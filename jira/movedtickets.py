from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from functools import reduce
import inspect
import os
from os.path import abspath, dirname, exists
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues

tickets = None

if exists('movedtickets.csv'):
	def count_keys(acc, line):
		old_key = line.split('\t')[0].strip()
		acc[old_key] = acc[old_key] + 1
		return acc

	with open('movedtickets.csv', 'r') as f:
		lines = set(f.readlines())
		tickets = reduce(count_keys, lines, defaultdict(int))

with open('movedtickets.csv', 'w') as f:
	for line in sorted(lines, key=lambda x: int(x.split('\t')[0].split('-')[1])):
		if line.find('\t') != -1 or tickets[line.strip()] == 1:
			f.write(line)

with open('movedtickets.csv', 'a') as f:
	def find_new_key(old_key):
		new_issues = get_issues('key = %s' % old_key, [])

		if new_issues is None:
			return

		new_keys = new_issues.keys()
		
		if len(new_keys) == 0:
			f.write('%s\n' % old_key)
			f.flush()
		else:
			for new_key in new_keys:
				f.write('%s\t%s\n' % (old_key, new_key))
				f.flush()

	with ThreadPoolExecutor(max_workers=10) as executor:
		ticket_numbers = range(1, 206656)
		old_keys = sorted(list(set(['LPS-%d' % i for i in ticket_numbers]).difference(tickets)), key=lambda x: int(x.split('-')[1]))
		tasks = [executor.submit(find_new_key, old_key) for old_key in old_keys]
		for task in tasks:
			task.result()