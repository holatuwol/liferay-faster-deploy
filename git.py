import os
from subprocess import Popen, PIPE

try:
	from subprocess import DEVNULL
except ImportError:
	import os
	DEVNULL = open(os.devnull, 'wb')

global git_root
git_root = None

def _git(cmd, args, stderr=PIPE):
	global git_root

	cwd = os.getcwd() if git_root is None else git_root
	pipe = Popen(['git', cmd] + list(args), cwd=cwd, stdout=PIPE, stderr=stderr)
	out, err = pipe.communicate()

	return out.decode('UTF-8', 'replace').strip()

def describe(*args):
	return _git('describe', args)

def for_each_ref(*args):
	return _git('for-each-ref', args)

def ls_files(*args):
	return _git('ls-files', args)

def merge_base(*args):
	return _git('merge-base', args)

def remote(*args):
	return _git('remote', args)

def rev_parse(*args):
	return _git('rev-parse', args)

def show(*args):
	return _git('show', args)

git_root = rev_parse('--show-toplevel')

if git_root is None or git_root == '':
	git_root = None
else:
	try:
		current_branch = rev_parse('--abbrev-ref', 'HEAD', DEVNULL)
	except:
		current_branch = 'HEAD'