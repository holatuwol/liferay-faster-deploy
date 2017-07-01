from __future__ import print_function

from collections import defaultdict
import dateparser
from datetime import date, datetime
import getpass
import pytz
import re
import requests
import six
import subprocess
import ujson as json

# Initial start time

today = date.today()
now = datetime.now(pytz.utc)

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

	if 'DISPLAY' not in os.environ or os.environ['DISPLAY'].find(':') == -1:
		return jira_cookie

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

	if jira_cookie is None:
		return []

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

def retrieve_pull_requests(reviewer_url, pull_request_ids):
	print('Checking pull requests waiting on %s' % reviewer_url)

	headers = {
		'user-agent': 'python checklpp.py',
		'authorization': 'token %s' % github_oauth_token
	}

	api_path = '/repos/%s/pulls' % reviewer_url

	r = requests.get(github_base_url + api_path, headers=headers)

	new_seen_pull_requests = {}

	if r.status_code != 200:
		return new_seen_pull_requests

	new_pull_requests = r.json()

	for pull_request in new_pull_requests:
		new_seen_pull_requests[pull_request['html_url']] = pull_request

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

def retrieve_active_pull_request_reviews(issues_by_request, requests_by_reviewer):
	active_reviews = []
	seen_pull_requests = {}

	for reviewer_url, pull_request_ids in sorted(requests_by_reviewer.items()):
		new_seen_pull_requests = retrieve_pull_requests(reviewer_url, pull_request_ids)
		new_active_reviews = [pull_request['html_url'] for pull_request in new_seen_pull_requests.values() if pull_request['html_url'] in issues_by_request and pull_request['state'] != 'closed']

		seen_pull_requests.update(new_seen_pull_requests)
		active_reviews.extend(new_active_reviews)

	return active_reviews, seen_pull_requests

# Let's do the work

def save_raw_data(base_name, json_value):
	with open('rawdata/%s_%s.json' % (base_name, today.isoformat()), 'w') as outfile:
		json.dump(json_value, outfile)

def process_issues():
	jira_issues = get_jira_issues('project=LPP AND status="In Review" order by key')

	save_raw_data('jira_issues', jira_issues)

	print('Identified %d tickets in review' % len(jira_issues))

	if len(jira_issues) == 0:
		return

	issues_by_request, requests_by_reviewer = extract_pull_requests_in_review(jira_issues)

	save_raw_data('issues_by_request', issues_by_request)
	save_raw_data('requests_by_reviewer', requests_by_reviewer)

	active_reviews, seen_pull_requests = retrieve_active_pull_request_reviews(issues_by_request, requests_by_reviewer)

	save_raw_data('active_reviews', active_reviews)
	save_raw_data('seen_pull_requests', seen_pull_requests)

	if len(active_reviews) == 0:
		print('No tickets in review are waiting on reviewers')
		return

	report_file_name = 'report_%s.html' % today.isoformat()

	with open(report_file_name, 'w') as outfile:
		outfile.write('<h2>Active Pull Requests on %s</h2>' % today.isoformat())

		outfile.write('<table>')
		outfile.write('<tr><th>Pull Request</th><th>Waiting Tickets</th><th>Elapsed Time</th></tr>')

		for github_url in active_reviews:
			outfile.write('<tr>')

			pull_request = seen_pull_requests[github_url]

			outfile.write('<td><a href="%s">%s</a></td>' % (github_url, pull_request['base']['user']['login']))

			affected_issues = [issue for issue in issues_by_request[github_url]]
			affected_issue_urls = ['https://issues.liferay.com/browse/%s' % issue for issue in affected_issues]

			outfile.write('<td>%s</td>' % ', '.join(['<a href="%s">%s</a>' % (issue_url, issue) for issue, issue_url in zip(affected_issues, affected_issue_urls)]))

			created_at = dateparser.parse(pull_request['created_at'])
			delta = now - created_at

			outfile.write('<td>%d days</td>' % delta.days)

			outfile.write('</tr>')

		outfile.write('</table>')

process_issues()