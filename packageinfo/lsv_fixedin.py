#!/usr/bin/env python

from datetime import datetime
import json
import requests

def get_issues(jql):
	start_at = 0

	payload = {
		'jql': jql,
		'startAt': start_at,
		'maxResults': 1000,
		'fields': ['fixVersions', 'labels']
	}

	search_url = 'https://issues.liferay.com/rest/api/2/search'

	r = requests.get(search_url, params=payload)

	if r.status_code != 200:
		return issues

	response_json = r.json()

	issues = {}

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

def expand_fix_version(issue):
	fix_version = {}

	fix_branches = [fixVersion['name'] for fixVersion in issue['fields']['fixVersions']]
	fix_pack_labels = [label for label in issue['fields']['labels'] if label.find('liferay-fixpack-') == 0]

	sev_labels = [label for label in issue['fields']['labels'] if label[0:4] == 'sev-']
	lsv_labels = [label for label in issue['fields']['labels'] if label[0:4] == 'lsv-']

	if len(sev_labels) > 0:
		fix_version['sev'] = int(sev_labels[0][4:])

	if len(lsv_labels) > 0:
		fix_version['lsv'] = int(lsv_labels[0][4:])

	for fix_branch in fix_branches:
		base_version = '.'.join(fix_branch.split('.', 3)[0:2])
		build_number = '';

		if base_version == '6.1':
			prefix = 'liferay-fixpack-portal-'
			suffix = '-6130'
		elif base_version == '6.2':
			prefix = 'liferay-fixpack-portal-'
			suffix = '-6210'
		elif base_version == '7.0':
			prefix = 'liferay-fixpack-de-'
			suffix = '-7010'
		else:
			prefix = 'liferay-fixpack-dxp-'
			suffix = '-%s10' % ''.join(fix_branch.split('.', 3)[0:2])

		build_number = suffix[1:]

		for label in fix_pack_labels:
			if label[:len(prefix)] != prefix or label[-len(suffix):] != suffix:
				continue

			fix_version[build_number] = int(label[len(prefix):-len(suffix)])

	return fix_version

issues = get_issues('project = LPE and labels = LSV and resolution = Fixed order by key')

fix_versions = {}

for issue_key, issue in issues.items():
	fix_version = expand_fix_version(issue)

	if len(fix_version) > 0:
		fix_versions[issue_key] = fix_version

with open('lsv_fixedin.json', 'w') as f:
	json.dump(fix_versions, f, separators=(',', ':'))