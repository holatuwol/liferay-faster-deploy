import inspect
import json
from os.path import abspath, dirname
from pathlib import Path
import sys
import zoneinfo

from issue_export import export_service_desk_issues

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import await_get_request, jira_base_url

def export_user(user_name, target_tz):
    r = await_get_request(f"{jira_base_url}/rest/api/3/user/search?query={user_name}@liferay.com", {})

    assert(r.status_code == 200)

    account_json = r.json()

    with open(f"participant_export/{user_name}[account].json", 'w', encoding='utf-8') as f:
        json.dump(account_json, f)

    assert(len(account_json) == 1)

    account_id = account_json[0]['accountId']

    export_service_desk_issues(f"project = 'LRHC' and assignee was {account_id}", f"participant_export/{user_name}.json", [])

if __name__ == '__main__':
    r = await_get_request(f"{jira_base_url}/rest/api/3/myself", {})

    assert(r.status_code == 200)

    response_json = r.json()
    target_tz = zoneinfo.ZoneInfo(response_json['timeZone'])

    if len(sys.argv) == 1:
        for user_name in [file_path.name[:-5] for file_path in Path('participant_export').glob("*.html")]:
            export_user(user_name, target_tz)
    else:
        export_user(sys.argv[1], target_tz)