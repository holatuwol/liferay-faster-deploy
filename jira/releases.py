import inspect
import json
import os
from os.path import abspath, dirname, exists
import re
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues

lsv_pattern = re.compile('LSV-[0-9]+')

def get_fixed_issues(release_id):
    fixed_issues = get_issues(f'fixVersion = {release_id}', ['summary', 'description', 'security'], True)

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

    lsv_issue_keys = []

    for secure_issue_key, secure_issue in secure_issues.items():
        summary = secure_issue['fields']['summary']
        lsv_matcher = lsv_pattern.search(summary)

        if lsv_matcher is not None:
            lsv_issue_keys.append(lsv_matcher[0])

    if len(lsv_issue_keys) == 0:
        return release_issues

    lsv_issue_query = 'key in (%s)' % ','.join(lsv_issue_keys)
    lsv_issues = get_issues(lsv_issue_query, ['summary', 'description', 'customfield_10563'], True)

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
        json.dump(get_fixed_issues(release_id), f, sort_keys=True, separators=(',', ':'))