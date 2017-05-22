#!/usr/bin/env python

from __future__ import print_function
import os.path
try:
    import cPickle as pickle
except ImportError:
    import pickle
import sys

class SourceTrie:
	def __init__(self, parent_node=None, node_id=None):
		self.parent_node = parent_node
		self.node_id = node_id
		self.children = {}
		self.value = None

	def add(self, path, group, name, version):
		result = self

		for path_element in path.split('/'):
			if path_element not in result.children:
				result.children[path_element] = SourceTrie(result, path_element)

			result = result.children[path_element]

		result.value = (group, name, version)

	def add_ant(self, path):
		# portal-web is an exception

		if path == 'portal-web':
			self.add(path, None, None, None)
			return

		# Load information from bnd.bnd

		_, artifact_version = self.extract_bnd(path)

		build_xml = '%s/build.xml' % path

		if artifact_version is None:
			if os.path.isfile(build_xml):
				self.add(path, None, None, None)

			return

		# Load the artifact name from build.xml

		with open(build_xml, 'r') as f:
			lines = [line for line in f.readlines() if line.find('"manifest.bundle.symbolic.name"') > 0]

		if len(lines) != 1:
			return

		x = lines[0].find('value="')+7
		y = lines[0].find(';', x)

		if y < 0:
			y = lines[0].find('"', x)

		artifact_name = lines[0][x:y]
		self.add(path, 'com.liferay.portal', artifact_name, artifact_version)

	def add_gradle(self, path):
		artifact_name, artifact_version = self.extract_bnd(path)
		self.add(path, 'com.liferay', artifact_name, artifact_version)

	def extract_bnd(self, path):
		bnd_bnd = '%s/bnd.bnd' % path

		if not os.path.exists(bnd_bnd):
			return None, None

		with open(bnd_bnd, 'r') as f:
			lines = [line for line in f.readlines()]

		name_lines = [line for line in lines if line.startswith('Bundle-SymbolicName:')]
		version_lines = [line for line in lines if line.startswith('Bundle-Version:')]

		if len(name_lines) != 1 or len(version_lines) != 1:
			return None, None

		artifact_name = name_lines[0][20:].strip()
		artifact_version = version_lines[0][15:].strip()

		return artifact_name, artifact_version

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

	def load(parent_folder):
		# Use the pickled source trie from a previous run (if present)

		pickle_file = '%s/sourcetrie.pickle' % parent_folder

		if os.path.exists(pickle_file):
			with open(pickle_file, 'rb') as f:
				try:
					return pickle.load(f)
				except:
					print('Corrupt sourcetrie.pickle, regenerating', file=sys.stderr)

		# Generate the pickled data structure if the source file is present

		source_file = '%s/sourcetrie.txt' % parent_folder

		if os.path.exists(source_file):
			root = SourceTrie()

			with open(source_file, 'r') as f:
				for file_name in [line.strip() for line in f.readlines()]:
					pos = file_name.rfind('/')

					if pos == -1:
						continue

					module_path = file_name[0:pos]

					if os.path.isfile('%s/build.xml' % module_path):
						root.add_ant(module_path)
					else:
						root.add_gradle(module_path)

			with open(pickle_file, 'wb') as f:
				pickle.dump(root, f)

			return root

		# Otherwise, we have no idea what to do

		print('Unable to find %s' % source_file, file=sys.stderr)
		sys.exit(1)

	load=staticmethod(load)