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

def config(*args, **kwargs):
	return _git('config', args, **kwargs)

def describe(*args, **kwargs):
	return _git('describe', args, **kwargs)

def for_each_ref(*args, **kwargs):
	return _git('for-each-ref', args, **kwargs)

def log(*args, **kwargs):
	return _git('log', args, **kwargs)

def ls_files(*args, **kwargs):
	return _git('ls-files', args, **kwargs)

def merge_base(*args, **kwargs):
	return _git('merge-base', args, **kwargs)

def remote(*args, **kwargs):
	return _git('remote', args, **kwargs)

def rev_parse(*args, **kwargs):
	return _git('rev-parse', args, **kwargs)

def show(*args, **kwargs):
	return _git('show', args, **kwargs)

git_root = rev_parse('--show-toplevel', stderr=DEVNULL)

if git_root is None or git_root == '':
	git_root = None
else:
	try:
		current_branch = rev_parse('--abbrev-ref', 'HEAD', stderr=DEVNULL)
	except:
		current_branch = 'HEAD'