import inspect
import json
import os
from os.path import abspath, dirname, exists
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import jira_env

quarterly_releases = {
    '2023.q3': 92,
    '2023.q4': 102,
    '2024.q1': 112,
    '2024.q2': 120,
    '2024.q3': 125
}

with open(f'releases.{jira_env}.json', 'r') as f:
    releases = json.load(f)

fixed_issues = {}

for release_name in releases.keys():
    with open(f'releases.{jira_env}/{release_name}.json', 'r') as f:
        fixed_issues[release_name] = set(json.load(f).keys())

for i in range(1, max(quarterly_releases.values()) + 1):
    prev_release_name = '7.4.13-u%d' % (i-1) if (i-1) > 0 else '7.4.13-ga1'
    this_release_name = '7.4.13-u%d' % i if i > 0 else '7.4.13-ga1'

    if this_release_name not in fixed_issues:
        fixed_issues[this_release_name] = set()

    fixed_issues[this_release_name].update(fixed_issues[prev_release_name])

for release_prefix in sorted(quarterly_releases.keys()):
    release_name = '%s.0' % release_prefix

    if release_name not in fixed_issues:
        fixed_issues[release_name] = set()

    fixed_issues[release_name].update(fixed_issues['7.4.13-u%d' % quarterly_releases[release_prefix]])
    fixed_issues[release_name] = fixed_issues[release_name] - fixed_issues['7.4.13-u92']

    max_patch_release = max([int(key[key.rfind('.')+1:]) for key in releases.keys() if key.find(release_prefix) == 0])

    for i in range(1, max_patch_release + 1):
        prev_release_name = '%s.%d' % (release_prefix, i-1)
        this_release_name = '%s.%d' % (release_prefix, i)
        fixed_issues[this_release_name].update(fixed_issues[prev_release_name])

def sort_tickets(x):
    a, b = x.split('-')
    return a, int(b)

for release_name in fixed_issues.keys():
    if release_name.find('.q') != -1:
        tickets = sorted(list(fixed_issues[release_name]), key=sort_tickets)
        with open(f'fixed_issues/{release_name}.txt', 'w') as f:
            f.write('\n'.join(tickets))