#!/usr/bin/env python

from __future__ import print_function
import csv
from os import listdir
import os.path
import re
import semver
import sys
import zipfile

sys.path.insert(1, os.path.join(sys.path[0], '..'))
from sourcetrie import get_rd_file

def get_old_version(module_name, module_version, package_name):
	folder_name = '.gradle/caches/modules-2/files-2.1/com.liferay.portal/%s/%s' % (module_name, module_version)

	if not os.path.exists(folder_name):
		return None

	for hash in listdir(folder_name):
		jar_name = '%s/%s/%s-%s.jar' % (folder_name, hash, module_name, module_version)

		if os.path.exists(jar_name):
			archive = zipfile.ZipFile(jar_name, 'r')
			packageinfo_path = '%s/packageinfo' % package_name.replace('.', '/')
			packageinfo = archive.read(packageinfo_path).decode('utf-8')
			return packageinfo[packageinfo.find(' ')+1:]

	return None

def get_new_version(module_name, package_name):
	folder_name = '.m2/com/liferay/portal/%s' % (module_name)

	if not os.path.exists(folder_name):
		return None

	for module_version in listdir(folder_name):
		jar_name = '%s/%s/%s-%s.jar' % (folder_name, module_version, module_name, module_version)

		if os.path.exists(jar_name):
			archive = zipfile.ZipFile(jar_name, 'r')
			packageinfo_path = '%s/packageinfo' % package_name.replace('.', '/')
			packageinfo = archive.read(packageinfo_path).decode('utf-8')
			return packageinfo[packageinfo.find(' ')+1:]

	return None

# Parse the usages.txt file in order to extract the dependencies
# so that we can determine if we need to actually add it as a line
# to checkdeps.txt

versions = dict()
version_pattern = re.compile('version: "([^"]+)"')

retain_lines = []

with open(get_rd_file('usages.txt'), 'r') as f:
	reader = csv.reader(f, delimiter=',', quotechar='"')

	for row in reader:
		folder = row[0]

		module_name = row[1]
		module_name_string = 'name: "%s"' % module_name

		package_name = row[2]

		module_version = None

		with open('%s/build.gradle' % folder, 'r') as f2:
			for line in f2.readlines():
				if line.find(module_name_string) == -1:
					continue

				result = version_pattern.search(line)
				module_version = result[1]
				break

		# If we couldn't compute the dependency version, this was probably a mistake.

		if module_version is None:
			print(folder)
			continue

		# If it already depends on default, there is nothing to be fixed.

		if module_version == 'default':
			continue

		# Extract the packageinfo file on the version of the dependency that we
		# currently depend on.

		version_key = '%s:%s' % (module_name, module_version)

		if version_key not in versions:
			versions[version_key] = dict()

		if package_name not in versions[version_key]:
			versions[version_key][package_name] = get_old_version(module_name, module_version, package_name)

		old_version = versions[version_key][package_name]

		# If it's not in the Gradle cache, let's just be pessimistic and assume
		# that we need it.

		if old_version is None:
			print(version_key, package_name)
			retain_lines.append(','.join(row))
			continue

		# If a minor version change has already happened since the dependency was declared,
		# and all we're doing is a minor version change, this version change definitely
		# won't affect the module

		new_version = get_new_version(module_name, package_name)

		old_version_next_minor = semver.bump_minor(old_version)
		old_version_next_major = semver.bump_minor(new_version)

		if semver.compare(old_version_next_minor, new_version) == 0 or semver.compare(old_version_next_major, new_version) == 0:
			print(old_version, new_version)
			retain_lines.append(','.join(row))

with open(get_rd_file('checkdeps.txt'), 'w') as f:
	f.write('\n'.join(retain_lines))