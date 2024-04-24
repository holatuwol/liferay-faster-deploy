import inspect
import itertools
import json
from os.path import abspath, dirname
import pandas as pd
import requests
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_response, get_issues, get_jira_auth, jira_base_url

with open('releases.json', 'r') as f:
	releases = json.load(f)

unused_releases = set()

def update_issue(issue_key, fix_pack_versions):
	print(issue_key)
	print(fix_pack_versions)
	return False

	while True:
		flattened_releases = [{'id': value} for value in fix_pack_versions if value not in unused_releases]
		releases = {'fields':{'customfield_10886':flattened_releases}}

		url = f'{jira_base_url}/rest/api/2/issue/{issue_key}'
		r = await_response(lambda: requests.put(url, json=releases, headers=get_jira_auth()))

		if r.status_code == 204:
			return True

		try:
			unused_release = r.json()['errors']['customfield_10886'].split('\'')[1]
			unused_releases.add(unused_release)
		except:
			print(r.status_code, r.text)
			return False

# update_issue('LPD-3678', fix_pack_releases.keys())
# update_issue('LPD-3678', [])

df = pd.read_csv('releases.csv', sep='\t')

for index, row in df.iterrows():
	update_issue(row['ticket'], row['fixPackVersion'].split(','))

