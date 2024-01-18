#!/usr/bin/env python

from datetime import datetime
import json
import re
import requests
import subprocess

from lsv_helpcenter import get_lsv_articles

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues

def get_prefix_suffix(base_version):
    prefix = None
    suffix = None

    if base_version == '6.1':
        prefix = 'liferay-fixpack-portal-'
        suffix = '-6130'
    elif base_version == '6.2':
        prefix = 'liferay-fixpack-portal-'
        suffix = '-6210'
    elif base_version == '7.0':
        prefix = 'liferay-fixpack-de-'
        suffix = '-7010'
    elif base_version == '7.1' or base_version == '7.2' or base_version == '7.3':
        prefix = 'liferay-fixpack-dxp-'
        suffix = '-%s10' % ''.join(base_version.split('.', 3)[0:2])
    elif base_version == '7.4':
        prefix = 'liferay-update-dxp-'
        suffix = '-%s13' % ''.join(base_version.split('.', 3)[0:2])

    return prefix, suffix

def get_bpr_fix_pack_label(issue_key, base_version):
    prefix, suffix = get_prefix_suffix(base_version)

    linked_issues = get_issues(
        'project = BPR and issueFunction in linkedIssuesOf("issue in linkedIssues(%s)")' % issue_key,
        ['customfield_14424', 'customfield_19421'])

    max_fix_pack_number = 0

    for linked_issue in linked_issues.values():
        if linked_issue['fields']['customfield_14424']['name'].find(base_version) != -1:
            if 'customfield_19421' in linked_issue['fields']:
                fix_pack = linked_issue['fields']['customfield_19421']

                if fix_pack is None or fix_pack.find('-') == -1:
                    max_fix_pack_number = 9999
                    continue

                fix_pack_number = int(fix_pack[fix_pack.find('-')+1:])

                if fix_pack_number > max_fix_pack_number:
                    max_fix_pack_number = fix_pack_number
            else:
                max_fix_pack_number = 9999

    if max_fix_pack_number == 0:
        max_fix_pack_number = 9999

    print('https://issues.liferay.com/browse/%s' % issue_key, '%s%s%s' % (prefix, max_fix_pack_number, suffix))
    return '%s%s%s' % (prefix, max_fix_pack_number, suffix)

def get_lps_fix_pack_labels(issue_key):
    linked_issues = get_issues('project = LPS AND key in linkedIssues(%s)' % issue_key, ['fixVersions'])

    lps_labels = []

    for linked_issue in linked_issues.values():
        for fix_version in linked_issue['fields']['fixVersions']:
            fix_version_name = fix_version['name']

            for fix_branch in ['6.1', '6.2', '7.0', '7.1', '7.2', '7.3']:
                if fix_version_name.find(fix_branch) != 0:
                    continue

                pos = fix_version_name.find('FP')

                if pos == -1:
                    continue

                update = int(fix_version_name[pos+2:])
                prefix, suffix = get_prefix_suffix(fix_branch)
                lps_labels.append('%s%s%s' % (prefix, update, suffix))

            for fix_branch in ['7.3', '7.4']:
                if fix_version_name.find(fix_branch) != 0:
                    continue

                pos = fix_version_name.find('U')

                if pos == -1:
                    continue

                update = int(fix_version_name[pos+1:])
                prefix, suffix = get_prefix_suffix(fix_branch)
                lps_labels.append('%s%s%s' % (prefix, update, suffix))

            for fix_branch in ['7.4']:
                if fix_version_name.find(fix_branch) != 0:
                    continue

                pos = fix_version_name.find('GA')

                if pos == -1:
                    continue

                update = int(fix_version_name[pos+2:])
                prefix, suffix = get_prefix_suffix(fix_branch)
                lps_labels.append('%s%s%s' % (prefix, update, suffix))

    if len(lps_labels) == 0:
        print(issue_key, linked_issues)

    return lps_labels

def get_fix_pack_labels(issue_key, issue):
    fix_pack_labels = [label for label in issue['fields']['labels'] if label.find('liferay-fixpack-') == 0 or label.find('liferay-update-') == 0]

    security_pending_labels = [label for label in issue['fields']['labels'] if label.find('-security-pending') == 4]

    if len(security_pending_labels) > 0:
        fix_versions = [label[:label.find('-')] for label in security_pending_labels]
        fix_branches = [version[0:-3] + '.' + version[-3:-2] for version in fix_versions]
        fix_pack_labels.extend([get_bpr_fix_pack_label(issue_key, fix_branch) for fix_branch in fix_branches])

    if len(fix_pack_labels) == 0:
        fix_pack_labels.extend(get_lps_fix_pack_labels(issue_key))

    return fix_pack_labels

def expand_fix_version(issue_key, issue):
    fix_version = {}
    fix_pack_labels = get_fix_pack_labels(issue_key, issue)

    sev_labels = [label for label in issue['fields']['labels'] if label[0:4] == 'sev-']
    lsv_labels = [label for label in issue['fields']['labels'] if label[0:4] == 'lsv-']

    if len(sev_labels) > 0:
        fix_version['sev'] = int(sev_labels[0][4:])

    if len(lsv_labels) > 0:
        fix_version['lsv'] = int(lsv_labels[0][4:])

    for fix_branch in ['6.1', '6.2', '7.0', '7.1', '7.2', '7.3', '7.4']:
        base_version = '.'.join(fix_branch.split('.', 3)[0:2])
        build_number = '';

        if base_version == '6.1':
            prefix = 'liferay-fixpack-portal-'
            suffix = '-6130'
        elif base_version == '6.2':
            prefix = 'liferay-fixpack-portal-'
            suffix = '-6210'
        elif base_version == '7.0':
            prefix = 'liferay-fixpack-de-'
            suffix = '-7010'
        elif base_version == '7.1' or base_version == '7.2' or base_version == '7.3':
            prefix = 'liferay-fixpack-dxp-'
            suffix = '-%s10' % ''.join(fix_branch.split('.', 3)[0:2])
        else:
            prefix = 'liferay-update-dxp-'
            suffix = '-%s13' % ''.join(base_version.split('.', 3)[0:2])

        build_number = suffix[1:]

        for label in fix_pack_labels:
            if label[:len(prefix)] != prefix or label[-len(suffix):] != suffix:
                continue

            pattern = re.compile('%s[0-9]*%s' % (prefix, suffix))

            if not pattern.fullmatch(label):
                continue

            fix_version[build_number] = int(label[len(prefix):-len(suffix)])

    return fix_version

fix_issues = {}
fix_versions = {}

def update_fix_versions(query):
    issues = get_issues(query, ['summary', 'labels'])

    for issue_key, issue in issues.items():
        if issue_key in fix_versions:
            continue

        fix_version = expand_fix_version(issue_key, issue)

        if len(fix_version) == 0:
            continue

        fix_issues[issue_key] = issue
        fix_versions[issue_key] = fix_version

def check_public_security_issues():
    update_fix_versions('project = LPE AND labels = LSV AND (resolution in (Completed, Fixed) OR labels = sev-1) ORDER BY key')

def check_private_security_issues():
    update_fix_versions('project = LPE AND labels != LSV AND component = "Security Vulnerability" AND resolution in (Completed, Fixed) ORDER BY key')
    update_fix_versions('project = LPE AND level = Private and (summary ~ "Use of library" OR summary ~ "LSV*")')

def update_help_center_links():
    pattern = re.compile('LSV-([0-9]+)')

    for issue_key, fix_version in fix_versions.items():
        if 'lsv' in fix_version:
            continue

        summary = fix_issues[issue_key]['fields']['summary']

        matcher = pattern.search(summary)

        if matcher is None:
            continue

        fix_version['lsv'] = int(matcher[1])

    lsv_articles = get_lsv_articles()

    if len(lsv_articles) > 0:
        for fix_version in fix_versions.values():
            if 'lsv' not in fix_version:
                continue

            lsv_ticket_name = 'LSV-%d' % fix_version['lsv']
            sev = 'SEV-%d' % fix_version['sev'] if 'sev' in fix_version else 'other'

            if lsv_ticket_name in lsv_articles:
                fix_version['hc'] = lsv_articles[lsv_ticket_name]
            elif sev == 'SEV-1' or sev == 'SEV-2':
                print('%s (%s) is missing a security advisory' % (lsv_ticket_name, sev))

check_public_security_issues()
check_private_security_issues()
update_help_center_links()

with open('lsv_fixedin.json', 'w') as f:
    json.dump(fix_versions, f, sort_keys=True, indent=2, separators=(',', ':'))