from bs4 import BeautifulSoup
from datetime import datetime, timezone
import json
import os
from os.path import exists
import re
import requests
import sys
import time

base_url = 'https://liferay.dev/vulnerabilities'

# The search results portlet only honors the page sizes it offers (20, 40, 60),
# and the 'start' parameter is a 1-based page number rather than an offset.

page_size = 60

output_folder = 'security_issue_public_export'
index_file = f'{output_folder}/index.json'

showing_pattern = re.compile(r'Showing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)\s+entries')

session = requests.Session()
session.headers['User-Agent'] = 'Mozilla/5.0 (compatible; security-issue-public-export)'

def get_html(url, retries=3):
    for attempt in range(retries):
        try:
            response = session.get(url, timeout=60)

            if response.status_code == 200:
                return response.text

            print(f'{url}: HTTP {response.status_code}', file=sys.stderr)
        except requests.RequestException as e:
            print(f'{url}: {e}', file=sys.stderr)

        time.sleep(2 ** attempt)

    return None

def get_search_results():
    results = {}
    page = 1

    while True:
        url = f'{base_url}?delta={page_size}&start={page}'
        html = get_html(url)

        if html is None:
            raise Exception(f'Unable to retrieve search results page {url}')

        soup = BeautifulSoup(html, 'html.parser')

        for link in soup.select('.portlet-search-results a.single-link[href]'):
            results[link['href']] = ' '.join(link.get_text().split())

        match = showing_pattern.search(soup.get_text(' '))

        if match is None:
            break

        last_index, total = [int(x.replace(',', '')) for x in match.group(2, 3)]

        print(f'Retrieved search results {last_index} of {total}', file=sys.stderr)

        if last_index >= total:
            break

        page += 1

    return results

def get_external_reference_code(html):
    soup = BeautifulSoup(html, 'html.parser')
    element = soup.find(attrs={'data-analytics-external-reference-code': True})

    if element is None:
        return None

    return element['data-analytics-external-reference-code']

def load_index():
    if not exists(index_file):
        return {}

    with open(index_file, 'r') as f:
        return json.load(f)

def save_index(index):
    with open(index_file, 'w') as f:
        json.dump(index, f, indent=2, sort_keys=True)

def main(refresh=False):
    os.makedirs(output_folder, exist_ok=True)

    index = load_index()
    known_urls = {
        entry['url']: erc for erc, entry in index.items()
            if exists(f'{output_folder}/{erc}.html')
    }

    search_results = get_search_results()
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')

    new_entries = []

    for url, title in search_results.items():
        if not refresh and url in known_urls:
            continue

        html = get_html(url)

        if html is None:
            continue

        erc = get_external_reference_code(html)

        if erc is None:
            print(f'{url}: missing data-analytics-external-reference-code', file=sys.stderr)
            continue

        with open(f'{output_folder}/{erc}.html', 'w') as f:
            f.write(html)

        if erc not in index:
            index[erc] = {'url': url, 'title': title, 'first_seen': now}
            new_entries.append(erc)
        else:
            index[erc] |= {'url': url, 'title': title}

        save_index(index)

    for erc in new_entries:
        print(f'{erc}\t{index[erc]["url"]}\t{index[erc]["title"]}')

    print(f'{len(new_entries)} new vulnerabilities, {len(index)} total', file=sys.stderr)

if __name__ == '__main__':
    main(refresh='--refresh' in sys.argv[1:])
