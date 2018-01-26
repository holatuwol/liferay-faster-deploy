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

def config(*args, stderr=PIPE):
	return _git('config', args, stderr=stderr)

def describe(*args, stderr=PIPE):
	return _git('describe', args, stderr=stderr)

def for_each_ref(*args, stderr=PIPE):
	return _git('for-each-ref', args, stderr=stderr)

def log(*args, stderr=PIPE):
	return _git('log', args, stderr=stderr)

def ls_files(*args, stderr=PIPE):
	return _git('ls-files', args, stderr=stderr)

def merge_base(*args, stderr=PIPE):
	return _git('merge-base', args, stderr=stderr)

def remote(*args, stderr=PIPE):
	return _git('remote', args, stderr=stderr)

def rev_parse(*args, stderr=PIPE):
	return _git('rev-parse', args, stderr=stderr)

def show(*args, stderr=PIPE):
	return _git('show', args, stderr=stderr)

git_root = rev_parse('--show-toplevel', stderr=DEVNULL)

if git_root is None or git_root == '':
	git_root = None
else:
	try:
		current_branch = rev_parse('--abbrev-ref', 'HEAD', stderr=DEVNULL)
	except:
		current_branch = 'HEAD'