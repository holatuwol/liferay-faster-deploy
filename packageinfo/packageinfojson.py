#!/usr/bin/env python

from __future__ import print_function
from collections import defaultdict
import csv
import json
import sys

folder = sys.argv[1]
releases = int(sys.argv[2])

files = ['packageinfo-base-7010.txt'] + ['packageinfo-de-%d-7010.txt' % i for i in range(1, releases + 1)]

# Read the CSV file

def read_file(file_name):
	with open('%s/%s' % (folder, file_name), 'r') as f:
		reader = csv.reader(f)
		return { row[3]: { 'group': row[0], 'name': row[1], 'version': row[2], 'package': row[3], 'packageVersion': row[4] } for row in reader }

# Add another entry

def add_file(packages, i):
	suffix = 'de%s' % str(i).zfill(2)

	for key, row in read_file(files[i]).items():
		if key not in packages:
			packages[key] = { 'group': row['group'], 'name': row['name'], 'version': '0.0.0', 'package': key, 'packageVersion': '0.0.0' }

		packages[key][suffix] = True
		packages[key]['version_%s' % suffix] = row['version']
		packages[key]['packageVersion_%s' % suffix] = row['packageVersion']

	return packages

# Load data files

packages = read_file(files[0])

for i in range(1, releases + 1):
	packages = add_file(packages, i)

# Fill in missing values

for row in packages.values():
	for i in range(1, releases + 1):
		old_suffix = 'de%s' % str(i).zfill(2)

		if old_suffix not in row:
			row['version_%s' % old_suffix] = '0.0.0'
			row['packageVersion_%s' % old_suffix] = '0.0.0'
		else:
			del row[old_suffix]

# Identify package changes

base = 'packageMajorVersion'
latest = 'packageMajorVersion_de%s' % str(releases).zfill(2)

columns = ['name', 'package', 'packageVersion']
columns += ['packageVersion_de%s' % str(i).zfill(2) for i in range(1, releases + 1)]

package_changes = [{ column: row[column] for column in columns } for row in packages.values()]
package_changes = sorted(package_changes, key = lambda x: (x['name'], x['package']))

with open('dxppackages.json', 'w') as f:
	json.dump(package_changes, f, sort_keys=True, separators=(',', ':'))

# Identify module changes

columns = ['group', 'name', 'version']
columns += ['version_de%s' % str(i).zfill(2) for i in range(1, releases + 1)]

unique_modules = {(row['group'], row['name']): row for row in packages.values() if row['version'] != '0.0.0'}
module_changes = [{ column: row[column] for column in columns } for row in unique_modules.values()]
module_changes = sorted(module_changes, key = lambda x: (x['group'], x['name']))

with open('dxpmodules.json', 'w') as f:
	json.dump(module_changes, f, sort_keys=True, separators=(',', ':'))