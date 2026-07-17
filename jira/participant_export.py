import inspect
import json
from os.path import abspath, dirname
import sys
from issue_export import export_service_desk_issues

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_get_request, jira_base_url

assert(len(sys.argv) == 2 and len(sys.argv) > 0)

user_name = sys.argv[1]

r = await_get_request(f"{jira_base_url}/rest/api/3/user/search?query={user_name}@liferay.com", {})

assert(r.status_code == 200)

account_json = r.json()

with open(f"participant_export/{user_name}[account].json", 'w', encoding='utf-8') as f:
    json.dump(account_json, f)

assert(len(account_json) == 1)

account_id = account_json[0]['accountId']

export_service_desk_issues(f"project = 'LRHC' and assignee was {account_id} order by created desc", f"participant_export/{user_name}.json", ['updated'])