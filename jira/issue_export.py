from bs4 import BeautifulSoup
from datetime import datetime
import gzip
import inspect
import json
from os import makedirs, remove
from os.path import abspath, dirname, exists
import sys
import zoneinfo

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_get_request, get_issue_fields, get_issues, jira_base_url

def extract_comment(comment_json):
    comment = {
        'author': comment_json['author']['displayName'] if 'author' in comment_json and comment_json['author'] is not None else 'Anonymous',
        'createdDate': comment_json['created']['epochMillis'],
        'public': comment_json['public'],
    }

    comment_html = comment_json['renderedBody']['html']

    soup = BeautifulSoup(comment_html, 'html.parser')

    for img in soup.find_all("img"):
        if img['src'][0] == '/':
            img['src'] = jira_base_url + img['src']

    comment['body'] = str(soup)

    return comment

def get_string_value(obj):
    if not isinstance(obj, dict):
        return obj

    if 'child' in obj:
        return ((obj['value'] + ' - ') if 'value' in obj else '') + get_string_value(obj['child'])
    if 'value' in obj:
        return obj['value']
    if 'name' in obj:
        return obj['name']

    print(obj)
    assert(False)

def get_servicedesk_issue(issue_key, issue_fields):
    issue_file = f"issue_export/{issue_key}.json"

    issue = {}
    requires_update = True

    if exists(issue_file):
        with open(issue_file, 'r', encoding='utf-8') as f:
            issue = json.load(f)

        if 'updated' not in issue:
            print(f"{issue_key} requires update due to not having an updated field")
        elif issue['updated'] != issue_fields['updated']:
            print(f"{issue_key} requires update due to {issue['updated']} != {issue_fields['updated']}")
        else:
            requires_update = False
    else:
        print(f"{issue_key} requires update due to having no cache file {issue_file}")
        requires_update = True

    if requires_update:
        r = await_get_request(f"{jira_base_url}/rest/servicedeskapi/request/{issue_key}", {})

        if r.status_code != 200:
            print(f"Unable to retrieve issue {issue_key}")
            return None

        response_json = r.json()

        issue.update({
            'issueKey': response_json['issueKey'],
            'reporter': response_json['reporter']['displayName'] if 'reporter' in response_json and response_json['reporter'] is not None else 'Anonymous',
            'summary': response_json['summary'],
            'createdDate': response_json['createdDate']['epochMillis'],
            'status': response_json['currentStatus']['status'],
            'statusDate': response_json['currentStatus']['statusDate']['epochMillis'],
            'updated': issue_fields['updated'],
        })

    if requires_update:
        payload = {
            'start': 0,
            'orderBy': 'created',
            'expand': 'renderedBody',
        }

        comments = []

        issue['comments'] = comments

        r = await_get_request(f"{jira_base_url}/rest/servicedeskapi/request/{issue_key}/comment", payload)

        if r.status_code != 200:
            return issue

        response_json = r.json()

        comments.extend([extract_comment(x) for x in response_json['values']])

        while not response_json['isLastPage']:
            payload['start'] = response_json['start'] + response_json['size']

            r = await_get_request(f"{jira_base_url}/rest/servicedeskapi/request/{issue_key}/comment", payload)

            if r.status_code != 200:
                return comments

            response_json = r.json()

            comments.extend([extract_comment(x) for x in response_json['values']])
    else:
        comments = issue['comments']

    requires_fields = False

    if len(comments) > 0 and issue['createdDate'] != comments[0]['createdDate']:
        print(f"{issue_key} requires update due to the description not being saved as the first comment ({issue['createdDate']} vs. {issue['comments'][0]['createdDate']})")
        requires_fields = True

    extra_fields = {
        'accountCode': 'customfield_12570',
        'priority': 'priority',
    }

    optional_extra_fields = {
        'longTermResolution': 'customfield_12561',
        'crTime': 'customfield_14750',
        'irTime': 'customfield_14749',
        'heatScore': 'customfield_10168',
    }

    for extra_field in extra_fields.keys():
        if extra_field not in issue or issue[extra_field] is None:
            print(f"{issue_key} requires update due to missing or empty field {extra_field}")
            requires_fields = True

    if requires_fields:
        issue_fields = get_issue_fields(issue_key, ['description', *extra_fields.values(), *optional_extra_fields.values()], True)

        for localKey, jiraKey in [*extra_fields.items(), *optional_extra_fields.items()]:
            issue[localKey] = get_string_value(issue_fields[jiraKey])

        if len(comments) == 0 or issue['createdDate'] != comments[0]['createdDate']:
            comments.insert(0, {
                'author': issue['reporter'],
                'createdDate': issue['createdDate'],
                'body': issue_fields['description'],
                'public': len([x for x in comments if x['public']]) > 0,
            })

    with open(issue_file, 'w', encoding='utf-8') as f:
        json.dump(issue, f)

    return issue

def get_exported_service_desk_issue(issue, exclude_fields):
    if issue is None:
        return None

    for exclude_field in exclude_fields:
        if exclude_field in issue:
            del issue[exclude_field]
    
    if 'public' in exclude_fields:
        issue['comments'] = [x for x in issue['comments'] if x['public']]

        if len(issue['comments']) == 0:
            return None

        for comment in issue['comments']:
            del comment['public']
    
    return issue
    
def get_issue_updated(issue, target_tz):
    if 'issueKey' not in issue:
        print(issue)
        return None

    issue_key = issue['issueKey']
    issue_file = f'issue_export/{issue_key}.json'

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

def export_service_desk_issues(jql, cache_file, exclude_fields):
    r = await_get_request(f"{jira_base_url}/rest/api/3/myself", {})

    if r.status_code != 200:
        return {}

    response_json = r.json()
    target_tz = zoneinfo.ZoneInfo(response_json['timeZone'])

    jql = f"{jql} and updated < '{datetime.now().astimezone(target_tz).strftime("%Y-%m-%d %H:%M")}'"

    if jql.find('order by') == -1:
        jql = f"{jql} order by created asc"

    issues = { issue_key: issue_response['fields'] for issue_key, issue_response in get_issues(jql, ['key', 'updated'], [], False).items() }

    servicedesk_issues = [
        get_exported_service_desk_issue(get_servicedesk_issue(issue_key, issue_fields), exclude_fields)
            for issue_key, issue_fields in issues.items()
    ]

    servicedesk_issues = sorted([x for x in servicedesk_issues if x is not None], key=lambda x: x['issueKey'])

    if cache_file is None:
        print(json.dumps(servicedesk_issues))
    else:
        if exists(cache_file):
            remove(cache_file)

        with gzip.open(f"{cache_file}.gz", 'wt', encoding='utf-8') as f:
            json.dump(servicedesk_issues, f)

if __name__ == '__main__':
    makedirs('custom_export', exist_ok=True)
    export_service_desk_issues(sys.argv[2], f"custom_export/{sys.argv[1]}.json", ['updated'])