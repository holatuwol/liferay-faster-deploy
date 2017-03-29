#!/usr/bin/env python

from __future__ import print_function
from sourcetrie import SourceTrie

module_paths = SourceTrie.load()
changed_modules = set()

# Scan modules

with open('deploy_changes.txt', 'r') as f:
	for file_name in [line.strip() for line in f.readlines()]:
		if file_name.endswith('.iml'):
			continue
		if file_name.endswith('rebel.xml'):
			continue
		if file_name.endswith('node_modules'):
			continue
		if file_name.find('hs_err_pid') >= 0:
			continue

		node = module_paths.find_leaf(file_name)

		if node is None:
			continue

		node_path = node.get_path()

		if node_path != 'modules':
			changed_modules.add(node_path)

# Sort the modules

def priority(x):
	if x.endswith('registry-api'):
		return (0, x)

	if x.startswith('modules/'):
		return (4, x)

	if x == 'portal-kernel':
		return (1, x)

	if x == 'portal-web':
		return (3, x)

	return (2, x)

changed_modules = [x[1] for x in sorted([priority(x) for x in changed_modules])]

for module in changed_modules:
	print(module)