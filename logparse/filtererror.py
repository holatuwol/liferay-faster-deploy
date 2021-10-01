#!/usr/bin/env python

from __future__ import print_function
import string
import sys

assert(len(sys.argv) >= 4)

since_timestamp = []
needles = sys.argv[3:]
numbers = set([str(x) for x in range(0, 10)])

with open(sys.argv[1]) as infile, open(sys.argv[2], 'w') as outfile:
	skip_error = False

	for line in infile:
		if line[0] in numbers:
			outfile.write(''.join(since_timestamp))
			since_timestamp = []

		# Look for the exception either in a timestamp line or a
		# "Caused by" line

		if line[0] in string.whitespace:
			if not skip_error:
				skip_error = len([needle for needle in needles if line.find(needle) != -1])
		else:
			if skip_error:
				if line.find('Caused by') == 0:
					continue
				if line[0] not in numbers and len(since_timestamp) == 0:
					continue

			skip_error = len([needle for needle in needles if line.find(needle) != -1])

		if skip_error:
			since_timestamp = []
			continue

		skip_error = False
		since_timestamp.append(line)

	outfile.write(''.join(since_timestamp))