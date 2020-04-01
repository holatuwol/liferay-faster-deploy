#!/usr/bin/env python

import re
import sys

with open(sys.argv[1], 'r') as f:
	content = f.read()

ajp_connector_index = content.rfind('<', 0, content.find('"AJP/'))
comment_start_marker = content.rfind('<!--', 0, ajp_connector_index)

if content[comment_start_marker+4:ajp_connector_index].isspace():
	comment_end_marker = content.find('-->', ajp_connector_index)

	new_connector_text = content[comment_start_marker+4:comment_end_marker-1]

	if new_connector_text.find('address="::1"') != -1:
		new_connector_text = new_connector_text.replace('address="::1"', 'address="127.0.0.1"')
	else:
		new_connector_text = new_connector_text.replace('/>', ' address="127.0.0.1" />')

	new_connector_text = new_connector_text.replace('/>', ' secretRequired="false" />')

	new_content = content[0:comment_start_marker] + \
		new_connector_text + \
		content[comment_end_marker+3:]

	with open(sys.argv[1], 'w') as f:
	  f.write(new_content)