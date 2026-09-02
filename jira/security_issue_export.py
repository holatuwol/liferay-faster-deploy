from datetime import datetime
import inspect
import orjson as json
from os.path import abspath, dirname, exists
import sys
import zoneinfo

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_get_request, get_issues, jira_base_url
issue_fields = ['key', 'issuelinks', 'versions', 'fixVersions', 'customfield_10563', 'customfield_10886', 'customfield_10786', 'priority', 'labels', 'updated']

def get_issue_updated(issue, target_tz):
    if 'issueKey' not in issue:
        print(issue)
        return None

    issue_key = issue['issueKey']
    issue_file = f'security_issue_export/{issue_key}.json'

    if not exists(issue_file):
        return None

    with open(issue_file, 'r', encoding='utf-8') as f:
        cached_issue = json.load(f)

    if 'updated' not in cached_issue:
        return None

    jira_timestamp = cached_issue['updated']
    fixed_timestamp = jira_timestamp[:-2] + ":" + jira_timestamp[-2:]

    dt_source = datetime.fromisoformat(fixed_timestamp)
    dt_target = dt_source.astimezone(target_tz)

    return dt_target.strftime("%Y-%m-%d %H:%M")

def get_issues_by_key(file_name, issue_keys, target_date, target_tz):
    file_path = f'security_issue_export/{file_name}.json'

    if exists(file_path):
        with open(file_path, 'rt') as f:
            old_issues = json.loads(f.read())
            max_updated = datetime.fromisoformat(max([x['updated'] for x in old_issues.values() if 'updated' in x])).astimezone(target_tz).strftime("%Y-%m-%d %H:%M")
            common_jql = f'and updated > "{max_updated}"'
    else:
        old_issues = {}
        common_jql = ''

    common_jql = f'{common_jql} and updated < "{target_date.astimezone(target_tz).strftime("%Y-%m-%d %H:%M")}" order by key'

    issues = {} | old_issues

    for i in range(0, len(issue_keys), 100):
        issue_keys_batch = issue_keys[i:i+100]
        new_issues = { issue_key : issue_response['fields'] for issue_key, issue_response in get_issues(f'key in ({','.join(issue_keys_batch)}) {common_jql}', issue_fields, [], False).items() }
        issues = issues | new_issues

    with open(file_path, 'wb') as f:
        f.write(json.dumps(issues))

    return issues

def process_issue_links(issues, issue_link_keys):
    for issue in issues.values():
        for issue_link in issue['issuelinks']:
            if 'inwardIssue' in issue_link:
                issue_link_key = issue_link['inwardIssue']['key']
                project = issue_link_key[:issue_link_key.find('-')]
                if project in issue_link_keys:
                    issue_link_keys[project].append(issue_link_key)
            if 'outwardIssue' in issue_link:
                issue_link_key = issue_link['outwardIssue']['key']
                project = issue_link_key[:issue_link_key.find('-')]
                if project in issue_link_keys:
                    issue_link_keys[project].append(issue_link_key)

def export_jira_issues(target_date, target_tz):
    common_jql = ' and '.join([
        'level is not empty',
        'status = Closed',
        'Resolution not in (Discarded, Duplicate, "Won\'t Fix")',
        f'updated < "{target_date.astimezone(target_tz).strftime("%Y-%m-%d %H:%M")}"'])

    other_keys = {
        'COMMERCE': ['COMMERCE-1165'],
        'LPS': ['LPS-117307', 'LPS-138398', 'LPS-140907', 'LPS-159040', 'LPS-175631', 'LPS-203552'],
        'LPSA': ['LPSA-38892', 'LPSA-56431'],
        'LPD': ['LPD-11235', 'LPD-22045', 'LPD-26723', 'LPD-55827'],
    }

    jqls = {
        'COMMERCE': f'project = COMMERCE and component = "Security Vulnerability" and {common_jql}',
        'LPS': f'project = LPS and component = "Security Vulnerability" and {common_jql}',
        'LPSA': f'project = LPSA and component = "Security Vulnerability" and {common_jql}',
        'LPD': f'project = LPD and "Cross Cutting Properties" = "Security Vulnerability" and {common_jql}', 
    }

    issue_link_keys = {'LPE': [], 'LSV': []}

    for file_name, jql in jqls.items():
        file_path = f'security_issue_export/{file_name}.json'

        jql_issues = { issue_key: issue_response['fields'] for issue_key, issue_response in get_issues(f'({jql}) order by key', issue_fields, [], False).items() }

        missing_issues = {}

        if file_name in other_keys:
            missing_issues = { issue_key: issue_response['fields'] for issue_key, issue_response in get_issues(f'key in ({','.join(other_keys[file_name])}) order by key', issue_fields, [], False).items() }

        issues = jql_issues | missing_issues

        with open(file_path, 'wb') as f:
            f.write(json.dumps(issues))

        process_issue_links(issues, issue_link_keys)

    get_issues_by_key('LPE', issue_link_keys['LPE'], target_date, target_tz)
    get_issues_by_key('LSV', issue_link_keys['LSV'], target_date, target_tz)

def check_missing_lsvs(target_date, target_tz):
    with open('security_issue_export/LSV.json', 'rt') as f:
        linked_lsvs = json.loads(f.read())

    common_jql = ' and '.join([
        'project = LSV',
        '("Issue Classification" is empty or "Issue Classification" not in ("False Positive", "Ignored", "Not Exploitable", "Won\'t Do"))',
        'status = Closed',
        'Resolution not in (Discarded, Duplicate, "Not a Bug", "Won\'t Fix")',
        f'updated < "{target_date.astimezone(target_tz).strftime("%Y-%m-%d %H:%M")}"'
    ])

    lsvs_with_cves = get_issues(f'{common_jql} and ("CVE IDs[Short text]" ~ "CVE-*")', issue_fields, [], False)

    missing_lsvs_with_cves = [x for x in lsvs_with_cves.keys() if x not in linked_lsvs]
    print(len(missing_lsvs_with_cves), 'issues:', missing_lsvs_with_cves)

    lsvs_without_cves = get_issues(f'{common_jql} and ("CVE IDs[Short text]" !~ "CVE-*" or "CVE IDs[Short text]" is empty) and (summary ~ "CVE-*" or description ~ "CVE-*" or comment ~ "CVE-*")')

    missing_lsvs_without_cves = [x for x in lsvs_without_cves.keys() if x not in linked_lsvs]
    print(len(missing_lsvs_without_cves), 'issues:', missing_lsvs_without_cves)

r = await_get_request(f"{jira_base_url}/rest/api/3/myself", {})

assert(r.status_code == 200)

response_json = r.json()
target_tz = zoneinfo.ZoneInfo(response_json['timeZone'])

target_date = datetime.now()

export_jira_issues(target_date, target_tz)
check_missing_lsvs(target_date, target_tz)