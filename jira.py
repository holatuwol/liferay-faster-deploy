from base64 import b64encode
import inspect
from os.path import abspath, dirname
import requests
import sys
import time

import git

jira_base_url = 'https://liferay.atlassian.net'

jira_username = git.config('jira.session-username')
jira_password = git.config('jira.session-password')

def get_jira_auth():
    return {
        'Authorization': 'Basic %s' % b64encode(f'{jira_username}:{jira_password}'.encode('utf-8')).decode('ascii')
    }

def get_issues(jql, fields=[], expand=[], render=False):
    start_at = 0

    if render:
        expand = expand + ['renderedFields']

    payload = {
        'jql': jql,
        'startAt': start_at,
        'maxResults': 1000
    }

    if len(fields) > 0:
        payload['fields'] = ','.join(fields)
    else:
        payload['fields'] = 'issuekey'

    if len(expand) > 0:
        payload['expand'] = ','.join(expand)

    search_url = f'{jira_base_url}/rest/api/2/search'

    r = requests.get(search_url, headers=get_jira_auth(), params=payload)

    issues = {}

    while r.status_code == 429:
        print(r.headers)

        retry_after = int(r.headers['Retry-After'])
        print('Retrying in %d seconds...' % retry_after)
        time.sleep(retry_after + 1)

        r = requests.get(search_url, headers=get_jira_auth(), params=payload)

    if r.status_code != 200:
        return issues

    response_json = r.json()

    for issue in response_json['issues']:
        issues[issue['key']] = issue

    while start_at + len(response_json['issues']) < response_json['total']:
        start_at += len(response_json['issues'])
        payload['startAt'] = start_at

        r = requests.get(search_url, headers=get_jira_auth(), params=payload)

        if r.status_code != 200:
            return issues

        response_json = r.json()

        for issue in response_json['issues']:
            issues[issue['key']] = issue

    return issues
