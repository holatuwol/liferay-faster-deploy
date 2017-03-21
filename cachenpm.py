#!/usr/bin/env python

from collections import defaultdict
from distutils.version import LooseVersion
import json

with open('cachenpm.txt', 'r') as f:
	lines = f.readlines()

all_dependencies = defaultdict(set)

def add_dependencies(dependencies):
	for name, version in dependencies.items():
		all_dependencies[name].add(version)

for line in lines:
	with open(line.strip()) as f:
		package_json = json.load(f)

		if 'dependencies' in package_json:
			add_dependencies(package_json['dependencies'])

		if 'devDependencies' in package_json:
			add_dependencies(package_json['devDependencies'])

max_dependencies = {
	name: str(max([LooseVersion(value) for value in values]))
		for name, values in all_dependencies.items()
}

with open('package.json', 'w') as f:
	json.dump({
		'name': 'liferay-portal',
		'version': '0.0.0',
		'devDependencies': max_dependencies
	}, f, sort_keys=True, indent=4)
