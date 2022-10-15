#!/usr/bin/env python

from datetime import datetime
import json
import re
import requests
import subprocess

from jira import get_issues
from lsv_helpcenter import get_lsv_articles

def get_bpr_fix_pack_label(issue_key, base_version):
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
    else:
        return None

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
        return '%s9999%s' % (prefix, suffix)

    print('https://issues.liferay.com/browse/%s' % issue_key, '%s%s%s' % (prefix, max_fix_pack_number, suffix))
    return '%s%s%s' % (prefix, max_fix_pack_number, suffix)

def get_fix_pack_labels(issue_key, issue):
    fix_pack_labels = [label for label in issue['fields']['labels'] if label.find('liferay-fixpack-') == 0 or label.find('liferay-update-') == 0]

    security_pending_labels = [label for label in issue['fields']['labels'] if label.find('-security-pending') == 4]

    if len(security_pending_labels) > 0:
        fix_versions = [label[:label.find('-')] for label in security_pending_labels]
        fix_branches = [version[0:-3] + '.' + version[-3:-2] for version in fix_versions]
        fix_pack_labels.extend([get_bpr_fix_pack_label(issue_key, fix_branch) for fix_branch in fix_branches])

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

    for fix_branch in ['6.1', '6.2', '7.0', '7.1', '7.2', '7.3']:
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

fix_versions = {}

def update_fix_versions(query):
    issues = get_issues(query, ['fixVersions', 'labels'])

    for issue_key, issue in issues.items():
        fix_version = expand_fix_version(issue_key, issue)

        if len(fix_version) == 0:
            continue

        fix_versions[issue_key] = fix_version

update_fix_versions('project = LPE AND labels = LSV AND (resolution in (Completed, Fixed) OR labels = sev-1) ORDER BY key')

lsv_articles = get_lsv_articles()

if len(lsv_articles) > 0:
    for fix_version in fix_versions.values():
        if 'lsv' not in fix_version:
            continue

        lsv_ticket_name = 'LSV-%d' % fix_version['lsv']
        sev = fix_version['sev'] if 'sev' in fix_version else 3

        if lsv_ticket_name in lsv_articles:
            fix_version['hc'] = lsv_articles[lsv_ticket_name]
        elif sev < 3:
            print('%s (sev-%d) is missing a security advisory' % (lsv_ticket_name, sev))

with open('lsv_fixedin.json', 'w') as f:
    json.dump(fix_versions, f, separators=(',', ':'))