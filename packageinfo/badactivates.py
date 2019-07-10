#!/usr/bin/env python

import networkx as nx
from os.path import isfile
import sys

# Load all the imports into a graph

imports_file = 'imports_%s.txt' % sys.argv[1] if len(sys.argv) > 1 else 'imports.txt'

if not isfile(imports_file):
	imports_file = '../%s' % imports_file

assert(isfile(imports_file))

imports_graph = nx.DiGraph()

with open(imports_file, 'r') as f:
	source_node = None

	for line in f:
		line = line.strip()

		if line == '':
			source_node = None
			continue

		if source_node is not None:
			target_node = line[len('import '):-1]

			if not imports_graph.has_node(target_node):
				imports_graph.add_node(target_node)

			imports_graph.add_edge(source_node, target_node)
		else:
			source_node = line

			if not imports_graph.has_node(source_node):
				imports_graph.add_node(source_node)

reachable_imports = {key: value for key, value in nx.all_pairs_shortest_path_length(imports_graph)}

# Find all the problem files that have the '@Activate annotation'

problem_activates = dict()

activates_file = 'activates_%s.txt' % sys.argv[1] if len(sys.argv) > 1 else 'activates.txt'

if not isfile(activates_file):
	activates_file = '../%s' % activates_file

assert(isfile(activates_file))

with open(activates_file, 'r') as f:
	for line in f:
		line = line.strip()

		if line not in reachable_imports:
			continue

		my_imports = reachable_imports[line]
		service_util_imports = [key for key in my_imports if key.find('ServiceUtil') != -1]

		if len(service_util_imports) > 0:
			problem_activates[line] = service_util_imports

# Report the problematic files

for key, value in problem_activates.items():
	print(key)

	for path in [nx.shortest_path(imports_graph, key, x) for x in value]:
		print(' - %s' % '\n   '.join(path[1:]))