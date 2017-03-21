#!/usr/bin/env python

from __future__ import print_function
import os.path

class TrieNode:
	def __init__(self, parent_node=None, node_id=None):
		self.parent_node = parent_node
		self.node_id = node_id
		self.children = {}
		self.value = None

	def add(self, path, value):
		result = self

		for path_element in path.split('/'):
			if path_element not in result.children:
				result.children[path_element] = TrieNode(result, path_element)

			result = result.children[path_element]

		result.value = value

	def find_leaf(self, path):
		result = self

		for path_element in path.split('/'):
			if path_element not in result.children:
				break

			result = result.children[path_element]

		while result is not None and result.value is None:
			result = result.parent_node

		return result

	def get_path(self):
		if self.parent_node is None:
			return None

		parent_path = self.parent_node.get_path()

		if parent_path is None:
			return self.node_id

		return '%s/%s' % (parent_path, self.node_id)

module_paths = TrieNode()

with open('root_candidates.txt', 'r') as f:
	for file_name in [line.strip() for line in f.readlines()]:
		module_path = file_name[0:file_name.rfind('/')]

		if file_name.endswith('/build.xml'):
			module_paths.add(module_path, 'ant')
		else:
			marker = '%s/.lfrbuild-portal' % module_path

			if os.path.exists(marker):
				module_paths.add(module_path, 'gradle')

changed_modules = set()

with open('deploy_changes.txt', 'r') as f:
	for file_name in f.readlines():
		node = module_paths.find_leaf(file_name)

		if node is not None:
			changed_modules.add(node.get_path())

for module in changed_modules:
	print(module)