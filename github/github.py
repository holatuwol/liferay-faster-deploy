#!/usr/bin/env python

import inspect
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import sys

script_git_root = dirname(dirname(abspath(inspect.getfile(inspect.currentframe()))))

sys.path.insert(0, script_git_root)

from getparent import getparent
import git
from git import git_root
import webbrowser
import webbrowser_patch

sys.path.insert(0, join(script_git_root, 'gitcd'))

from gitfind import find

def get_relpath(needle):
	if needle is None:
		return ''

	folders, files = find(needle)

	if files is not None and len(files) > 1:
		print('%s is ambiguous:' % needle)
		print('\n'.join(files))
		return None

	if folders is not None and len(folders) > 1:
		print('%s is ambiguous:' % needle)
		print('\n'.join(folders))
		return None

	if files is not None and len(files) == 1:
		return files[0]

	if folders is not None and len(folders) == 1:
		return folders[0]

	print('Unable to find a file or folder matching %s' % needle)
	return None

def open_on_github(needle, selection_start=None, selection_end=None):

	# Identify the name of the remote

	parent_ref = getparent(True)
	parent_branch = getparent(False)

	remote_refs = git.for_each_ref('--format=%(refname)', 'refs/remotes/').split('\n')

	candidate_refs = [remote_ref for remote_ref in remote_refs if remote_ref.find('/upstream-ce/') > -1 and remote_ref.find(parent_branch) != -1]

	if len(candidate_refs) == 0:
		candidate_refs = [remote_ref for remote_ref in remote_refs if remote_ref.find('/upstream-dxp/') > -1 and remote_ref.find(parent_branch) != -1]

	if len(candidate_refs) == 0:
		candidate_refs = [remote_ref for remote_ref in remote_refs if remote_ref.find('/upstream/') > -1 and remote_ref.find(parent_branch) != -1]

	if len(candidate_refs) == 0:
		candidate_refs = [remote_ref for remote_ref in remote_refs if remote_ref.find('/origin/') > -1 and remote_ref.find(parent_branch) != -1]

	if len(candidate_refs) == 0:
		print('Unable to find remote for %s' % parent_branch)
		return

	# Identify the name of the repository

	matching_ref = candidate_refs[0].split('/')[2]
	matching_remote_url = git.remote('get-url', matching_ref)
	matching_remote_path = matching_remote_url[matching_remote_url.find(':')+1:-4]

	# Find the path to the matching file/folder, relative to the git root

	matching_path = get_relpath(needle)

	if matching_path is None:
		print('No matching path')
		return

	path = relpath(join(os.getcwd(), matching_path), git_root)
	path_type = 'blob' if isfile(path) else 'tree'

	# Compute the GitHub URL

	line_link = ''

	if selection_start is not None and selection_end is not None:
		line_link = '#L%d-L%d' % (selection_start, selection_end)
	elif selection_start is not None:
		line_link = '#L%d' % selection_start

	github_url = 'https://github.com/%s/%s/%s/%s%s' % (matching_remote_path, path_type, parent_ref, path, line_link)

	webbrowser.open(github_url)

if __name__ == '__main__':
	if len(sys.argv) > 3:
		open_on_github(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
	elif len(sys.argv) > 2:
		open_on_github(sys.argv[1], int(sys.argv[2]))
	elif len(sys.argv) > 1:
		open_on_github(sys.argv[1])
	else:
		open_on_github(None)
