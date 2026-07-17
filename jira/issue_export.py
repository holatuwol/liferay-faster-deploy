from bs4 import BeautifulSoup
import inspect
import json
from os.path import abspath, dirname, exists
import sys

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

def get_servicedesk_issue(issue_key, issue_fields):
    issue_file = f"issue_export/{issue_key}.json"

    issue = None
    requires_fields = False
    requires_update = True

    if exists(issue_file):
        with open(issue_file, 'r', encoding='utf8') as f:
            issue = json.load(f)

        if 'updated' not in issue:        
            print(f"{issue_key} requires update due to not having an updated field")
        elif issue['updated'] != issue_fields['updated']:
            print(f"{issue_key} requires update due to {issue['updated']} != {issue_fields['updated']}")
        else:
            requires_update = False
        
        if len(issue['comments']) > 0 and issue['createdDate'] != issue['comments'][0]['createdDate']:
            print(f"{issue_key} requires update due to the description not being saved as the first comment")
            requires_fields = True
        
        for extra_field in ['accountCode']:
            if extra_field not in issue:
                print(f"{issue_key} requires update due to missing field {extra_field}")
                requires_fields = True
    else:
        print(f"{issue_key} requires update due to having no cache file {issue_file}")
        requires_fields = True

    if issue is None or requires_update:
        r = await_get_request(f"{jira_base_url}/rest/servicedeskapi/request/{issue_key}", {})

        if r.status_code != 200:
            return {}

        response_json = r.json()

        issue = {
            'issueKey': response_json['issueKey'],
            'reporter': response_json['reporter']['displayName'] if 'reporter' in response_json and response_json['reporter'] is not None else 'Anonymous',
            'summary': response_json['summary'],
            'createdDate': response_json['createdDate']['epochMillis'],
            'status': response_json['currentStatus']['status'],
            'statusDate': response_json['currentStatus']['statusDate']['epochMillis'],
            'updated': issue_fields['updated'],
        }

    if requires_update:
        payload = {
            'start': 0,
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

    if requires_fields:
        issue_fields = get_issue_fields(issue_key, ['description', 'customfield_12570'], True)

        issue['accountCode'] = issue_fields['customfield_12570']

        if issue['createdDate'] != comments[0]['createdDate']:
            comments.insert(0, {
                'author': issue['reporter'],
                'createdDate': issue['createdDate'],
                'body': issue_fields['description'],
                'public': len([x for x in comments if x['public']]) > 0,
            })

    with open(issue_file, 'w', encoding='utf8') as f:
        json.dump(issue, f)

    return issue

def get_exported_service_desk_issue(issue, exclude_fields):
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
    

def export_service_desk_issues(jql, cache_file, exclude_fields):
    issues = { issue_key: issue_response['fields'] for issue_key, issue_response in get_issues(jql, ['key', 'updated'], [], False).items() }

    servicedesk_issues = [
        get_exported_service_desk_issue(get_servicedesk_issue(issue_key, issue_fields), exclude_fields)
            for issue_key, issue_fields in issues.items()
    ]

    servicedesk_issues = [x for x in servicedesk_issues if x is not None]

    if cache_file is None:
        print(json.dumps(servicedesk_issues))
    else:
        with open(cache_file, 'w', encoding='utf8') as f:
            json.dump(servicedesk_issues, f)