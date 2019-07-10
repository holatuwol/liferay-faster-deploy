#!/usr/bin/env python

import json
from scrape_liferay import get_liferay_content, get_namespaced_parameters
import sys

def get_patcher_build(url):
	build_url_parts = url.split('/')
	build_id = build_url_parts[-1]

	if not build_id.isnumeric():
		return None

	print('Looking up metadata for patcher build %s' % build_id)

	base_url = 'https://patcher.liferay.com/api/jsonws/osb-patcher-portlet.builds/view'

	parameters = {
		'id': build_id
	}

	json_response = json.loads(get_liferay_content(base_url, parameters, 'post'))

	if json_response['status'] != 200:
		print('Unable to retrieve patcher account code for %s' % url)
		return None

	return json_response['data']

def get_hotfix_url(url):
	if url.find('https://patcher.liferay.com/') != 0:
		return url

	patcher_build = get_patcher_build(url)

	if patcher_build is None:
		return None

	return patcher_build['downloadURL']

if __name__ == '__main__':
	print(get_hotfix_url(sys.argv[1]))