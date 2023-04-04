#!/usr/bin/env python

from __future__ import print_function
import string
import sys

assert(len(sys.argv) >= 4)

since_timestamp = []
needles = sys.argv[3:]
numbers = set([str(x) for x in range(0, 10)])

with open(sys.argv[1]) as infile, open(sys.argv[2], 'w') as outfile:
	include_error = False

	for line in infile:
		if line[0] in numbers:
			if include_error:
				outfile.write(''.join(since_timestamp))

			since_timestamp = []
			include_error = False

		# Look for the exception either in a timestamp line or a
		# "Caused by" line

		since_timestamp.append(line)

		if not include_error:
			include_error = len([needle for needle in needles if line.find(needle) != -1])

	if include_error:
		outfile.write(''.join(since_timestamp))