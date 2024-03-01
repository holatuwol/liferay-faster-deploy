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

def await_request(url, payload):
    r = requests.get(url, headers=get_jira_auth(), params=payload)

    while r.status_code == 429:
        print(r.headers)

        retry_after = int(r.headers['Retry-After'])
        print('Retrying in %d seconds...' % retry_after)
        time.sleep(retry_after + 1)

        r = requests.get(url, headers=get_jira_auth(), params=payload)

    return r

def get_issues(jql, fields=[], expand=[], render=False):
    start_at = 0

    if render:
        expand = expand + ['renderedFields']

    payload = {
        'jql': jql,
        'startAt': start_at,
        'maxResults': 100
    }

    if len(fields) > 0:
        payload['fields'] = ','.join(fields)
    else:
        payload['fields'] = 'issuekey'

    if len(expand) > 0:
        payload['expand'] = ','.join(expand)

    search_url = f'{jira_base_url}/rest/api/2/search'

    r = await_request(search_url, payload)

    issues = {}

    if r.status_code != 200:
        return issues

    response_json = r.json()

    for issue in response_json['issues']:
        issues[issue['key']] = issue

    while start_at + len(response_json['issues']) < response_json['total']:
        start_at += len(response_json['issues'])
        payload['startAt'] = start_at

        r = await_request(search_url, payload)

        if r.status_code != 200:
            return issues

        response_json = r.json()

        for issue in response_json['issues']:
            issues[issue['key']] = issue

    return issues

def get_issue_changelog(issue_key):
    start_at = 0

    search_url = f'{jira_base_url}/rest/api/2/issue/{issue_key}/changelog'

    payload = {
        'startAt': start_at,
        'maxResults': 100
    }

    r = await_request(search_url, payload)

    changelog = []

    if r.status_code != 200:
        return changelog

    response_json = r.json()

    changelog.extend(response_json['values'])

    while start_at + len(response_json['values']) < response_json['total']:
        start_at += len(response_json['values'])
        payload['startAt'] = start_at

        r = await_request(search_url, payload)

        if r.status_code != 200:
            return changelog

        response_json = r.json()
        changelog.extend(response_json['values'])

    return changelog

def get_issue_fields(issue_key, fields=[]):
    search_url = f'{jira_base_url}/rest/api/2/issue/{issue_key}'

    payload = {
        'fields': ','.join(fields)
    }

    r = await_request(search_url, payload)

    if r.status_code != 200:
        return {}

    return r.json()['fields']
