#!/usr/bin/env python

import git
from git import current_branch, git_root
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import subprocess

def get_file_property(file_name, property):
	needle = '%s=' % property

	with open(file_name, 'r') as file:
		lines = file.readlines()
		lines = [line.strip() for line in lines if line.find(needle) > -1]
		return lines[0].split('=')[1]

def get_git_file_property(commit, file_name, property):
	lines = git.show('%s:%s' % (commit, file_name)).split('\n')
	full_version = [line.strip() for line in lines if line.find(property) > -1][0].split('=')[1]

def getparent(check_tags):

	# Find the current branch, accounting for detached head

	if current_branch in ['master', 'master-private', '7.0.x', '7.0.x-private', 'ee-6.2.x', 'ee-6.1.x', 'ee-6.0.x']:
		return current_branch

	# Extract the full version

	full_version = None

	if isfile(join(git_root, 'release.properties')):
		full_version = get_file_property(join(git_root, 'release.properties'), 'lp.version')
	elif isfile(join(git_root, 'build.properties')):
		full_version = get_file_property(join(git_root, 'build.properties'), 'lp.version')
	elif isfile(join(git_root, 'git-commit-portal')):
		with open(join(git_root, 'git-commit-portal'), 'r') as file:
			commit = file.readlines()[0]
			full_version = get_git_file_property(commit, 'release.properties', 'lp.version')
	else:
		return current_branch

	# If the short version is 6.x, then we have a shortcut

	short_version = '.'.join(full_version.split('.')[0:2])

	if short_version == '6.0':
		return 'ee-6.0.x'

	if short_version == '6.1':
		return 'ee-6.1.x'

	if short_version == '6.2':
		return 'ee-6.2.x'

	base_branch = None

	# Determine the base version using build.properties

	if isfile(join(git_root, 'build.properties')):
		base_branch = get_file_property(join(git_root, 'build.properties'), 'git.working.branch.name')

	if base_branch is None and isfile(join(git_root, 'git-commit-portal')):
		with open(join(git_root, 'git-commit-portal'), 'r') as file:
			commit = file.readlines()[0]
			base_branch = get_git_file_property(commit, 'build.properties', 'git.working.branch.name')

	if base_branch is None:
		base_branch = current_branch
	elif isdir(join(git_root, 'modules/private')):
		base_branch = '%s-private' % base_branch

	# If this is master or master-private, or we've recently rebased to 7.0.x or 7.0.x-private,
	# then use the branch instead of the tag

	if not check_tags:
		return base_branch

	exit_code = subprocess.call(['git', 'merge-base', '--is-ancestor', base_branch, 'HEAD'])

	if exit_code == 0:
		return base_branch

	# Find the closest matching tag

	base_tag = git.describe('--tags', 'HEAD', '--abbrev=0')

	if base_tag.find('fix-pack-base-') or base_tag.find('fix-pack-de-') > -1 or base_tag.find('-ga') > -1:
		return base_tag

	return base_branch

if __name__ == '__main__':
	print(getparent(True))