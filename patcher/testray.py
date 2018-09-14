from bs4 import BeautifulSoup
import json
from scrape_liferay import get_liferay_content, get_namespaced_parameters
import sys
import webbrowser

def get_project_version(url):
	if url.find('https://files.liferay.com/') == 0 or url.find('http://files.liferay.com/') == 0:
		url_parts = url.split('/')
		version_id = url_parts[6]
		return version_id[:version_id.rfind('.')]

	if url.find('https://github.com/'):
		# TODO
		return 'master'

	print('Unable to determine Liferay version from %s' % url)
	return None

def get_project_id(url):
	version = get_project_version(url)

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

def get_github_build_url(url):
	routine_id = get_routine_id(url)

	if routine_id is None:
		return None

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.builds/index'

	pull_request_parts = url.split('/')

	pull_request_sender = pull_request_parts[3]
	pull_request_number = pull_request_parts[6]

	parameters = {
		'name': pull_request_sender,
		'testrayRoutineId': routine_id,
		'archived': False,
		'cur': 0,
		'delta': 100,
		'start': -1,
		'end': -1
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	matching_name = '> %s - PR#%s' % (pull_request_sender, pull_request_number)

	matching_build_urls = [
		build['htmlURL'] for build in json_response['data']
			if build['name'].find(matching_name) != -1
	]

	if len(matching_build_urls) != 1:
		print('Unable to determine build URL from %s' % url)
		return None

	return matching_build_urls[0]

def get_hotfix_url(url):
	if url.find('https://patcher.liferay.com/') != 0:
		return url

	hotfix_html = get_liferay_content(url)

	if hotfix_html is None:
		print('Unable to determine hotfix ID from %s' % url)
		return None

	soup = BeautifulSoup(hotfix_html, 'html.parser')

	download_label = soup.find('label', {'for': '_1_WAR_osbpatcherportlet_official'})

	if download_label is None:
		print('Unable to determine hotfix ID from %s' % url)
		return None

	download_link = download_label.parent.find('a')

	if download_link is None:
		print('Unable to determine hotfix ID from %s' % url)
		return None

	return download_link['href']

def get_hotfix_build_url(url):
	hotfix_url = get_hotfix_url(url)

	if hotfix_url is None:
		return None

	routine_id = get_routine_id(hotfix_url)

	if routine_id is None:
		return None

	base_url = 'https://testray.liferay.com/api/jsonws/osb-testray-web.builds/index'

	hotfix_id = hotfix_url[hotfix_url.rfind('/') + 1 : hotfix_url.rfind('.')]

	hotfix_parts = hotfix_id.split('-')
	hotfix_number = hotfix_parts[2]

	parameters = {
		'name': hotfix_number,
		'testrayRoutineId': routine_id,
		'archived': False,
		'cur': 0,
		'delta': 100,
		'start': -1,
		'end': -1
	}

	json_response = json.loads(get_liferay_content(base_url, parameters))

	matching_build_urls = [
		build['htmlURL'] for build in json_response['data']
			if build['name'].find(hotfix_id) != -1
	]

	if len(matching_build_urls) != 1:
		print('Unable to determine build URL from %s' % url)
		return None

	return matching_build_urls[0]

def get_build_url(url):
	if url.find('https://github.com/') == 0:
		return get_github_build_url(url)

	if url.find('https://patcher.liferay.com/') == 0:
		return get_hotfix_build_url(url)

	if url.find('https://files.liferay.com/') == 0:
		return get_hotfix_build_url(url)

	if url.find('http://files.liferay.com/') == 0:
		return get_hotfix_build_url(url)

	print('Unable to determine build URL from %s' % url)
	return None

if len(sys.argv) > 1:
	build_url = get_build_url(sys.argv[1])

	if build_url is not None:
		webbrowser.open_new_tab(build_url)
else:
	print('testray <github_url>')
	print('testray <hotfix_url>')