#!/usr/bin/env python

from __future__ import print_function
from collections import defaultdict
import csv
import json
import os
import sys

folder = sys.argv[1]
ce_releases = int(sys.argv[2])
ee_releases = int(sys.argv[3])

file_suffixes = ['7010-base'] + \
	['70%s-ga%d' % (str(i).zfill(2), i+1) for i in range(0, ce_releases)] + \
	['7010-de-%d' % i for i in range(1, ee_releases + 1)]

bundle_file_names = ['bundleinfo-%s.txt' % file_suffix for file_suffix in file_suffixes]
package_file_names = ['packageinfo-%s.txt' % file_suffix for file_suffix in file_suffixes]

json_suffixes = [suffix if suffix[5:7] != 'de' else suffix[0:8] + suffix[8:].zfill(2) for suffix in file_suffixes]

# Read the CSV file

def read_bundle_file(file_name):
	result = {}

	with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
		reader = csv.reader(f)
		result = { row[1]: { 'group': row[0], 'name': row[1], 'version': row[2] } for row in reader }

	private_file_name = file_name[0:-4] + '-private' + file_name[-4:]

	if os.path.isfile('%s/metadata/%s' % (folder, private_file_name)):
		with open('%s/metadata/%s' % (folder, private_file_name), 'r') as f:
			reader = csv.reader(f)
			for row in reader:
				result[row[1]] = { 'group': row[0], 'name': row[1], 'version': row[2] }

	return result

def read_package_file(file_name):
	result = {}

	with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
		reader = csv.reader(f)
		result = { row[3]: { 'group': row[0], 'name': row[1], 'version': row[2], 'package': row[3], 'packageVersion': row[4] } for row in reader }

	private_file_name = file_name[0:-4] + '-private' + file_name[-4:]

	if os.path.isfile('%s/metadata/%s' % (folder, private_file_name)):
		with open('%s/metadata/%s' % (folder, private_file_name), 'r') as f:
			reader = csv.reader(f)
			for row in reader:
				result[row[3]] = { 'group': row[0], 'name': row[1], 'version': row[2], 'package': row[3], 'packageVersion': row[4] }

	return result

# Add another entry

def add_bundle_file(bundles, file_name, suffix):
	for key, row in read_bundle_file(file_name).items():
		if key not in bundles:
			bundles[key] = { 'group': row['group'], 'name': row['name'], 'version': '0.0.0' }

		bundles[key][suffix] = True
		bundles[key]['version_%s' % suffix] = row['version']

	return bundles

def add_package_file(packages, file_name, suffix):
	for key, row in read_package_file(file_name).items():
		if key not in packages:
			packages[key] = { 'group': row['group'], 'name': row['name'], 'version': '0.0.0', 'package': key, 'packageVersion': '0.0.0' }

		packages[key][suffix] = True
		packages[key]['version_%s' % suffix] = row['version']
		packages[key]['packageVersion_%s' % suffix] = row['packageVersion']

	return packages

# Load data files

packages = read_package_file(package_file_names[0])

for file_name, suffix in zip(package_file_names, json_suffixes):
	packages = add_package_file(packages, file_name, suffix)

bundles = read_bundle_file(bundle_file_names[0])

for file_name, suffix in zip(bundle_file_names, json_suffixes):
	bundles = add_bundle_file(bundles, file_name, suffix)

# Fill in missing values

for row in bundles.values():
	for suffix in json_suffixes:
		if suffix not in row:
			row['version_%s' % suffix] = '0.0.0'
			row['packageVersion_%s' % suffix] = '0.0.0'
		else:
			del row[suffix]

for row in packages.values():
	for suffix in json_suffixes:
		if suffix not in row:
			row['version_%s' % suffix] = '0.0.0'
			row['packageVersion_%s' % suffix] = '0.0.0'
		else:
			del row[suffix]

# Identify module changes

columns = ['group', 'name', 'version']
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