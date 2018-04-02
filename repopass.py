from __future__ import print_function
import subprocess
import sys

key_prefix = 'build.repository.private.';
key_suffix = '[%s]' % sys.argv[1].split('/')[-1];

branch = sys.argv[1]

if branch.find('-private') == -1:
	branch = branch + '-private'

properties_content = subprocess.check_output(['git', 'show', '%s:working.dir.properties' % branch])

lines = [line.strip() for line in properties_content.decode('utf8').split('\n')]
pairs = [[x.strip() for x in line.split('=')] for line in lines if line.find(key_prefix) == 0 and line.find(key_suffix) != -1]
props = ['%s=%s' % (x[0][0:x[0].find(key_suffix)], x[1]) for x in pairs]

if len(lines) > 0:
	print('\n'.join(props))