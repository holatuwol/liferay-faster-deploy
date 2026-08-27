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

def get_issues_by_key(file_name, issue_keys, target_tz):
    file_path = f'security_issue_export/{file_name}.json'
    if exists(file_path):
        with open(file_path, 'rt') as f:
            old_issues = json.loads(f.read())
            max_updated = datetime.fromisoformat(max([x['updated'] for x in old_issues.values() if 'updated' in x])).astimezone(target_tz).strftime("%Y-%m-%d %H:%M")
            common_jql = f'and updated > {max_updated} order by key'
    else:
        old_issues = {}
        common_jql = 'order by key'

    issues = {} | old_issues

    for i in range(0, len(issue_keys), 100):
        issue_keys_batch = issue_keys[i:i+100]
        new_issues = { issue_key : issue_response['fields'] for issue_key, issue_response in get_issues(f'key in ({','.join(issue_keys_batch)}) {common_jql}', issue_fields, [], False).items() }
        issues = issues | new_issues

    with open(file_path, 'wb') as f:
        f.write(json.dumps(issues))

def export_jira_issues():
    r = await_get_request(f"{jira_base_url}/rest/api/3/myself", {})

    if r.status_code != 200:
        return {}

    response_json = r.json()
    target_tz = zoneinfo.ZoneInfo(response_json['timeZone'])

    common_jql = f'and level is not empty and status = Closed and Resolution not in (Discarded, Duplicate, "Won\'t Fix") and updated < "{datetime.now().astimezone(target_tz).strftime("%Y-%m-%d %H:%M")}"'

    jqls = {
        'LPS': f'project = LPS and component = "Security Vulnerability" {common_jql}',
        'LPD': f'project = LPD and "Cross Cutting Properties" = "Security Vulnerability" {common_jql}', 
    }

    lpe_issue_keys = []
    lsv_issue_keys = []

    for file_name, jql in jqls.items():
        file_path = f'security_issue_export/{file_name}.json'
        if exists(file_path):
            with open(file_path, 'rt') as f:
                old_issues = json.loads(f.read())

            if len(old_issues) > 0:
                max_updated = datetime.fromisoformat(max([x['updated'] for x in old_issues.values() if 'updated' in x])).astimezone(target_tz).strftime("%Y-%m-%d %H:%M")
                jql = f'{jql} and updated > "{max_updated}"'
        else:
            old_issues = {}

        new_issues = { issue_key: issue_response['fields'] for issue_key, issue_response in get_issues(f'{jql} order by key', issue_fields, [], False).items() }

        issues = old_issues | new_issues

        with open(file_path, 'wb') as f:
            f.write(json.dumps(issues))

        for key, issue in issues.items():
            for issue_link in issue['issuelinks']:
                if 'inwardIssue' in issue_link:
                    issue_link_key = issue_link['inwardIssue']['key']
                    if issue_link_key[:3] == 'LPE':
                        lpe_issue_keys.append(issue_link_key)
                    elif issue_link_key[:3] == 'LSV':
                        lsv_issue_keys.append(issue_link_key)
                if 'outwardIssue' in issue_link:
                    issue_link_key = issue_link['outwardIssue']['key']
                    if issue_link_key[:3] == 'LPE':
                        lpe_issue_keys.append(issue_link_key)
                    elif issue_link_key[:3] == 'LSV':
                        lsv_issue_keys.append(issue_link_key)

    get_issues_by_key('LPE', lpe_issue_keys, target_tz)
    get_issues_by_key('LSV', lsv_issue_keys, target_tz)

export_jira_issues()