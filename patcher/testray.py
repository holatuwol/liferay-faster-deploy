from bs4 import BeautifulSoup
import json
from scrape_liferay import get_liferay_content, get_namespaced_parameters
import sys
import webbrowser

# Utility methods for bridging Liferay systems

def get_liferay_version(url):
	if url.find('https://files.liferay.com/') == 0 or url.find('http://files.liferay.com/') == 0:
		url_parts = url.split('/')
		version_id = url_parts[6]
		return version_id[:version_id.rfind('.')]

	if url.find('https://github.com/'):
		# TODO
		return 'master'

	print('Unable to determine Liferay version from %s' % url)
	return None

# Utility methods for dealing with Patcher Portal

def get_qa_build_urls():
	base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds'

	parameters = {
		'tabs1': 'accounts'
	}

	namespaced_parameters = get_namespaced_parameters('1_WAR_osbpatcherportlet', parameters)

	qa_builds_html = get_liferay_content(base_url, parameters)
	soup = BeautifulSoup(qa_builds_html, 'html.parser')

	search_container = soup.find('div', {'id': '_1_WAR_osbpatcherportlet_patcherBuildsSearchContainerSearchContainer'})

	if search_container is None:
		return []

	table = search_container.find('table')

	if table is None:
		return []

	thead = table.find('thead')
	tbody = table.find('tbody')

	if thead is None or tbody is None:
		return []

	build_id_index = -1
	qa_status_index = -1

	for i, th in enumerate(thead.find_all('th')):
		th_text = th.text.strip().lower()

		if th_text == 'build id':
			build_id_index = i
		elif th_text == 'qa status':
			qa_status_index = i

	if build_id_index == -1 or qa_status_index == -1:
		return []

	links = []

	for tr in tbody.find_all('tr'):
		cells = tr.find_all('td')

		if cells is not None and cells[build_id_index] is not None and cells[qa_status_index] is not None:
			if cells[qa_status_index].text.strip().lower() != 'qa analysis needed':
				continue

			for link_tag in cells[build_id_index].find_all('a'):
				if link_tag['href'].find('https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/') == 0:
					links.append(link_tag['href'])

	return links

def get_patcher_build(url):
	build_url_parts = url.split('/')
	build_id = build_url_parts[-1]

	base_url = 'https://patcher.liferay.com/api/jsonws/osb-patcher-portlet.builds/view'

	parameters = {
		'id': build_id
	}

	json_response = json.loads(get_liferay_content(base_url, parameters, 'post'))

	if json_response['status'] != 200:
		print('Unable to retrieve account code for %s' % url)
		return None

	return json_response['data']

def get_previous_patcher_build(patcher_build):
	if patcher_build is None:
		return None

	account_code = patcher_build['patcherBuildAccountEntryCode']

	if account_code is None:
		return None

	base_url = 'https://patcher.liferay.com/api/jsonws/osb-patcher-portlet.accounts/view'

	parameters = {
		'limit': 10,
		'patcherBuildAccountEntryCode': account_code
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to retrieve account builds for %s' % account_code)
		return None

	matching_builds = [
		build for build in json_response['data']
			if build['statusLabel'] == 'complete' and
				build['qaStatusLabel'] == 'qa-automation-passed' and
				build['downloadURL'][-8:] == patcher_build['downloadURL'][-8:] and
				build['patcherBuildId'] != patcher_build['patcherBuildId']
	]

	if len(matching_builds) == 0:
		return None

	browser_parameters = {
		'patcherBuildAccountEntryCode': account_code
	}

	same_baseline_builds = [
		build for build in matching_builds
			if build['patcherProjectVersionId'] == patcher_build['patcherProjectVersionId']
	]

	if len(same_baseline_builds) != 0:
		matching_builds = same_baseline_builds
		browser_parameters['patcherProjectVersionId'] = patcher_build['patcherProjectVersionId']

	browser_base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view'
	browser_namespaced_parameters = get_namespaced_parameters('1_WAR_osbpatcherportlet', browser_parameters)
	browser_query_string = '&'.join(['%s=%s' % (key, value) for key, value in browser_namespaced_parameters.items()])

	webbrowser.open_new_tab('%s?%s' % (browser_base_url, browser_query_string))

	patcher_build_fixes = set(patcher_build['patcherBuildName'].split(','))

	best_matching_build = None
	best_matching_build_overlap = len(patcher_build_fixes)

	for matching_build in matching_builds:
		matching_build_overlap = len(patcher_build_fixes - set(matching_build['patcherBuildName'].split(',')))

		if matching_build_overlap < best_matching_build_overlap:
			best_matching_build = matching_build
			best_matching_build_overlap = matching_build_overlap

	return best_matching_build

def get_hotfix_url(url):
	if url.find('https://patcher.liferay.com/') != 0:
		return url

	patcher_build = get_patcher_build(url)

	if patcher_build is None:
		return None

	return patcher_build['downloadURL']

# Utility methods for dealing with Testray

def get_project_id(url):
	version = get_liferay_version(url)

	if version is None:
		return None

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.projects/index'

	parameters = {
		'cur': 0,
		'delta': 100,
		'start': -1,
		'end': -1
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to determine project ID from %s' % url)
		return None

	matching_name = 'Liferay Portal %s' % (version if version != 'master' else '7.1')

	matching_project_ids = [
		project['testrayProjectId'] for project in json_response['data']
			if project['name'] == matching_name
	]

	if len(matching_project_ids) != 1:
		print('Unable to determine project ID from %s' % url)
		return None

	return matching_project_ids[0]

def get_routine_id(url):
	project_id = get_project_id(url)

	if project_id is None:
		return None

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
		print('Unable to determine routine ID from %s' % url)
		return None

	matching_name = None

	if url.find('https://github.com') == 0:
		matching_name = 'CE Pull Request' if url.find('-ee') == -1 else 'EE Pull Request'
	elif url.find('https://files.liferay.com') == 0:
		matching_name = 'Hotfix Tester'
	elif url.find('http://files.liferay.com') == 0:
		matching_name = 'Hotfix Tester'
	else:
		print('Unable to determine routine ID from %s' % url)

	matching_routine_ids = [
		routine['testrayRoutineId'] for routine in json_response['data']
			if routine['name'] == matching_name
	]

	if len(matching_routine_ids) != 1:
		print('Unable to determine routine ID from %s' % url)
		return None

	return matching_routine_ids[0]

def get_build_id(routine_id, search_name, matching_name, archived=False):
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
		print('Unable to determine build for routine %s, search string %s' % (routine_id, search_name))
		return None

	matching_build_ids = [
		build['testrayBuildId'] for build in json_response['data']
			if build['name'].find(matching_name) != -1
	]

	if len(matching_build_ids) == 0:
		if not archived:
			return get_build_id(routine_id, search_name, matching_name, True)

		print('Unable to determine build for routine %s, search string %s, matching string %s' % (routine_id, search_name, matching_name))
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

def get_hotfix_build_id(hotfix_url):
	if hotfix_url is None:
		return None

	routine_id = get_routine_id(hotfix_url)

	if routine_id is None:
		return None

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.builds/index'

	hotfix_id = hotfix_url[hotfix_url.rfind('/') + 1 : hotfix_url.rfind('.')]

	hotfix_parts = hotfix_id.split('-')
	hotfix_number = hotfix_parts[2]

	search_name = hotfix_number
	matching_name = hotfix_id

	return get_build_id(routine_id, search_name, matching_name)

def get_run_id(build_id, run_number):
	if build_id is None:
		return None

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.runs/index'

	parameters = {
		'testrayBuildId': build_id,
		'cur': 0,
		'delta': 100,
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	if json_response['status'] != 200:
		print('Unable to determine runs for build %s' % (build_id))
		return None

	first_runs = [
		run['testrayRunId'] for run in json_response['data']
			if run['number'] == run_number
	]

	if len(first_runs) == 0:
		print('Unable to determine runs for build %s' % (build_id))
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

# Main logic for deciding which URL to use

def open_testray(url):
	if url.find('?') != -1:
		url = url[0:url.find('?')]

	patcher_url = None
	hotfix_url = None

	if url.find('https://github.com/') == 0:
		build_id = get_github_build_id(url)
	if url.find('https://patcher.liferay.com/') == 0:
		patcher_url = url
	elif url.find('https://files.liferay.com/') == 0:
		build_id = get_hotfix_build_id(url)
	elif url.find('http://files.liferay.com/') == 0:
		build_id = get_hotfix_build_id(url)
	else:
		print('Unable to determine build URL from %s' % url)
		return

	testray_url = None

	if patcher_url is not None:
		patcher_build = get_patcher_build(patcher_url)

		if patcher_build is None:
			return

		build_id = get_hotfix_build_id(patcher_build['downloadURL'])

		if build_id is None:
			return

		previous_patcher_build = get_previous_patcher_build(patcher_build)

		if previous_patcher_build is not None:
			previous_build_id = get_hotfix_build_id(previous_patcher_build['downloadURL'])
			testray_url = get_testray_url(build_id, previous_build_id)

	if testray_url is None:
		testray_url = get_testray_url(build_id, None)

	if testray_url is not None:
		webbrowser.open_new_tab(testray_url)

# Main method

if __name__ == '__main__':
	if len(sys.argv) > 1:
		open_testray(sys.argv[1])
	else:
		qa_build_urls = get_qa_build_urls()

		if len(qa_build_urls) != 0:
			webbrowser.open_new_tab('https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds?_1_WAR_osbpatcherportlet_tabs1=fixes')

			for qa_build_url in get_qa_build_urls():
				open_testray(qa_build_url)