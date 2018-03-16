#!/usr/bin/env python

from __future__ import print_function
import json
import os
import os.path
import sys

sys.path.insert(1, os.path.join(sys.path[0], '..'))
from git import git_root
from sourcetrie import SourceTrie, get_rd_file

rush_version = sys.argv[1]
npm_version = sys.argv[2]
node_version = sys.argv[3]

if node_version[0] == 'v':
	node_version = node_version[1:]

module_paths = SourceTrie.load(get_rd_file())
application_paths = set()

with open(get_rd_file('rush.txt'), 'r') as f:
	for file_name in [line.strip() for line in f.readlines()]:
		node = module_paths.find_leaf(file_name)

		if node is None:
			continue

		node_path = node.get_path()

		if not os.path.isfile(os.path.join(node_path, 'package.json')):
			continue

		application_paths.add(node_path)

def get_package_name(application_path):
	with open(os.path.join(application_path, 'package.json'), 'r') as f:
		package_json = json.load(f)
		return package_json['name']

	return None

rush_metadata = {
	'rushVersion': rush_version,
	'npmVersion': npm_version,
	'nodeSupportedVersionRange': node_version,
	'projectFolderMaxDepth': 100,
	'projects': [{'packageName': get_package_name(application_path), 'projectFolder': application_path} for application_path in application_paths]
}

with open(os.path.join(git_root, 'rush.json'), 'w') as f:
	json.dump(rush_metadata, f, indent=4)