#!/usr/bin/env python

import inspect
import json
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import sys

sys.path.insert(0, join(dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))), 'patcher'))

from scrape_liferay import get_liferay_content, get_namespaced_parameters

assert len(sys.argv) > 2, "python get_feed.py <user.feed.url> <output.file.name>"

screen_name = sys.argv[1]

if screen_name.rfind('/') != -1:
	screen_name = screen_name[screen_name.rfind('/') + 1:]

def get_class_name_id(class_name):
	api_url = 'https://loop.liferay.com/api/jsonws/classname/fetch-class-name-id'

	params = {
		'value': class_name
	}

	return json.loads(get_liferay_content(api_url, params))

class_name_id = get_class_name_id('com.liferay.loop.model.LoopPerson')

api_url = 'https://loop.liferay.com/api/jsonws/loop-portlet.people/search'
params = {
	'keywords': screen_name,
	'start': -1,
	'end': -1
}

response_body = json.loads(get_liferay_content(api_url, params))['data']

assert response_body['total'] == 1, '%s did not match exactly one user' % screen_name

loop_person = response_body['results'][0]

class_pk = loop_person['entityClassPK']

api_url = 'https://loop.liferay.com/api/jsonws/loop-portlet.feed/viewOldFeed'
params = {
	'childAssetEntrySetsLimit': 0,
	'classNameId': class_name_id,
	'classPK': class_pk,
	'createTime': 0,
	'likedParticipantsLimit': 0,
	'parentAssetEntrySetId': 0,
	'start': -1,
	'end': -1
}

feed_json = json.loads(get_liferay_content(api_url, params))

feed_items = feed_json['data'] if 'data' in feed_json else []

created_feed_items = [
	feed_item for feed_item in feed_items
		if feed_item['creatorClassNameId'] == class_name_id and feed_item['creatorClassPK'] == class_pk
]

with open(sys.argv[2], 'w') as f:
	json.dump(created_feed_items, f)

print(feed_json)