
from bs4 import BeautifulSoup
import hashlib
import hmac
import inspect
import json
import math
import os
from os.path import abspath, basename, dirname, isdir, isfile, join, relpath
import pickle
import re
import requests
import sys
import time
from tqdm import tqdm
import urllib3

# Suppress InsecureRequestWarning: Unverified HTTPS
urllib3.disable_warnings()

try:
    from urllib import parse
except:
    import urlparse as parse

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))

import git
import onepass




json_auth_token = {}

if os.path.isfile('session.ser'):
    try:
        with open('session.ser', 'rb') as f:
            session = pickle.load(f)
    except:
        pass
else:
    session = requests.session()

username = onepass.item(git.config('1password.liferay'), 'username')['username']
password = onepass.item(git.config('1password.liferay'), 'password')['password']

default_headers = {
	'User-Agent': 'scrape_liferay.py'
}

def get_namespaced_parameters(portlet_id, parameters):
    return { ('_%s_%s' % (portlet_id, key)) : value for key, value in parameters.items() }

def authenticate(base_url, get_params=None):
    r = session.get(base_url, headers=default_headers, stream=True, verify=False)

    is_html = r.headers['content-type'].lower().find('text/html') == 0

    if is_html and r.text.find('idpEntityId') != -1:
        r = saml_request(base_url, r.url, r.text)

    if r.url == base_url:
        return r

    if r.url.find('https://login.liferay.com/') == 0:
        print('redirected to login.liferay.com')
        r = login_okta(base_url, r.url)
    elif is_html:
        if r.text.find('SAMLRequest') != -1:
            print('redirected to a SAML IdP')
            r = saml_request(base_url, r.url, r.text)
        elif len(r.history) > 0 and r.url.find('p_p_id=') != -1:
            print('redirected to login portlet')
            url_params = parse.parse_qs(parse.urlparse(r.url).query)
            r = login_portlet(base_url, r.url, url_params, r.text)

    with open('session.ser', 'wb') as f:
        pickle.dump(session, f)

    return r

def progress_bar_request(r, f=None):
    total = int(r.headers.get('content-length', 0))
    progress_bar = tqdm(total=total, unit='iB', unit_scale=True)

    if f is None:
        for chunk in r.iter_content(chunk_size=8192):
            progress_bar.update(len(chunk))
    else:
        for chunk in r.iter_content(chunk_size=8192):
            progress_bar.update(len(chunk))
            f.write(chunk)

def get_liferay_file(base_url, target_file=None, params=None, method='get'):
    r = make_liferay_request(base_url, params, method)

    if target_file is None:
        filenames = re.findall('filename="([^"]*)"', r.headers.get('content-disposition', ''))

        if len(filenames) == 0:
            target_file = basename(base_url)

            if target_file.find('.') == -1:
                target_file = 'untitled'
        else:
            target_file = filenames[0]

    with open(target_file, 'wb') as f:
        progress_bar_request(r, f)

    return target_file

def get_liferay_content(base_url, params=None, method='get'):
    r = make_liferay_request(base_url, params, method)

    return r.text

def make_liferay_request(base_url, params=None, method='get'):
    full_url = base_url

    if method == 'get' and params is not None:
        query_string = '&'.join(['%s=%s' % (parse.quote(key), parse.quote(value)) for key, value in params.items()])

        if base_url.find('?') == -1:
            full_url = '%s?%s' % (base_url, query_string)
        else:
            full_url = '%s&%s' % (base_url, query_string)

    print(full_url)

    pos = base_url.find('/api/jsonws/')

    if pos != -1 and params is not None:
        params['p_auth'] = get_json_auth_token(base_url[0:pos])
    else:
        r = authenticate(full_url, params)

        if r.url == full_url:
            return r

    if method == 'get':
        return session.get(full_url, headers=default_headers, stream=True, verify=False)
    else:
        return session.post(full_url, data=params, headers=default_headers, verify=False)

def post_liferay_form(response_body):
    soup = BeautifulSoup(response_body, 'html.parser')

    form = soup.find('form')
    form_action = form.get('action')
    form_params = { node.get('name'): node.get('value') for node in form.find_all('input') if node.get('name') is not None }

    return session.post(form_action, headers=default_headers, data=form_params)

def saml_request(base_url, response_url, response_body):
    r = post_liferay_form(response_body)

    url_params = parse.parse_qs(parse.urlparse(r.url).query)

    if r.url.find('https://login.liferay.com/') == 0:
        return login_okta(base_url, r.url)
    elif 'p_p_id' in url_params:
        return login_portlet(base_url, r.url, url_params, r.text)
    else:
        return saml_response(base_url, r.url, r.text)

def get_function_end(json_text, start):
    count = 0

    for i, ch in enumerate(json_text[start:]):
        if ch == '{':
            count = count + 1
        elif ch == '}':
            count = count - 1
            if count == 0:
                return start + i

def get_okta_state_token(response_text):
    start = response_text.find('{"redirectUri":')
    end = response_text.find('};', start) + 1

    json_text = response_text[start:end].replace('\\x', '\\u00')

    function_start = json_text.find('function(')

    while function_start != -1:
        function_end = get_function_end(json_text, function_start)
        json_text = json_text[0:function_start] + '""' + json_text[function_end+1:]
        function_start = json_text.find('function(')

    try:
        okta_data = json.loads(json_text)
    except:
        print(json_text)
        return None

    return okta_data['signIn']['stateToken']

def login_okta(base_url, okta_url):
    redirect_url = None

    while redirect_url is None:
        r = session.get(okta_url, headers=default_headers, verify=False)
        state_token = get_okta_state_token(r.text)

        print('attempting login with state token %s' % state_token)

        okta_headers, redirect_url = attempt_login_okta(state_token)

        if redirect_url is None:
            time.sleep(10*60)

    print('handling redirect to %s' % redirect_url)

    r = session.get(redirect_url, headers=okta_headers, stream=True, verify=False)

    if r.url == base_url:
        return r

    # Process the SAML response

    return saml_response(base_url, r.url, r.text)

def attempt_login_okta(state_token):
    form_params = {
        'stateToken': state_token if state_token is not None else ''
    }

    r = session.post('https://login.liferay.com/api/v1/authn', headers=default_headers, json=form_params)

    request_id = r.headers['X-Okta-Request-Id']

    okta_headers = {
        'X-Okta-Request-Id': request_id
    }

    # Hard-code the device fingerprint to all options blank (okta_fingerprint.html)

    fingerprint = '24700f9f1986800ab4fcc880530dd0ed'

    # Retrieve the nonce

    r = session.post('https://login.liferay.com/api/v1/internal/device/nonce', headers=okta_headers)

    # Set the HMAC-SHA256 encoded fingerprint as a header

    nonce = r.json()['nonce']
    hashed_fingerprint = hmac.new(nonce.encode('utf-8'), msg=fingerprint.encode('utf-8'), digestmod=hashlib.sha256).hexdigest()
    device_fingerprint = '%s|%s|%s' % (nonce, hashed_fingerprint, fingerprint)

    okta_headers['x-device-fingerprint'] = device_fingerprint

    # Attempt to login

    form_params = {
        'username': username if username.find('@') != -1 else ('%s@liferay.com' % username),
        'password': password,
        'stateToken': state_token,
        'options': {
            'warnBeforePasswordExpired': 'false',
            'multiOptionalFactorEnroll': 'false'
        }
    }

    r = session.post('https://login.liferay.com/api/v1/authn', headers=okta_headers, json=form_params)

    # Pretend we can follow the login redirect

    response_json = r.json()

    form_params = {
        'stateToken': response_json['stateToken']
    }

    if 'next' in response_json['_links']:
        return okta_headers, response_json['_links']['next']['href']

    if response_json['status'] != 'MFA_REQUIRED':
        sys.stderr.write('unrecognized status: %s\n' % response_json['status'])
        return None, None

    factors = {
        factor['factorType']: factor
            for factor in response_json['_embedded']['factors']
    }

    if 'push' in factors:
        factor_type = 'push'
    else:
        factor_types = list(factors.keys())
        sys.stderr.write('\navailable factors:\n%s' % '\n'.join('  %s: %s' % (i, key) for i, key in enumerate(factor_types)))
        sys.stderr.write('\nchoose a factor: ')

        factor_type = input()

        try:
            factor_type = factor_types[int(factor_type)]
        except:
            pass

    factor = factors[factor_type]

    links = factor['_links']
    verify_url = links['verify']['href']

    try:
        r = session.post(verify_url, json=form_params, headers=okta_headers)
        response_json = r.json()
    except:
        return None, None

    if factor_type != 'push' and response_json['status'] == 'MFA_CHALLENGE':
        while response_json['status'] != 'SUCCESS':
            sys.stderr.write('passcode: ')
            form_params['passCode'] = input()

            try:
                r = session.post(verify_url, json=form_params, headers=okta_headers)
                response_json = r.json()
            except:
                pass

            del form_params['passCode']
            return okta_headers, response_json['_links']['next']['href']

    for i in range(12):
        if response_json['status'] == 'SUCCESS':
            return okta_headers, response_json['_links']['next']['href']

        sys.stderr.write('waiting for MFA result (%d/12)...\n' % (i+1))
        time.sleep(5)

        try:
            r = session.post(verify_url, json=form_params, headers=okta_headers)
            response_json = r.json()
        except:
            pass

    return None, None

def login_portlet(base_url, login_url, login_params, login_response_body):
    soup = BeautifulSoup(login_response_body, 'html.parser')

    portlet_id = login_params['p_p_id'][0]

    namespace = '_%s_' % portlet_id

    form_id = '%s%s' % (namespace, 'loginForm')
    form = soup.find('form', {'id': form_id})

    if form is None:
        form_id = '%s%s' % (namespace, 'fm')
        form = soup.find('form', {'id': form_id})

    form_action = form.get('action')
    form_params = { node.get('name'): node.get('value') for node in form.find_all('input') if node.get('name') is not None }

    login_input_name = '%s%s' % (namespace, 'login')

    form_params[login_input_name] = input('username: ')

    form_params['%s%s' % (namespace, 'password')] = input('password: ')

    r = session.post(form_action, data=form_params, headers=default_headers)

    if r.text.find('SAMLResponse') != -1:
        return saml_response(r.url, r.text)

    return r

def saml_response(base_url, response_url, response_body):
    soup = BeautifulSoup(response_body, 'html.parser')

    form = soup.find('form')
    form_action = form.get('action')
    form_params = { node.get('name'): node.get('value') for node in form.find_all('input') if node.get('name') is not None }

    r = session.post(form_action, headers=default_headers, data=form_params)

    return r

def get_json_auth_token(base_url):
    if base_url in json_auth_token:
        return json_auth_token[base_url]

    authenticate('%s/group/control_panel' % base_url, None)

    parameters = {
        'signature': '/company/get-company-by-id-1-companyId'
    }

    json_api_html = get_liferay_content('%s/api/jsonws' % base_url, parameters)

    soup = BeautifulSoup(json_api_html, 'html.parser')

    p_auth_input = soup.find('input', {'name': 'p_auth'})

    if p_auth_input is None:
        return ''

    json_auth_token[base_url] = p_auth_input['value']
    return json_auth_token[base_url]

if __name__ == '__main__':
    make_liferay_request('https://www.liferay.com/c/portal/login')

    if len(sys.argv) > 1:
        for file_name in sys.argv[1:]:
            print(get_liferay_file(file_name))
