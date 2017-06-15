#!/usr/bin/env python

from __future__ import print_function
import string
import sys

assert(len(sys.argv) >= 4)

needles = sys.argv[3:]

with open(sys.argv[1]) as infile, open(sys.argv[2], 'w') as outfile:
	skip_error = False

	for line in infile:
		if line[0] not in string.whitespace:
			skip_error = len([needle for needle in needles if line.find(needle) != -1])

		if skip_error:
			continue

		skip_error = False
		outfile.write(line)