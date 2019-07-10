#!/usr/bin/env python

import datetime
import humanize
import inspect
import json
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import re
import sys

sys.path.insert(0, join(dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))), 'patcher'))

from scrape_liferay import get_liferay_content, get_namespaced_parameters

def get_class_name_id(class_name):
	api_url = 'https://loop.liferay.com/api/jsonws/classname/fetch-class-name-id'

	params = {
		'value': class_name
	}

	return json.loads(get_liferay_content(api_url, params))

loop_service_paths = {
	'com.liferay.loop.model.LoopPerson': 'people',
	'com.liferay.loop.model.LoopDivision': 'divisions'
}

class_names = {
	get_class_name_id(class_name): class_name
		for class_name in loop_service_paths.keys()
}

external_references = { key: {} for key in class_names.keys() }

def get_reference(class_name_id, class_pk):
	if class_pk not in external_references[class_name_id]:
		class_name = class_names[class_name_id]
		api_url = 'https://loop.liferay.com/api/jsonws/loop-portlet.%s/view' % loop_service_paths[class_name]

		params = {
			'id': class_pk
		}

		response = json.loads(get_liferay_content(api_url, params))

		data = response['data']

		if class_name == 'com.liferay.loop.model.LoopDivision':
			data = data['loopDivisionCompositeJSONObject']

		external_references[class_name_id][class_pk] = '[%s](https://loop.liferay.com%s)' % (data['name'], data['displayURL'])

	return external_references[class_name_id][class_pk]

topic_pattern = re.compile('(^|\\s)#([A-Za-z][A-Za-z0-9]*)', re.UNICODE)

def format_message(raw_message):
	formatted_message = raw_message

	topics = set([item[1] for item in re.findall(topic_pattern, formatted_message)])

	for topic in topics:
		formatted_message = formatted_message.replace('#%s' % topic, '[#%s](https://loop.liferay.com/web/guest/home/-/loop/topics/%s)' % (topic, topic))

	references = re.findall('(%~\\{\\}~%@([0-9]*):([0-9]*)%~\\{\\}~%)', formatted_message)

	for reference in references:
		formatted_message = formatted_message.replace(reference[0], get_reference(int(reference[1]), int(reference[2])))

	return formatted_message

with open(sys.argv[1], 'r') as f:
	created_feed_items = json.load(f)

with open('%s.md' % sys.argv[1], 'w') as f:
	fprint = lambda x = '': print(x, file=f)

	payload = json.loads(created_feed_items[0]['payload'])
	creator = payload['creator']

	fprint('# [%s](https://loop.liferay.com%s)' % (creator['name'], creator['displayURL']))
	fprint('## %s &middot; %s' % (creator['jobTitle'], creator['locationName']))

	fprint()

	for feed_item in created_feed_items:
		payload = json.loads(feed_item['payload'])

		post_time = datetime.datetime.fromtimestamp(int(feed_item['createTime'] / 1000))

		fprint('# [%s](https://loop.liferay.com%s) (%s)' % (post_time.isoformat(), feed_item['displayURL'], humanize.naturaltime(post_time)))
		fprint()

		fprint(format_message(payload['rawMessage']))
		fprint()