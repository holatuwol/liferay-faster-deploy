#!/usr/bin/env python

import sys

with open(sys.argv[1], 'r') as f:
  content = f.read()

ajp_connector_index = content.find('"AJP/')

comment_start_marker = content.rfind('<!--', 0, ajp_connector_index)
comment_end_marker = content.find('-->', ajp_connector_index)

new_content = content[0:comment_start_marker] + content[comment_start_marker+4:comment_end_marker] + content[comment_end_marker+3:]

with open(sys.argv[1], 'w') as f:
  f.write(new_content)