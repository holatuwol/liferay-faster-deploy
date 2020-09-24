#!/usr/bin/env python

from __future__ import print_function
from collections import defaultdict
import csv
import json
import os
import sys

def get_dxp_release_tuple(release_id):
	x = release_id.find('-')

	release_number = release_id[0:x]
	patch_level = release_id[x+1:]

	if patch_level.find('ga') == 0:
		patch_level = patch_level[2:]
	elif patch_level.find('de-') == 0:
		patch_level = patch_level[3:]
	elif patch_level.find('dxp-') == 0:
		patch_level = patch_level[4:]

	if patch_level == 'base':
		patch_level = '0'

	return (None, release_number, int(patch_level))

def get_marketplace_release_tuple(release_id):
	product_pos = len('marketplace-')
	version_pos = release_id.rfind('-', 0, release_id.rfind('-')) + 1

	product = release_id[product_pos:version_pos-1]
	release_number = release_id[-4:]
	patch_level = release_id[version_pos:-5]

	return (product, release_number, patch_level)

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
				'sourceFolder': row[4],
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
					'sourceFolder': row[4],
					'packaging': row[6]
				}

	return result

def read_bootstrap_file(folder, file_name):
	result = {}

	full_path = '%s/metadata/%s' % (folder, file_name)

	if not os.path.exists(full_path):
		return {}

	with open(full_path, 'r') as f:
		reader = csv.reader(f)
		result = {
			row[1]: {
				'group': row[0],
				'name': row[1],
				'version': row[2],
				'repository': 'public',
				'packaging': 'jar'
			}
			for row in reader
		}

	return result

def read_dependencies_file(folder, file_name):
	result = {}

	if os.path.isfile('%s/metadata/%s' % (folder, file_name)):
		with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
			reader = csv.reader(f)

			bad_rows = [row for row in reader if len(row) != 4]

			if len(bad_rows) != 0:
				print(file_name, bad_rows)

		with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
			reader = csv.reader(f)
			result = {
				row[2]: {
					'group': row[1],
					'name': row[2],
					'version': row[3],
					'repository': 'third-party',
					'packaging': 'jar'
				}
				for row in reader if len(row) == 4
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
				result[row[2]] = {
					'group': row[0],
					'name': row[1],
					'package': row[2],
					'packageVersion': row[3]
				}

	return result

# Add another entry

def add_bundle_file(bundles, folder, application_name, file_name, suffix):
	for key, row in read_bundle_file(folder, file_name).items():
		if key not in bundles:
			bundles[key] = {
				'application': application_name,
				'group': row['group'],
				'name': row['name'],
				'repository': row['repository'],
				'sourceFolder': row['sourceFolder'],
				'packaging': row['packaging']
			}

		bundles[key][suffix] = True
		bundles[key]['version_%s' % suffix] = row['version']

	return bundles

def add_bootstrap_file(bundles, folder, application_name, file_name, suffix):
	for key, row in read_bootstrap_file(folder, file_name).items():
		if key not in bundles:
			bundles[key] = {
				'application': application_name,
				'group': row['group'],
				'name': row['name'],
				'repository': 'public',
				'sourceFolder': None,
				'packaging': 'jar'
			}

		bundles[key]['version_%s' % suffix] = row['version']

	return bundles

def add_dependencies_file(bundles, folder, application_name, file_name, suffix):
	for key, row in read_dependencies_file(folder, file_name).items():
		if key not in bundles:
			bundles[key] = {
				'application': application_name,
				'group': row['group'],
				'name': row['name'],
				'repository': row['repository'],
				'sourceFolder': None,
				'packaging': row['packaging']
			}

		bundles[key][suffix] = True
		bundles[key]['version_%s' % suffix] = row['version']

	return bundles

def add_package_file(packages, folder, application_name, file_name, suffix):
	for key, row in read_package_file(folder, file_name).items():
		if key not in packages:
			packages[key] = {
				'application': application_name,
				'group': row['group'],
				'name': row['name'],
				'package': key
			}

		packages[key][suffix] = True
		packages[key]['packageVersion_%s' % suffix] = row['packageVersion']

	return packages

# Load data files

def generate_metadata_files(file_metadata, modules_file_name, packages_file_name):
	folders = [metadata[0] for metadata in file_metadata]
	file_suffixes = [metadata[1] for metadata in file_metadata]
	json_suffixes = [metadata[2] for metadata in file_metadata]
	application_names = [metadata[3][0] for metadata in file_metadata]

	bundle_file_names = ['bundleinfo-%s.txt' % suffix for suffix in file_suffixes]
	dependencies_file_names = ['dependencies-%s.txt' % suffix for suffix in file_suffixes]
	package_file_names = ['packageinfo-%s.txt' % suffix for suffix in file_suffixes]
	bootstrap_file_names = ['bootstrap-%s.txt' % suffix for suffix in file_suffixes]

	packages = {}

	for folder, application_name, file_name, suffix in zip(folders, application_names, package_file_names, json_suffixes):
		packages = add_package_file(packages, folder, application_name, file_name, suffix)

	bundles = {}

	for folder, application_name, bundle_file_name, dependencies_file_name, bootstrap_file_name, suffix in \
		zip(folders, application_names, bundle_file_names, dependencies_file_names, bootstrap_file_names, json_suffixes):

		bundles = add_bundle_file(bundles, folder, application_name, bundle_file_name, suffix)
		bundles = add_dependencies_file(bundles, folder, application_name, dependencies_file_name, suffix)
		bundles = add_bootstrap_file(bundles, folder, application_name, bootstrap_file_name, suffix)

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

	columns = ['application', 'group', 'name', 'repository', 'sourceFolder', 'packaging']
	columns += ['version_%s' % suffix for suffix in json_suffixes]

	unique_modules = {(row['group'], row['name']): row for row in bundles.values()}
	module_changes = [{ column: row[column] for column in columns } for row in unique_modules.values()]
	module_changes = sorted(module_changes, key = lambda x: (x['group'], x['name']))

	with open(modules_file_name, 'w') as f:
		json.dump(module_changes, f, sort_keys=True, separators=(',', ':'))

	# Identify package changes

	columns = ['application', 'name', 'package']
	columns += ['packageVersion_%s' % suffix for suffix in json_suffixes]

	package_changes = [{ column: row[column] for column in columns } for row in packages.values()]
	package_changes = sorted(package_changes, key = lambda x: (x['name'], x['package']))

	with open(packages_file_name, 'w') as f:
		json.dump(package_changes, f, sort_keys=True, separators=(',', ':'))

def get_dxp_json_suffix(suffix):
	return suffix if suffix[5:7] != 'de' and suffix[5:8] != 'dxp' else suffix[0:8] + suffix[8:].zfill(2)

dxp_file_metadata = sorted(
	set([
		(folder, f[f.find('-')+1:-4], get_dxp_json_suffix(f[f.find('-')+1:-4]), get_dxp_release_tuple(f[f.find('-')+1:-4]))
			for folder in sys.argv[1:]
				for f in os.listdir('%s/metadata' % folder)
					if f != 'tags.txt' and f.find('-private') == -1 and f.find('marketplace-') == -1
	]),
	key=lambda x: x[2]
)

generate_metadata_files(dxp_file_metadata, 'dxpmodules.json', 'dxppackages.json')

def get_marketplace_json_suffix(suffix):
	return suffix[suffix.rfind('-', 0, len(suffix) - 5)+1:-5]

marketplace_file_metadata = sorted(
	set([
		(folder, f[f.find('-')+1:-4], get_marketplace_json_suffix(f[f.find('-')+1:-4]), get_marketplace_release_tuple(f[f.find('-')+1:-4]))
			for folder in sys.argv[1:]
				for f in os.listdir('%s/metadata' % folder)
					if f.find('-marketplace-') != -1
	]),
	key=lambda x: x[2]
)

generate_metadata_files(marketplace_file_metadata, 'mpmodules.json', 'mppackages.json')