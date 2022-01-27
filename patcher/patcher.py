#!/usr/bin/env python

from bs4 import BeautifulSoup
import inspect
import json
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import re
from scrape_liferay import get_liferay_content, get_namespaced_parameters
import sys

script_git_root = dirname(dirname(abspath(inspect.getfile(inspect.currentframe()))))

sys.path.insert(0, script_git_root)

from getparent import getparent
import git
from git import git_root, current_branch
import webbrowser
import webbrowser_patch

base_branch = getparent(False)
base_tag = getparent(True)

def process_patcher_search_container(base_url, parameters, container_name, column_names, callback):
	namespaced_parameters = get_namespaced_parameters('1_WAR_osbpatcherportlet', parameters)
	namespaced_parameters['p_p_state'] = 'exclusive'

	html = get_liferay_content(base_url, namespaced_parameters)
	soup = BeautifulSoup(html, 'html.parser')

	namespaced_container_name = '_1_WAR_osbpatcherportlet_%s' % container_name
	search_container = soup.find('div', {'id': namespaced_container_name})

	if search_container is None:
		print('Unable to find search results %s' % namespaced_container_name)
		return

	table = search_container.find('table')

	if table is None:
		print('Unable to find search results %s' % (namespaced_container_name))
		return

	thead = table.find('thead')
	tbody = table.find('tbody')

	if thead is None or tbody is None:
		print('No search results %s' % (namespaced_container_name))
		return

	column_indices = [-1] * len(column_names)

	for i, th in enumerate(thead.find_all('th')):
		th_text = th.text.strip().lower()

		for j, column_name in enumerate(column_names):
			if th_text == column_name:
				column_indices[j] = i

	missing_column = False

	for column_index, column_name in zip(column_indices, column_names):
		if column_index == -1:
			print('Unable to find column %s in search results %s' % (column_name, namespaced_container_name))
			missing_column = True

	if missing_column:
		return

	for tr in tbody.find_all('tr'):
		cells = tr.find_all('td')

		if cells is None:
			continue

		null_cell = False

		for index in column_indices:
			if cells[index] is None:
				null_cell = True
				break

		if not null_cell:
			callback({name: cells[index] for index, name in zip(column_indices, column_names)})

def get_baseline_id():
	with open(join(dirname(sys.argv[0]), 'patcher.json'), 'r') as file:
		patcher_json = json.load(file)

		return patcher_json[base_branch], patcher_json[base_tag] if base_tag in patcher_json else None

def get_fix_id(typeFilter='0'):
	base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher'
	candidate_fix_names = None

	if len(sys.argv) >= 3 and len(sys.argv[2]) > 0:
		if re.search('^[0-9]*$', sys.argv[2]) is not None:
			return sys.argv[2], None
		else:
			candidate_fix_names = [','.join(sys.argv[2:])]

	if candidate_fix_names is None:
		candidate_fix_names = get_candidate_fix_names()

	for fix_name in candidate_fix_names:
		print('Checking patcher portal for existing fix for %s (typeFilter=%s)...' % (fix_name, typeFilter))

		parameters = {
			'advancedSearch': 'true',
			'patcherProjectVersionIdFilter': get_baseline_id()[1],
			'patcherFixName': fix_name,
			'hideOldFixVersions': 'true',
			'typeFilter': typeFilter,
			'andOperator': 'true'
		}

		fix_ids = []

		def process_fix_row(columns):
			candidate_fix_name = ''.join(columns['content'].text.split())

			if candidate_fix_name == fix_name:
				fix_ids.append(columns['fix id'].text.strip())

		try:
			process_patcher_search_container(
				base_url, parameters, 'patcherFixsSearchContainerSearchContainer',
				['fix id', 'content'], process_fix_row)
		except:
			pass

		if len(fix_ids) == 1:
			return fix_ids[0], fix_name

	if len(sys.argv) >= 3 and len(sys.argv[2]) > 0:
		return None, ','.join(sys.argv[2:])

	return None, None

def get_candidate_fix_names():
	pattern = re.compile('LP[EPS]-[0-9]*')

	if current_branch.find('LPE-') == 0 or current_branch.find('LPP-') == 0 or current_branch.find('LPS-') == 0:
		yield ','.join(sorted(pattern.findall(current_branch)))

	fixes = set()

	for line in git.log('%s..%s' % (base_tag, 'HEAD'), '--pretty=%s').split('\n'):
		fixes.update(pattern.findall(line))

	if len(fixes) > 0:
		yield ','.join(sorted(fixes))

def get_fix_name_from_id(fix_id):
	if fix_id is None:
		return None

	base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/%s/edit' % fix_id
	fix_html = get_liferay_content(base_url)
	soup = BeautifulSoup(fix_html, 'html.parser')

	textarea = soup.find('textarea', {'id': '_1_WAR_osbpatcherportlet_patcherFixName'})

	if textarea is None:
		return None

	return textarea.text.strip()

def open_patcher_portal():
	fix_id = None
	fix_name = None

	if current_branch.find('patcher-') == 0:
		fix_id = current_branch[len('patcher-'):]
	elif current_branch.find('fix-pack-fix-') == 0:
		fix_id = current_branch[len('fix-pack-fix-'):]

	for typeFilter in ['0', '1', '6', '2']:
		if fix_id is None:
			fix_id, fix_name = get_fix_id(typeFilter)

	if fix_id is None:
		print('No existing fix to update, opening window for a new fix...')
		base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/create'
	else:
		print('Opening window to update fix %s...' % fix_id)
		base_url = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/%s/edit' % fix_id

	product_version, project_version = get_baseline_id()

	origin_name = sys.argv[1]

	parameters = {
		'patcherProductVersionId': product_version,
		'patcherProjectVersionId': project_version,
		'committish': current_branch,
		'gitRemoteURL': origin_name
	}

	if fix_name is not None:
		parameters['patcherFixName'] = fix_name
	elif fix_id is not None:
		parameters['patcherFixName'] = get_fix_name_from_id(fix_id)
	else:
		pattern = re.compile('LP[EPS]-[0-9]*')
		fixes = set()

		for line in git.log('%s..%s' % (base_tag, 'HEAD'), '--pretty=%s').split('\n'):
			fixes.update(pattern.findall(line))

		parameters['patcherFixName'] = ','.join(sorted(fixes))

	namespaced_parameters = get_namespaced_parameters('1_WAR_osbpatcherportlet', parameters)

	query_string = '&'.join(['%s=%s' % (key, value) for key, value in namespaced_parameters.items() if value is not None])
	webbrowser.open_new_tab('%s?%s' % (base_url, query_string))

if __name__ == '__main__':
	open_patcher_portal()