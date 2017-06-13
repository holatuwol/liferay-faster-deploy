#!/usr/bin/env python

from __future__ import print_function
import csv
import os.path
import semver

packageinfos = dict()

# Load the new packageinfo values

with open('.redeploy/changes.txt') as f:
	for filename in f.readlines():
		pos = filename.find('src/')

		if pos == -1:
			continue

		package = filename[pos+4:].strip()

		if package.find('main/java/') == 0:
			package = package[10:-12]
		elif package.find('main/resources/') == 0:
			package = package[15:-12]
		else:
			package = package[0:-12]

		package = package.replace('/', '.')

		with open(filename.strip()) as f2:
			packageinfos[package] = f2.readline()[8:].strip()

# Pad OSGi packageinfo version ranges with the necessary minor/patch version

def pad_semver(version):
	periods = version.count('.')

	if periods == 0:
		return '%s.0.0' % version

	if periods == 1:
		return '%s.0' % version

	return version

# Convert the version string into an array of semantic version strings

def get_semver(import_version_string):
	version_array = import_version_string.split(',')

	for i in range(0, len(version_array)):
		if version_array[i][0] == '[':
			version_array[i] = '>=%s' % pad_semver(version_array[i][1:])
		elif version_array[i][0] == '(':
			version_array[i] = '>%s' % pad_semver(version_array[i][1:])
		elif version_array[i][-1] == ']':
			version_array[i] = '<=%s' % pad_semver(version_array[i][0:-1])
		elif version_array[i][-1] == ')':
			version_array[i] = '<%s' % pad_semver(version_array[i][0:-1])
		else:
			version_array[i] = '==%s' % pad_semver(version_array[i])

	return version_array

# Parse the fixdeps.txt file in order to identify the manifest files,
# and parse the versions contained in those manifest files

packages = dict()
manifests = dict()

with open('.redeploy/checkdeps.txt') as f:
	reader = csv.reader(f, delimiter=',', quotechar='"')

	for row in reader:
		folder = row[0]

		if folder in manifests:
			continue

		packages[row[2]] = row[1]

		filename = '%s/build/tmp/jar/MANIFEST.MF.csv' % folder

		if not os.path.isfile(filename):
			manifests[folder] = None
			continue

		with open(filename) as f2:
			reader2 = csv.reader(f2, delimiter=',', quotechar='"')
			manifests[folder] = { row2[0]: get_semver(row2[1]) for row2 in reader2 if len(row2) == 2 }

# Use the parsed manifests to decide what needs to be updated

with open('.redeploy/fixdeps.txt', 'w') as f:
	for folder, manifest in manifests.items():
		for package, version in packageinfos.items():
			if manifest is None:
				continue

			if package not in manifest or package not in packages:
				continue

			if not all(semver.match(version, limiter) for limiter in manifest[package]):
				print('%s requires %s version %s, which does not match %s' % (folder, package, version, ','.join(manifest[package])))
				f.write('%s,%s\n' % (folder, packages[package]))