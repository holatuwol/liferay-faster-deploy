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

file_names = ['requireschema-%s.txt' % suffix for suffix in file_suffixes]
suffixes = [suffix if suffix[5:7] != 'de' else suffix[0:8] + suffix[8:].zfill(2) for suffix in file_suffixes]

# Read the CSV file

def read_file(folder, file_name):
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

def add_file(schemas, folder, file_name, suffix):
	for key, row in read_file(folder, file_name).items():
		if key not in schemas:
			schemas[key] = { 'name': key, 'requireSchemaVersion': '0.0.0' }

		schemas[key][suffix] = True
		schemas[key]['requireSchemaVersion_%s' % suffix] = row['requireSchemaVersion']

	return schemas

# Load data file_names

schemas = read_file(folders[0], file_names[0])

for folder, file_name, suffix in zip(folders, file_names, suffixes):
	schemas = add_file(schemas, folder, file_name, suffix)

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