#!/usr/bin/env python

from __future__ import print_function
from collections import defaultdict
import csv
import json
import os
import sys

def get_dxp_release_tuple(release_id):
	x = release_id.find('-')

	if x == -1:
		return (None, '9999', 0)

	release_number = release_id[0:x]
	patch_level = release_id[x+1:]

	if patch_level.find('ga') == 0:
		patch_level = patch_level[2:]
	elif patch_level.find('de-') == 0:
		patch_level = patch_level[3:]
	elif patch_level.find('dxp-') == 0:
		patch_level = patch_level[4:]
	elif patch_level[0] == 'u':
		patch_level = patch_level[1:]

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

def add_file(schemas, folder, application_name, file_name, suffix):
	for key, row in read_file(folder, file_name).items():
		if key not in schemas:
			schemas[key] = {
				'application': application_name,
				'name': key
			}

		schemas[key][suffix] = True
		schemas[key]['requireSchemaVersion_%s' % suffix] = row['requireSchemaVersion']

	return schemas

# Load data file_names

def generate_metadata_files(file_metadata, schemas_file_name, fill_empty):
	folders = [metadata[0] for metadata in file_metadata]
	file_suffixes = [metadata[1] for metadata in file_metadata]
	json_suffixes = [metadata[2] for metadata in file_metadata]
	application_names = [metadata[3][0] for metadata in file_metadata]

	file_names = ['requireschema-%s.txt' % suffix for suffix in file_suffixes]

	schemas = {}

	for folder, application_name, file_name, suffix in zip(folders, application_names, file_names, json_suffixes):
		schemas = add_file(schemas, folder, application_name, file_name, suffix)

	# Fill in missing values

	if fill_empty:
		for row in schemas.values():
			for suffix in json_suffixes:
				if suffix not in row:
					row['requireSchemaVersion_%s' % suffix] = '0.0.0'
				else:
					del row[suffix]

	# Identify package changes

	columns = ['application', 'name']
	columns += ['requireSchemaVersion_%s' % suffix for suffix in json_suffixes]

	schema_changes = [{ column: row[column] for column in columns if column in row } for row in schemas.values()]
	schema_changes = sorted(schema_changes, key = lambda x: (x['name']))

	with open(schemas_file_name, 'w') as f:
		json.dump(schema_changes, f, sort_keys=True, separators=(',', ':'))

def get_dxp_json_suffix(suffix):
	return suffix if suffix[5:7] != 'de' and suffix[5:8] != 'dxp' else suffix[0:8] + suffix[8:].zfill(2)

dxp_file_metadata = sorted(
	set([
		(folder, f[f.find('-')+1:-4], get_dxp_json_suffix(f[f.find('-')+1:-4]), get_dxp_release_tuple(f[f.find('-')+1:-4]))
			for folder in [x for x in sys.argv[1:] if os.path.isdir('%s/metadata' % x)]
				for f in os.listdir('%s/metadata' % folder)
					if f != 'tags.txt' and f != 'marketplace.txt' and f.find('-private') == -1 and f.find('marketplace-') == -1
	]),
	key=lambda x: x[2]
)

generate_metadata_files(dxp_file_metadata, 'dxpschemas.json', True)

def get_marketplace_json_suffix(suffix):
	return suffix[suffix.rfind('-', 0, len(suffix) - 5)+1:-5]

marketplace_file_metadata = sorted(
	set([
		(folder, f[f.find('-')+1:-4], get_marketplace_json_suffix(f[f.find('-')+1:-4]), get_marketplace_release_tuple(f[f.find('-')+1:-4]))
			for folder in [x for x in sys.argv[1:] if os.path.isdir('%s/metadata' % x)]
				for f in os.listdir('%s/metadata' % folder)
					if f.find('-marketplace-') != -1
	]),
	key=lambda x: x[2]
)

generate_metadata_files(marketplace_file_metadata, 'mpschemas.json', False)