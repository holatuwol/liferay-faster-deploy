import inspect
import itertools
import json
from os.path import abspath, dirname
import pandas as pd
import requests
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_response, get_issues, get_jira_auth, jira_base_url

df = pd.read_csv('releases.csv', sep='\t', header=None, names=['ticket', 'fixVersion', 'fixPackVersion'])

with open('releases.json', 'r') as f:
	releases = json.load(f)

def get_fix_pack(release_name):
	if release_name.find('.q') != -1:
		return '%s.%d' % (release_name[:4], int(release_name[6]) * 100 + int(release_name[8:]))
	return release_name[8:]

fix_pack_releases = {
	get_fix_pack(key): value for key, value in releases.items()
}

with open('releases_unused.json', 'r') as f:
	unused_releases = set(json.load(f))

def update_issue(issue_key, fix_pack_versions):
	while True:
		mapped_releases = [fix_pack_releases[key] for key in fix_pack_versions]
		flattened_releases = [{'id': value} for value in itertools.chain.from_iterable(mapped_releases) if value not in unused_releases]
		releases = {'fields':{'customfield_10886':flattened_releases}}

		url = f'{jira_base_url}/rest/api/2/issue/{issue_key}'
		r = await_response(lambda: requests.put(url, json=releases, headers=get_jira_auth()))

		if r.status_code == 204:
			return

		try:
			unused_release = r.json()['errors']['customfield_10886'].split('\'')[1]
			unused_releases.add(unused_release)
		except:
			print(r.status_code, r.text)
			return

		with open('releases_unused.json', 'w') as f:
			json.dump(sorted(list(unused_releases)), f)

update_issue('LPD-3678', fix_pack_releases.keys())
update_issue('LPD-3678', [])

# for index, row in df.iterrows():
# 	update_issue(row['ticket'], json.loads(row['fixPackVersion']))

