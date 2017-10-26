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

file_names = ['requireschema-7010-base.txt'] + \
	['requireschema-70%s-ga%d.txt' % (str(i).zfill(2), i+1) for i in range(0, ce_releases)] + \
	['requireschema-7010-de-%d.txt' % i for i in range(1, ee_releases + 1)]

suffixes = [file_name[14:-4] for file_name in file_names]
suffixes = [suffix if suffix[5:7] != 'de' else suffix[0:8] + suffix[8:].zfill(2) for suffix in suffixes]

# Read the CSV file

def read_file(file_name):
	result = {}

	with open('%s/metadata/%s' % (folder, file_name), 'r') as f:
		reader = csv.reader(f)
		result = { row[0]: { 'name': row[0], 'requireSchemaVersion': row[1] } for row in reader }

	private_file_name = file_name[0:-4] + '-private' + file_name[-4:]

	if os.path.isfile('%s/metadata/%s' % (folder, private_file_name)):
		with open('%s/metadata/%s' % (folder, private_file_name), 'r') as f:
			reader = csv.reader(f)
			for row in reader:
				result[row[0]] = { 'name': row[0], 'requireSchemaVersion': row[1] }

	return result

# Add another entry

def add_file(schemas, file_name, suffix):
	for key, row in read_file(file_name).items():
		if key not in schemas:
			schemas[key] = { 'name': key, 'requireSchemaVersion': '0.0.0' }

		schemas[key][suffix] = True
		schemas[key]['requireSchemaVersion_%s' % suffix] = row['requireSchemaVersion']

	return schemas

# Load data file_names

schemas = read_file(file_names[0])

for file_name, suffix in zip(file_names, suffixes):
	schemas = add_file(schemas, file_name, suffix)

# Fill in missing values

for row in schemas.values():
	for suffix in suffixes:
		if suffix not in row:
			row['requireSchemaVersion_%s' % suffix] = '0.0.0'
		else:
			del row[suffix]

# Identify package changes

columns = ['name', 'requireSchemaVersion']
columns += ['requireSchemaVersion_%s' % suffix for suffix in suffixes]

schema_changes = [{ column: row[column] for column in columns } for row in schemas.values()]
schema_changes = sorted(schema_changes, key = lambda x: (x['name']))

with open('dxpschemas.json', 'w') as f:
	json.dump(schema_changes, f, sort_keys=True, separators=(',', ':'))