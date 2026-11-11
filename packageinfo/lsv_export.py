from datetime import datetime
import inspect
import orjson as json
from os import makedirs
from os.path import abspath, dirname, join
import sys
import zoneinfo

script_folder = dirname(abspath(inspect.getfile(inspect.currentframe())))

sys.path.insert(0, dirname(script_folder))

from jira import await_get_request, get_issues, jira_base_url

issue_fields = ['key', 'customfield_10563', 'customfield_10955', 'customfield_10956', 'customfield_10957', 'customfield_10786', 'customfield_10959', 'customfield_10960', 'customfield_10961', 'customfield_10978', 'customfield_10983']

# The export lists the LSVs that are ready for publishing and whose publication
# date has passed in either the customer-facing (cf[10955]) or the public-facing
# (cf[10956]) publication date field. lsv_checker.py builds the data for both
# lsv_checker.html and lsv_checker_public.html from this one export.

export_file_name = 'LSV.json'
date_fields = ['customfield_10955', 'customfield_10956']

def export_lsv_issues(target_date, target_tz, date_fields, file_name):
    target_date_string = target_date.astimezone(target_tz).strftime("%Y-%m-%d %H:%M")

    date_conditions = []

    for date_field in date_fields:
        date_cf = 'cf[%s]' % date_field[len('customfield_'):]
        date_conditions.append(f'({date_cf} is not empty and {date_cf} < "{target_date_string}")')

    jql = ' and '.join([
        'project = LSV',
        '(cf[10957] is not empty and cf[10957] = "Ready for Publishing")',
        '(%s)' % ' or '.join(date_conditions),
    ])

    issues = { issue_key: issue_response['fields'] for issue_key, issue_response in get_issues(f'{jql} order by key', issue_fields, [], False).items() }

    export_folder = join(script_folder, 'lsv_export')

    makedirs(export_folder, exist_ok=True)

    with open(join(export_folder, file_name), 'wb') as f:
        f.write(json.dumps(issues))

    return issues

if __name__ == '__main__':
    r = await_get_request(f"{jira_base_url}/rest/api/3/myself", {})

    assert(r.status_code == 200)

    response_json = r.json()
    target_tz = zoneinfo.ZoneInfo(response_json['timeZone'])

    target_date = datetime.now()

    issues = export_lsv_issues(target_date, target_tz, date_fields, export_file_name)
    print(export_file_name, len(issues), 'issues')
