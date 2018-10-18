from __future__ import print_function
import os
import re
import sys

class LogSplitter:

	def split(self, foldername, filename):

		# Create the folder if it does not yet exist.

		if not os.path.exists(foldername):
			os.mkdir(foldername)

		lines = open(filename, 'r')

		# Search for the date format emitted at the top of every
		# standard dump and continues searching until it sees two empty
		# lines in a row.

		thread_dump = False
		thread_dump_file = None

		timestamp_text = '^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d$'
		timestamp_pattern = re.compile(timestamp_text)
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
					foldername, 'thread_' + re.sub('[^\d]', '', line))

				thread_dump_file = open(thread_dump_filename, 'w')

			elif last_line_blank and line.find('Full thread dump') == 0:
				counter += 1

				if thread_dump:
					thread_dump_file.close()
				else:
					thread_dump = True

				last_line_blank = False

				thread_dump_filename = os.path.join(
					foldername, 'thread_%05d' % counter)

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

if __name__ == '__main__':
	if len(sys.argv) != 3:
		print('syntax: python log_splitter.py "/path/to/target/folder" "/path/to/source/file"')
	else:
		splitter = LogSplitter()
		splitter.split(sys.argv[1], sys.argv[2])