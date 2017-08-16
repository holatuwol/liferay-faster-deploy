#!/usr/bin/env python

from __future__ import print_function
import datetime
from os import listdir
from os.path import getmtime, isfile, isdir, join
import sys

def get_modified_time(path):
	if isdir(path):
		return max([get_modified_time(join(path, item)) for item in listdir(path)])
	elif isfile(path):
		return getmtime(path)
	else:
		return 0

def get_modified_time_source_folder(path):
	if not isdir(path):
		return get_modified_time(path)
	if isdir(join(path, 'src')):
		return get_modified_time(join(path, 'src'))
	elif isdir(join(path, 'docroot')):
		return get_modified_time(join(path, 'docroot'))
	else:
		return get_modified_time(path)

modified_times = [get_modified_time_source_folder(line.strip()) for line in sys.argv[1:] if line.strip() != '']
str_modified_times = [datetime.datetime.fromtimestamp(item).strftime('%Y%m%d%H%M.%S') for item in modified_times]

if len(modified_times) > 0:
	print('\n'.join(str_modified_times))