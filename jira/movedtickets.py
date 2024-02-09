from collections import defaultdict, OrderedDict
from concurrent.futures import ThreadPoolExecutor
from functools import reduce
import inspect
import json
import os
from os.path import abspath, dirname, exists
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues

tickets = defaultdict()

if exists('movedtickets.csv'):
	def reduce_keys(acc, line):
		if line.find('\t') == -1:
			return acc

		old_key, new_key = [x.strip() for x in line.split('\t')]
		acc[old_key] = new_key

		return acc

	with open('movedtickets.csv', 'r') as f:
		lines = set(f.readlines())
		tickets = reduce(reduce_keys, lines, defaultdict())

with open('movedtickets.csv', 'w') as f:
	for line in sorted(lines, key=lambda x: int(x.split('\t')[0].split('-')[1])):
		if line.find('\t') != -1 or line.strip() not in tickets:
			f.write(line)

def write_tickets_json():
	ticket_values = []

	for key, value in tickets.items():
		index = int(key.split('\t')[0].split('-')[1])

		for i in range(len(ticket_values), index + 1):
			ticket_values.append(None)

		ticket_values[index] = value

	with open('movedtickets_object.json', 'w') as f:
		json.dump(tickets, f, separators=[',', ':'])

	with open('movedtickets_array.json', 'w') as f:
		json.dump(ticket_values, f, separators=[',', ':'])

write_tickets_json()

with open('movedtickets.csv', 'a') as f:
	def remember_key_change(old_key, new_key=None):
		if new_key is None:
			f.write('%s\n' % old_key)
			f.flush()
		else:
			f.write('%s\t%s\n' % (old_key, new_key))
			f.flush()

	def find_new_key(old_key):
		new_issues = get_issues('key = %s' % old_key)

		if new_issues is None:
			return

		new_keys = new_issues.keys()

		tickets[old_key].extend(new_keys)
		
		if len(new_keys) == 0:
			remember_key_change(old_key)
		else:
			for new_key in new_keys:
				remember_key_change(old_key, new_key)

	def find_unchanged_keys(old_keys):
		new_issues = get_issues('key in (%s)' % ','.join(old_keys))

		if new_issues is None:
			return old_keys

		if len(new_issues) == 0:
			return set()

		missing_keys = set(old_keys)

		print('%d matched search query' % len(new_issues))

		for new_key, issue in new_issues.items():
			if new_key in missing_keys:
				missing_keys.remove(new_key)
				remember_key_change(new_key, new_key)
				continue

		return missing_keys

	def find_new_keys(old_keys):
		new_issues = get_issues('key in (%s)' % ','.join(old_keys), [], ['changelog'])

		if new_issues is None:
			return old_keys

		if len(new_issues) == 0:
			return set()

		missing_keys = set(old_keys)

		print('%d matched search query' % len(new_issues))

		for new_key, issue in new_issues.items():
			for old_key in [item['fromString'] for entry in issue['changelog']['histories'] for item in entry['items'] if item['field'] == 'issuekey']:
				if old_key in missing_keys:
					missing_keys.remove(old_key)
					remember_key_change(old_key, new_key)

		return missing_keys

	ticket_numbers = range(1, 210000)
	old_keys = sorted(list(set(['LPS-%d' % i for i in ticket_numbers]).difference(tickets)), key=lambda x: int(x.split('-')[1]))

	print('looking up original issue key for %d issues' % len(old_keys))

	chunk_size = 500
	old_keys_chunks = [old_keys[x:x+chunk_size] for x in range(0, len(old_keys), chunk_size)]

	changed_keys = []

	for old_keys_chunk in list(old_keys_chunks):
		changed_keys.extend(find_unchanged_keys(old_keys_chunk))
		print('accumulated %d issues that changed their issue key' % len(changed_keys))

	chunk_size = 500
	changed_keys_chunks = [changed_keys[x:x+chunk_size] for x in range(0, len(changed_keys), chunk_size)]

	missing_changelog_keys = []

	for changed_keys_chunk in list(changed_keys_chunks):
		missing_changelog_keys.extend(find_new_keys(changed_keys_chunk))
		print('accumulated %d issues that are missing a proper changelog entry' % len(missing_changelog_keys))

	with ThreadPoolExecutor(max_workers=5) as executor:
		print('searching %d issues individually due to missing proper changelog entries' % len(missing_changelog_keys))

		tasks = [executor.submit(find_new_key, old_key) for old_key in missing_changelog_keys]

		for task in tasks:
			task.result()

write_tickets_json()