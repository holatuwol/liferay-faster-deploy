from collections import defaultdict
import inspect
import itertools
import json
from os.path import abspath, dirname, exists
import pandas as pd
import requests
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_response, get_issues, get_issue_fields, get_jira_auth, jira_base_url

with open('releases.json', 'r') as f:
	releases = json.load(f)

unused_releases = defaultdict(set)
fixed_tickets = set()

if exists('fix_releases.txt'):
	with open('fix_releases.txt', 'r') as f:
		fixed_tickets = set([x.strip() for x in f.readlines()])

def update_issue(issue_key, fix_pack_versions):
	old_fields = get_issue_fields(issue_key, ['customfield_10886'])

	old_flattened_releases = set([
		release['id'] for release in old_fields['customfield_10886']
	]) if 'customfield_10886' in old_fields and old_fields['customfield_10886'] is not None else []

	while True:
		mapped_releases = [releases[key] for key in fix_pack_versions]
		new_flattened_releases = [value for value in itertools.chain.from_iterable(mapped_releases) if value not in unused_releases[issue_key[:3]]]

		if set(new_flattened_releases) == old_flattened_releases:
			return True

		new_releases_field = {'fields':{'customfield_10886':[{'id': value} for value in new_flattened_releases]}}

		url = f'{jira_base_url}/rest/api/2/issue/{issue_key}'
		r = await_response(lambda: requests.put(url, json=new_releases_field, headers=get_jira_auth()))

		if r.status_code == 204:
			return True

		try:
			field_error = r.json()['errors']['customfield_10886']

			if field_error.find('cannot be set') != -1:
				return False

			if field_error.find('is not valid') != -1:
				unused_release = field_error.split('\'')[1]
				unused_releases[issue_key[:3]].add(unused_release)
				continue

			print(field_error)
		except:
			pritn('Unexpected error.')
			return False

# update_issue('LPD-3678', fix_pack_releases.keys())
# update_issue('LPD-3678', [])

df = pd.read_csv('releases.csv', sep='\t')

with open('fix_releases.txt', 'a') as f:
	for index, row in df.iterrows():
		issue_key = row['ticket']

		if issue_key[:4] == 'CVE-' or issue_key in fixed_tickets:
			continue

		print('Checking issue %d of %d (%s)' % (index, len(df), issue_key))
		if update_issue(issue_key, row['fixPackVersion'].split(',')):
			f.write('%s\n' % issue_key)