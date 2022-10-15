import inspect
from os.path import abspath, dirname
import requests
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

import git

jira_base_url = 'https://issues.liferay.com'

jira_username = git.config('jira.session-username')
jira_password = git.config('jira.session-password')

if jira_username == '':
    jira_username = None

if jira_password == '':
    jira_password = None

def get_jira_cookie():
    jira_cookie = None

    jira_cookie_name = None
    jira_cookie_value = None

    try:
        jira_cookie_name = git.config('jira.session-cookie-name')
        jira_cookie_value = git.config('jira.session-cookie-value')
    except:
        pass

    if jira_cookie_name == '':
        jira_cookie_name = None

    if jira_cookie_value == '':
        jira_cookie_value = None

    if jira_cookie_name is not None and jira_cookie_value is not None:
        jira_cookie = {
            jira_cookie_name: jira_cookie_value
        }

        r = requests.get(jira_base_url + '/rest/auth/1/session', cookies=jira_cookie)

        if r.status_code != 200:
            jira_cookie = None

    if jira_cookie is not None:
        return jira_cookie

    if jira_username is None or jira_password is None:
        return None

    post_json = {
        'username': jira_username,
        'password': jira_password
    }

    r = requests.post(jira_base_url + '/rest/auth/1/session', json=post_json)

    if r.status_code != 200:
        print('Invalid login')

        return None

    jira_cookie_name = 'JSESSIONID'
    jira_cookie_value = r.cookies[jira_cookie_name]

    git.config('--global', 'jira.session-cookie-name', jira_cookie_name)
    git.config('--global', 'jira.session-cookie-value', jira_cookie_value)

    jira_cookie = {
        jira_cookie_name: jira_cookie_value
    }

    return jira_cookie

def get_issues(jql, fields):
    start_at = 0

    payload = {
        'jql': jql,
        'startAt': start_at,
        'maxResults': 1000,
        'fields': fields
    }

    search_url = jira_base_url + '/rest/api/2/search'

    r = requests.get(search_url, cookies=get_jira_cookie(), params=payload)

    issues = {}

    if r.status_code != 200:
        return issues

    response_json = r.json()

    for issue in response_json['issues']:
        issues[issue['key']] = issue

    while start_at + len(response_json['issues']) < response_json['total']:
        start_at += len(response_json['issues'])
        payload['startAt'] = start_at

        r = requests.get(search_url, params=payload)

        if r.status_code != 200:
            return issues

        response_json = r.json()

        for issue in response_json['issues']:
            issues[issue['key']] = issue

    return issues