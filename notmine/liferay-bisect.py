#!/usr/bin/env python
# Taken from https://grow.liferay.com/people/Liferay+Bisect+script

import inspect
import json
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import re
import sys
import builtins

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))
import git
import webbrowser
import webbrowser_patch

# Debug printing is enabled by default.
quiet = False

dir_path = os.getcwd()
filename = 'bisect_log.html'

def print_flush(*objects, sep='', end='\n', flush=False):
    return builtins.print(objects, sep, end, flush=True)

builtins.__print__ = print_flush

def print_help():
    print('SYNTAX : lb <bad_commit> <good_commit>')

# Write or Append
def generate_html(notable_hashes, write=True):
    if not quiet:
        print('Updating ' + filename)

    with open('%s/liferay-bisect.js' % dirname(sys.argv[0]), 'r') as js_content_file:
        js_content = ''.join(js_content_file.readlines())
        json_content = json.dumps(notable_hashes)

        html_content = '''
<html><head>
<!-- Latest compiled and minified CSS -->
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">

<!-- Optional theme -->
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">

<!-- Latest compiled and minified JavaScript -->
<script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>

<style>
tr.bad-hash { background-color: #daa; }
tr.good-hash { background-color: #add; }
tr.next-hash { background-color: #dda; }
td.commit-hash { font-family: monospace; }
td.commit-hash input { background-color: transparent; border: 0px; font-family: monospace; font-size: 1em; margin: 0px; padding: 0px; width: 100%%; }
table.hide-unmarked tbody tr { display: none; }
table.hide-unmarked tbody tr.next-hash, table.hide-unmarked tbody tr.marked { display: table-row; }
</style>
</head>
<body>
<div class="container" role="main">

<div>
<input type="checkbox" id="hideUnmarked" name="hideUnmarked">
<label for="hideUnmarked">Hide Unmarked</label>
</div>

</div>
<script language="Javascript">
var notableHashes = %s;
%s
</script>
</body></html>
        ''' % (json_content, js_content)

    with open(os.path.join(dir_path, filename),'w' if write else 'a', encoding='UTF-8') as file:
        file.write(html_content)

def get_hash_info(commit_hash):
    commit_date, ticket_id = git.log('-1', '--date=short', '--pretty=%cd %s', commit_hash).strip().split()[0:2]

    if ticket_id != ticket_id.upper():
        ticket_id = None

    return commit_date, ticket_id

def list_generate(bad, good):
    last_ticket_id = None
    notable_hashes = []

    for line in git.log('--date=short', '--pretty=%H %cd %s', bad + '...' + good).split('\n'):
        commit_hash, commit_date, ticket_id = line.split()[0:3]

        if ticket_id != ticket_id.upper():
            continue
        if last_ticket_id == ticket_id:
            continue

        last_ticket_id = ticket_id
        notable_hashes.append({'hash': commit_hash, 'date': commit_date, 'ticket': ticket_id, 'status': None})

    bad_date, bad_ticket_id = get_hash_info(bad)
    bad_hash = {'hash': bad, 'date': bad_date, 'ticket': bad_ticket_id, 'status': 'bad'}

    good_date, good_ticket_id = get_hash_info(good)
    good_hash = {'hash': good, 'date': good_date, 'ticket': good_ticket_id, 'status': 'good'}

    if git.is_ancestor(bad, good):
        notable_hashes.insert(0, good_hash)
        notable_hashes.append(bad_hash)
    else:
        notable_hashes.insert(0, bad_hash)
        notable_hashes.append(good_hash)

    generate_html(notable_hashes)

def main():
    # lb fix-pack-de-57-7010 fix-pack-de-58-7010
    num_args = len(sys.argv)

    if '-help' in sys.argv or '-h' in sys.argv:
        print_help()

    elif num_args == 2:
    	print_help()

    elif num_args == 3:
        bad = sys.argv[1]
        good = sys.argv[2]
        list_generate(bad, good)

        webbrowser.open_new_tab('file://%s/%s' % (dir_path, filename))

    else:
        sys.exit('Improper argument. \'-help\' for guide.')

if __name__ == '__main__':
    main()