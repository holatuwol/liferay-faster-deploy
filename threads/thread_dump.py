#!/usr/bin/env python

from matplotlib import pyplot
import six
import sys


class ThreadDump:
	def __init__(self, lines, inverted_index = None):

		# If we are given a file name rather than a list of lines,
		# iterate over the lines in that file name.

		if isinstance(lines, six.string_types):
			lines = open(lines, 'r')

		self.header_lines = []
		self.stack_traces = []
		self.inverted_index = StackTraceInvertedIndex()

		# In order to build our representation of the thread dump,
		# we extract the stack elements and then build the inverted
		# index from those stack elements.

		stack_trace = None

		for line in lines:
			if not isinstance(line, six.string_types):
				line = line.decode('utf-8')

			# If we encounter an empty line, then we have finished
			# reading in a single thread.

			line = line.rstrip()

			if len(line) == 0:
				if stack_trace is not None:
					if stack_trace.get_element_count() > 0:
						self.stack_traces.append(stack_trace)
					stack_trace = None

			# If we have encountered a non-empty line, but we have not
			# encountered the beginning of the next thread stack trace,
			# check to see if we should assume that we've reached the
			# start of a new thread stack trace.

			elif stack_trace is None:
				if line[0] == '"':
					stack_trace = StackTrace(line)
					self.inverted_index.remember(stack_trace)
				elif len(self.stack_traces) == 0:
					self.header_lines.append(line)

			# Otherwise, we have encountered a non-empty line and we
			# already saw the beginning of the next thread stack trace.
			# In this case, we simply add to the stack trace.

			else:
				stack_trace.add_line(line)
				self.inverted_index.remember(stack_trace, line)

	def __cmp__(self, other):
		return cmp(self.get_timestamp(), other.get_timestamp())

	def __str__(self):

		# When transforming the thread dump back to a string, only
		# add the stack traces marked as visible.

		filter_visible = lambda x: x.is_visible()
		visible_stack_traces = list(filter(filter_visible, self.stack_traces))
		sorted_stack_traces = sorted(visible_stack_traces)

		return '\n'.join(self.header_lines) + '\n\n' + \
			'\n\n'.join(map(str, sorted_stack_traces))

	def store(self, filename):

		# Convert to a string and save to the specified file.

		with open(filename, 'w') as file:
			file.write(str(self))

	def thread_names(self, substring):
		thread_names = []

		for stack_trace in self.stack_traces:
			if not stack_trace.is_visible():
				continue

			thread_name = stack_trace.get_thread_name()

			if substring is None or thread_name.find(substring) != -1:
				thread_names.append(thread_name)

		return sorted(thread_names)

	def get_timestamp(self):
		return self.header_lines[0]

	def get_thread_dump_header(self):
		return '\n'.join(self.header_lines)

	def get_thread(self, target_thread_name):
		for stack_trace in self.stack_traces:
			thread_name = stack_trace.get_thread_name()

			if thread_name == target_thread_name:
				return stack_trace

		return None

	def search(self, phrases = None, visible = True):

		# First, find all the stack traces that match the phrases we are
		# attempting to count.

		if phrases is None:
			matching_stack_traces = set(self.stack_traces)
		else:
			if isinstance(phrases, six.string_types):
				phrases = [ phrases ]

			matching_stack_traces = set()

			for phrase in phrases:
				phrase_stack_traces = self.inverted_index.search(phrase)
				matching_stack_traces.update(phrase_stack_traces)

		# Now, filter against the stack traces that are still marked
		# with a visibility matching our search.

		if visible:
			filter_function = lambda x: x.is_visible()
		else:
			filter_function = lambda x: not x.is_visible()

		filtered_stack_traces = list(filter(filter_function, matching_stack_traces))

		return filtered_stack_traces

	def lengths(self, title = None, plot = None):

		visible_lengths = {}

		for stack_trace in self.stack_traces:
			if not stack_trace.is_visible():
				continue

			thread_name = stack_trace.get_thread_name()
			stack_element_count = stack_trace.get_element_count()
			visible_lengths[thread_name] = stack_element_count

		return visible_lengths

	def count(self, phrases = None):

		# Counting is simply filtering on what is visible and counting
		# the number of search results.

		filtered_stack_traces = self.search(phrases, True)

		return len(filtered_stack_traces)

	def show(self, phrases = None):

		# Showing stack traces is simply filtering on what is not
		# visible and making it visible.

		filtered_stack_traces = self.search(phrases, False)

		for stack_trace in filtered_stack_traces:
			stack_trace.show()

	def hide(self, phrases = None, min_length = 0, max_length = sys.maxsize):

		# Hiding stack traces is simply filtering on what is visible
		# and making it not visible.

		filtered_stack_traces = self.search(phrases, True)

		for stack_trace in filtered_stack_traces:
			stack_trace.hide(min_length, max_length)


class StackTraceInvertedIndex:
	def __init__(self):
		self.stack_traces = set()
		self.stack_trace_lookup = { None: set() }
		self.search_cache = {}

	def remember(self, stack_trace, line = None):

		# If we are just remembering the stack trace, track it in the
		# list of all stack traces.

		if line is None:
			self.stack_traces.add(stack_trace)
			return

		# First we add it to the list of stack traces that we need to
		# remember based on line.

		if line not in self.stack_trace_lookup:
			self.stack_trace_lookup[line] = set()

		self.stack_trace_lookup[line].add(stack_trace)

		# Next we add it to any past searches if the line matches any of
		# the past search terms.

		for phrase, stack_trace_lookup in self.search_cache:
			if line.find(phrase) != -1:
				stack_trace_lookup.add(stack_trace)

	def search(self, phrase):

		if phrase is None:
			return frozenset(self.stack_traces)

		# Check if we've already done this search before. If we
		# have, use the cached results.

		if phrase in self.search_cache:
			return self.search_cache[phrase]

		# Otherwise, iterate over all the lines and check for
		# this phrase. If we find it, save it.

		phrase_stack_traces = set()

		for line, stack_trace_lookup in self.stack_trace_lookup.items():
			if line is not None and line.find(phrase) != -1:
				phrase_stack_traces.update(stack_trace_lookup)

		# Store the result of our search in the search cache so
		# that we can reuse it in future analysis.

		self.search_cache[phrase] = frozenset(phrase_stack_traces)
		return self.search_cache[phrase]


class StackTrace:
	def __init__(self, header):
		self.header = header
		self.thread_name = header[1:header.find('"', 1)]

		self.visible = True
		self.stack_elements = []

	def __cmp__(self, other):
		reverse_iterator = zip(reversed(self.stack_elements), reversed(other.stack_elements))

		for self_element, other_element in reverse_iterator:
			if self_element > other_element:
				return 1
			elif self_element < other_element:
				return -1

		if self.thread_name > other.thread_name:
			return 1
		elif self.thread_name < other.thread_name:
			return -1
		return 0

	def __eq__(self, other):
		return self.header == other.header

	def __ne__(self, other):
		return self.header != other.header

	def __gt__(self, other):
		return self.__cmp__(other) > 0

	def __lt__(self, other):
		return self.__cmp__(other) < 0

	def __hash__(self):
		return hash(self.header)

	def __str__(self):
		return self.header + '\n' + '\n'.join(map(str, self.stack_elements))

	def add_line(self, line):
		self.stack_elements.append(line)

	def get_thread_name(self):
		return self.thread_name

	def get_element_count(self):
		return len(self.stack_elements)

	def is_visible(self):
		return self.visible

	def hide(self, min_length = 0, max_length = sys.maxsize):
		element_count = self.get_element_count()

		if element_count < min_length:
			self.visible = False
		elif element_count > max_length:
			self.visible = False
		elif min_length == 0 and max_length == sys.maxsize:
			self.visible = False

	def show(self):
		self.visible = True