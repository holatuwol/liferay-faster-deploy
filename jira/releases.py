import inspect
import json
import os
from os.path import abspath, dirname, exists
import re
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues, get_issue_changelog, get_issue_fields

lsv_pattern = re.compile('LSV-[0-9]+')

quarterly_releases = {
    '2023.q3': 92,
    '2023.q4': 102
}

quarterly_updates = { value: key for key, value in quarterly_releases.items() }

def get_release_cf(release_name):
    if release_name.find('.q') != -1:
        release_parts = release_name.split('.')
        return '%d.%d' % (int(release_parts[0]), int(release_parts[1][1:]) * 100 + int(release_parts[2]))

    return int(release_name.split('-')[1][1:])

def get_release_ulevel(release_name):
    if release_name.find('.q') != -1:
        return quarterly_releases[release_name[:7]]

    return int(release_name.split('-')[1][1:])

def get_fixed_issues(release_name, release_id):
    query = f'(project in ("LPE","LPS","LPD") AND cf[10210] = {get_release_cf(release_name)})'

    if release_id is not None:
        query = f'fixVersion = {release_id} or ' + query

    fixed_issues = get_issues(query, ['summary', 'description', 'security'], render=True)

    release_issues = {}

    secure_issue_keys = []

    for fixed_issue_key, fixed_issue in fixed_issues.items():
        if fixed_issue['fields']['security'] is None:
            release_issues[fixed_issue_key] = {
                'summary': fixed_issue['fields']['summary'],
                'description': fixed_issue['renderedFields']['description']
            }
        else:
            secure_issue_keys.append(fixed_issue_key)

    if len(secure_issue_keys) == 0:
        return release_issues

    secure_issue_query = 'project = LPE and (%s)' % ' or '.join(['issue in linkedIssues(%s)' % secure_issue_key for secure_issue_key in secure_issue_keys])
    secure_issues = get_issues(secure_issue_query, ['summary'])

    lsv_issue_keys = {}

    for secure_issue_key, secure_issue in secure_issues.items():
        summary = secure_issue['fields']['summary']
        lsv_matcher = lsv_pattern.search(summary)

        if lsv_matcher is not None:
            lsv_issue_keys[lsv_matcher[0]] = secure_issue_key

    if len(lsv_issue_keys) == 0:
        return release_issues

    lsv_issue_query = 'key in (%s)' % ','.join(lsv_issue_keys.keys())
    lsv_issues = get_issues(lsv_issue_query, ['summary', 'description', 'customfield_10563'], render=True)

    for lsv_issue_key, lsv_issue in lsv_issues.items():
        if lsv_issue['fields']['customfield_10563'] is not None:
            release_issues[lsv_issue['fields']['customfield_10563']] = {
                'summary': lsv_issue['fields']['summary'],
                'description': lsv_issue['renderedFields']['description']
            }

    return release_issues

with open('releases.json', 'r') as f:
    releases = json.load(f)

for release_name, release_id in releases.items():
    release_file_name = f'releases/{release_name}.json'

    if exists(release_file_name):
        continue

    with open(release_file_name, 'w') as f:
        print(f'writing {release_name} metadata')
        json.dump(get_fixed_issues(release_name, release_id), f, sort_keys=True, separators=(',', ':'))

def check_issue_changelog(issue_key):
    releases_updates = set()

    changelog = get_issue_changelog(issue_key)
    changelog_items = sum([changelog_entry['items'] for changelog_entry in changelog if 'items' in changelog_entry], [])

    issue_fields = get_issue_fields(issue_key, ['fixVersions'])
    past_fix_versions = [field['name'] for field in issue_fields['fixVersions']]

    past_74_fix_versions = [item['toString'] for item in changelog_items if 'fieldId' in item and item['fieldId'] == 'customfield_10210']
    past_74_fix_versions = [version + '00' if version.find('.') != -1 and len(version) < 7 else version for version in past_74_fix_versions]

    with open('releases.csv', 'a') as f:
        f.write(f'{issue_key}\t{json.dumps(sorted(past_fix_versions))}\t{json.dumps(sorted(past_74_fix_versions))}\n')

    for fix_version in past_74_fix_versions:
        if fix_version not in releases_data:
            continue

        if issue_key in releases_data[fix_version]:
            continue

        releases_data[fix_version][issue_key] = fixed_issues[issue_key]
        releases_updates.add(fix_version)

    return releases_updates

releases_data = {}
releases_file_names = {}
fixed_issues = {}

for release_name, release_id in releases.items():
    if get_release_ulevel(release_name) < 92:
        continue

    release_cf = get_release_cf(release_name)
    release_cf_key = 'u' if release_name.find('.q') == -1 else release_name[:7]

    release_file_name = f'releases/{release_name}.json'

    if not exists(release_file_name):
        continue

    releases_file_names[release_cf] = release_file_name

    with open(release_file_name, 'r') as f:
        releases_data[release_cf] = json.load(f)
        fixed_issues.update(releases_data[release_cf])

seen_issue_keys = set()

if exists('releases.csv'):
    with open('releases.csv', 'r') as f:
        seen_issue_keys.update([line.strip().split('\t')[0] for line in f.readlines()])

for i, issue_key in enumerate(fixed_issues.keys()):
    if issue_key in seen_issue_keys:
        continue

    if issue_key[:4] == 'CVE-':
        continue

    print('Checking issue %d of %d (%s)' % (i + 1, len(fixed_issues), issue_key))

    for release_cf in check_issue_changelog(issue_key):
        with open(releases_file_names[release_cf], 'w') as f:
            json.dump(releases_data[release_cf], f, sort_keys=True, separators=(',', ':'))