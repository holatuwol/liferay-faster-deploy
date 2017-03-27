#!/usr/bin/env python

from __future__ import print_function
from sourcetrie import SourceTrie

module_paths = SourceTrie.load()
changed_modules = set()

with open('deploy_changes.txt', 'r') as f:
	for file_name in f.readlines():
		node = module_paths.find_leaf(file_name)

		if node is None:
			continue

		node_path = node.get_path()

		if node_path != 'modules':
			changed_modules.add(node_path)

for module in changed_modules:
	print(module)