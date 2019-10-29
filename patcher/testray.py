#!/usr/bin/env python

from bs4 import BeautifulSoup
from findhotfix import get_patcher_build
import inspect
import json
from os.path import abspath, dirname
from patcher import process_patcher_search_container
import requests
from scrape_liferay import get_liferay_content, get_namespaced_parameters, username, password
import sys
from xml.etree import ElementTree

script_git_root = dirname(dirname(abspath(inspect.getfile(inspect.currentframe()))))
sys.path.insert(0, script_git_root)

import webbrowser
import webbrowser_patch

# Utility methods for bridging Liferay systems

service_packs = {
	'7.0': [0, 7, 12, 14, 22, 30, 32, 40, 50, 60, 70, 80],
	'7.1': [0, 5, 10],
	'7.2': [0]
};

master_version = '7.2'

def get_liferay_version(url):
	if url.find('.lpkg') != -1:
		version_number = url[url.rfind('-') + 1:]
		return '%s.%s' % (version_number[0], version_number[1])

	if url.find('fix-pack-de-') == 0 or url.find('fix-pack-dxp-') == 0 or url.find('fix-pack-base-') == 0:
		version_number = url[url.rfind('-') + 1:]
		return '%s.%s' % (version_number[0], version_number[1])

	if url.find('https://files.liferay.com/') == 0 or url.find('http://files.liferay.com/') == 0:
		url_parts = url.split('/')
		version_id = url_parts[6]
		return version_id[:version_id.rfind('.')]

	if url.find('https://github.com/') == 0:
		# TODO
		return 'master'

	print('Unable to determine Liferay version from %s' % url)
	return None

# Utility methods for dealing with Patcher Portal

def get_qa_build_urls():
	print('Looking up all patcher builds needing analysis')

	base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds'

	parameters = {
		'tabs1': 'accounts'
	}

	links = []

	def append_build_link(columns):
		if columns['build id'].text.strip().lower() != 'qa analysis needed':
			return

		for link_tag in columns['qa status'].find_all('a'):
			if link_tag['href'].find('https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/') == 0:
				window_state_href = link_tag['href']
				query_index = window_state_href.find('?')
				links.append(window_state_href if query_index == -1 else window_state_href[0:query_index])

	process_patcher_search_container(
		base_url, parameters, 'patcherBuildsSearchContainerSearchContainer',
		['build id', 'qa status'], append_build_link)

	return links

def get_fix_names(build):
	return set(build['patcherBuildName'].split(','))

def get_new_fixes(build_id, new_fix_names):
	print('Looking up fixes for patcher build %s' % build_id)

	base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/%s/fixes' % build_id
	parameters = {}

	links = []

	def process_fixes(columns):
		has_fix = False

		for fix_name in columns['name'].text.strip().split(','):
			if fix_name in new_fix_names:
				has_fix = True

		if not has_fix:
			return

		fix_id = columns['fix id'].text.strip()

		links.append('https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/%s' % fix_id)

	process_patcher_search_container(
		base_url, parameters, 'patcherFixsSearchContainerSearchContainer',
		['fix id', 'name'], process_fixes)

	base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/%s/childBuilds' % build_id
	parameters = {}

	def process_child_builds(columns):
		child_build_id = columns['build id'].text.strip()
		links.extend(get_new_fixes(child_build_id, new_fix_names))

	process_patcher_search_container(
		base_url, parameters, 'patcherBuildsSearchContainerSearchContainer',
		['build id'], process_child_builds)

	return links

def get_previous_patcher_build(patcher_build):
	if patcher_build is None:
		return None

	account_code = patcher_build['patcherBuildAccountEntryCode']

	if account_code is None:
		return None

	print('Looking up patcher builds for account %s' % account_code)

	base_url = 'https://patcher.liferay.com/api/jsonws/osb-patcher-portlet.accounts/view'

	parameters = {
		'limit': 10,
		'patcherBuildAccountEntryCode': account_code
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to retrieve patcher account builds for %s' % account_code)
		return None

	matching_builds = [
		build for build in json_response['data']
			if (build['statusLabel'] == 'complete' or build['statusLabel'] == 'released') and
				build['downloadURL'][-8:] == patcher_build['downloadURL'][-8:] and
				build['patcherBuildId'] != patcher_build['patcherBuildId']
	]

	account_parameters = {
		'patcherBuildAccountEntryCode': account_code
	}

	successful_builds = [
		build for build in matching_builds
			if build['qaStatusLabel'] == 'qa-automation-passed'
	]

	if len(successful_builds) > 0:
		matching_builds = successful_builds

	same_baseline_builds = [
		build for build in matching_builds
			if build['patcherProjectVersionId'] == patcher_build['patcherProjectVersionId']
	]

	if len(same_baseline_builds) > 0:
		matching_builds = same_baseline_builds
		account_parameters['patcherProjectVersionId'] = patcher_build['patcherProjectVersionId']

	account_base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view'
	account_namespaced_parameters = get_namespaced_parameters('1_WAR_osbpatcherportlet', account_parameters)
	account_query_string = '&'.join(['%s=%s' % (key, value) for key, value in account_namespaced_parameters.items()])

	webbrowser.open_new_tab('%s?%s' % (account_base_url, account_query_string))

	patcher_build_fixes = get_fix_names(patcher_build)

	if len(matching_builds) == 0:
		best_matching_build = None
		best_matching_build_diff = patcher_build_fixes
		best_matching_build_name = patcher_build['patcherProjectVersionName']
	else:
		best_matching_build = None
		best_matching_build_fixes = None
		best_matching_build_diff = patcher_build_fixes

		for matching_build in matching_builds:
			matching_build_fixes = get_fix_names(matching_build)
			matching_build_diff = patcher_build_fixes - matching_build_fixes

			if len(matching_build_diff) < len(best_matching_build_diff):
				best_matching_build = matching_build
				best_matching_build_fixes = matching_build_fixes
				best_matching_build_diff = matching_build_diff

		if best_matching_build is not None:
			best_matching_build_name = 'fix-pack-fix-%s' % best_matching_build['patcherFixId']

	new_fixes = get_new_fixes(patcher_build['patcherBuildId'], best_matching_build_diff)

	if len(new_fixes) > 0 and len(new_fixes) <= 2:
		for new_fix in new_fixes:
			webbrowser.open_new_tab(new_fix)
	elif len(same_baseline_builds) > 0:
		webbrowser.open_new_tab(
			'https://github.com/liferay/liferay-portal-ee/compare/%s...fix-pack-fix-%s' %
				(best_matching_build_name, patcher_build['patcherFixId'])
		)
	else:
		webbrowser.open_new_tab(
			'https://github.com/liferay/liferay-portal-ee/compare/%s...fix-pack-fix-%s' %
				(patcher_build['patcherProjectVersionName'], patcher_build['patcherFixId'])
		)

	return best_matching_build

# Utility methods for dealing with Testray

def get_project_id(url):
	version = get_liferay_version(url)

	if version is None:
		return None

	print('Looking up testray projects for Liferay version %s' % version)

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.projects/index'

	parameters = {
		'cur': 0,
		'delta': 100,
		'start': -1,
		'end': -1
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to determine testray project from %s' % url)
		return None

	matching_name = 'Liferay Portal %s' % (master_version if version == 'master' else version)

	matching_project_ids = [
		project['testrayProjectId'] for project in json_response['data']
			if project['name'] == matching_name
	]

	if len(matching_project_ids) != 1:
		print('Unable to determine testray project from %s' % url)
		return None

	return matching_project_ids[0]

def get_routine_id(url):
	project_id = get_project_id(url)

	if project_id is None:
		return None

	print('Looking up testray routine by project')

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.routines/index'

	parameters = {
		'testrayProjectId': project_id,
		'cur': 0,
		'delta': 100,
		'start': -1,
		'end': -1,
		'orderByCol': 'name',
		'orderByType': 'asc'
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to determine testray routine from %s' % url)
		return None

	matching_name = None

	if url.find('https://github.com') == 0:
		matching_name = 'CE Pull Request' if url.find('-ee') == -1 else 'EE Pull Request'
	elif url.find('fix-pack-de-') == 0 or url.find('fix-pack-dxp-') == 0 or url.find('fix-pack-base-') == 0:
		matching_name = 'Fix Pack Tester'
	elif url.find('https://files.liferay.com') == 0:
		matching_name = 'Hotfix Tester'
	elif url.find('http://files.liferay.com') == 0:
		matching_name = 'Hotfix Tester'
	else:
		print('Unable to determine testray routine from %s' % url)

	matching_routine_ids = [
		routine['testrayRoutineId'] for routine in json_response['data']
			if routine['name'] == matching_name
	]

	if len(matching_routine_ids) != 1:
		print('Unable to determine testray routine from %s' % url)
		return None

	return matching_routine_ids[0]

def get_build_id(routine_id, search_name, matching_name, archived=False):
	print('Looking up testray build by routine (archived = %r)' % archived)

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.builds/index'

	parameters = {
		'name': search_name,
		'testrayRoutineId': routine_id,
		'archived': archived,
		'cur': 0,
		'delta': 100,
		'start': -1,
		'end': -1
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to determine testray build for testray routine %s, search string %s' % (routine_id, search_name))
		return None

	matching_build_ids = [
		build['testrayBuildId'] for build in json_response['data']
			if build['name'].find(matching_name) != -1
	]

	if len(matching_build_ids) == 0:
		if not archived:
			return get_build_id(routine_id, search_name, matching_name, True)

		print('Unable to determine build for testray routine %s, search string %s, matching string %s' % (routine_id, search_name, matching_name))
		return None

	return matching_build_ids[0]

def get_github_build_id(github_url):
	routine_id = get_routine_id(github_url)

	if routine_id is None:
		return None

	pull_request_parts = github_url.split('/')

	pull_request_sender = pull_request_parts[3]
	pull_request_number = pull_request_parts[6]

	search_name = pull_request_sender
	matching_name = '> %s - PR#%s' % (pull_request_sender, pull_request_number)

	return get_build_id(routine_id, search_name, matching_name)

def get_fixpack_build_id(version_name):
	if version_name is None or version_name.find('fix-pack-base-') == 0:
		return None

	liferay_version = get_liferay_version(version_name)
	routine_id = get_routine_id(version_name)

	if routine_id is None:
		return None

	fix_id = int(version_name.split('-')[3])

	if fix_id == 0:
		return None

	service_pack = max([x for x, y in enumerate(service_packs[liferay_version]) if y <= fix_id])
	search_name = '%s.10.%d' % (liferay_version, service_pack) if service_pack > 0 else '%s.10' % liferay_version
	matching_name = ' - liferay-%s - ' % version_name

	return get_build_id(routine_id, search_name, matching_name)

def get_hotfix_build_id(hotfix_url, patcher_build=None):
	if hotfix_url is None:
		return None

	routine_id = get_routine_id(hotfix_url)

	if routine_id is None:
		return None

	hotfix_id = hotfix_url[hotfix_url.rfind('/') + 1 : hotfix_url.rfind('.')]

	hotfix_parts = hotfix_id.split('-')
	hotfix_number = hotfix_parts[2]

	if hotfix_url.find('.lpkg') != -1:
		test_url = get_jenkins_test_url(patcher_build)

		if test_url is None:
			return None

		search_name = 'fix.pack.file.name'
		matching_name = test_url[test_url.rfind('/')+1:]
	else:
		search_name = hotfix_number
		matching_name = hotfix_id

	return get_build_id(routine_id, search_name, matching_name)

def get_run_id(build_id, run_number):
	if build_id is None:
		return None

	print('Looking up testray run by testray build')

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.runs/index'

	parameters = {
		'testrayBuildId': build_id,
		'cur': 0,
		'delta': 100,
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to determine testray runs for testray build %s' % (build_id))
		return None

	first_runs = [
		run['testrayRunId'] for run in json_response['data']
			if run['number'] == run_number
	]

	if len(first_runs) == 0:
		print('Unable to determine testray runs for testray build %s' % (build_id))
		return None

	return first_runs[0]

def get_testray_url(a, b, run_number='1'):
	a_run_id = get_run_id(a, run_number)

	if a_run_id is None:
		return None

	b_run_id = get_run_id(b, run_number)

	if b_run_id is None:
		return 'https://testray.liferay.com/home/-/testray/case_results?testrayBuildId=%s&testrayRunId=%s' % (a, a_run_id)

	return 'https://testray.liferay.com/home/-/testray/runs/compare?testrayRunIdA=%s&testrayRunIdB=%s&view=details' % (a_run_id, b_run_id)

# Retrieve a Jenkins URL for a patcher build

def open_jenkins_build_urls(patcher_build_id):
	jenkins_queue_urls = []

	for i in range(1, 24):
		url = 'https://test-1-%s.liferay.com/queue/api/xml' % i

		response = requests.get(url, auth=(username, password))
		tree = ElementTree.fromstring(response.content)
		items = tree.findall('./item/action/parameter[name="patcher.build.id"][value="%s"]/../..' % patcher_build_id)

		if len(items) > 0:
			jenkins_queue_urls.append('https://test-1-%d.liferay.com/job/fixpack-builder-hotfix-7x(production)/' % i)

	jenkins_build_urls = []

	for i in range(1, 24):
		url = 'https://test-1-%d.liferay.com/job/fixpack-builder-hotfix-7x(production)/api/xml?tree=builds[number,timestamp,actions[parameters[name,value]]]&xpath=//build[action[parameter[name="patcher.build.id"][value="%s"]]]/*[self::number or self::timestamp]&wrapper=builds&pretty=true' % (i, patcher_build_id)

		response = requests.get(url, auth=(username, password))
		tree = ElementTree.fromstring(response.content)

		jenkins_build_numbers = [child.text for child in tree.iter('number')]
		jenkins_build_timestamps = [int(child.text) for child in tree.iter('timestamp')]

		jenkins_build_urls += [
			(timestamp, 'https://test-1-%d.liferay.com/job/fixpack-builder-hotfix-7x(production)/%s/' % (i, number))
				for number, timestamp in zip(jenkins_build_numbers, jenkins_build_timestamps)
		]

	jenkins_build_urls.sort()

	for timestamp, build_url in jenkins_build_urls:
		webbrowser.open_new_tab(build_url)

	for build_url in jenkins_queue_urls:
		webbrowser.open_new_tab(build_url)

# Retrieve a Jenkins URL for a patcher build's tests

def get_jenkins_test_url(patcher_build):
	patcher_build_id = patcher_build['patcherBuildId']
	url = 'https://test-1-1.liferay.com/job/test-portal-hotfix-release/api/xml?tree=builds[number,actions[parameters[name,value]]]&xpath=//parameter[name="PATCHER_BUILD_ID"][value="%s"]/../../number&wrapper=builds&pretty=true' % patcher_build_id

	response = requests.get(url, auth=(username, password))
	tree = ElementTree.fromstring(response.content)

	jenkins_build_numbers = [child.text for child in tree.iter('number')]

	if len(jenkins_build_numbers) == 0:
		if patcher_build['statusLabel'] != 'complete' and patcher_build['statusLabel'] != 'released':
			open_jenkins_build_urls(patcher_build_id)

		return None

	return 'https://test-1-1.liferay.com/job/test-portal-hotfix-release/%s/' % jenkins_build_numbers[0]

# Main logic for deciding which URL to use

def open_testray(urls):
	builds = []

	for url in urls:
		if url.find('?') != -1:
			url = url[0:url.find('?')]

		build_id = None
		patcher_build = None

		if url.find('https://github.com/') == 0:
			build_id = get_github_build_id(url)
		elif url.find('fix-pack-de-') == 0 or url.find('fix-pack-dxp-') == 0:
			build_id = get_fixpack_build_id(url)
		elif url.find('https://patcher.liferay.com/') == 0:
			patcher_build = get_patcher_build(url)
			build_id = get_hotfix_build_id(patcher_build['downloadURL'] if patcher_build is not None else None, patcher_build)
		elif url.find('https://files.liferay.com/') == 0:
			build_id = get_hotfix_build_id(url)
		elif url.find('http://files.liferay.com/') == 0:
			build_id = get_hotfix_build_id(url)
		else:
			print('Unable to determine testray build ID from %s' % url)
			continue

		if build_id is not None:
			builds.append((build_id, patcher_build))

	if len(builds) == 1:
		build_id, patcher_build = builds[0]

		previous_build_id = None
		previous_patcher_build = get_previous_patcher_build(patcher_build)

		if previous_patcher_build is not None:
			previous_build_id = get_hotfix_build_id(previous_patcher_build['downloadURL'], previous_patcher_build)

		if previous_build_id is None:
			print('First build for customer, comparing against fix pack tests')
			previous_build_id = get_fixpack_build_id(patcher_build['patcherProjectVersionName'])

		testray_url = get_testray_url(build_id, previous_build_id)

		if testray_url is not None:
			webbrowser.open_new_tab(testray_url)
	elif len(builds) > 1:
		build_id, patcher_build = builds[0]

		for previous_build in builds[1:]:
			testray_url = get_testray_url(build_id, previous_build[0])

			if testray_url is not None:
				webbrowser.open_new_tab(testray_url)
	elif patcher_build is not None:
		jenkins_url = get_jenkins_test_url(patcher_build)

		if jenkins_url is not None:
			webbrowser.open_new_tab(jenkins_url)
		else:
			print('Unable to find Jenkins build for patcher build %s' % patcher_build['patcherBuildId'])

# Main method

if __name__ == '__main__':
	if len(sys.argv) > 1:
		open_testray(sys.argv[1:])
	else:
		qa_build_urls = get_qa_build_urls()

		if len(qa_build_urls) != 0:
			webbrowser.open_new_tab('https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds?_1_WAR_osbpatcherportlet_tabs1=fixes')

			for qa_build_url in get_qa_build_urls():
				open_testray([qa_build_url])