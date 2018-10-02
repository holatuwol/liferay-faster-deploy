from bs4 import BeautifulSoup
import os
import sys
import ujson as json

sys.path.insert(1, os.path.join(sys.path[0], '..'))
import git

def get_short_name(file_name):
	return file_name[file_name.rfind('/') + 1 : file_name.rfind('.')]

def get_command_name(line):
	pos = line.find('name="') + 6
	return line[pos:line.find('"', pos)]

def get_commands(ref_name, file_name):
	return {
		'path': file_name,
		'commands': {
			get_command_name(line): i
				for i, line in enumerate(git.show('%s:%s' % (ref_name, file_name)).split('\n'), 1)
					if line.find('<command') != -1
		}
	}

def get_test_metadata(ref_name):
	print('Retrieving functional test metadata for %s' % ref_name)
	file_names = git.ls_tree('-r', '--name-only', ref_name, 'portal-web/test/functional').split('\n')

	return {
		'testcases': { get_short_name(file_name): get_commands(ref_name, file_name) for file_name in file_names if file_name.find('.testcase') != -1 },
		'macros': { get_short_name(file_name): get_commands(ref_name, file_name) for file_name in file_names if file_name.find('.macro') != -1 }
	}

metadata = [
	{ 'ref_name': 'ee-6.2.x', 'routines': [{'project': 'Liferay Portal 6.2'}] },
	{ 'ref_name': '7.0.x', 'routines': [{'project': 'Liferay Portal 7.0'}] },
	{ 'ref_name': '7.1.x', 'routines': [{'project': 'Liferay Portal 7.1'}] },
	{ 'ref_name': 'master', 'routines': [{'project': 'Liferay Portal 7.1', 'routine': 'CE Pull Request'}] }
]

for metadata_item in metadata:
	metadata_item.update(get_test_metadata(metadata_item['ref_name']))

with open('testinfo.json', 'w') as f:
	json.dump(metadata, f)