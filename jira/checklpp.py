
from __future__ import print_function

from collections import defaultdict, namedtuple
import dateparser
from datetime import date, datetime
import numpy as np
import os
import pandas as pd
import pytz
import re
import requests
import six
import subprocess
import ujson as json

today = date.today()
now = datetime.now(pytz.utc)

def load_raw_data(base_name):
    file_name = 'rawdata/%s_%s.json' % (base_name, today.isoformat())

    if not os.path.isfile(file_name):
        return None

    with open(file_name) as infile:
        return json.load(infile)

def save_raw_data(base_name, json_value):
    file_name = 'rawdata/%s_%s.json' % (base_name, today.isoformat())

    with open(file_name, 'w') as outfile:
        json.dump(json_value, outfile)

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

def get_jira_issues(jql):
    jira_cookie = get_jira_cookie()

    if jira_cookie is None:
        return []

    start_at = 0

    post_json = {
        'jql': jql,
        'startAt': start_at
    }

    r = requests.post(jira_base_url + '/api/2/search', cookies=jira_cookie, json=post_json)

    if r.status_code != 200:
        return []

    response_json = r.json()

    issues = response_json['issues']

    while start_at + response_json['maxResults'] < response_json['total']:
        start_at += response_json['maxResults']
        post_json['startAt'] = start_at

        r = requests.post(jira_base_url + '/api/2/search', cookies=jira_cookie, json=post_json)

        if r.status_code != 200:
            return issues

        response_json = r.json()

        issues.extend(response_json['issues'])

    return issues

jira_issues = load_raw_data('jira_issues')

if jira_issues is None:
    print('Executing JIRA search')

    jql = 'project = LPP AND type not in ("SME Request", "SME Request SubTask") AND status = "In Review" order by key'
    jira_issues = get_jira_issues(jql)
    save_raw_data('jira_issues', jira_issues)
else:
    print('Loaded cached JIRA search')

JIRAIssue = namedtuple('JIRAIssue', ['key', 'status', 'assignee', 'summary'])

pd.DataFrame([
    JIRAIssue(
        key=jira_issue['key'],
        status=jira_issue['fields']['status']['name'],
        assignee=jira_issue['fields']['assignee']['displayName'],
        summary=jira_issue['fields']['summary']
    )
        for jira_issue in jira_issues
])

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

    new_pull_requests = r.json()

    new_seen_pull_requests = { pull_request['html_url']: pull_request for pull_request in new_pull_requests }

    for pull_request_id in pull_request_ids:
        github_url = 'https://github.com/%s/pull/%s' % (reviewer_url, pull_request_id)

        if github_url in new_seen_pull_requests:
            continue

        api_path = '/repos/%s/pulls/%s' % (reviewer_url, pull_request_id)

        r = requests.get(github_base_url + api_path, headers=headers)

        if r.status_code != 200:
            continue

        new_seen_pull_requests[github_url] = r.json()

    return new_seen_pull_requests

open_backport_pulls = load_raw_data('open_backport_pulls')

if open_backport_pulls is None:
    open_backport_pulls = retrieve_pull_requests('liferay/liferay-portal-ee')
    
    save_raw_data('open_backport_pulls', open_backport_pulls)
else:
    print('Loaded cached open backports')

GHPullRequest = namedtuple('GHPullRequest', ['submitter', 'reviewer', 'repository', 'branch', 'github_url'])

pd.DataFrame([
    GHPullRequest(
        submitter=pull_request['user']['login'],
        reviewer=pull_request['base']['user']['login'],
        repository=pull_request['base']['repo']['name'],
        branch=pull_request['base']['ref'],
        github_url=github_url
    )
        for github_url, pull_request in open_backport_pulls.items()
])

def extract_pull_requests_in_review(jira_issues):
    issues_by_request = defaultdict(set)
    requests_by_reviewer = defaultdict(set)

    for jira_issue in jira_issues:
        for value in jira_issue['fields'].values():
            if not isinstance(value, six.string_types):
                continue

            for github_url in re.findall('https://github.com/[^\s]*/pull/[\d]+', value):
                issues_by_request[github_url].add(jira_issue['key'])

                pos = github_url.find('/', github_url.find('/', 19) + 1)
                reviewer_url = github_url[19:pos]
                pull_request_id = github_url[github_url.rfind('/') + 1:]

                requests_by_reviewer[reviewer_url].add(pull_request_id)

    return issues_by_request, requests_by_reviewer

issues_by_request = load_raw_data('issues_by_request')
requests_by_reviewer = load_raw_data('requests_by_reviewer')

if issues_by_request is None or requests_by_reviewer is None:
    issues_by_request, requests_by_reviewer = extract_pull_requests_in_review(jira_issues)

    save_raw_data('issues_by_request', issues_by_request)
    save_raw_data('requests_by_reviewer', requests_by_reviewer)
else:
    print('Loaded cached JIRA to GitHub mapping')

JIRAGitHubMapping = namedtuple('JIRAGitHubMapping', ['jiraKey', 'githubKey'])

pd.DataFrame([
    JIRAGitHubMapping(jiraKey=jiraKey, githubKey=githubKey)
        for githubKey, jiraKeys in issues_by_request.items()
            for jiraKey in jiraKeys
])

def retrieve_active_pull_request_reviews(issues_by_request, requests_by_reviewer):
    active_reviews = []
    seen_pull_requests = {}

    for reviewer_url, pull_request_ids in sorted(requests_by_reviewer.items()):
        new_seen_pull_requests = retrieve_pull_requests(reviewer_url, pull_request_ids)
        new_active_reviews = [pull_request['html_url'] for pull_request in new_seen_pull_requests.values() if pull_request['html_url'] in issues_by_request and pull_request['state'] != 'closed']

        seen_pull_requests.update(new_seen_pull_requests)
        active_reviews.extend(new_active_reviews)

    return active_reviews, seen_pull_requests

active_reviews = load_raw_data('active_reviews')
seen_pull_requests = load_raw_data('seen_pull_requests')

if active_reviews is None or seen_pull_requests is None:
    active_reviews, seen_pull_requests = retrieve_active_pull_request_reviews(issues_by_request, requests_by_reviewer)

    save_raw_data('active_reviews', active_reviews)
    save_raw_data('seen_pull_requests', seen_pull_requests)
else:
    print('Loaded cached pull request metadata')

def get_daycount_string(time_delta):
    elapsed = float(time_delta.days) + float(time_delta.seconds) / (60 * 60 * 24)
    elapsed_string = '%0.1f days' % elapsed

    return elapsed_string

def report_active(outfile, jira_issues, issues_by_request, active_reviews, seen_pull_requests):
    jira_issues_by_key = { issue['key']: issue for issue in jira_issues }

    outfile.write('<h2>Active Pull Requests on %s</h2>' % today.isoformat())

    outfile.write('<table>')
    outfile.write('<tr>')

    for header in ['Submitter', 'Pull Request Link', 'Waiting Tickets', 'Open Time', 'Idle Time']:
        outfile.write('<th>%s</th>' % header)

    outfile.write('</tr>')

    for github_url in active_reviews:
        outfile.write('<tr>')

        if github_url not in seen_pull_requests:
            continue
        
        pull_request = seen_pull_requests[github_url]

        # Submitter

        outfile.write('<td>%s</td>' % pull_request['user']['login'])

        # Pull Request Link

        outfile.write('<td><a href="%s">%s#%d</a></td>' % (github_url, pull_request['base']['user']['login'], pull_request['number']))

        # Waiting Tickets

        affected_issue_keys = [issue_key for issue_key in issues_by_request[github_url]]
        affected_issue_urls = ['https://issues.liferay.com/browse/%s' % issue_key for issue_key in affected_issue_keys]
        affected_issue_assignees = [jira_issues_by_key[issue_key]['fields']['assignee']['displayName'] for issue_key in affected_issue_keys]

        affected_issue_links = [
            '<a href="%s">%s</a> (%s)' % (issue_url, issue_key, issue_assignee)
                for issue_key, issue_url, issue_assignee in zip(affected_issue_keys, affected_issue_urls, affected_issue_assignees)
        ]

        outfile.write('<td>%s</td>' % '<br />'.join(affected_issue_links))

        # Open Time

        created_at = dateparser.parse(pull_request['created_at'])
        open_time = now - created_at

        outfile.write('<td>%s</td>' % get_daycount_string(open_time))

        # Idle Time

        updated_at = dateparser.parse(pull_request['updated_at'])
        idle_time = now - updated_at

        outfile.write('<td>%s</td>' % get_daycount_string(idle_time))

        outfile.write('</tr>')

    outfile.write('</table>')

def report_completed(outfile, jira_issues, issues_by_request, active_reviews, seen_pull_requests):
    requests_by_issue = defaultdict(set)

    for github_url, issue_keys in issues_by_request.items():
        for issue_key in issue_keys:
            requests_by_issue[issue_key].add(github_url)

    completed_review = []
    region_field_name = 'customfield_11523'

    for issue in jira_issues:
        issue_key = issue['key']
        github_urls = requests_by_issue[issue_key]
        all_pulls_closed = len([github_url for github_url in github_urls if github_url in active_reviews]) == 0

        if not all_pulls_closed:
            continue

        assignee = issue['fields']['assignee']['displayName']

        regions = []

        if region_field_name in issue['fields']:
            regions = [region['value'] for region in issue['fields'][region_field_name]]

        region = ''

        if len(regions) > 0:
            region = regions[0]

        idle_time = None

        for github_url in github_urls:
            if github_url not in seen_pull_requests:
                continue
            
            pull_request = seen_pull_requests[github_url]

            if pull_request['closed_at'] is None:
                continue

            closed_at = dateparser.parse(pull_request['closed_at'])
            new_idle_time = now - closed_at

            if idle_time is None or new_idle_time < idle_time:
                idle_time = new_idle_time

        completed_review.append((region, issue_key, assignee, idle_time))

    completed_review.sort()

    if len(completed_review) > 0:
        outfile.write('<h2>Review Already Completed for %s</h2>' % today.isoformat())

        outfile.write('<table>')
        outfile.write('<tr>')

        for header in ['Region', 'Ticket', 'Idle Time']:
            outfile.write('<th>%s</th>' % header)

        for region, issue_key, assignee, idle_time in completed_review:
            outfile.write('<tr>')

            # Region

            outfile.write('<td>%s</td>' % region)

            # Ticket

            outfile.write('<td><a href="https://issues.liferay.com/browse/%s">%s</a> (%s)</td>' % (issue_key, issue_key, assignee))

            # Idle Time

            outfile.write('<td>%s</td>' % get_daycount_string(idle_time))

            outfile.write('</tr>')

        outfile.write('</table>')

report_file_name = 'report_%s.html' % today.isoformat()

with open(report_file_name, 'w') as outfile:
    report_active(outfile, jira_issues, issues_by_request, active_reviews, seen_pull_requests)
    report_completed(outfile, jira_issues, issues_by_request, active_reviews, seen_pull_requests)

