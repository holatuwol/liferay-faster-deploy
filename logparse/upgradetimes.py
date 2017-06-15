#!/usr/bin/env python

from __future__ import print_function
import csv
from functools import reduce

with open('times_old.csv') as old_f, open('times_new.csv') as new_f:
	old_rows = [row for row in csv.reader(old_f)]
	new_rows = [row for row in csv.reader(new_f)]

def collapse_upgrades(accumulator, row):
	if row[0].find('#') != -1:
		accumulator['unsorted'].append(row)
		return accumulator

	accumulator['unsorted'].sort(key = lambda x: x[0])
	accumulator['unsorted'].append(row)

	if accumulator['core_finished']:
		accumulator['modules'].append(accumulator['unsorted'])

		if row[0].find(' ') == -1:
			accumulator['modules'].sort(key = lambda x: x[-1][0])
	else:
		accumulator['core'].append(accumulator['unsorted'])

	accumulator['unsorted'] = []

	if row[0] == 'com.liferay.portal.verify.VerifyProcessSuite':
		accumulator['core_finished'] = True

	return accumulator

old_upgrade_data = reduce(collapse_upgrades, old_rows, {'core':[], 'modules':[], 'unsorted':[], 'core_finished': False})
new_upgrade_data = reduce(collapse_upgrades, new_rows, {'core':[], 'modules':[], 'unsorted':[], 'core_finished': False})

compared_tasks = []

def look_ahead_task(tasks, index, value):
	for k in range(index, len(tasks)):
		if tasks[k][0] == value:
			return k

	return -1

def look_ahead_upgrade(upgrades, index, value):
	for k in range(index, len(upgrades)):
		if upgrades[k][-1][0] == value:
			return k

	return -1

def flatten(l):
	return [item for sublist in l for item in sublist]

def process_tasks(old_tasks, new_tasks):
	m = 0
	n = 0

	while m < len(old_tasks):
		if n == len(new_tasks):
			compared_tasks.append([old_tasks[m][0], old_tasks[m][1], None])
			m += 1
			continue

		if old_tasks[m][0] == new_tasks[n][0]:
			compared_tasks.append([old_tasks[m][0], old_tasks[m][1], new_tasks[n][1]])
			m += 1
			n += 1
			continue

		if look_ahead_task(old_tasks, m+1, new_tasks[n][0]) != -1:
			compared_tasks.append([old_tasks[m][0], old_tasks[m][1], None])
			m += 1
			continue

		if look_ahead_task(new_tasks, n + 1, old_tasks[m][0]) != -1:
			compared_tasks.append([new_tasks[n][0], None, new_tasks[n][1]])
			n += 1
			continue

		# Otherwise, it's a step that appears in the old upgrade but does
		# not appear in the new upgrade

		compared_tasks.append([old_tasks[m][0], old_tasks[m][1], None])
		m += 1

	while n < len(new_tasks):
		compared_tasks.append([new_tasks[n][0], None, new_tasks[n][1]])
		n += 1

def process_upgrades(old_upgrades, new_upgrades):
	i = 0
	j = 0

	while i < len(old_upgrades):
		# If they match, append the comparison

		if old_upgrades[i][-1][0] == new_upgrades[j][-1][0]:
			process_tasks(old_upgrades[i], new_upgrades[j])
			i += 1
			j += 1
			continue

		if look_ahead_upgrade(old_upgrades, i + 1, new_upgrades[j][-1][0]) != -1:
			process_tasks(old_upgrades[i], [])
			i += 1
			continue

		if look_ahead_upgrade(new_upgrades, j + 1, old_upgrades[i][-1][0]) != -1:
			process_tasks([], new_upgrades[j])
			j += 1
			continue

		# Otherwise, it's a step that appears in the old upgrade but does
		# not appear in the new upgrade

		process_tasks(old_upgrades[i], [])
		i += 1

	while j < len(new_upgrades):
		process_tasks([], new_upgrades[j])
		j += 1

process_upgrades(old_upgrade_data['core'], new_upgrade_data['core'])
process_upgrades(old_upgrade_data['modules'], new_upgrade_data['modules'])

with open('times_compare.csv', 'w') as f:
	w = csv.writer(f, delimiter=',')

	for task in compared_tasks:
		w.writerow(task)