#!/usr/bin/env python

from datetime import datetime
import json
import requests
import subprocess

from jira import get_issues

def get_bpr_fix_pack_label(issue_key, base_version):
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
		suffix = '-%s10' % ''.join(base_version.split('.', 3)[0:2])

	issues = get_issues(
		'project = BPR and issueFunction in linkedIssuesOf("issue in linkedIssues(%s)")' % issue_key,
		['customfield_14424', 'customfield_19421'])

	max_fix_pack = None
	max_fix_pack_number = 0

	for issue_key, issue in issues.items():
		if issue['fields']['customfield_14424']['name'].find(base_version) != -1:
			if 'customfield_19421' in issue['fields']:
				fix_pack = issue['fields']['customfield_19421']

				if fix_pack is None or fix_pack.find('-') == -1:
					max_fix_pack = 9999
					continue

				fix_pack_number = int(fix_pack[fix_pack.find('-')+1:])

				if fix_pack_number > max_fix_pack_number:
					max_fix_pack = fix_pack
					max_fix_pack_number = fix_pack_number
			else:
				max_fix_pack = 9999

	if max_fix_pack_number == 0 or max_fix_pack == 9999:
		return '%s-9999-%s' % (prefix, suffix)

	return 'liferay-fixpack-%s%s' % (max_fix_pack, suffix)

def get_fix_pack_labels(issue_key, issue):
	fix_pack_labels = [label for label in issue['fields']['labels'] if label.find('liferay-fixpack-') == 0]

	security_pending_labels = [label for label in issue['fields']['labels'] if label.find('-security-pending') == 4]

	if len(security_pending_labels) > 0:
		fix_versions = [label[:label.find('-')] for label in security_pending_labels]
		fix_branches = [version[0:-3] + '.' + version[-3:-2] for version in fix_versions]
		fix_pack_labels.extend([get_bpr_fix_pack_label(issue_key, fix_branch) for fix_branch in fix_branches])

	return fix_pack_labels

def expand_fix_version(issue_key, issue):
	fix_version = {}

	fix_branches = [fixVersion['name'] for fixVersion in issue['fields']['fixVersions']]
	fix_pack_labels = get_fix_pack_labels(issue_key, issue)

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

issues = get_issues(
	'project = LPE and labels = LSV and resolution = Fixed order by key',
	['fixVersions', 'labels'])

fix_versions = {}

for issue_key, issue in issues.items():
	fix_version = expand_fix_version(issue_key, issue)

	if len(fix_version) > 0:
		fix_versions[issue_key] = fix_version

with open('lsv_fixedin.json', 'w') as f:
	json.dump(fix_versions, f, separators=(',', ':'))