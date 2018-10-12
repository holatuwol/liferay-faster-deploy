#!/usr/bin/env python

from __future__ import print_function
import csv
import os.path
import pandas as pd
import sys

sys.path.insert(1, os.path.join(sys.path[0], '..'))
from git import git_root
from sourcetrie import SourceTrie, get_rd_file

# Identify excluded packages

excluded_packages = []

if os.path.isfile('modules/core/portal-bootstrap/system.packages.extra.bnd'):
	with open('modules/core/portal-bootstrap/system.packages.extra.bnd') as f:
		is_export = False

		for line in f.readlines():
			if line.startswith('Export-Package:'):
				is_export = True
				continue

			if not line[0:1].isspace():
				is_export = False
				continue

			if not is_export:
				continue

			line = line.strip()

			if line[0] != '!':
				continue

			x = 1
			y = line.find(';')

			if y < 0:
				y = line.find(',')

			excluded_packages.append(line[x:y])

def is_excluded_package(package_name):
	for excluded_package in excluded_packages:
		if excluded_package == package_name:
			return True

		if excluded_package.startswith('*.') and excluded_package.endswith('.*'):
			if package_name.find(excluded_package[2:-2]) >= 0:
				return True
		elif excluded_package.startswith('*.'):
			if package_name.endswith(excluded_package[2:]):
				return True
		elif excluded_package.endswith('.*'):
			if package_name.startswith(excluded_package[0:-2]):
				return True

	return False

# Process the packageinfo.txt

module_paths = SourceTrie.load(get_rd_file())
module_versions = []

with open(get_rd_file('packageinfo.txt'), 'r') as f:
	for folder_name in [line.strip() for line in f.readlines()]:
		node = module_paths.find_leaf(folder_name)

		if node is None:
			print('Unable to determine package name for %s' % folder_name, file=sys.stderr)
			continue

		path = node.get_path()

		relative_path = folder_name[len(path) + 1:]

		if relative_path == 'src':
			continue

		if relative_path.find('src/main/resources/') == 0:
			package_name = relative_path[19:].replace('/', '.')
		elif relative_path.find('src/main/java/') == 0:
			package_name = relative_path[14:].replace('/', '.')
		elif relative_path.find('src/') == 0:
			package_name = relative_path[4:].replace('/', '.')
		else:
			print('Unable to determine package name for %s' % folder_name, file=sys.stderr)
			continue

		if path == 'portal-impl' or path == 'portal-kernel':
			if is_excluded_package(package_name):
				continue

		packageinfo = '%s/packageinfo' % folder_name.strip()

		if os.path.exists(packageinfo):
			with open(packageinfo, 'r') as pif:
				package_version = pif.read().split(' ')[1].strip()
		else:
			package_version = '1.0.0'

		module_versions.append(node.value + (package_name))

with open(sys.argv[1], 'w') as f:
	csvf = csv.writer(f)
	csvf.writerows(module_versions)