#!/usr/bin/env python

import os
from subprocess import Popen, PIPE

try:
    from subprocess import DEVNULL
except ImportError:
    import os
    DEVNULL = open(os.devnull, 'wb')

def _git(cmd, args, cwd=None, stderr=PIPE, strip=True):
    if cwd is None:
        pipe = Popen(['git', cmd] + list(args), stdout=PIPE, stderr=stderr)
    else:
        pipe = Popen(['git', cmd] + list(args), cwd=cwd, env={'PWD': cwd}, stdout=PIPE, stderr=stderr)

    out, err = pipe.communicate()

    if strip:
        return out.decode('UTF-8', 'replace').strip()
    else:
        return out.decode('UTF-8', 'replace')

def add(*args, **kwargs):
    return _git('add', args, **kwargs)

def checkout(*args, **kwargs):
    return _git('checkout', args, **kwargs)

def commit(*args, **kwargs):
    return _git('commit', args, **kwargs)

def config(*args, **kwargs):
    return _git('config', args, **kwargs)

def config_prompt(key, label):
    value = config(key)

    if value is not None and value != '':
        return value

    value = input('%s: ' % label)

    config('--global', key, value)

    return value

def describe(*args, **kwargs):
    return _git('describe', args, **kwargs)

def diff(*args, **kwargs):
    return _git('diff', args, **kwargs)

def fetch(*args, **kwargs):
    return _git('fetch', args, **kwargs)

def for_each_ref(*args, **kwargs):
    return _git('for-each-ref', args, **kwargs)

def is_ancestor(*args, **kwargs):
    pipe = Popen(['git', 'merge-base', '--is-ancestor'] + list(args), stdout=DEVNULL, stderr=DEVNULL)
    out, err = pipe.communicate()

    return pipe.returncode == 0

def log(*args, **kwargs):
    return _git('log', args, **kwargs)

def ls_files(*args, **kwargs):
    return _git('ls-files', args, **kwargs)

def ls_tree(*args, **kwargs):
    return _git('ls-tree', args, **kwargs)

def merge_base(*args, **kwargs):
    return _git('merge-base', args, **kwargs)

def rebase(*args, **kwargs):
    return _git('rebase', args, **kwargs)

def remote(*args, **kwargs):
    return _git('remote', args, os.getcwd(), **kwargs)

def reset(*args, **kwargs):
    return _git('reset', args, **kwargs)

def rev_list(*args, **kwargs):
    return _git('rev-list', args, **kwargs)

def rev_parse(*args, **kwargs):
    return _git('rev-parse', args, **kwargs)

def show(*args, **kwargs):
    return _git('show', args, **kwargs)

def status(*args, **kwargs):
    return _git('status', args, **kwargs)

def tag(*args, **kwargs):
    return _git('tag', args, **kwargs)

git_root = rev_parse('--show-toplevel', stderr=DEVNULL)

if git_root is None or git_root == '':
	git_root = None
	current_branch = None
else:
	try:
		current_branch = rev_parse('--abbrev-ref', 'HEAD', stderr=DEVNULL)
	except:
		current_branch = 'HEAD'