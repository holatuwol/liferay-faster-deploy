from bs4 import BeautifulSoup
from collections import defaultdict
import inspect
import json
import requests
from os.path import abspath, dirname, join
import sys

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

import git

session = requests.session()

def zendesk_json_request(domain, api_path, attribute_name, request_type, json_params):
    auth_headers = {
        'Authorization': 'Bearer %s' % git.config('%s.token' % domain)
    }

    url = 'https://%s/api/v2%s' % (domain, api_path)

    if request_type == 'POST':
        r = session.post(url, headers=auth_headers, json=json_params)
    elif request_type == 'PUT':
        r = session.put(url, headers=auth_headers, json=json_params)
    elif request_type == 'GET' and json_params is None:
        r = session.get(url, headers=auth_headers)
    else:
        return None

    api_result = json.loads(r.text)

    if attribute_name in api_result:
        return api_result[attribute_name]
    else:
        print(r.text)
        return None

def get_zendesk_article_content(domain, article_id):
    article = zendesk_json_request(
        domain, '/help_center/en-us/articles/%s.json' % article_id,
        'article', 'GET', None)

    if article is None:
        return None

    return article['body']

def get_lsv_articles():
    article_content = get_zendesk_article_content('liferay-support.zendesk.com', '360018875952')

    soup = BeautifulSoup(article_content, 'html.parser')

    lsv_articles = {}

    for link in soup.find_all('a'):
        href = link.get('href')
        if href is None or href.find('https://help.liferay.com/') != 0:
            continue

        text = link.get_text()

        if text.find('LSV') != 0:
            continue

        article_id = href[href.rfind('/')+1:]

        if text in lsv_articles:
            continue

        lsv_articles[text] = article_id

    return lsv_articles