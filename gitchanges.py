#!/usr/bin/env python

from __future__ import print_function
from sourcetrie import SourceTrie
import os.path

module_paths = SourceTrie.load('.redeploy')
changed_modules = set()

# Scan modules

with open('.redeploy/changes.txt', 'r') as f:
	for file_name in [line.strip() for line in f.readlines()]:
		if file_name.endswith('.iml'):
			continue
		if file_name.startswith('portal-web') and file_name.endswith('.tld'):
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
	if x.startswith('modules/'):
		if os.path.exists('%s/.lfrbuild-portal-pre'):
			return (0, x)
		else:
			return (4, x)

	if x == 'portal-kernel':
		return (1, x)

	if x == 'portal-web':
		return (3, x)

	return (2, x)

changed_modules = sorted([priority(x) for x in changed_modules])

with open('.redeploy/changes_ant.txt', 'w') as f:
	for module in [x[1] for x in changed_modules if not x[1].startswith('modules/')]:
		f.write('%s\n' % module)

with open('.redeploy/changes_gradle_1.txt', 'w') as f:
	for module in [x[1] for x in changed_modules if x[0] == 0]:
		f.write('%s\n' % module)

with open('.redeploy/changes_gradle_2.txt', 'w') as f:
	for module in [x[1] for x in changed_modules if x[0] == 4]:
		f.write('%s\n' % module)