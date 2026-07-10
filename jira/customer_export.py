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
    }

    comment_html = comment_json['renderedBody']['html']

    soup = BeautifulSoup(comment_html, 'html.parser')

    for img in soup.find_all("img"):
        if img['src'][0] == '/':
            img['src'] = jira_base_url + img['src']

    comment['body'] = str(soup)

    return comment

def get_servicedesk_issue(issue_key, issue_fields):
    issue_file = f"customer_export/{issue_key}.json"

    if exists(issue_file):
        with open(issue_file, 'r', encoding='utf8') as f:
            issue = json.load(f)

        if 'updated' in issue and issue['updated'] == issue_fields['updated']:
            return issue

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

    comments.extend([extract_comment(x) for x in response_json['values'] if x['public']])

    while not response_json['isLastPage']:
        payload['start'] = response_json['start'] + response_json['size']

        r = await_get_request(f"{jira_base_url}/rest/servicedeskapi/request/{issue_key}/comment", payload)

        if r.status_code != 200:
            return comments

        response_json = r.json()

        comments.extend([extract_comment(x) for x in response_json['values'] if x['public']])
    
    with open(issue_file, 'w', encoding='utf8') as f:
        json.dump(issue, f)

    if len(comments) == 0:
        return issue

    if issue['createdDate'] != comments[0]['createdDate']:
        comments.insert(0, {
            'author': issue['reporter'],
            'createdDate': issue['createdDate'],
            'body': get_issue_fields(issue_key, ['description'], True)['description'],
        })

    return issue

assert(len(sys.argv) == 2 and len(sys.argv) > 0)

account_key = sys.argv[1]

if account_key[:5] == 'LRHC-':
    issues = { account_key: None }
else:
    issues = { issue_key: issue_response['fields'] for issue_key, issue_response in get_issues(f"project = 'LRHC' and (cf[12570] ~ '{account_key}' or cf[10163] ~ '{account_key}') order by created desc", ['key', 'updated'], [], False).items() }

servicedesk_issues = [get_servicedesk_issue(issue_key, issue_fields) for issue_key, issue_fields in issues.items()]

public_servicedesk_issues = [issue for issue in servicedesk_issues if len(issue['comments']) > 0]

if account_key[:5] == 'LRHC-':
    print(json.dumps(public_servicedesk_issues))
else:
    with open(f"customer_export/{account_key}.json", 'w', encoding='utf8') as f:
        json.dump(public_servicedesk_issues, f)