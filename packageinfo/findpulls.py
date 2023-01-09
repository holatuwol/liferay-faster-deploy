import json
import subprocess

get_liferay_members = [
	'gh', 'api', '--paginate', '-H', 'Accept: application/vnd.github+json', '/orgs/liferay/members'
]

with subprocess.Popen(get_liferay_members, stdout=subprocess.PIPE, encoding='utf8') as proc:
	data = [item['login'] for item in json.loads(proc.communicate()[0].replace('][', ','))]

with open('findpulls.json', 'w') as f:
	json.dump(data, f, separators=[',', ':'])