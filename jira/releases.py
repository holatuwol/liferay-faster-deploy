from collections import defaultdict, OrderedDict
from datetime import datetime, timezone
import inspect
import json
import os
from os.path import abspath, dirname, exists
import re
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_get_request, get_issues, get_issue_changelog, get_releases, jira_base_url, jira_env

reload_fixed_issues = False

quarterly_releases = {
    '2023.q3': 92,
    '2023.q4': 102,
    '2024.q1': 112,
    '2024.q2': 120,
    '2024.q3': 125,
    '2024.q4': 129,
    '2025.q1': 132,
    '2025.q2': 135,
    '2025.q3': 138,
    '2025.q4': 143,
    '2026.q1': 147,
    '2026.q2': 149,
    '2026.q3': 152,
    '2026.q4': 155,
}

# The fix pack (or update, for 7.3) that each 7.0, 7.1, 7.2 and 7.3 service pack
# is equivalent to (7.2.10-sp3 is 7.2.10-fp8, and 7.0.10-sp9 is 7.0.10-de60)
service_pack_fix_packs = {
    '7.0': {
        1: 7,
        2: 12,
        3: 14,
        4: 22,
        5: 30,
        6: 32,
        7: 40,
        8: 50,
        9: 60,
        10: 70,
        11: 80,
        12: 87,
        13: 90,
        14: 93,
        15: 96,
        16: 99,
        17: 102,
    },
    '7.1': {
        1: 5,
        2: 10,
        3: 15,
        4: 17,
        5: 20,
        6: 23,
        7: 26,
        8: 28,
    },
    '7.2': {
        1: 2,
        2: 5,
        3: 8,
        4: 11,
        5: 14,
        6: 17,
        7: 19,
        8: 20,
    },
    '7.3': {
        1: 1,
        2: 2,
        3: 3,
    },
}

# The kind of release that the service packs of each line map to, if not a fix
# pack (7.0 has de releases and 7.3 has updates)
service_pack_release_types = {
    '7.0': 'de',
    '7.3': 'u',
}

# 7.0 to 7.3 service pack names, such as 7.2.10 DXP SP3, 7.2.10.3 DXP SP3,
# 7.0.10.10 DXP SP11, 7.1.10.1 SP1 or 7.2.10-sp3
service_pack_pattern = re.compile(r'^(7\.[0-3])\.\d+(?:\.\d+)?[\s.-]*(?:dxp\s*)?sp\s*(\d+)$', re.IGNORECASE)

# 7.4 CE GA names, such as 7.4.3.120 CE GA120, 7.4.3.100 GA100 or
# 7.4.13.125 CE GA125 (where 7.4.13 is a typo for 7.4.3)
ce_ga_74_pattern = re.compile(r'^7\.4\.(?:3|13)\.(\d+)\s+(?:ce\s+)?ga\d*$', re.IGNORECASE)

def compute_old_update_threshold(x):
    if x == '2023.q3':
        return 92
    year, quarter = x.split('.')
    if quarter == 'q1':
        return quarterly_releases['%d.q4' % (int(year) - 1)]
    else:
        return quarterly_releases['%s.q%d' % (year, int(quarter[1]) - 1)]

old_update_threshold = {
    key: compute_old_update_threshold(key) for key in quarterly_releases.keys()
}

quarterly_updates = { value: key for key, value in quarterly_releases.items() }

raw_fix_versions = {}

ticket_summaries = {}
update_fixed_issues = {}
quarterly_fixed_issues = {}

def get_release_cf(release_name):
    if release_name == '7.4.13-ga1':
        return 0

    if release_name.find('.q') != -1:
        release_parts = release_name.split('.')
        return float('%d.%d' % (int(release_parts[0]), int(release_parts[1][1:]) * 100 + int(release_parts[2])))

    if release_name[:6] != '7.4.13':
        return -1

    return int(release_name.split('-')[1][1:])

def get_release_ulevel(release_name):
    if release_name[-3:-1] == 'ga':
        return 0

    if release_name.find('.q') != -1:
        short_name = release_name[:7]

        if short_name not in quarterly_releases:
            return None

        return quarterly_releases[short_name]

    update = release_name.split('-')[1]
    if update[0] == 'u':
        return int(update[1:])
    if update[:2] == 'fp':
        return int(update[2:])
    if update[:2] == 'de':
        return int(update[2:])
    if update[:2] == 'sp':
        return int(update[2:])

    print(update)
    assert(False)

def get_release_baseline(release_name):
    return int(release_name[:6].replace('.', ''))

def release_sort_key(release_name):
    if release_name.find('.q') != -1:
        release_parts = release_name.split('.')
        return float('%d.%d' % (8000000 + int(release_parts[0]), int(release_parts[1][1:]) * 100 + int(release_parts[2])))

    return float(get_release_baseline(release_name) * 1000.0 + get_release_ulevel(release_name))

def ticket_sort_key(line):
    issue_key = line.split('\t')[0]
    last_dash = issue_key.rfind('-')
    try:
        return (issue_key[:last_dash], int(issue_key[last_dash+1:]))
    except:
        print(f'error in line: "{line}"')
        assert(False)

def get_iso_time(jira_time):
    if jira_time == '':
        return None

    return datetime.strptime(jira_time, '%Y-%m-%dT%H:%M:%S.%f%z').astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def get_field_value(fixed_issue, field_name, sub_field_name=None):
    if field_name not in fixed_issue['fields'] or fixed_issue['fields'][field_name] is None:
        return ''

    if sub_field_name is None:
        return fixed_issue['fields'][field_name]

    if sub_field_name not in fixed_issue['fields'][field_name] or fixed_issue['fields'][field_name][sub_field_name] is None:
        return ''

    return fixed_issue['fields'][field_name][sub_field_name]

def has_matching_changelog_item(changelog_entry, field, to):
    for changelog_item in changelog_entry['items']:
        if changelog_item['field'] == field and changelog_item['to'] == to:
            return True

    return False

def get_issue_compact(fixed_issue):
    global raw_fix_versions

    fix_versions = get_field_value(fixed_issue, 'fixVersions')

    if fix_versions != '' and fix_versions is not None:
        raw_fix_versions[fixed_issue['key']] = fix_versions

    create_date = get_iso_time(fixed_issue['fields']['created'])
    fix_priority = get_field_value(fixed_issue, 'customfield_10211', 'value')

    resolution_id = get_field_value(fixed_issue, 'resolution', 'id')
    resolution_date = get_iso_time(get_field_value(fixed_issue, 'resolutiondate'))
    status_id = get_field_value(fixed_issue, 'status', 'id')
    status_date = get_iso_time(get_field_value(fixed_issue, 'statuscategorychangedate'))

    return {
        'key': fixed_issue['key'],
        'type': get_field_value(fixed_issue, 'issuetype', 'name'),
        'summary': fixed_issue['fields']['summary'],
        'description': fixed_issue['renderedFields']['description'],
        'components': [x['name'] for x in fixed_issue['fields']['components']],
        'fix_priority': fix_priority,
        'create_date': create_date,
        'resolution': get_field_value(fixed_issue, 'resolution', 'name'),
        'resolution_date': resolution_date,
        'status': get_field_value(fixed_issue, 'status', 'name'),
        'status_date': status_date,
    }


def get_jira_fixed_issues(release_name, release_ids):
    release_cf = get_release_cf(release_name)

    release_keys_file_name = f'releases.{jira_env}/{release_name}.keys.json'
    release_raw_file_name = f'releases.{jira_env}/{release_name}.raw.json'

    if release_ids is not None and len(release_ids) > 0 and release_cf > 0:
        query = 'fixVersion in (%s) OR (project in ("LPE","LPS","LPD") AND cf[10210] = %s)' % (','.join(release_ids), release_cf)
    elif release_ids is not None and len(release_ids) > 0:
        query = 'fixVersion in (%s)' % ','.join(release_ids)
    elif release_cf > 0:
        query = f'project in ("LPE","LPS","LPD") AND cf[10210] = {release_cf}'
    elif not exists(release_keys_file_name):
        print(f'unrecognized release {release_name}')
        return {}

    release_issues = {}

    if exists(release_keys_file_name):
        if exists(release_raw_file_name):
            with open(release_raw_file_name, 'r') as f:
                return json.load(f)

        if not exists(release_keys_file_name):
            print(f'unrecognized release {release_name}')
            return {}

        with open(release_keys_file_name, 'r') as f:
            issue_keys = json.load(f)

        query = f'key in ({','.join(issue_keys)})'

        fixed_issues = get_issues(query, None, render=True)
    else:
        if exists(release_raw_file_name):
            with open(release_raw_file_name, 'r') as f:
                return json.load(f)

        fixed_issues = get_issues(query, None, render=True)

    if len(fixed_issues) == 0:
        print('No issues found with query %s' % query)
        return release_issues

    # Tickets with a security level (security vulnerabilities) are left out,
    # since this data is shared publicly

    for fixed_issue_key, fixed_issue in fixed_issues.items():
        if is_shareable_issue(fixed_issue):
            release_issues[fixed_issue_key] = fixed_issue

    with open(release_raw_file_name, 'w') as f:
        json.dump(release_issues, f, sort_keys=False, separators=(',', ':'))

    return release_issues

# Whether a ticket can be included in the publicly shared release notes, so
# that security vulnerabilities are never shared: LSV tickets are always left
# out (they do not have a security level), and tickets from other projects are
# only included if they do not have a security level

def is_shareable_issue(issue):
    if issue['fields']['project']['key'] == 'LSV':
        return False

    return issue['fields'].get('security') is None

def get_fixed_issues(release_name, release_ids):
    jira_fixed_issues = get_jira_fixed_issues(release_name, release_ids)

    return {
        issue_key: get_issue_compact(issue)
            for issue_key, issue in jira_fixed_issues.items()
                if is_shareable_issue(issue)
    }

def update_releases():
    project_releases = defaultdict(list)
    unsorted_releases = defaultdict(list)
    release_names = {}

    unsorted_releases.update({'6.1.%d-ga%d' % (i * 10, i): [] for i in range(1, 4)})
    unsorted_releases.update({'6.1.30-sp%d' % i: [] for i in range(1, 6)})

    unsorted_releases['6.2.10-ga1'] = []
    unsorted_releases.update({'6.2.10-sp%d' % i: [] for i in range(1, 21)})

    unsorted_releases['7.0.10-ga1'] = []
    unsorted_releases.update({'7.0.10-de%d' % i: [] for i in range(1, 103)})

    unsorted_releases['7.1.10-fp27'] = ['14827']
    unsorted_releases['7.1.10-fp28'] = ['14828']

    unsorted_releases['7.4.13-u102'] = ['16044', '16504']
    unsorted_releases['7.4.13-u103'] = ['16126', '16682']
    unsorted_releases['7.4.13-u104'] = ['16127', '16505']
    unsorted_releases['7.4.13-u105'] = ['16133']
    unsorted_releases['7.4.13-u106'] = ['16134', '16506']
    unsorted_releases['7.4.13-u107'] = ['16135']
    unsorted_releases['7.4.13-u108'] = ['16136', '16507']
    unsorted_releases['7.4.13-u109'] = ['16142', '16508']
    unsorted_releases['7.4.13-u110'] = ['16240', '16509']
    unsorted_releases['7.4.13-u111'] = ['16242', '16749']
    unsorted_releases['7.4.13-u112'] = ['16243']

    unsorted_releases['2024.q1.33'] = ['31779']
    unsorted_releases['2026.q3.10'] = ['31774']

    def add_release(project, release):
        name = release['name']
        short_name = None

        if ce_ga_74_pattern.match(name.strip()):
            release_num = int(ce_ga_74_pattern.match(name.strip()).group(1))
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

            if short_name[-4:] == '-cms':
                return False
            if short_name[-4:] == '-lts':
                short_name = short_name[:-4]
        elif name[:6] == '7.3.10' and name.find(' DXP U') != -1:
            release_num = int(name[name.rfind('U')+1:])
            short_name = '7.3.10-u%d' % release_num
        elif name == '7.3.10 DXP GA1':
            release_num = 0
            short_name = '7.3.10-ga1'
        elif name[:6] == '7.3.10' and name.find(' DXP FP') != -1:
            release_num = int(name[name.rfind('FP')+2:])
            short_name = '7.3.10-u%d' % release_num
        elif service_pack_pattern.match(name.strip()):
            line, service_pack = service_pack_pattern.match(name.strip()).groups()
            if int(service_pack) not in service_pack_fix_packs[line]:
                return False
            release_num = service_pack_fix_packs[line][int(service_pack)]
            short_name = '%s.10-%s%d' % (line, service_pack_release_types.get(line, 'fp'), release_num)
        elif name[:6] == '7.2.10' and name.find(' DXP FP') != -1:
            release_num = int(name[name.rfind('FP')+2:].strip())
            short_name = '7.2.10-fp%d' % release_num
        elif name == '7.2.10 DXP GA1':
            release_num = 0
            short_name = '7.2.10-ga1'
        elif name[:6] == '7.1.10' and name.find(' DXP FP') != -1:
            release_num = int(name[name.rfind('FP')+2:].strip())
            short_name = '7.1.10-fp%d' % release_num
        elif name == '7.1.10 DXP GA1':
            release_num = 0
            short_name = '7.1.10-ga1'
        elif name[:5] == '7.0.0' and name.find(' DXP FP') != -1:
            release_num = int(name[name.rfind('FP')+2:].strip())
            short_name = '7.0.10-de%d' % release_num
        elif name == '7.0.0 DXP GA1':
            release_num = 0
            short_name = '7.0.10-ga1'
        elif name == '6.1.30 EE GA3':
            release_num = 0
            short_name = '6.1.30-ga3'
        elif name == '6.1.20 EE GA2':
            release_num = 0
            short_name = '6.1.20-ga2'
        elif name == '6.1.10 EE GA1':
            release_num = 0
            short_name = '6.1.10-ga1'

        if short_name is None:
            return False

        if get_release_ulevel(short_name) is None:
            print(name)
            return False

        release_names[str(release['id'])] = release['name']
        project_releases[project].append(str(release['id']))
        unsorted_releases[short_name].append(str(release['id']))
        unsorted_releases[short_name] = sorted(unsorted_releases[short_name])
        return True

    for release in get_releases('LPS'):
        add_release('LPS', release)

    for release in get_releases('LPD'):
        add_release('LPD', release)

    for release in get_releases('LPE'):
        add_release('LPE', release)

    # add releases where we skipped the release step on Jira
    assert(add_release('LPS', {'name': '7.2.10 DXP FP 19', 'id': '15257'}))
    assert(add_release('LPS', {'name': '7.2.10 DXP FP20', 'id': '15188'}))
    assert(add_release('LPD', {'name': '2023.Q4.3', 'id': '16748'}))

    sorted_releases = OrderedDict(sorted(unsorted_releases.items(), key=lambda x: release_sort_key(x[0])))

    with open(f'releases.{jira_env}.json', 'w') as f:
        json.dump(sorted_releases, f, sort_keys=False, indent=2, separators=(',', ': '))

    with open(f'releases.{jira_env}.projects.json', 'w') as f:
        json.dump(project_releases, f, sort_keys=False, indent=2, separators=(',', ': '))

    save_release_names(sorted_releases, release_names)

# Saves the Jira name of each release ID in releases.json, so that releases.js
# can show its Jira query by fix version name. IDs that were not returned by
# get_releases (such as the hard-coded ones, which may not be marked as
# released) are looked up individually, reusing the names from the last run.

def save_release_names(sorted_releases, release_names):
    release_names_file_name = f'releases.{jira_env}.names.json'

    saved_release_names = {}

    if exists(release_names_file_name):
        with open(release_names_file_name, 'r') as f:
            saved_release_names = json.load(f)

    names = {}

    for release_ids in sorted_releases.values():
        for release_id in release_ids:
            if release_id in release_names:
                names[release_id] = release_names[release_id]
            elif release_id in saved_release_names:
                names[release_id] = saved_release_names[release_id]
            else:
                print(f'Looking up name of release {release_id}')

                r = await_get_request(f'{jira_base_url}/rest/api/3/version/{release_id}', {})

                if r.status_code == 200:
                    names[release_id] = r.json()['name']

    with open(release_names_file_name, 'w') as f:
        json.dump(dict(sorted(names.items(), key=lambda x: int(x[0]))), f, sort_keys=False, indent=2, separators=(',', ': '))

update_releases()

def pull_updates():
    with open(f'releases.{jira_env}.json', 'r') as f:
        releases = json.load(f)

    for release_name, release_ids in releases.items():
        if release_name.find('.q') != -1:
            continue

        print(f'Pulling {release_name} metadata')

        fixed_issues = get_fixed_issues(release_name, release_ids)

        ticket_summaries.update(fixed_issues)

        release_ulevel = get_release_ulevel(release_name)
        update_fixed_issues[release_ulevel] = set(fixed_issues.keys())

        release_file_name = f'releases.{jira_env}/{release_name}.json'

        if not exists(release_file_name):
            print(f'Writing {release_name} metadata')

            with open(release_file_name, 'w') as f:
                json.dump(fixed_issues, f, sort_keys=False, separators=(',', ':'))

def pull_quarterlies():
    with open(f'releases.{jira_env}.json', 'r') as f:
        releases = json.load(f)

    for release_name, release_ids in releases.items():
        if release_name.find('.q') == -1:
            continue

        release_file_name = f'releases.{jira_env}/{release_name}.json'

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

pull_updates()
pull_quarterlies()

def check_issue_changelog(issue_key):
    global raw_fix_versions

    releases_updates = set()

    changelog = get_issue_changelog(issue_key)
    changelog_items = sum([changelog_entry['items'] for changelog_entry in changelog if 'items' in changelog_entry], [])
    past_fix_versions = [field['name'].lower().strip() for field in raw_fix_versions[issue_key]] if issue_key in raw_fix_versions else []

    past_74_fix_versions = [item['toString'] for item in changelog_items if 'fieldId' in item and item['fieldId'] == 'customfield_10210']
    past_74_fix_versions = [version + '00' if version.find('.') != -1 and len(version) < 8 else version for version in past_74_fix_versions if len(version) == 8 or (version != '' and float(version) < 2000)]

    updates = set()
    quarterlies = set()

    for fix_version in past_74_fix_versions:
        if float(fix_version) < 2000:
            if fix_version.find('.') == -1:
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
                if fix_version in quarterly_fixed_issues and issue_key in quarterly_fixed_issues[fix_version]:
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
        print('Checking issue %d of %d (%s)' % (i + 1, len(post92_fixed_issues), issue_key))

        check_issue_changelog(issue_key)

    for i, issue_keys in update_fixed_issues.items():
        release_name = '7.4.13-u%d' % i if i > 0 else '7.4.13-ga1'
        release_file_name = f'releases.{jira_env}/{release_name}.json'
        if len(issue_keys) == 0:
            os.remove(release_file_name)
        else:
            with open(release_file_name, 'w') as f:
                json.dump({key: ticket_summaries[key] for key in sorted(issue_keys, key=ticket_sort_key)}, f)

    for release_name, issue_keys in quarterly_fixed_issues.items():
        release_file_name = f'releases.{jira_env}/{release_name}.json'
        if len(issue_keys) == 0:
            os.remove(release_file_name)
        else:
            with open(release_file_name, 'w') as f:
                json.dump({key: ticket_summaries[key] for key in sorted(issue_keys, key=ticket_sort_key)}, f)

    with open(f'releases.{jira_env}.json', 'w') as f:
        json.dump(releases, f, sort_keys=False, indent=2, separators=(',', ': '))

check_changelogs()

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

save_fix_versions()

# Combines every release's metadata into a single newline-delimited JSON file,
# so that releases.js can load all releases at once (for example, when the page
# and its data files are inlined for hosting on Google Drive) instead of
# fetching each one separately. Since many tickets are fixed in several
# releases, each ticket is stored once, as a {"key": ..., "ticket": ...} line,
# followed by one {"name": ..., "keys": [...]} line per release listing its
# ticket keys in order. A ticket's key is stored separately from the ticket
# because moved tickets keep their old key in the release files. If copies of a
# ticket differ between releases, the copy from the last release is kept, and
# the release files with older copies are rewritten to use it.

def save_releases_ndjson():
    with open(f'releases.{jira_env}.json', 'r') as f:
        releases = json.load(f)

    tickets = {}
    release_keys = {}

    for release_name in releases.keys():
        release_file_name = f'releases.{jira_env}/{release_name}.json'

        if not exists(release_file_name):
            continue

        with open(release_file_name, 'r') as f:
            release_tickets = json.load(f)

        tickets.update(release_tickets)
        release_keys[release_name] = list(release_tickets.keys())

    # Second pass: rewrite the release files from earlier pulls that still
    # have outdated copies of a ticket, so that they match the ndjson file

    for release_name in release_keys.keys():
        release_file_name = f'releases.{jira_env}/{release_name}.json'

        with open(release_file_name, 'r') as f:
            release_tickets = json.load(f)

        updated_tickets = {key: tickets[key] for key in release_tickets.keys()}

        if updated_tickets != release_tickets:
            print(f'Updating outdated tickets in {release_name} metadata')

            with open(release_file_name, 'w') as f:
                json.dump(updated_tickets, f, sort_keys=False, separators=(',', ':'))

    with open(f'releases.{jira_env}.ndjson', 'w') as out:
        for key in sorted(tickets.keys(), key=ticket_sort_key):
            out.write(json.dumps({'key': key, 'ticket': tickets[key]}, separators=(',', ':')))
            out.write('\n')

        for release_name, keys in release_keys.items():
            out.write(json.dumps({'name': release_name, 'keys': keys}, separators=(',', ':')))
            out.write('\n')

save_releases_ndjson()
