#!/usr/bin/env python

from __future__ import print_function
import os
import os.path
import sys

cwd = os.getcwd()

lines = [os.path.relpath(line.strip(), cwd) for line in sys.stdin.readlines() if line.strip() != '']

if len(lines) > 0:
	print('\n'.join(lines))