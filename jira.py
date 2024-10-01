from base64 import b64encode
import inspect
import json
from os.path import abspath, dirname, exists
import requests
import sys
import time

import git

jira_username = git.config('jira.session-username')
jira_password = git.config('jira.session-password')

jira_env = 'production'
jira_base_url = 'https://liferay.atlassian.net'

# jira_env = 'sandbox'
# jira_base_url = 'https://liferay-sandbox-822.atlassian.net'

def get_jira_auth():
    return {
        'Authorization': 'Basic %s' % b64encode(f'{jira_username}:{jira_password}'.encode('utf-8')).decode('ascii')
    }

def await_get_request(url, payload):
    print(url, payload)
    return await_response(lambda: requests.get(url, params=payload, headers=get_jira_auth()))

def await_put_request(url, payload):
    print(url, payload)
    return await_response(lambda: requests.put(url, json=payload, headers=get_jira_auth()))

def await_response(response_generator):
    r = response_generator()

    while r.status_code == 429:
        print(r.headers)

        retry_after = int(r.headers['Retry-After'])
        print('Retrying in %d seconds...' % retry_after)
        time.sleep(retry_after + 1)

        r = response_generator()

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

    if fields is not None:
        if len(fields) > 0:
            payload['fields'] = ','.join(fields)
        else:
            payload['fields'] = 'issuekey'

    if len(expand) > 0:
        payload['expand'] = ','.join(expand)

    search_url = f'{jira_base_url}/rest/api/2/search'

    r = await_get_request(search_url, payload)

    issues = {}

    if r.status_code != 200:
        return issues

    response_json = r.json()

    for issue in response_json['issues']:
        issues[issue['key']] = issue

    while start_at + len(response_json['issues']) < response_json['total']:
        start_at += len(response_json['issues'])
        payload['startAt'] = start_at

        r = await_get_request(search_url, payload)

        if r.status_code != 200:
            return issues

        response_json = r.json()

        for issue in response_json['issues']:
            issues[issue['key']] = issue

    return issues

def get_issue_changelog(issue_key, last_updated=None):
    issue_changelog_file_name = f'releases.{jira_env}.changelog/{issue_key}.json'

    if exists(issue_changelog_file_name):
        with open(issue_changelog_file_name, 'r') as f:
            changelog = json.load(f)

        if last_updated is None:
            return changelog

        if len(changelog) > 0 and last_updated <= changelog[-1]['created']:
            return changelog

    start_at = 0

    search_url = f'{jira_base_url}/rest/api/2/issue/{issue_key}/changelog'

    payload = {
        'startAt': start_at,
        'maxResults': 100
    }

    r = await_get_request(search_url, payload)

    if r.status_code != 200:
        visited_changelogs[issue_key] = []
        return []

    response_json = r.json()

    changelog = []
    changelog.extend(response_json['values'])

    while start_at + len(response_json['values']) < response_json['total']:
        start_at += len(response_json['values'])
        payload['startAt'] = start_at

        r = await_get_request(search_url, payload)

        if r.status_code != 200:
            return changelog

        response_json = r.json()
        changelog.extend(response_json['values'])

    with open(issue_changelog_file_name, 'w') as f:
        json.dump(changelog, f, sort_keys=False, separators=(',', ':'))

    return changelog

def get_issue_fields(issue_key, fields=[]):
    search_url = f'{jira_base_url}/rest/api/2/issue/{issue_key}'

    payload = {
        'fields': ','.join(fields)
    }

    r = await_get_request(search_url, payload)

    if r.status_code != 200:
        return {}

    return r.json()['fields']

def get_releases(project):
    start_at = 0

    search_url = f'{jira_base_url}/rest/api/3/project/{project}/version'

    payload = {
        'startAt': start_at,
        'maxResults': 100
    }

    r = await_get_request(search_url, payload)

    releases = []

    if r.status_code != 200:
        return releases

    response_json = r.json()

    releases.extend(response_json['values'])

    while start_at + len(response_json['values']) < response_json['total']:
        start_at += len(response_json['values'])
        payload['startAt'] = start_at

        r = await_get_request(search_url, payload)

        if r.status_code != 200:
            return releases

        response_json = r.json()
        releases.extend(response_json['values'])

    return releases