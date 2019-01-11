#!/usr/bin/env python

from __future__ import print_function
import sys

def basenames(entries):
	if entries is None:
		return []

	entries = [entry[entry.rfind('/')+1:].strip() for entry in entries if entry.strip() != '']
	entries = [entry for entry in entries if entry != '']
	return sorted(set(entries))

if __name__ == '__main__':
	lines = basenames(sys.stdin.readlines())
	if len(lines) > 0:
		print('\n'.join(lines))