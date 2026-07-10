from base64 import b64encode
import inspect
import json
from os.path import abspath, dirname, exists
import requests
from requests.auth import HTTPBasicAuth
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
    return (jira_username, jira_password)

def await_get_request(url, payload):
    print(url, payload)
    return await_response(lambda: requests.get(url, params=payload, auth=get_jira_auth()))

def await_put_request(url, payload):
    print(url, payload)
    return await_response(lambda: requests.put(url, json=payload, auth=get_jira_auth()))

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
        'maxResults': 100
    }

    if fields is not None:
        if len(fields) > 0:
            payload['fields'] = ','.join(fields)
        else:
            payload['fields'] = 'issuekey'
    else:
        payload['fields'] = '*all'

    if len(expand) > 0:
        payload['expand'] = ','.join(expand)

    search_url = f'{jira_base_url}/rest/api/3/search/jql'

    r = await_get_request(search_url, payload)

    issues = {}

    if r.status_code != 200:
        return issues

    response_json = r.json()

    for issue in response_json['issues']:
        issues[issue['key']] = issue

    while not response_json['isLast']:
        payload['nextPageToken'] = response_json['nextPageToken']

        r = await_get_request(search_url, payload)

        if r.status_code != 200:
            return issues

        response_json = r.json()

        for issue in response_json['issues']:
            issues[issue['key']] = issue

    return issues

def get_issue_changelog(issue_key, last_updated=None):
    if issue_key.find('CVE') == 0:
        return []

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

def get_issue_fields(issue_key, fields=None, render=False):
    search_url = f'{jira_base_url}/rest/api/2/issue/{issue_key}'

    payload = {}

    if fields is not None:
        payload['fields'] = ','.join(fields)
    
    if render:
        payload['expand'] = 'renderedFields'

    r = await_get_request(search_url, payload)

    if r.status_code != 200:
        return {}

    response_json = r.json()
    
    if render:
        return response_json['renderedFields']
    else:
        return response_json['fields']

def get_releases(project):
    start_at = 0

    search_url = f'{jira_base_url}/rest/api/3/project/{project}/version'

    payload = {
        'startAt': start_at,
        'maxResults': 100,
        'status': 'released',
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

if __name__ == '__main__':
    print(get_issue_changelog('TOPIN-108'))