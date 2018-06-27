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
		return lines[0].split('=')[1] if len(lines) > 0 else None

def get_git_file_property(commit, file_name, property):
	lines = git.show('%s:%s' % (commit, file_name)).split('\n')
	lines = [line.strip() for line in lines if line.find(property) > -1]
	return lines[0].split('=')[1] if len(lines) > 0 else None

def getparent(check_tags):

	if git_root is None:
		return current_branch

	# Find the current branch, accounting for detached head

	if current_branch in ['master', 'master-private', '7.0.x', '7.0.x-private', 'ee-6.2.x', 'ee-6.1.x', 'ee-6.0.x']:
		return current_branch

	# Extract the full version

	full_version = None

	if isfile(join(git_root, 'release.properties')):
		full_version = get_file_property(join(git_root, 'release.properties'), 'lp.version')
	elif isfile(join(git_root, 'build.properties')) and isfile(join(git_root, 'app.server.properties')):
		full_version = get_file_property(join(git_root, 'build.properties'), 'lp.version')
	elif isfile(join(git_root, 'git-commit-portal')):
		with open(join(git_root, 'git-commit-portal'), 'r') as file:
			commit = file.readlines()[0].strip()
			full_version = get_git_file_property(commit, 'release.properties', 'lp.version')
	else:
		return getparent_origin()

	# If the short version is 6.x, then we have a shortcut

	short_version = '.'.join(full_version.split('.')[0:2])

	base_branch = None

	if short_version == '6.0':
		base_branch = 'ee-6.0.x'
	elif short_version == '6.1':
		base_branch = 'ee-6.1.x'
	elif short_version == '6.2':
		base_branch = 'ee-6.2.x'
	else:
		# Determine the base version using build.properties

		if isfile(join(git_root, 'build.properties')):
			base_branch = get_file_property(join(git_root, 'build.properties'), 'git.working.branch.name')

		if base_branch is None and isfile(join(git_root, 'git-commit-portal')):
			with open(join(git_root, 'git-commit-portal'), 'r') as file:
				commit = file.readlines()[0].strip()
				base_branch = get_git_file_property(commit, 'build.properties', 'git.working.branch.name')

		if base_branch is None:
			base_branch = current_branch if current_branch != 'HEAD' else '7.0.x'
		elif base_branch == 'ee-7.0.x':
			base_branch = '7.0.x'
		elif isdir(join(git_root, 'modules/private')) and len(git.ls_files('build.properties').strip()) == 0 and base_branch.find('-private') == -1:
			base_branch = '%s-private' % base_branch

	# If this is master or master-private, or we've recently rebased to 7.0.x or 7.0.x-private,
	# then use the branch instead of the tag

	if not check_tags:
		return base_branch

	if base_branch != 'ee-7.0.x':
		exit_code = subprocess.call(['git', 'merge-base', '--is-ancestor', base_branch, 'HEAD'])

		if exit_code == 0:
			return base_branch

	# Find the closest matching tag

	base_tag = ''

	if base_branch == '7.0.x' or base_branch == '7.0.x-private':
		base_tag = git.describe('--tags', 'HEAD', '--abbrev=0', '--match=fix-pack-de-*')

		if base_tag is None:
			base_tag = git.describe('--tags', 'HEAD', '--abbrev=0', '--match=7.0.*-ga*')

	elif base_branch == 'ee-6.2.x':
		base_tag = git.describe('--tags', 'HEAD', '--abbrev=0', '--match=fix-pack-base-*')

	if base_tag.find('fix-pack-base-') > -1 or base_tag.find('fix-pack-de-') > -1 or base_tag.find('-ga') > -1:
		return base_tag

	return base_branch

def getparent_origin():
	remote_refs = git.for_each_ref('--format=%(refname)', 'refs/remotes/').split('\n')

	origin_branches = [ref[len('refs/remotes/'):] for ref in remote_refs if ref.find('refs/remotes/origin') == 0]
	upstream_branches = [ref[len('refs/remotes/'):] for ref in remote_refs if ref.find('refs/remotes/upstream') == 0]

	closest_branch = None
	closest_branch_diff = -1

	for branch_set in [upstream_branches, origin_branches]:
		for branch in branch_set:
			short_branch = branch[branch.find('/')+1:]

			if short_branch == current_branch or short_branch == closest_branch or not git.is_ancestor(branch, current_branch):
				continue

			branch_diff = len(git.log('--pretty=%H', '%s..%s' % (branch, current_branch)))

			if closest_branch is None or branch_diff < closest_branch_diff:
				closest_branch = short_branch
				closest_branch_diff = branch_diff

		if closest_branch is not None:
			return closest_branch

	return current_branch

if __name__ == '__main__':
	print(getparent(True))
	print(getparent(False))