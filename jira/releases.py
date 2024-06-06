from collections import defaultdict, OrderedDict
import inspect
import json
import os
from os.path import abspath, dirname, exists
import re
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues, get_issue_changelog, get_issue_fields, get_releases, jira_env

reload_fixed_issues = False

lsv_pattern = re.compile('LSV-[0-9]+')

quarterly_releases = {
    '2023.q3': 92,
    '2023.q4': 102,
    '2024.q1': 112
}

old_update_threshold = {
    '2023.q3': 92,
    '2023.q4': 92,
    '2024.q1': 102
}

quarterly_updates = { value: key for key, value in quarterly_releases.items() }

ticket_summaries = {}
update_fixed_issues = {}
quarterly_fixed_issues = {}

def get_release_cf(release_name):
    if release_name == '7.4.13-ga1':
        return 0

    if release_name.find('.q') != -1:
        release_parts = release_name.split('.')
        return '%d.%d' % (int(release_parts[0]), int(release_parts[1][1:]) * 100 + int(release_parts[2]))

    return int(release_name.split('-')[1][1:])

def get_release_ulevel(release_name):
    if release_name == '7.4.13-ga1':
        return 0

    if release_name.find('.q') != -1:
        short_name = release_name[:7]

        if short_name not in quarterly_releases:
            return None

        return quarterly_releases[short_name]

    return int(release_name.split('-')[1][1:])

def release_sort_key(x):
    return float(get_release_cf(x))

def ticket_sort_key(line):
    issue_key = line.split('\t')[0]
    last_dash = issue_key.rfind('-')
    return (issue_key[:last_dash], int(issue_key[last_dash+1:]))

def get_fixed_issues(release_name, release_ids):
    release_cf = get_release_cf(release_name)

    if release_ids is not None and release_cf != 0:
        query = 'fixVersion in (%s) OR (project in ("LPE","LPS","LPD") AND cf[10210] = %s)' % (','.join(release_ids), release_cf)
    elif release_ids is not None:
        query = 'fixVersion in (%s)' % ','.join(release_ids)
    elif release_cf != 0:
        query = f'project in ("LPE","LPS","LPD") AND cf[10210] = {release_cf}'
    else:
        print(f'unrecognized release {release_name}')
        return {}

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

    lsv_issue_keys = {}

    if len(secure_issue_keys) > 0:
        secure_issue_query = 'project = LPE and (%s)' % ' or '.join(['issue in linkedIssues(%s)' % secure_issue_key for secure_issue_key in secure_issue_keys])
        secure_issues = get_issues(secure_issue_query, ['summary'])

        for secure_issue_key, secure_issue in secure_issues.items():
            summary = secure_issue['fields']['summary']
            lsv_matcher = lsv_pattern.search(summary)

            if lsv_matcher is not None:
                lsv_issue_keys[lsv_matcher[0]] = secure_issue_key

    cve_issues = []

    if len(lsv_issue_keys) > 0:
        lsv_issue_query = 'key in (%s)' % ','.join(lsv_issue_keys.keys())
        lsv_issues = get_issues(lsv_issue_query, ['summary', 'description', 'customfield_10563'], render=True)

        for lsv_issue_key, lsv_issue in lsv_issues.items():
            if lsv_issue['fields']['customfield_10563'] is not None:
                cve_issues.append(lsv_issue['fields']['customfield_10563'])
                release_issues[lsv_issue['fields']['customfield_10563']] = {
                    'summary': lsv_issue['fields']['summary'],
                    'description': lsv_issue['renderedFields']['description']
                }

    if len(secure_issue_keys) > 0:
        print('Found [%s] = [%s] = [%s] for %s' % (','.join(secure_issue_keys), ','.join(lsv_issue_keys.keys()), ','.join(cve_issues), release_name))

    return release_issues

def update_releases():
    project_releases = defaultdict(list)
    unsorted_releases = defaultdict(list)

    def add_release(project, release):
        name = release['name']
        short_name = None

        if name[:6] == '7.4.3.' and name.find(' CE GA') != -1:
            release_num = int(name[6:name.find(' ')])
            if release_num >= 15:
                short_name = '7.4.13-u%d' % release_num
            elif release_num > 4:
                short_name = '7.4.13-u%d' % (release_num - 4)
        elif name == '7.4.13 DXP GA1':
            release_num = 0
            short_name = '7.4.13-ga1'
        elif name[:12] == '7.4.13 DXP U':
            release_num = int(name[12:])
            short_name = '7.4.13-u%d' % release_num
        elif len(name) > 8 and (name[4:6] == '.Q' or name[4:6] == '.q'):
            short_name = name.lower().strip()

        if short_name is not None and get_release_ulevel(short_name) is not None:
            project_releases[project].append(str(release['id']))
            unsorted_releases[short_name].append(str(release['id']))
            unsorted_releases[short_name] = sorted(unsorted_releases[short_name])

    for release in get_releases('LPS'):
        add_release('LPS', release)

    for release in get_releases('LPD'):
        add_release('LPD', release)

    sorted_releases = OrderedDict(sorted(unsorted_releases.items(), key=lambda x: release_sort_key(x[0])))

    with open(f'releases.{jira_env}.json', 'w') as f:
        json.dump(sorted_releases, f, sort_keys=False, indent=2, separators=(',', ': '))

    with open(f'releases.{jira_env}.projects.json', 'w') as f:
        json.dump(project_releases, f, sort_keys=False, indent=2, separators=(',', ': '))

update_releases()

def pull_updates():
    with open(f'releases.{jira_env}.json', 'r') as f:
        releases = json.load(f)

    for release_name, release_ids in releases.items():
        if release_name.find('.q') != -1:
            continue

        release_file_name = f'releases.{jira_env}/{release_name}.json'

        if exists(release_file_name):
            print(f'Reading {release_name} metadata')

            with open(release_file_name, 'r') as f:
                fixed_issues = json.load(f)
        else:
            print(f'Pulling {release_name} metadata')

            fixed_issues = get_fixed_issues(release_name, release_ids)

        ticket_summaries.update(fixed_issues)

        release_ulevel = get_release_ulevel(release_name)
        update_fixed_issues[release_ulevel] = set(fixed_issues.keys())

        if not exists(release_file_name):
            print(f'Writing {release_name} metadata')

            with open(f'releases.{jira_env}/{release_name}.json', 'w') as f:
                json.dump(fixed_issues, f, sort_keys=False, separators=(',', ':'))

def pull_quarterlies():
    with open(f'releases.{jira_env}.json', 'r') as f:
        releases = json.load(f)

    for release_name, release_ids in releases.items():
        if release_name.find('.q') == -1:
            continue

        release_file_name = f'releases.{jira_env}/{release_name}.json'

        if exists(release_file_name):
            print(f'Reading {release_name} metadata')

            with open(release_file_name, 'r') as f:
                fixed_issues = json.load(f)
        else:
            print(f'Pulling {release_name} metadata')

            fixed_issues = get_fixed_issues(release_name, release_ids)

        ticket_summaries.update(fixed_issues)

        for i in range(1, old_update_threshold[release_name[:7]] + 1):
             if i in update_fixed_issues:
                 fixed_issues = {key: value for key, value in fixed_issues.items() if key not in update_fixed_issues[i]}

        quarterly_fixed_issues[release_name] = set(fixed_issues.keys())

        if not exists(release_file_name):
            print(f'Writing {release_name} metadata')

            with open(f'releases.{jira_env}/{release_name}.json', 'w') as f:
                json.dump(fixed_issues, f, sort_keys=False, separators=(',', ':'))

# pull_updates()
# pull_quarterlies()

def check_issue_changelog(issue_key):
    releases_updates = set()

    changelog = get_issue_changelog(issue_key)
    changelog_items = sum([changelog_entry['items'] for changelog_entry in changelog if 'items' in changelog_entry], [])

    issue_fields = get_issue_fields(issue_key, ['fixVersions'])
    past_fix_versions = [field['name'].lower().strip() for field in issue_fields['fixVersions']]

    past_74_fix_versions = [item['toString'] for item in changelog_items if 'fieldId' in item and item['fieldId'] == 'customfield_10210']
    past_74_fix_versions = [version + '00' if version.find('.') != -1 and len(version) < 8 else version for version in past_74_fix_versions if len(version) == 8 or (version != '' and float(version) < 2000)]

    updates = set()
    quarterlies = set()

    for fix_version in past_74_fix_versions:
        if float(fix_version) < 2000:
            updates.add(int(fix_version))
        else:
            quarterlies.add(fix_version)

    if len(updates) != 0 or len(quarterlies) != 0:
        for fix_version in past_fix_versions:
            if fix_version == '7.4.13 DXP GA1':
                update_fixed_issues[0].remove(issue_key)
            elif fix_version.find('7.4.13 DXP U') == 0:
                update_fixed_issues[int(fix_version[12:])].remove(issue_key)
            elif fix_version.find('.q') != -1:
                if issue_key in quarterly_fixed_issues[fix_version]:
                    quarterly_fixed_issues[fix_version].remove(issue_key)

    for fix_version in past_fix_versions:
        if fix_version == '7.4.13 DXP GA1':
            updates.add(0)
        if fix_version.find('7.4.13 DXP U') == 0:
            updates.add(int(fix_version[12:]))

    if (len(updates) == 0 or min(updates) >= 92):
        for fix_version in past_fix_versions:
            if fix_version.find('.q') != -1:
                quarterlies.add(fix_version)

    missing_updates = [x for x in updates if x in update_fixed_issues and issue_key not in update_fixed_issues[x]]
    missing_quarterlies = [x for x in quarterlies if x in quarterly_fixed_issues and issue_key not in quarterly_fixed_issues[x]]

    for x in missing_updates:
        update_fixed_issues[x].add(issue_key)

    for x in missing_quarterlies:
        quarterly_fixed_issues[x].add(issue_key)

    return missing_updates + missing_quarterlies

def check_changelogs():
    with open(f'releases.{jira_env}.json', 'r') as f:
        releases = json.load(f)

    post92_fixed_issues = set()

    for i, issue_keys in update_fixed_issues.items():
         if i >= 92:
             post92_fixed_issues.update(issue_keys)

    for issue_keys in quarterly_fixed_issues.values():
         post92_fixed_issues.update(issue_keys)

    for i, issue_key in enumerate(sorted(post92_fixed_issues, key=ticket_sort_key)):
        if issue_key[:4] == 'CVE-':
            continue

        print('Checking issue %d of %d (%s)' % (i + 1, len(post92_fixed_issues), issue_key))
        check_issue_changelog(issue_key)

    for i, issue_keys in update_fixed_issues.items():
        release_name = '7.4.13-u%d' % i if i > 0 else '7.4.13-ga1'
        release_file_name = f'releases.{jira_env}/{release_name}.json'
        if len(issue_keys) == 0:
            del releases[release_name]
            os.remove(release_file_name)
        else:
            with open(release_file_name, 'w') as f:
                json.dump({key: ticket_summaries[key] for key in sorted(issue_keys, key=ticket_sort_key)}, f)

    for release_name, issue_keys in quarterly_fixed_issues.items():
        release_file_name = f'releases.{jira_env}/{release_name}.json'
        if len(issue_keys) == 0:
            del releases[release_name]
            os.remove(release_file_name)
        else:
            with open(release_file_name, 'w') as f:
                json.dump({key: ticket_summaries[key] for key in sorted(issue_keys, key=ticket_sort_key)}, f)

    with open(f'releases.{jira_env}.json', 'w') as f:
        json.dump(releases, f, sort_keys=False, indent=2, separators=(',', ': '))

# check_changelogs()

def save_fix_versions():
    ticket_fix_versions = defaultdict(list)

    for i, issue_keys in update_fixed_issues.items():
        release_name = '7.4.13-u%d' % i if i > 0 else '7.4.13-ga1'

        for issue_key in issue_keys:
            ticket_fix_versions[issue_key].append(release_name)

    for release_name, issue_keys in quarterly_fixed_issues.items():
        for issue_key in issue_keys:
            ticket_fix_versions[issue_key].append(release_name)

    with open(f'releases.{jira_env}.csv', 'w') as f:
        f.write('ticket\tfixPackVersion\n')
        for issue_key in sorted(ticket_fix_versions.keys(), key=ticket_sort_key):
        	f.write(f'{issue_key}\t{",".join(ticket_fix_versions[issue_key])}\n')

# save_fix_versions()