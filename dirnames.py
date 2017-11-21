#!/usr/bin/env python

from __future__ import print_function
import sys

def dirnames(entries):
	entries = [entry[0:entry.rfind('/')].strip() for entry in entries if entry.strip() != '' and entry.rfind('/') != -1]
	entries = [entry for entry in entries if entry != '']
	return sorted(set(entries))

if __name__ == '__main__':
	lines = dirnames(sys.stdin.readlines())
	if len(lines) > 0:
		print('\n'.join(lines))