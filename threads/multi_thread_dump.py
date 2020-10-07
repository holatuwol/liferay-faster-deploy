#!/usr/bin/env python

from __future__ import print_function
from pandas import DataFrame
from matplotlib import pyplot
import os
import shutil
import six
import sys
from tarfile import TarFile
from thread_dump import ThreadDump
from zipfile import ZipFile


class MultiThreadDump:
	def __init__(self):
		self.thread_dumps = {}

	def show(self, phrases = None):
		for thread_dump in self.thread_dumps.values():
			thread_dump.show(phrases)

	def hide(self, phrases = None, min_length = 0, max_length = sys.maxsize):
		for thread_dump in self.thread_dumps.values():
			thread_dump.hide(phrases, min_length, max_length)

	def store(self, foldername):
		for filename, thread_dump in self.thread_dumps.items():
			target_filename = os.path.join(foldername, filename)
			target_foldername = os.path.dirname(target_filename)

			if not os.path.exists(target_foldername):
				os.makedirs(target_foldername)

			if thread_dump.count() == 0:
				print('Remove %s because it is now empty' % filename)

				if os.path.exists(target_filename):
					os.remove(target_filename)
			else:
				with open(target_filename, 'w') as file:
					file.write(str(thread_dump))

	def thread_names(self, substring = None):
		thread_names = set()

		for thread_dump in self.thread_dumps.values():
			thread_names.update(thread_dump.thread_names(substring))

		return sorted(thread_names)

	def thread_names_plot(thread_name = ''):
		df = pd.DataFrame([
			{
				'file': key,
				'count': len(value.thread_names(thread_name))
			}
				for key, value in sorted(threads.thread_dumps.items())
		])

		df.plot()

	def store_thread(self, target_filename, substring):
		thread_names = list(self.thread_names(substring))

		if len(thread_names) == 0:
			print('No visible threads matched %s' % substring)
			return

		if len(thread_names) > 1:
			print('%s is ambiguous %s' % (substring, thread_names))
			return

		with open(target_filename, 'w') as file:
			target_thread_name = thread_names[0]

			for thread_dump in sorted(self.thread_dumps.values()):
				stack_trace = thread_dump.get_thread(target_thread_name)

				if stack_trace is None:
					continue

				file.write(thread_dump.get_thread_dump_header())
				file.write('\n\n')
				file.write(str(stack_trace))
				file.write('\n\n\n\n')

	def count(self, phrases = []):
		return self.counts(phrases)

	def counts(self, phrases = []):
		# If it's just one string, convert it into a list os that the
		# remaining logic works cleanly.

		if isinstance(phrases, six.string_types):
			phrases = [ phrases ]

		# For each thread dump, count the occurrences of each phrase.
		# This will constitute a row in the data frame.

		rows = []
		sorted_filenames = sorted(self.thread_dumps.keys())

		for filename in sorted_filenames:
			thread_dump = self.thread_dumps[filename]
			rows.append(map(thread_dump.count, phrases))

		# Create a data frame representing all the count results for
		# each phrase within each thread dump.

		df = DataFrame(
			rows, columns = phrases, index = sorted_filenames)

		return df

	def count_plot(self, phrases, split = False):
		return self.counts_plot(phrases, split)

	def counts_plot(self, phrases, split = False):
		# Use pandas in order to create our count plot. To do that,
		# get the data frame and then create the plot.

		df = self.counts(phrases)

		# For now, we use a non-subplot bar chart in order to visualize
		# the counts.

		figure = pyplot.figure()

		if split:
			figure_height = 2 * len(phrases)
		else:
			figure_height = 4

		df.plot(
			kind = 'bar', subplots = split, legend = split,
			use_index = False, figsize = (12, figure_height),
			colormap = 'cubehelix')

		if not split:
			pyplot.legend(
				loc = 'center left', bbox_to_anchor = (1.0, 0.5))

		pyplot.show()

	def length(self):
		return self.length()

	def lengths(self):
		# For each thread dump, retrieve the lengths of each thread.
		# This will constitute a row in the data frame.

		rows = []
		row_names = []
		thread_names = set()

		for filename in sorted(self.thread_dumps.keys()):
			thread_dump = self.thread_dumps[filename]

			if thread_dump.count() == 0:
				continue

			thread_lengths = thread_dump.lengths()

			thread_names.update(set(thread_lengths.keys()))

			rows.append(thread_lengths)
			row_names.append(filename)

		# Create a data frame representing all the length results for
		# each thread dump.

		df = DataFrame(
			rows, columns = thread_names, index = row_names)

		return df

	def length_histogram(self, split = False):
		return self.lengths_histogram(split)

	def lengths_histogram(self, split = False):
		# Use pandas in order to create our count plot. To do that,
		# get the data frame and then create the plot.

		df = self.lengths()

		# Histograms want the columns to be how we separate the plots,
		# so we need to take the transpose of the data frame before we
		# create the histogram.

		figure = pyplot.figure()

		if split:
			figure_height = 2 * len(self.thread_dumps.keys())
		else:
			figure_height = 4

		df.T.plot(
			kind = 'hist', subplots = split, legend = split,
			sharex = True, sharey = True, layout = (-1, 1),
			alpha = 0.5, figsize = (12, figure_height),
			colormap = 'cubehelix')

		if not split:
			pyplot.legend(
				loc = 'center left', bbox_to_anchor = (1.0, 0.5))

		pyplot.show()


class FolderThreadDump(MultiThreadDump):
	def __init__(self, foldername):
		MultiThreadDump.__init__(self)

		for filename in os.listdir(foldername):
			lines = open(foldername + '/' + filename, 'r')
			self.thread_dumps[filename] = ThreadDump(lines)


class TarThreadDump(MultiThreadDump):
	def __init__(self, filename):
		MultiThreadDump.__init__(self)

		if filename[-2:] == 'gz':
			tar_file = TarFile(filename, 'r:gz')
		else:
			tar_file = TarFile(filename, 'r')

		for member in tar_file.getmembers():
			if member.isfile():
				tar_member = tar_file.extractfile(member)
				child_name = tar_member.name

				lines = tar_member.readlines()
				self.thread_dumps[child_name] = ThreadDump(lines)


class ZipThreadDump(MultiThreadDump):
	def __init__(self, filename):
		MultiThreadDump.__init__(self)
		zip_file = ZipFile(filename, 'r')

		for child_name in zip_file.namelist():
			lines = zip_file.open(child_name, 'r')
			self.thread_dumps[child_name] = ThreadDump(lines)