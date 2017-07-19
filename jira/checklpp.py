
from __future__ import print_function

from collections import defaultdict, namedtuple
import dateparser
from datetime import date, datetime
import hashlib
import numpy as np
import os
import pandas as pd
import pytz
import re
import requests
import six
import sys
import subprocess
import ujson as json

today = date.today()
now = datetime.now(pytz.utc)

def get_file_name(cache_name, suffix):
    base_name = os.path.basename(cache_name)
    subfolder_name = os.path.dirname(cache_name)
    folder_name = 'rawdata/%s' % subfolder_name

    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    if suffix[0] == '.':
        suffix = suffix[1:]

    return '%s/%s_%s.%s' % (folder_name, today.isoformat(), base_name, suffix)

def save_row(outfile, keys, row_value):
    for key in keys:
        outfile.write(json.dumps(key))
        outfile.write('\t')

    outfile.write(json.dumps(row_value))
    outfile.write('\n')

def save_raw_dict(cache_name, raw_dict, index_fields=[]):
    file_name = get_file_name(cache_name, 'json')

    with open(file_name, 'w') as outfile:
        for primkey, row_value in raw_dict.items():
            keys = [primkey] + [row[field] if field in row else None for field in index_fields]
            save_row(outfile, keys, row_value)

    return load_raw_dict(cache_name)

def load_row(line):
    row = line.split('\t')
    keys = [json.loads(key) for key in row[0:-1]]
    row_value = json.loads(row[-1])

    if len(keys) == 0:
        return row_value

    return keys, row_value

def load_raw_dict(cache_name):
    file_name = get_file_name(cache_name, 'json')

    if not os.path.isfile(file_name):
        return None

    raw_dict = {}
    indexed_data = defaultdict(list)

    with open(file_name) as infile:
        for line in infile:
            keys, row_value = load_row(line)

            primkey = keys[0]
            raw_dict[primkey] = row_value

            index_fields = tuple(keys[1:])

            if len(index_fields) > 0:
                indexed_data[index_fields].append(row_value)

    if len(indexed_data) == 0:
        return raw_dict

    return raw_dict, indexed_data

def get_config(key):
    try:
        return subprocess.check_output(['git', 'config', key]).strip().decode('utf8')
    except:
        return None

def set_config(key, value):
    subprocess.call(['git', 'config', '--global', key, value])
    subprocess.call(['git', 'config', '--global', key, value])

jira_username = get_config('jira.session-username')
jira_password = get_config('jira.session-password')

assert(jira_username is not None)
assert(jira_password is not None)

jira_base_url = 'https://issues.liferay.com/rest'

def get_jira_cookie():
    jira_cookie = None

    jira_cookie_name = None
    jira_cookie_value = None

    try:
        jira_cookie_name = get_config('jira.session-cookie-name')
        jira_cookie_value = get_config('jira.session-cookie-value')
    except:
        pass

    if jira_cookie_name is not None and jira_cookie_value is not None:
        jira_cookie = {
            jira_cookie_name: jira_cookie_value
        }

        r = requests.get(jira_base_url + '/auth/1/session', cookies=jira_cookie)

        if r.status_code != 200:
            jira_cookie = None

    if jira_cookie is not None:
        return jira_cookie

    post_json = {
        'username': jira_username,
        'password': jira_password
    }

    r = requests.post(jira_base_url + '/auth/1/session', json=post_json)

    if r.status_code != 200:
        print('Invalid login')

        return None

    response_json = r.json()

    jira_cookie_name = response_json['session']['name']
    jira_cookie_value = response_json['session']['value']

    set_config('jira.session-cookie-name', jira_cookie_name)
    set_config('jira.session-cookie-value', jira_cookie_value)

    jira_cookie = {
        jira_cookie_name: jira_cookie_value
    }

    return jira_cookie

assert(get_jira_cookie() is not None)

def retrieve_jira_issues(jql):
    if jql.find('order by') == -1:
        ordered_jql = '%s order by updated asc' % jql
    else:
        ordered_jql = jql

    jira_cookie = get_jira_cookie()

    if jira_cookie is None:
        return []

    start_at = 0

    payload = {
        'jql': ordered_jql,
        'startAt': start_at,
        'maxResults': 1000
    }

    search_url = jira_base_url + '/api/2/search'

    r = requests.get(search_url, cookies=jira_cookie, params=payload)

    if r.status_code != 200:
        return {}

    response_json = r.json()

    issues = {}

    for issue in response_json['issues']:
        issues[issue['key']] = issue

    while start_at + len(response_json['issues']) < response_json['total']:
        start_at += len(response_json['issues'])
        payload['startAt'] = start_at

        print('[%s] Retrieved %d of %d results' % (datetime.now().isoformat(), start_at, response_json['total']))

        r = requests.get(search_url, cookies=jira_cookie, params=payload)

        if r.status_code != 200:
            return issues

        response_json = r.json()

        for issue in response_json['issues']:
            issues[issue['key']] = issue

    return issues

in_review_jql = '''
    project = LPP AND
    type not in ("SME Request", "SME Request SubTask") AND
    status = "In Review"
'''

jql_hashes = load_raw_dict('jql_hashes')

if jql_hashes is None:
    jql_hashes = {}

def get_jql_hashed_name(base_name, jql):
    jql_hash = None

    for key, value in jql_hashes.items():
        if value == jql:
            jql_hash = key
            break

    if jql_hash is None:
        digester = hashlib.md5()
        digester.update(jql)
        jql_hash = digester.hexdigest()

        jql_hashes[jql_hash] = jql

        save_raw_dict('jql_hashes', jql_hashes)

    return '%s/%s' % (jql_hash, base_name)

def get_jira_issues(jql):
    base_name = get_jql_hashed_name('jira_issues', jql)

    jira_issues = load_raw_dict(base_name)

    if jira_issues is not None:
        print('Loaded cached JIRA search %s' % jql)
        return jira_issues

    print('Executing JIRA search %s' % jql)

    jira_issues = retrieve_jira_issues(jql)
    jira_issues = save_raw_dict(base_name, jira_issues)
    return jira_issues

if __name__ == '__main__':
    jira_issues = get_jira_issues(in_review_jql)
else:
    jira_issues = {}

JIRAIssue = namedtuple(
    'JIRAIssue',
    ['ticket_key', 'region', 'status', 'assignee', 'summary']
)

def get_jira_tuple(issue):
    region_field_name = 'customfield_11523'

    regions = ['']

    if region_field_name in issue['fields']:
        regions = [region['value'] for region in issue['fields'][region_field_name]]

    return JIRAIssue(
        ticket_key=issue['key'],
        region=regions[0],
        status=issue['fields']['status']['name'],
        assignee=issue['fields']['assignee']['displayName'],
        summary=issue['fields']['summary']
    )

pd.DataFrame([get_jira_tuple(issue) for issue in jira_issues.values()])

github_oauth_token = get_config('github.oauth-token')

assert(github_oauth_token is not None)

github_base_url = 'https://api.github.com'

def is_repository_accessible(reviewer_url):
    print('Validating OAuth token against %s' % reviewer_url)

    headers = {
        'user-agent': 'python checklpp.py',
        'authorization': 'token %s' % github_oauth_token
    }

    api_path = '/repos/%s' % reviewer_url

    r = requests.get(github_base_url + api_path, headers=headers)

    return r.status_code == 200

assert(is_repository_accessible('liferay/liferay-portal'))
assert(is_repository_accessible('liferay/liferay-portal-ee'))

def retrieve_pull_requests(reviewer_url, pull_request_ids=[]):
    print('Checking pull requests waiting on %s' % reviewer_url)

    headers = {
        'user-agent': 'python checklpp.py',
        'authorization': 'token %s' % github_oauth_token
    }

    api_path = '/repos/%s/pulls' % reviewer_url

    r = requests.get(github_base_url + api_path, headers=headers)

    if r.status_code != 200:
        return {}

    new_pull_requests_list = r.json()
    new_pull_requests = {
        pull_request['html_url']: pull_request
            for pull_request in new_pull_requests_list
    }

    for pull_request_id in pull_request_ids:
        github_url = 'https://github.com/%s/pull/%s' % (reviewer_url, pull_request_id)

        if github_url in new_pull_requests:
            continue

        api_path = '/repos/%s/pulls/%s' % (reviewer_url, pull_request_id)

        r = requests.get(github_base_url + api_path, headers=headers)

        if r.status_code != 200:
            continue

        new_pull_requests[github_url] = r.json()

    return new_pull_requests

def get_open_backports():
    open_backports = load_raw_dict('open_backports')

    if open_backports is not None:
        print('Loaded cached open backports')
        return open_backports

    open_backports = retrieve_pull_requests('liferay/liferay-portal-ee')
    open_backports = save_raw_dict('open_backport_pulls', open_backports)
    return open_backports

if __name__ == '__main__':
    open_backports = get_open_backports()
else:
    open_backports = {}

GHPullRequest = namedtuple(
    'GHPullRequest',
    ['submitter', 'pull_id', 'branch', 'created_at', 'updated_at', 'closed_at', 'state', 'github_url']
)

def get_github_tuple(pull_request):
    pull_id = '%s/%s#%d' % (
        pull_request['base']['user']['login'],
        pull_request['base']['repo']['name'],
        pull_request['number']
    )

    return GHPullRequest(
        submitter=pull_request['user']['login'],
        pull_id=pull_id,
        branch=pull_request['base']['ref'],
        created_at=pull_request['created_at'],
        updated_at=pull_request['updated_at'],
        closed_at=pull_request['closed_at'],
        state=pull_request['state'],
        github_url=pull_request['html_url']
    )

pd.DataFrame([get_github_tuple(pull_request) for pull_request in open_backports.values()])

def extract_jira_pull_request_urls(jira_issues):
    issues_by_request = defaultdict(set)
    requests_by_issue = defaultdict(set)
    requests_by_reviewer = defaultdict(set)

    for jira_key, jira_issue in jira_issues.items():
        for value in jira_issue['fields'].values():
            if not isinstance(value, six.string_types):
                continue

            for github_url in re.findall('https://github.com/[^\s]*/pull/[\d]+', value):
                requests_by_issue[jira_key].add(github_url)
                issues_by_request[github_url].add(jira_key)

    return issues_by_request, requests_by_issue

def get_jira_pull_request_urls(jql):
    base_name_1 = get_jql_hashed_name('issues_by_request', jql)
    base_name_2 = get_jql_hashed_name('requests_by_issue', jql)

    issues_by_request = load_raw_dict(base_name_1)
    requests_by_issue = load_raw_dict(base_name_2)

    if issues_by_request is not None and requests_by_issue is not None:
        print('Loaded cached JIRA to GitHub mapping')
        return issues_by_request, requests_by_issue

    jira_issues = get_jira_issues(jql)
    issues_by_request, requests_by_issue = extract_jira_pull_request_urls(jira_issues)

    issues_by_request = save_raw_dict(base_name_1, issues_by_request)
    requests_by_issue = save_raw_dict(base_name_2, requests_by_issue)

    return issues_by_request, requests_by_issue

if __name__ == '__main__':
    issues_by_request, requests_by_issue = get_jira_pull_request_urls(in_review_jql)
else:
    issues_by_request = {}
    requests_by_issue = {}

JIRAGitHubMapping = namedtuple('JIRAGitHubMapping', ['jira_key', 'github_url'])

pd.DataFrame([
    JIRAGitHubMapping(jira_key=jira_key, github_url=github_url)
        for jira_key, github_urls in requests_by_issue.items()
            for github_url in github_urls
])

def retrieve_related_pull_requests(issues_by_request):
    requests_by_reviewer = defaultdict(set)

    for github_url in issues_by_request.keys():
        reviewer_url = github_url[19:github_url.rfind('/pull/')]
        requests_by_reviewer[reviewer_url].add(github_url[github_url.rfind('/')+1:])

    related_pull_requests = {}

    for reviewer_url, pull_request_ids in sorted(requests_by_reviewer.items()):
        new_pull_requests = retrieve_pull_requests(reviewer_url, pull_request_ids)
        related_pull_requests.update(new_pull_requests)

    return related_pull_requests

def get_related_pull_requests(jql):
    base_name = get_jql_hashed_name('related_pull_requests', jql)

    related_pull_requests = load_raw_dict(base_name)

    if related_pull_requests is not None:
        print('Loaded cached pull request metadata')
        return related_pull_requests

    issues_by_request, requests_by_issue = get_jira_pull_request_urls(jql)

    related_pull_requests = retrieve_related_pull_requests(issues_by_request)
    related_pull_requests = save_raw_dict(base_name, related_pull_requests)

    return related_pull_requests

if __name__ == '__main__':
    related_pull_requests = get_related_pull_requests(in_review_jql)
else:
    related_pull_requests = {}

pd.DataFrame([get_github_tuple(pull_request) for pull_request in related_pull_requests.values()])

def get_jira_github_join(jql):
    base_name = get_jql_hashed_name('jira_github_join', jql)

    jira_github_join = load_raw_dict(base_name)

    if jira_github_join is not None:
        print('Loaded cached JIRA-GitHub join result')
        return jira_github_join

    jira_issues = get_jira_issues(jql)
    issues_by_request, requests_by_issue = get_jira_pull_request_urls(jql)
    related_pull_requests = get_related_pull_requests(jql)

    jira_github_join = {
        jira_key: {
            'jira': jira_issues[jira_key],
            'github': [
                related_pull_requests[github_url] for github_url in github_urls
                    if github_url in related_pull_requests
            ]
        }
        for jira_key, github_urls in requests_by_issue.items()
    }

    jira_github_join = save_raw_dict(base_name, jira_github_join)

    return jira_github_join

def get_github_open_count(jql):
    base_name = get_jql_hashed_name('github_open_count', jql)

    github_open_count = load_raw_dict(base_name)

    if github_open_count is not None:
        print('Loaded cached JIRA-GitHub join count result')
        return github_open_count

    jira_github_join = get_jira_github_join(jql)

    github_open_count = {
        jira_key: len([pull_request for pull_request in join_result['github'] if pull_request['state'] == 'open'])
            for jira_key, join_result in jira_github_join.items()
    }

    github_open_count = save_raw_dict(base_name, github_open_count)

    return github_open_count

if __name__ == '__main__':
    github_open_count = get_github_open_count(in_review_jql)
else:
    github_open_count = {}

GitHubOpenCount = namedtuple('GitHubOpenCount', ['jira_key', 'open_count'])

pd.DataFrame([
    GitHubOpenCount(jira_key=jira_key, open_count=open_count)
        for jira_key, open_count in github_open_count.items()
])

def get_github_idle_tickets(jql):
    base_name = get_jql_hashed_name('github_idle_tickets', jql)

    github_idle_tickets = load_raw_dict(base_name)

    if github_idle_tickets is not None:
        print('Loaded cached list of tickets idle on GitHub')
        return github_idle_tickets

    github_open_count = get_github_open_count(jql)
    jira_github_join = get_jira_github_join(jql)

    github_idle_tickets = {
        jira_key: {
            'jira': join_result['jira'],
            'github': [pull_request for pull_request in join_result['github'] if pull_request['state'] == 'open']
        }
        for jira_key, join_result in jira_github_join.items() if github_open_count[jira_key] > 0
    }

    github_idle_tickets = save_raw_dict(base_name, github_idle_tickets)

    return github_idle_tickets

if __name__ == '__main__':
    github_idle_tickets = get_github_idle_tickets(in_review_jql)
else:
    github_idle_tickets = {}

JiraGitHubLookup = namedtuple(
    'JiraGitHubLookup',
    list(JIRAIssue._fields) + list(GHPullRequest._fields)
)

def get_jira_github_tuple(jira_key, jira_issue, pull_request):
    jira_tuple = get_jira_tuple(jira_issue)
    github_tuple = get_github_tuple(pull_request)

    combined_columns = jira_tuple._asdict()
    combined_columns.update(github_tuple._asdict())

    new_tuple = JiraGitHubLookup(**combined_columns)

    return new_tuple

pd.DataFrame([
    get_jira_github_tuple(jira_key, join_result['jira'], pull_request)
        for jira_key, join_result in github_idle_tickets.items()
            for pull_request in join_result['github']
])

def get_jira_idle_tickets(jql):
    base_name = get_jql_hashed_name('jira_idle_tickets', jql)

    jira_idle_tickets = load_raw_dict(base_name)

    if jira_idle_tickets is not None:
        print('Loaded cached list of tickets idle on JIRA')
        return jira_idle_tickets

    github_open_count = get_github_open_count(jql)
    jira_github_join = get_jira_github_join(jql)

    github_closed_pulls = {
        key: {
            'jira': join_result['jira'],
            'github': [
                pull_request
                    for pull_request in join_result['github'] if pull_request['state'] == 'closed'
            ]
        }
        for key, join_result in jira_github_join.items() if github_open_count[key] == 0
    }

    jira_idle_tickets = {
        key: {
            'jira': join_result['jira'],
            'github': max(join_result['github'], key=lambda x: x['closed_at'])
        }
        for key, join_result in github_closed_pulls.items()
    }

    jira_idle_tickets = save_raw_dict(base_name, jira_idle_tickets)

    return jira_idle_tickets

if __name__ == '__main__':
    jira_idle_tickets = get_jira_idle_tickets(in_review_jql)
else:
    jira_idle_tickets = {}

pd.DataFrame([
    get_jira_github_tuple(jira_key, join_result['jira'], join_result['github'])
        for jira_key, join_result in jira_idle_tickets.items()
])

def get_time_delta_as_days(time_delta):
    return float(time_delta.days) + float(time_delta.seconds) / (60 * 60 * 24)

new_fields = list(JiraGitHubLookup._fields) + ['open_time_days', 'idle_time_days']
removed_fields = ['created_at', 'updated_at', 'closed_at']

for removed_field in removed_fields:
    new_fields.remove(removed_field)

JiraGitHubLookupIdleTime = namedtuple('JiraGitHubLookupIdleTime', new_fields)

def get_jira_github_idle_time_tuple(jira_key, jira_issue, pull_request):
    old_tuple = get_jira_github_tuple(jira_key, jira_issue, pull_request)
    old_values = old_tuple._asdict()

    for removed_field in removed_fields:
        del old_values[removed_field]

    created_at = dateparser.parse(pull_request['created_at'])
    updated_at = dateparser.parse(pull_request['updated_at'])

    closed_at = pull_request['closed_at']

    if closed_at is None:
        open_time_days = get_time_delta_as_days(now - created_at)
        idle_time_days = get_time_delta_as_days(now - updated_at)
    else:
        closed_at = dateparser.parse(pull_request['closed_at'])

        open_time_days = None
        idle_time_days = get_time_delta_as_days(now - closed_at)

    new_tuple = JiraGitHubLookupIdleTime(
        open_time_days=open_time_days,
        idle_time_days=idle_time_days,
        **old_values
    )

    return new_tuple

pd.DataFrame([
    get_jira_github_idle_time_tuple(jira_key, join_result['jira'], pull_request)
        for jira_key, join_result in github_idle_tickets.items()
            for pull_request in join_result['github']
])

pd.DataFrame([
    get_jira_github_idle_time_tuple(jira_key, join_result['jira'], join_result['github'])
        for jira_key, join_result in jira_idle_tickets.items()
])

if __name__ == '__main__':
    github_idle_tickets_list = [
        get_jira_github_idle_time_tuple(jira_key, join_result['jira'], pull_request)._asdict()
            for jira_key, join_result in github_idle_tickets.items()
                for pull_request in join_result['github']
    ]

    jira_idle_tickets_list = [
        get_jira_github_idle_time_tuple(jira_key, join_result['jira'], join_result['github'])._asdict()
            for jira_key, join_result in jira_idle_tickets.items()
    ]

    with open('%s_idle_ticket_data.json' % today.isoformat(), 'w') as outfile:
        idle_ticket_data = {
            'lastUpdated': now.isoformat(),
            'githubIdleTicketsList': github_idle_tickets_list,
            'jiraIdleTicketsList': jira_idle_tickets_list
        }

        json.dump(idle_ticket_data, outfile)

