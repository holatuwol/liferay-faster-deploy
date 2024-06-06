from collections import defaultdict
import inspect
import itertools
import json
from os.path import abspath, dirname, exists
import pandas as pd
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_put_request, get_issues, get_issue_fields, jira_base_url, jira_env

fix_pack_versions_custom_field = 'customfield_10886' if jira_env == 'production' else 'customfield_10903'

with open(f'releases.{jira_env}.json', 'r') as f:
	releases = json.load(f)

project_releases = {}

with open(f'releases.{jira_env}.projects.json', 'r') as f:
	project_releases = json.load(f)

	for key in project_releases:
		project_releases[key] = set(project_releases[key])

unused_releases = defaultdict(set)

success_tickets = set()
failure_tickets = set()

if exists(f'fix_releases.{jira_env}.success.txt'):
	with open(f'fix_releases.{jira_env}.success.txt', 'r') as f:
		success_tickets = set([x.strip() for x in f.readlines()])

if exists(f'fix_releases.{jira_env}.failure.txt'):
	with open(f'fix_releases.{jira_env}.failure.txt', 'r') as f:
		failure_tickets = set([x.strip() for x in f.readlines()])


def update_issue(issue_key, fix_pack_versions):
	project = issue_key[:issue_key.find('-')]
	old_fields = get_issue_fields(issue_key, [fix_pack_versions_custom_field])

	old_flattened_releases = set([
		release['id'] for release in old_fields[fix_pack_versions_custom_field]
	]) if fix_pack_versions_custom_field in old_fields and old_fields[fix_pack_versions_custom_field] is not None else set()

	while True:
		mapped_releases = [releases[key] for key in fix_pack_versions]
		new_flattened_releases = [value for value in itertools.chain.from_iterable(mapped_releases) if value in project_releases[project] and value not in unused_releases[project]]

		if set(new_flattened_releases) == old_flattened_releases:
			return True

		new_releases_field = {'fields':{fix_pack_versions_custom_field:[{'id': value} for value in new_flattened_releases]}}

		url = f'{jira_base_url}/rest/api/2/issue/{issue_key}'
		r = await_put_request(url, new_releases_field)

		if r.status_code == 204:
			return True

		try:
			field_error = r.json()['errors'][fix_pack_versions_custom_field]

			if field_error.find('cannot be set') != -1:
				print(field_error)
				return False

			if field_error.find('is not valid') != -1:
				unused_release = field_error.split('\'')[1]
				unused_releases[project].add(unused_release)
				continue

			print(field_error)
		except:
			print('Unexpected error.')
			return False

# update_issue('LPD-3678', releases.keys())
# update_issue('LPD-3678', [])

df = pd.read_csv(f'releases.{jira_env}.csv', sep='\t')

with open(f'fix_releases.{jira_env}.success.txt', 'a') as f1, open(f'fix_releases.{jira_env}.failure.txt', 'a') as f2:
	for index, row in df.iterrows():
		issue_key = row['ticket']

		if issue_key[:4] == 'CVE-' or issue_key in success_tickets or issue_key in failure_tickets:
			print('Skipping already checked issue %d of %d (%s)' % (index, len(df), issue_key))
			continue

		print('Checking issue %d of %d (%s)' % (index, len(df), issue_key))
		if update_issue(issue_key, row['fixPackVersion'].split(',')):
			f1.write('%s\n' % issue_key)
			f1.flush()
		else:
			f2.write('%s\n' % issue_key)
			f2.flush()