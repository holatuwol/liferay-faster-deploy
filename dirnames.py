#!/usr/bin/env python

from __future__ import print_function
import sys

lines = [line[0:line.rfind('/')] for line in sys.stdin.readlines() if line != '']

if len(lines) > 0:
	print('\n'.join(lines))