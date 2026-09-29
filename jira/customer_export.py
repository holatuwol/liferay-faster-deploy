from concurrent.futures import ThreadPoolExecutor
import orjson as json
from os.path import exists
import sys
from issue_export import export_service_desk_issues

assert(len(sys.argv) == 2 and len(sys.argv) > 0)

def export_project(account_key):
    issues, _ = export_service_desk_issues(f"project = 'LRHC' and cf[12570] ~ '{account_key}'", f"customer_export/{account_key}.internal.json", ['accountCode'])
    issues, _ = export_service_desk_issues(issues, f"customer_export/{account_key}.json", ['accountCode', 'public', 'updated', 'priority', 'longTermResolution', 'heatScore', 'irTime', 'crTime'])

if exists(sys.argv[1]):
    file_path = sys.argv[1]

    print(file_path)

    assert(file_path[-5:] == '.json' or file_path[-7:] == '.ndjson')

    with open(file_path, 'rb') as f:
        if file_path[-5:] == '.json':
            account_keys = set([account['code'] for account in json.loads(f.read())])
        else:
            account_keys = set([json.loads(line)['code'] for line in f])

    with ThreadPoolExecutor(max_workers=5) as executor:
        tasks = [executor.submit(export_project, account_key) for account_key in account_keys]

    for task in tasks:
    	task.result()
else:
    if sys.argv[1] == 'LRHC-':
        export_service_desk_issues(f"key = '{sys.argv[1]}'", None, ['accountCode', 'public'])
    else:
        export_project(sys.argv[1])