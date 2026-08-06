import sys
from issue_export import export_service_desk_issues

assert(len(sys.argv) == 2 and len(sys.argv) > 0)

account_key = sys.argv[1]

if account_key[:5] == 'LRHC-':
    export_service_desk_issues(f"key = '{account_key}'", None, ['accountCode', 'public'])
else:
    export_service_desk_issues(f"project = 'LRHC' and cf[12570] ~ '{account_key}'", f"customer_export/{account_key}.json", ['accountCode', 'public', 'updated', 'priority', 'longTermResolution', 'heatScore', 'irTime', 'crTime'])
    export_service_desk_issues(f"project = 'LRHC' and cf[12570] ~ '{account_key}'", f"customer_export/{account_key}.internal.json", ['accountCode', 'updated'])