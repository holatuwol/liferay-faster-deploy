from __future__ import print_function

import git
import os
from sourcetrie import get_rd_file, SourceTrie
import sys

def git_hash_time(hash, folders):
	changes = set()
	changes_file = get_rd_file('changes.txt')

	if os.path.exists(changes_file):
		with open(changes_file, 'r') as f:
			changes = set([line.strip() for line in f.readlines()])

	mtime = git.log('-1', hash, '--pretty=format:%ct')

	if mtime == '':
		return

	mtime = int(mtime)

	for folder in folders:
		folder = folder.strip()

		source_folder = '%s/src/main/java' % folder

		if not os.path.isdir(source_folder):
			source_folder = '%s/docroot/WEB-INF/src' % folder

		if not os.path.isdir(source_folder):
			source_folder = '%s/src' % folder

		if not os.path.isdir(source_folder):
			continue

		for file in git.ls_files(source_folder).split('\n'):
			if file not in changes and os.path.isfile(file):
				os.utime(file, (mtime, mtime))

if __name__ == '__main__':
	git_hash_time(sys.argv[1], sys.stdin.readlines())