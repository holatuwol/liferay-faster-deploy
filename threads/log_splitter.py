#!/usr/bin/env python

from __future__ import print_function
import os
import re
import stat
import sys

timestamp_text = '^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d$'
timestamp_pattern = re.compile(timestamp_text)

class LogSplitter:

	def lines(self, path):
		if os.path.isdir(path):
			lines = []
			for filename in os.listdir(path):
				print(filename)
				lines.extend(list(open(os.path.join(path, filename), 'r')))
		else:
			lines = list(open(filename, 'r'))

		return lines

	# Split by date

	def split(self, target_path, source_path):

		# Create the folder if it does not yet exist.

		if not os.path.exists(target_path):
			os.mkdir(target_path)
			os.chmod(target_path, stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)

		lines = self.lines(source_path)

		# Search for the date format emitted at the top of every
		# standard dump and continues searching until it sees two empty
		# lines in a row.

		thread_dump = False
		thread_dump_file = None

		last_line_blank = False
		counter = 0

		for line in lines:
			line = line.rstrip()

			# If you are currently parsing a thread dump, then check
			# for an empty line.

			# If you have reached the beginning of a thread dump, flag
			# it as such and open a file. For simplicity, use a name
			# which matches the timestamp.

			if timestamp_pattern.match(line):
				if thread_dump:
					thread_dump_file.close()
				else:
					thread_dump = True

				last_line_blank = False

				thread_dump_filename = os.path.join(
					target_path, 'thread_' + re.sub('[^\d]', '', line))

				thread_dump_file = open(thread_dump_filename, 'w')

			elif last_line_blank and line.find('Full thread dump') == 0:
				counter += 1

				if thread_dump:
					thread_dump_file.close()
				else:
					thread_dump = True

				last_line_blank = False

				thread_dump_filename = os.path.join(
					target_path, 'thread_%05d' % counter)

				thread_dump_file = open(thread_dump_filename, 'w')

			elif thread_dump:

				# If the last line was also blank, you have just seen
				# two empty lines in a row so you have reached the end of
				# your thread dump. Otherwise, you've seen your first
				# blank line so you should track it.

				if len(line) == 0:
					if last_line_blank:
						thread_dump = False
						thread_dump_file.close()
					else:
						last_line_blank = True

				# If you did not see an empty line, reset the flag for
				# tracking the last blank line.

				else:
					last_line_blank = False

			# Write to the thread dump file if you've decided that you
			# are in the middle of parsing a thread dump.

			if thread_dump:
				thread_dump_file.write(line)
				thread_dump_file.write('\n')

		if thread_dump:
			thread_dump_file.close()
			os.chmod(thread_dump_filename, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH | stat.S_IWOTH)

	# Split each instance of a thread into its own file

	def split_thread(self, target_path, source_path):
		# Create the folder if it does not yet exist.

		if not os.path.exists(target_path):
			os.mkdir(target_path)

		header_line = None
		lines = self.lines(source_path)
		thread_dump = False
		counter = 0

		files = dict()

		for line in lines:
			line = line.rstrip()

			if len(line) == 0:
				if thread_dump:
					thread_dump_file.close()
					thread_dump = False
			elif timestamp_pattern.match(line):
				header_line = line
			elif line[0] == '"':
				if thread_dump:
					thread_dump_file.close()

				thread_name = line[1:line.rfind('"')]

				if thread_name in files:
					thread_dump_filename = files[thread_name]
					thread_dump_file = open(thread_dump_filename, 'a')

					thread_dump_file.write('\n\n')
					thread_dump_file.write(header_line)
					thread_dump_file.write('\n')
				else:
					counter += 1

					# thread_dump_filename = os.path.join(
					# 	target_path, 'thread_%05d' % counter)

					thread_dump_filename = os.path.join(
						target_path, 'thread_%s' % thread_name.replace('/', '_'))

					files[thread_name] = thread_dump_filename
					thread_dump_file = open(thread_dump_filename, 'w')
					thread_dump_file.write(header_line)
					thread_dump_file.write('\n')

				thread_dump = True

			if thread_dump:
				thread_dump_file.write(line)
				thread_dump_file.write('\n')

		if thread_dump:
			thread_dump_file.close()
			os.chmod(thread_dump_filename, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH | stat.S_IWOTH)

if __name__ == '__main__':
	if len(sys.argv) != 3:
		print('syntax: python log_splitter.py "/path/to/target/folder" "/path/to/source/file"')
	else:
		splitter = LogSplitter()
		splitter.split(sys.argv[1], sys.argv[2])