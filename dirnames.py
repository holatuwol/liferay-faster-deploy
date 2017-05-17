#!/usr/bin/env python

from __future__ import print_function
import sys

lines = [line[0:line.rfind('/')].strip() for line in sys.stdin.readlines() if line != '' and line.rfind('/') != -1]
lines = [line for line in lines if line != '']

if len(lines) > 0:
	print('\n'.join(lines))