#!/usr/bin/env python

from __future__ import print_function
import os
from os.path import relpath
import sys

def relpaths(entries):
	if entries is None:
		return []

	cwd = os.getcwd()
	return [relpath(entry.strip(), cwd) for entry in entries if entry.strip() != '']

if __name__ == '__main__':
	lines = relpaths(sys.stdin.readlines())
	if len(lines) > 0:
		print('\n'.join(lines))