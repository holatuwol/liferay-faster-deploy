#!/usr/bin/env python

from __future__ import print_function
import sys

with open(sys.argv[1]) as f:
	last_build = None
	print_last_build = True

	for line in f.readlines():
		line = line.strip()

		if line.find(':formatSource') > -1 or line.find(':checkSourceFormatting') > -1:
			if print_last_build:
				print()

			last_build = line
			print_last_build = False
			continue

		if last_build is None:
			continue

		if line.find('./src') > -1:
			if not print_last_build:
				print(last_build)
				print_last_build = True

			print(line)