#!/usr/bin/env python

import sys

bnd_file = '%s/bnd.bnd' % sys.argv[1]
tmp_file = '%s/bnd.tmp' % sys.argv[1]

with open(tmp_file, 'w') as outfile:
	with open(bnd_file, 'r') as infile:
		is_import = False

		for line in infile.readlines():
			if line.startswith('Import-Package:'):
				is_import = True
				continue

			if not line[0:1].isspace():
				is_import = False

			if not is_import:
				outfile.write(line)