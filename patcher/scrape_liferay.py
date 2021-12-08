
from bs4 import BeautifulSoup
from getpass import getpass
import hashlib
import hmac
import inspect
import json
import math
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
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

json_auth_token = {}

if os.path.isfile('session.ser'):
    with open('session.ser', 'rb') as f:
        session = pickle.load(f)
else:
    session = requests.session()

def get_namespaced_parameters(portlet_id, parameters):
    return { ('_%s_%s' % (portlet_id, key)) : value for key, value in parameters.items() }

def authenticate(base_url, get_params=None):
    r = session.get(base_url, data=get_params, verify=False)

    if r.url.find('https://login.liferay.com/') == 0:
        login_okta(r.url)
    elif r.text.find('SAMLRequest') != -1:
        saml_request(r.url, r.text)
    elif len(r.history) > 0 and r.url.find('p_p_id=') != -1:
        url_params = parse.parse_qs(parse.urlparse(r.url).query)
        login_portlet(r.url, url_params, r.text)

    with open('session.ser', 'wb') as f:
        pickle.dump(session, f)

def get_liferay_file(base_url, target_file=None, params=None, method='get'):
    r = make_liferay_request(base_url, params, method, True)
    total = int(r.headers.get('content-length', 0))
    progress_bar = tqdm(total=total, unit='iB', unit_scale=True)

    if target_file is None:
        filenames = re.findall('filename="([^"]*)"', r.headers.get('content-disposition', ''))

        if len(filenames) == 0:
            target_file = 'untitled'
        else:
            target_file = filenames[0]

    with open(target_file, 'wb') as f:
        for chunk in r.iter_content(chunk_size=8192):
            progress_bar.update(len(chunk))
            f.write(chunk)

    return target_file

def get_liferay_content(base_url, params=None, method='get'):
    r = make_liferay_request(base_url, params, method)

    return r.text

def make_liferay_request(base_url, params, method, stream=False):
    pos = base_url.find('/api/jsonws/')

    if pos != -1:
        params['p_auth'] = get_json_auth_token(base_url[0:pos])
    else:
        authenticate(base_url, params)

    if method == 'get':
        if params is None:
            full_url = base_url
        else:
            query_string = '&'.join(['%s=%s' % (key, value) for key, value in params.items()])

            if base_url.find('?') == -1:
                full_url = '%s?%s' % (base_url, query_string)
            else:
                full_url = '%s&%s' % (base_url, query_string)

        r = session.get(full_url, data=params, stream=stream, verify=False)
    else:
        r = session.post(base_url, data=params, verify=False)

    return r

def saml_request(response_url, response_body):
    soup = BeautifulSoup(response_body, 'html.parser')

    form = soup.find('form')
    form_action = form.get('action')
    form_params = { node.get('name'): node.get('value') for node in form.find_all('input') if node.get('name') is not None }

    r = session.post(form_action, data=form_params)

    url_params = parse.parse_qs(parse.urlparse(r.url).query)

    if r.url.find('https://login.liferay.com/') == 0:
        login_okta(r.url)
    elif 'p_p_id' in url_params:
        login_portlet(r.url, url_params, r.text)
    else:
        saml_response(r.url, r.text)

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

    okta_data = json.loads(json_text)

    return okta_data['signIn']['stateToken']

def login_okta(okta_url):
    redirect_url = None

    while redirect_url is None:
        r = session.get(okta_url, verify=False)
        state_token = get_okta_state_token(r.text)

        print('attempting login with state token %s' % state_token)

        headers, redirect_url = attempt_login_okta(state_token)

    print(redirect_url)

    r = session.get(redirect_url, headers=headers, verify=False)

    # Process the SAML response

    saml_response(r.url, r.text)
    return True

def attempt_login_okta(state_token):
    form_params = {
        'stateToken': state_token
    }

    r = session.post('https://login.liferay.com/api/v1/authn', json=form_params)

    request_id = r.headers['X-Okta-Request-Id']

    headers = {
        'X-Okta-Request-Id': request_id
    }

    # Hard-code the device fingerprint to all options blank (okta_fingerprint.html)

    fingerprint = '24700f9f1986800ab4fcc880530dd0ed'

    # Retrieve the nonce

    r = session.post('https://login.liferay.com/api/v1/internal/device/nonce', headers=headers)

    # Set the HMAC-SHA256 encoded fingerprint as a header

    nonce = r.json()['nonce']
    hashed_fingerprint = hmac.new(nonce.encode('utf-8'), msg=fingerprint.encode('utf-8'), digestmod=hashlib.sha256).hexdigest()
    device_fingerprint = '%s|%s|%s' % (nonce, hashed_fingerprint, fingerprint)

    headers['x-device-fingerprint'] = device_fingerprint

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

    r = session.post('https://login.liferay.com/api/v1/authn', json=form_params, headers=headers)

    # Pretend we can follow the login redirect

    response_json = r.json()

    form_params = {
        'stateToken': response_json['stateToken']
    }

    if 'next' in response_json['_links']:
        return headers, response_json['_links']['next']['href']

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
        r = session.post(verify_url, json=form_params, headers=headers)
        response_json = r.json()
    except:
        return None, None

    if factor_type != 'push' and response_json['status'] == 'MFA_CHALLENGE':
        while response_json['status'] != 'SUCCESS':
            sys.stderr.write('passcode: ')
            form_params['passCode'] = input()

            try:
                r = session.post(verify_url, json=form_params, headers=headers)
                response_json = r.json()
            except:
                pass

            del form_params['passCode']
            print('return 2')
            return headers, response_json['_links']['next']['href']

    for i in range(12):
        if response_json['status'] == 'SUCCESS':
            print('return 3')
            return headers, response_json['_links']['next']['href']

        sys.stderr.write('waiting for MFA result (%d/12)...\n' % (i+1))
        time.sleep(5)

        try:
            r = session.post(verify_url, json=form_params, headers=headers)
            response_json = r.json()
        except:
            pass

    return None, None

def login_portlet(login_url, login_params, login_response_body):
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
    use_email = False

    for label in form.find_all('label'):
        if label.get('for') == login_input_name:
            use_email = label.text.lower().find('email') != -1

    if use_email:
        form_params[login_input_name] = '%s@liferay.com' % username
    else:
        form_params[login_input_name] = username

    form_params['%s%s' % (namespace, 'password')] = password

    r = session.post(form_action, data=form_params)

    if r.text.find('SAMLResponse') != -1:
        saml_response(r.url, r.text)

def saml_response(response_url, response_body):
    soup = BeautifulSoup(response_body, 'html.parser')

    form = soup.find('form')
    form_action = form.get('action')
    form_params = { node.get('name'): node.get('value') for node in form.find_all('input') if node.get('name') is not None }

    r = session.post(form_action, data=form_params)

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
    if len(sys.argv) < 2:
        username = git.config('files.username')
        password = git.config('files.password')

        get_liferay_file('https://www.liferay.com/c/portal/login')
    else:
        sys.stderr.write('username: ')
        username = input()
        password = getpass('password: ')

        for file_name in sys.argv[1:]:
            print(get_liferay_file(file_name))
else:
    username = git.config('files.username')
    password = git.config('files.password')
