from __future__ import print_function

from collections import defaultdict
import dateparser
from datetime import datetime, timezone
import getpass
import re
import requests
import six
import subprocess
import ujson as json

# Initial start time

now = datetime.now(timezone.utc)

# Code for handling JIRA

jira_base_url = 'https://issues.liferay.com/rest'

def get_jira_cookie():
	jira_cookie = None

	jira_cookie_name = None
	jira_cookie_value = None

	try:
		jira_cookie_name = subprocess.check_output(['git', 'config', 'jira.session-cookie-name']).strip().decode('utf8')
		jira_cookie_value = subprocess.check_output(['git', 'config', 'jira.session-cookie-value']).strip().decode('utf8')
	except:
		pass

	if jira_cookie_name is not None and jira_cookie_value is not None:
		jira_cookie = {
			jira_cookie_name: jira_cookie_value
		}

		r = requests.get(jira_base_url + '/auth/1/session', cookies=jira_cookie)

		if r.status_code != 200:
			print(jira_base_url + '/auth/1/session')
			jira_cookie = None

	while jira_cookie is None:
		jira_username = input('JIRA username: ')
		jira_password = getpass.getpass('JIRA password: ')

		post_json = {
			'username': jira_username,
			'password': jira_password
		}

		r = requests.post(jira_base_url + '/auth/1/session', json=post_json)

		if r.status_code != 200:
			print('Invalid login')
			continue

		response_json = r.json()

		jira_cookie_name = response_json['session']['name']
		jira_cookie_value = response_json['session']['value']

		subprocess.call(['git', 'config', '--global', 'jira.session-cookie-name', jira_cookie_name])
		subprocess.call(['git', 'config', '--global', 'jira.session-cookie-value', jira_cookie_value])

		jira_cookie = {
			jira_cookie_name: jira_cookie_value
		}

	return jira_cookie

def get_jira_issues(jql):
	jira_cookie = get_jira_cookie()

	start_at = 0

	post_json = {
		'jql': jql,
		'startAt': start_at
	}

	print('Executing JIRA search')

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

# Code for handling GitHub

github_base_url = 'https://api.github.com'
github_oauth_token = subprocess.check_output(['git', 'config', 'github.oauth-token']).strip().decode('utf8')

def get_reviewer_pull_requests(reviewer_url):
	headers = {
		'user-agent': 'python checklpp.py',
		'authorization': 'token %s' % github_oauth_token
	}

	api_path = '/repos/%s/pulls' % reviewer_url

	r = requests.get(github_base_url + api_path, headers=headers)

	if r.status_code != 200:
		return []

	return r.json()

def retrieve_active_pull_request_reviews(issues_by_request, requests_by_reviewer):
	active_reviews = []
	active_pull_requests = {}

	for reviewer_url in sorted(requests_by_reviewer.keys()):
		print('Checking pull requests waiting on %s' % reviewer_url)

		new_pull_requests = get_reviewer_pull_requests(reviewer_url)
		new_active_reviews = [pull_request['html_url'] for pull_request in new_pull_requests if pull_request['html_url'] in issues_by_request]

		if len(new_active_reviews) == 0:
			continue

		active_reviews.extend(new_active_reviews)

		for pull_request in new_pull_requests:
			active_pull_requests[pull_request['html_url']] = pull_request

	return active_reviews, active_pull_requests

# Let's do the work

def process_issues():
	jira_issues = get_jira_issues('project=LPP AND status="In Review" order by key')

	print('Identified %d tickets in review' % len(jira_issues))

	if len(jira_issues) == 0:
		return

	issues_by_request, requests_by_reviewer = extract_pull_requests_in_review(jira_issues)
	active_reviews, active_pull_requests = retrieve_active_pull_request_reviews(issues_by_request, requests_by_reviewer)

	if len(active_reviews) == 0:
		print('No tickets in review are waiting on reviewers')
		return

	for github_url in active_reviews:
		created_at = dateparser.parse(active_pull_requests[github_url]['created_at'])
		delta = now - created_at

		print()
		print('Pull Request: %s' % github_url)
		print('Affected Tickets: https://issues.liferay.com/browse/%s' % ', '.join(issues_by_request[github_url]))
		print('Elapsed Time: %d days' % delta.days)
		print()

process_issues()