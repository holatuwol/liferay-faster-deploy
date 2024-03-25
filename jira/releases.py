from collections import defaultdict, OrderedDict
import inspect
import json
import os
from os.path import abspath, dirname, exists
import re
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues, get_issue_changelog, get_issue_fields, get_releases

lsv_pattern = re.compile('LSV-[0-9]+')

quarterly_releases = {
    '2023.q3': 92,
    '2023.q4': 102,
    '2024.q1': 112
}

old_update_threshold = {
    '2023.3': 92,
    '2023.4': 92,
    '2024.1': 102
}

quarterly_updates = { value: key for key, value in quarterly_releases.items() }

seen_issue_keys = {}
seen_issue_versions = {}

releases_data = {}
releases_file_names = {}
fixed_issues = {}

def get_release_cf(release_name):
    if release_name.find('.q') != -1:
        release_parts = release_name.split('.')
        return '%d.%d' % (int(release_parts[0]), int(release_parts[1][1:]) * 100 + int(release_parts[2]))

    return int(release_name.split('-')[1][1:])

def get_release_ulevel(release_name):
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
    query = f'(project in ("LPE","LPS","LPD") AND cf[10210] = {get_release_cf(release_name)})'

    if release_ids is not None:
        query = 'fixVersion in (%s) or %s ' % (','.join(release_ids), query)

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

def update_releases():
    unsorted_releases = defaultdict(list)

    def add_release(release):
        name = release['name']
        short_name = None

        if name[:6] == '7.4.3.' and name.find(' CE GA') != -1:
            release_num = int(name[6:name.find(' ')])
            if release_num >= 15:
                short_name = '7.4.13-u%d' % release_num
        elif name[:12] == '7.4.13 DXP U':
            release_num = int(name[12:])
            short_name = '7.4.13-u%d' % release_num
        elif len(name) > 8 and (name[4:6] == '.Q' or name[4:6] == '.q'):
            short_name = name.lower()

        if short_name is not None and get_release_ulevel(short_name) is not None:
            unsorted_releases[short_name].append(str(release['id']))
            unsorted_releases[short_name] = sorted(unsorted_releases[short_name])

    for release in get_releases('LPS'):
        add_release(release)

    for release in get_releases('LPD'):
        add_release(release)

    sorted_releases = OrderedDict(sorted(unsorted_releases.items(), key=lambda x: release_sort_key(x[0])))

    with open('releases.json', 'w') as f:
        json.dump(sorted_releases, f, sort_keys=False, indent=2, separators=(',', ': '))

update_releases()

def sort_releases():
    with open('releases.json', 'r') as f:
        releases = json.load(f)

    for release_name, release_ids in releases.items():
        release_file_name = f'releases/{release_name}.json'

        if exists(release_file_name):
            with open(release_file_name, 'r') as f:
                unsorted_fixed_issues = json.load(f)
        else:
            unsorted_fixed_issues = get_fixed_issues(release_name, release_ids)

        sorted_fixed_issues = OrderedDict(sorted(unsorted_fixed_issues.items(), key=lambda x: ticket_sort_key(x[0])))

        if len(sorted_fixed_issues) == 0:
            continue

        print(f'writing {release_name} metadata')

        with open(release_file_name, 'w') as f:
            json.dump(sorted_fixed_issues, f, sort_keys=False, separators=(',', ':'))

sort_releases()

def check_issue_changelog(issue_key, past_fix_versions, past_74_fix_versions):
    releases_updates = set()

    if past_fix_versions is None or past_74_fix_versions is None:
        changelog = get_issue_changelog(issue_key)
        changelog_items = sum([changelog_entry['items'] for changelog_entry in changelog if 'items' in changelog_entry], [])

        issue_fields = get_issue_fields(issue_key, ['fixVersions'])
        past_fix_versions = [field['name'] for field in issue_fields['fixVersions']]

        past_74_fix_versions = [item['toString'] for item in changelog_items if 'fieldId' in item and item['fieldId'] == 'customfield_10210']
        past_74_fix_versions = [version + '00' if version.find('.') != -1 and len(version) < 8 else version for version in past_74_fix_versions if len(version) == 8 or (version != '' and float(version) < 2000)]

        with open('releases.csv', 'a') as f:
            f.write(f'{issue_key}\t{json.dumps(sorted(past_fix_versions))}\t{json.dumps(sorted(past_74_fix_versions))}\n')

    updates = set()
    quarterlies = set()

    for fix_version in past_fix_versions:
        if fix_version.find('7.4.13 DXP U') == 0:
            update = int(fix_version[12:])
            updates.add(update)
        elif fix_version.lower().find('.q') != -1:
            quarterly = '%s.%s%02d' % (fix_version.lower()[:4], fix_version[6], int(fix_version[8:]))
            quarterlies.add(quarterly)

    for fix_version in past_74_fix_versions:
        if float(fix_version) < 2000:
            update = int(fix_version)
            updates.add(update)
        else:
            quarterlies.add(fix_version)

        if fix_version not in releases_data:
            continue

        if issue_key in releases_data[fix_version]:
            continue

        releases_data[fix_version][issue_key] = fixed_issues[issue_key]
        releases_updates.add(fix_version)

    if len(updates) > 0 and len(quarterlies) > 0:
        max_update = max(updates)
        min_quarterly = min(quarterlies)[:6]

        if max_update < old_update_threshold[min_quarterly]:
            for quarterly in quarterlies:
                if quarterly in releases_data and issue_key in releases_data[quarterly]:
                    del releases_data[quarterly][issue_key]
                    releases_updates.add(quarterly)

    return releases_updates

def check_fixed_issues():
    with open('releases.json', 'r') as f:
        releases = json.load(f)

    for release_name, release_ids in releases.items():
        release_ulevel = get_release_ulevel(release_name)

        release_cf = get_release_cf(release_name)
        release_cf_key = 'u' if release_name.find('.q') == -1 else release_name[:7]

        release_file_name = f'releases/{release_name}.json'

        if not exists(release_file_name):
            continue

        releases_file_names[release_cf] = release_file_name

        with open(release_file_name, 'r') as f:
            releases_data[release_cf] = json.load(f)
            if release_ulevel is not None and release_ulevel >= 92:
                fixed_issues.update(releases_data[release_cf])

def sort_seen_issues():
    if not exists('releases.csv'):
        return

    with open('releases.csv', 'r') as f:
        lines = sorted(f.readlines(), key=ticket_sort_key)
        for line in lines:
            issue_key, fix_json, fix74_json = line.strip().split('\t')
            seen_issue_keys[issue_key] = (json.loads(fix_json), json.loads(fix74_json))

    with open('releases.csv', 'w') as f:
        f.write(''.join(lines))

check_fixed_issues()
sort_seen_issues()

def check_changelogs():
    with open('releases.json', 'r') as f:
        releases = json.load(f)

    for i, issue_key in enumerate(fixed_issues.keys()):
        if issue_key[:4] == 'CVE-':
            continue

        print('Checking issue %d of %d (%s)' % (i + 1, len(fixed_issues), issue_key))

        if issue_key in seen_issue_keys:
            past_fix_versions, past_74_fix_versions = seen_issue_keys[issue_key]
            release_cfs = check_issue_changelog(issue_key, past_fix_versions, past_74_fix_versions)
        else:
            release_cfs = check_issue_changelog(issue_key, None, None)

        if len(release_cfs) > 0:
            print('Fixing releases for issue %d of %d (%s)' % (i + 1, len(fixed_issues), issue_key))

        for release_cf in release_cfs:
            with open(releases_file_names[release_cf], 'w') as f:
                json.dump(releases_data[release_cf], f, sort_keys=True, separators=(',', ':'))

    for release_name in sorted(releases.keys(), key=release_sort_key, reverse=True):
        release_cf = get_release_cf(release_name)
        if release_cf not in releases_data or len(releases_data[release_cf]) == 0:
            del releases[release_name]

    with open('releases.json', 'w') as f:
        json.dump(releases, f, sort_keys=False, indent=2, separators=(',', ': '))

check_changelogs()