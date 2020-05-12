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

    with open('%s/liferay-bisect.js' % dirname(sys.argv[0]), 'r') as js_content_file, open('%s/liferay-bisect.css' % dirname(sys.argv[0]), 'r') as css_content_file:
        css_content = ''.join(css_content_file.readlines())
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
%s
</style>
</head>
<body>
<div class="container" role="main">

<div id="settings">
<input type="checkbox" id="hideUnmarked" name="hideUnmarked">
<label for="hideUnmarked">Hide Unmarked</label>

<input type="checkbox" id="hideMarked" name="hideMarked">
<label for="hideMarked">Hide Marked</label>

<input type="text" id="newCommand" name="newCommand">
</div>

</div>
<script language="Javascript">
var notableHashes = %s;
%s
</script>
</body></html>
        ''' % (css_content, json_content, js_content)

    with open(os.path.join(dir_path, filename),'w' if write else 'a', encoding='UTF-8') as file:
        file.write(html_content)


def sublist_generate(start, end):
    matching_tags = {}
    last_ticket_id = None

    for line in git.log('--date=short', '--format=format:%H %cd', '--simplify-by-decoration', '%s..%s' % (start, end)).split('\n'):
        commit_hash, commit_date = line.split()[0:2]
        commit_tag = git.tag('--points-at', commit_hash)

        if commit_tag.find('\n') != -1:
            commit_tag = [x for x in commit_tag.split('\n') if x.find('fix-pack-') == 0][0]

        if commit_tag.find('fix-pack-') != 0:
            continue

        metadata = {'hash': commit_tag, 'date': commit_date, 'ticket': '', 'status': None}

        matching_tags[commit_tag] = metadata
        matching_tags[commit_hash] = metadata

    notable_hashes = []

    for line in git.log('--date=short', '--pretty=%H %cd %s', '%s..%s' % (start, end)).split('\n'):
        commit_hash, commit_date, ticket_id = line.split()[0:3]

        if commit_hash in matching_tags:
            notable_hashes.append(matching_tags[commit_hash])
            continue

        if ticket_id != ticket_id.upper():
            continue
        if last_ticket_id == ticket_id:
            continue

        last_ticket_id = ticket_id
        notable_hashes.append({'hash': commit_hash, 'date': commit_date, 'ticket': ticket_id, 'status': None})

    return notable_hashes

def list_generate(bad, good):
    notable_hashes = []
    start = None
    end = None

    if git.is_ancestor('fix-pack-base-7010', bad):
        if git.is_ancestor('fix-pack-base-7010', good):
            start = bad if git.is_ancestor(bad, good) else good
            end = bad if start == good else good
            notable_hashes = sublist_generate(start + '~1', end)
        else:
            start = bad
            end = good
            notable_hashes = notable_hashes + sublist_generate('cc57347219da4911d30b154188a99c6a628f6079', end)
            notable_hashes = notable_hashes + sublist_generate(start + '~1', 'fix-pack-de-27-7010')
    else:
        if git.is_ancestor('fix-pack-base-7010', good):
            start = good
            end = bad

            notable_hashes = notable_hashes + sublist_generate('cc57347219da4911d30b154188a99c6a628f6079', end)
            notable_hashes = notable_hashes + sublist_generate(start + '~1', 'fix-pack-de-27-7010')
        else:
            start = bad if git.is_ancestor(bad, good) else good
            end = bad if start == good else good
            notable_hashes = sublist_generate(start + '~1', end)

    if start == bad:
        notable_hashes[0]['status'] = 'good'
        notable_hashes[-1]['status'] = 'bad'
    else:
        notable_hashes[-1]['status'] = 'good'
        notable_hashes[0]['status'] = 'bad'

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