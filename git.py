import os
import subprocess

global git_root
git_root = None

def _git(cmd, args):
	global git_root

	cwd = os.getcwd() if git_root is None else git_root
	pipe = subprocess.Popen(['git', cmd] + list(args), cwd=cwd, stdout=subprocess.PIPE)
	out, err = pipe.communicate()

	return out.decode('UTF-8', 'replace').strip()

def merge_base(*args):
	return _git('merge-base' + args)

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

try:
	current_branch = rev_parse('--abbrev-ref', 'HEAD')
except:
	current_branch = 'HEAD'