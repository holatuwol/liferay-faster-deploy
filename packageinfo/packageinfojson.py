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

file_names = ['packageinfo-7010-base.txt'] + \
	['packageinfo-70%s-ga%d.txt' % (str(i).zfill(2), i+1) for i in range(0, ce_releases)] + \
	['packageinfo-7010-de-%d.txt' % i for i in range(1, ee_releases + 1)]

suffixes = [file_name[12:-4] for file_name in file_names]
suffixes = [suffix if suffix[5:7] != 'de' else suffix[0:8] + suffix[8:].zfill(2) for suffix in suffixes]

# Read the CSV file

def read_file(file_name):
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

def add_file(packages, file_name, suffix):
	for key, row in read_file(file_name).items():
		if key not in packages:
			packages[key] = { 'group': row['group'], 'name': row['name'], 'version': '0.0.0', 'package': key, 'packageVersion': '0.0.0' }

		packages[key][suffix] = True
		packages[key]['version_%s' % suffix] = row['version']
		packages[key]['packageVersion_%s' % suffix] = row['packageVersion']

	return packages

# Load data file_names

packages = read_file(file_names[0])

for file_name, suffix in zip(file_names, suffixes):
	packages = add_file(packages, file_name, suffix)

# Fill in missing values

for row in packages.values():
	for suffix in suffixes:
		if suffix not in row:
			row['version_%s' % suffix] = '0.0.0'
			row['packageVersion_%s' % suffix] = '0.0.0'
		else:
			del row[suffix]

# Identify package changes

columns = ['name', 'package', 'packageVersion']
columns += ['packageVersion_%s' % suffix for suffix in suffixes]

package_changes = [{ column: row[column] for column in columns } for row in packages.values()]
package_changes = sorted(package_changes, key = lambda x: (x['name'], x['package']))

with open('dxppackages.json', 'w') as f:
	json.dump(package_changes, f, sort_keys=True, separators=(',', ':'))

# Identify module changes

columns = ['group', 'name', 'version']
columns += ['version_%s' % suffix for suffix in suffixes]

unique_modules = {(row['group'], row['name']): row for row in packages.values() if row['version'] != '0.0.0'}
module_changes = [{ column: row[column] for column in columns } for row in unique_modules.values()]
module_changes = sorted(module_changes, key = lambda x: (x['group'], x['name']))

with open('dxpmodules.json', 'w') as f:
	json.dump(module_changes, f, sort_keys=True, separators=(',', ':'))