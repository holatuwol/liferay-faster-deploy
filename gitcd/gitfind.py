#!/usr/bin/env python

import inspect
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from dirnames import dirnames
from relpaths import relpaths
import git
from git import git_root

def find(needle):

	# Attempt to find the file without using git

	folders, files = nongit_find(os.getcwd(), needle)

	if git_root is None or folders is not None or files is not None:
		return (folders, files)

	folders, files = nongit_find(git_root, needle)

	if folders is not None or files is not None:
		return (git_root_relpaths(folders), git_root_relpaths(files))

	# Attempt to find the file using git ls-files

	folders, files = git_find(os.getcwd(), needle)

	if folders is not None or files is not None:
		return (folders, files)

	folders, files = git_find(git_root, needle)

	if folders is not None or files is not None:
		return (git_root_relpaths(folders), git_root_relpaths(files))

	# Attempt to find the file using git ls-files --with-tree

	git_commit_portal = join(git_root, 'git-commit-portal')

	if isfile(git_commit_portal):
		with open(git_commit_portal, 'r') as file:
			commit = file.readline().strip()
			folders, files = git_find(git_root, needle, commit)

	working_dir_properties = join(git_root, 'working.dir.properties')

	if isfile(working_dir_properties):
		with open(working_dir_properties, 'r') as file:
			matching_properties = [x.strip() for x in file.readlines() if x.find('lcs.sha=') != -1]

			if len(matching_properties) > 0:
				commit = matching_properties[0].split('=')[1]
				folders, files = git_find(git_root, needle, commit)

	return (git_root_relpaths(folders), git_root_relpaths(files))

def get_filtered_folders(filtered_list, needle):
	filtered_folders = list(set([dirname(file) for file in filtered_list]))
	filtered_exact_folders = [folder for folder in filtered_folders if folder[-len(needle):] == needle]
	return filtered_exact_folders if len(filtered_exact_folders) > 0 else filtered_folders

def git_find(haystack, needle, commit=None):
	haystack = relpath(haystack, git_root)

	if commit is None:
		file_list = set([relpath(x, haystack).replace('\\', '/') for x in git.ls_files(haystack).split('\n') if is_project_file(needle, x)])
	else:
		file_list = set([relpath(x, haystack).replace('\\', '/') for x in git.ls_files('--with-tree=%s' % commit, haystack).split('\n') if is_project_file(needle, x)])

	# First, assume that we're looking for a module root, so check for
	# bnd.bnd, ivy.xml, and package.json

	for pattern in ['/%s/%s', '%s/%s']:
		for module_marker in ['bnd.bnd', 'ivy.xml', 'package.json']:
			filter_needle = pattern % (needle, module_marker)
			filtered_list = [file for file in file_list if file.find(filter_needle) > -1]

			if len(filtered_list) > 0:
				return (get_filtered_folders(filtered_list, needle), None)

	for pattern in ['%s/', '/%s', '%s']:
		for module_marker in ['bnd.bnd', 'ivy.xml', 'package.json']:
			filter_needle = pattern % needle
			filtered_list = [file for file in file_list if file.find(filter_needle) > -1 and file.find(module_marker) > -1]

			if len(filtered_list) > 0:
				return (get_filtered_folders(filtered_list, needle), None)

	# Next, check for a folder that isn't a module root, which can either be
	# an exact match or a suffix match. Prefer in that order.

	for pattern in ['/%s/', '%s/']:
		filter_needle = pattern % needle
		filtered_list = [file for file in file_list if file.find(filter_needle) > -1]

		if len(filtered_list) > 0:
			return (get_filtered_folders(filtered_list, needle), None)

	# Finally, assume that maybe the person is looking for a folder containing
	# a file and is using the file name as an abbreviated way at getting there.
	# Choose a prefix match first, then an anywhere match.

	for pattern in ['/%s', '%s']:
		filter_needle = pattern % needle
		filtered_list = [file for file in file_list if file.find(filter_needle) > -1]

		if len(filtered_list) > 0:
			return (get_filtered_folders(filtered_list, needle), filtered_list)

	return (None, None)

def git_root_relpaths(entries):
	if entries is None:
		return None

	return relpaths([join(git_root, entry) for entry in entries])

def is_project_file(needle, x):
	return x.find(needle) != -1 and x.find('.releng') == -1 and x.find('.gradle') == -1

def nongit_find(haystack, needle):
	if isdir(join(haystack, needle)):
		return ([needle], None)

	if isfile(join(haystack, needle)):
		return ([dirname(needle)], [needle])

	return None, None

if __name__ == '__main__':
	if len(sys.argv) > 1:
		needle = sys.argv[1]

		folders, files = find(needle)

		if files is not None and len(files) == 1:
			print(files[0])
		elif folders is not None and len(folders) == 1:
			print(folders[0])
		elif files is not None and len(files) > 1:
			print('%s is ambiguous:' % needle)
			print('\n'.join(files))
		elif folders is not None and len(folders) > 1:
			print('%s is ambiguous:' % needle)
			print('\n'.join(folders))
		else:
			print('Unable to find a file or folder matching %s' % needle)