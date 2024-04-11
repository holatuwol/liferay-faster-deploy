import inspect
from os.path import abspath, dirname
import requests
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

from jira import get_issues, get_jira_auth, jira_base_url

watched_issues = get_issues('watcher = currentUser() AND status in (Closed, Done, Resolved, Completed, Answered, Cancelled)', [], [])


url = f'{jira_base_url}/rest/api/3/myself'
r = requests.get(url, headers=get_jira_auth())
account_id = r.json()['accountId']

for issue in watched_issues:
    url = f'{jira_base_url}/rest/api/2/issue/{issue}/watchers?accountId={account_id}'
    r = requests.delete(url, headers=get_jira_auth())