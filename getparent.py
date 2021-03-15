#!/usr/bin/env python

import git
from git import current_branch, git_root
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import subprocess
import sys

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

	ee_branches = ['6.2.x', '6.1.x', '6.0.x']
	ee_branches = ee_branches + ['ee-%s' % branch for branch in ee_branches]

	de_branches = ['7.0.x', '7.0.x-private', 'ee-7.0.x']

	dxp_branches = ['7.3.x', '7.2.x', '7.1.x']
	dxp_branches = dxp_branches + ['%s-private' % branch for branch in dxp_branches]

	if current_branch == 'master' or current_branch in ee_branches + de_branches + dxp_branches:
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

		if base_branch is None:
			if isfile(join(git_root, 'git-commit-portal')):
				with open(join(git_root, 'git-commit-portal'), 'r') as file:
					commit = file.readlines()[0].strip()
					base_branch = get_git_file_property(commit, 'build.properties', 'git.working.branch.name')
		elif base_branch == 'master':
			if git.for_each_ref('refs/remotes/upstream*/%s.x' % short_version) != '':
				base_branch = '%s.x' % short_version

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

	# Find the closest matching tag

	base_tag = None

	if base_branch in dxp_branches or base_branch in de_branches:
		base_tag = git.describe('HEAD', '--tags', '--abbrev=0', '--match=fix-pack-*-%s%s10*' % (base_branch[0], base_branch[2]))

		if base_tag is None or len(base_tag) == 0:
			base_tag = git.describe('HEAD', '--tags', '--abbrev=0', '--match=%s.%s.*-ga*' % (base_branch[0], base_branch[2]))

	elif base_branch in ee_branches:
		base_tag = git.describe('HEAD', '--tags', '--abbrev=0', '--match=fix-pack-base-6%s*' % base_branch[5])

		if base_tag is None or len(base_tag) == 0:
			if base_branch.find('ee-') == 0:
				base_tag = git.describe('HEAD', '--tags', '--abbrev=0', '--match=%s.%s.*-ga*' % (base_branch[3], base_branch[5]))
			else:
				base_tag = git.describe('HEAD', '--tags', '--abbrev=0', '--match=%s.%s.*-ga*' % (base_branch[0], base_branch[2]))

	if base_tag is None:
		return base_branch

	if base_tag.find('fix-pack-base-') == 0 or base_tag.find('fix-pack-de-') == 0 or base_tag.find('fix-pack-dxp-') == 0 or base_tag.find('-ga') > -1:
		return base_tag

	return base_branch

def getparent_origin():
	remote_refs = git.for_each_ref('--format=%(refname)', 'refs/remotes/').split('\n')

	origin_branches = [ref[len('refs/remotes/'):] for ref in remote_refs if ref.find('refs/remotes/origin') == 0 and ref[-5:] != '/HEAD']
	upstream_branches = [ref[len('refs/remotes/'):] for ref in remote_refs if ref.find('refs/remotes/upstream') == 0 and ref[-5:] != '/HEAD']

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
	if len(sys.argv) == 1 or sys.argv[1] == 'tag':
		print(getparent(True))

	if len(sys.argv) == 1 or sys.argv[1] == 'branch':
		print(getparent(False))