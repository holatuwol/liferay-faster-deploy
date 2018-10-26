#!/usr/bin/env python

from __future__ import print_function
from collections import defaultdict
import csv
import json
import os
import sys

def get_release_tuple(release_tuple):
	release_id = release_tuple[1]

	x = release_id.find('-')

	release_number = release_id[0:x]
	patch_level = release_id[x+1:]

	if patch_level.find('ga') == 0:
		patch_level = patch_level[2:]
	elif patch_level.find('de-') == 0:
		patch_level = patch_level[3:]
	elif patch_level.find('dxp-') == 0:
		patch_level = patch_level[4:]

	private = False

	if patch_level == 'base':
		patch_level = '0'

	return (release_number, int(patch_level), private)

file_metadata = sorted(
	set(
		[
			(folder, f[f.find('-')+1:-4])
				for folder in sys.argv[1:]
					for f in os.listdir('%s/metadata' % folder)
						if f != 'tags.txt' and f.find('-private') == -1
		]
	),
	key=get_release_tuple
)

folders = [metadata[0] for metadata in file_metadata]
file_suffixes = [metadata[1] for metadata in file_metadata]

bundle_file_names = ['bundleinfo-%s.txt' % suffix for suffix in file_suffixes]
dependencies_file_names = ['dependencies-%s.txt' % suffix for suffix in file_suffixes]
package_file_names = ['packageinfo-%s.txt' % suffix for suffix in file_suffixes]
bootstrap_file_names = ['bootstrap-%s.txt' % suffix for suffix in file_suffixes]

json_suffixes = [suffix if suffix[5:7] != 'de' and suffix[5:8] != 'dxp' else suffix[0:8] + suffix[8:].zfill(2) for suffix in file_suffixes]

# Read the CSV file

def read_bundle_file(folder, file_name):
	result = {}

	with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
		reader = csv.reader(f)
		result = {
			row[1]: {
				'group': row[0],
				'name': row[1],
				'version': row[2],
				'repository': row[3],
				'packaging': row[6]
			}
			for row in reader
		}

	private_file_name = file_name[0:-4] + '-private' + file_name[-4:]

	if os.path.isfile('%s/metadata/%s' % (folder, private_file_name)):
		with open('%s/metadata/%s' % (folder, private_file_name), 'r') as f:
			reader = csv.reader(f)
			for row in reader:
				result[row[1]] = {
					'group': row[0],
					'name': row[1],
					'version': row[2],
					'repository': row[3],
					'packaging': row[6]
				}

	return result

def read_bootstrap_file(folder, file_name):
	result = {}

	with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
		reader = csv.reader(f)
		result = {
			row[1]: {
				'group': row[0],
				'name': row[1],
				'version': row[2]
			}
			for row in reader
		}

	return result

def read_dependencies_file(folder, file_name):
	result = {}

	if os.path.isfile('%s/metadata/%s' % (folder, file_name)):
		with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
			reader = csv.reader(f)
			result = {
				row[1]: {
					'group': row[0],
					'name': row[1],
					'version': row[2],
					'repository': 'third-party',
					'packaging': 'jar'
				}
				for row in reader
			}

	private_file_name = file_name[0:-4] + '-private' + file_name[-4:]

	if os.path.isfile('%s/metadata/%s' % (folder, private_file_name)):
		with open('%s/metadata/%s' % (folder, private_file_name), 'r') as f:
			reader = csv.reader(f)
			for row in reader:
				result[row[1]] = {
					'group': row[0],
					'name': row[1],
					'version': row[2],
					'repository': row[3],
					'packaging': row[4]
				}

	return result

def read_package_file(folder, file_name):
	result = {}

	with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
		reader = csv.reader(f)
		result = {
			row[2]: {
				'group': row[0],
				'name': row[1],
				'package': row[2],
				'packageVersion': row[3]
			}
			for row in reader
		}

	private_file_name = file_name[0:-4] + '-private' + file_name[-4:]

	if os.path.isfile('%s/metadata/%s' % (folder, private_file_name)):
		with open('%s/metadata/%s' % (folder, private_file_name), 'r') as f:
			reader = csv.reader(f)
			for row in reader:
				result[row[3]] = {
					'group': row[0],
					'name': row[1],
					'package': row[2],
					'packageVersion': row[3]
				}

	return result

# Add another entry

def add_bundle_file(bundles, folder, file_name, suffix):
	for key, row in read_bundle_file(folder, file_name).items():
		if key not in bundles:
			bundles[key] = {
				'group': row['group'],
				'name': row['name'],
				'repository': row['repository'],
				'version': '0.0.0',
				'packaging': row['packaging']
			}

		bundles[key][suffix] = True
		bundles[key]['version_%s' % suffix] = row['version']

	return bundles

def add_bootstrap_file(bundles, folder, file_name, suffix):
	for key, row in read_bootstrap_file(folder, file_name).items():
		bundles[key]['version_%s' % suffix] = row['version']

	return bundles

def add_dependencies_file(bundles, folder, file_name, suffix):
	for key, row in read_dependencies_file(folder, file_name).items():
		if key not in bundles:
			bundles[key] = {
				'group': row['group'],
				'name': row['name'],
				'repository': row['repository'],
				'version': '0.0.0',
				'packaging': row['packaging']
			}

		bundles[key][suffix] = True
		bundles[key]['version_%s' % suffix] = row['version']

	return bundles

def add_package_file(packages, folder, file_name, suffix):
	for key, row in read_package_file(folder, file_name).items():
		if key not in packages:
			packages[key] = { 'group': row['group'], 'name': row['name'], 'package': key, 'packageVersion': '0.0.0' }

		packages[key][suffix] = True
		packages[key]['packageVersion_%s' % suffix] = row['packageVersion']

	return packages

# Load data files

packages = {}

for folder, file_name, suffix in zip(folders, package_file_names, json_suffixes):
	packages = add_package_file(packages, folder, file_name, suffix)

bundles = {}

for folder, bundle_file_name, dependencies_file_name, bootstrap_file_name, suffix in \
	zip(folders, bundle_file_names, dependencies_file_names, bootstrap_file_names, json_suffixes):

	bundles = add_bundle_file(bundles, folder, bundle_file_name, suffix)
	bundles = add_dependencies_file(bundles, folder, dependencies_file_name, suffix)
	bundles = add_bootstrap_file(bundles, folder, bootstrap_file_name, suffix)

# Fill in missing values

for row in bundles.values():
	for suffix in json_suffixes:
		if suffix not in row:
			row['version_%s' % suffix] = '0.0.0'
		else:
			del row[suffix]

for row in packages.values():
	for suffix in json_suffixes:
		if suffix not in row:
			row['packageVersion_%s' % suffix] = '0.0.0'
		else:
			del row[suffix]

# Identify module changes

columns = ['group', 'name', 'version', 'repository', 'packaging']
columns += ['version_%s' % suffix for suffix in json_suffixes]

unique_modules = {(row['group'], row['name']): row for row in bundles.values()}
module_changes = [{ column: row[column] for column in columns } for row in unique_modules.values()]
module_changes = sorted(module_changes, key = lambda x: (x['group'], x['name']))

with open('dxpmodules.json', 'w') as f:
	json.dump(module_changes, f, sort_keys=True, separators=(',', ':'))

# Identify package changes

columns = ['name', 'package', 'packageVersion']
columns += ['packageVersion_%s' % suffix for suffix in json_suffixes]

package_changes = [{ column: row[column] for column in columns } for row in packages.values()]
package_changes = sorted(package_changes, key = lambda x: (x['name'], x['package']))

with open('dxppackages.json', 'w') as f:
	json.dump(package_changes, f, sort_keys=True, separators=(',', ':'))