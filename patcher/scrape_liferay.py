
from bs4 import BeautifulSoup
import hashlib
import hmac
import inspect
import json
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import requests
import sys

try:
    from urllib import parse
except:
    import urlparse as parse

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))
import git

username = git.config('files.username')
password = git.config('files.password')
json_auth_token = {}

session = requests.session()

def get_namespaced_parameters(portlet_id, parameters):
    return { ('_%s_%s' % (portlet_id, key)) : value for key, value in parameters.items() }

def authenticate(base_url, get_params=None):
    r = session.get(base_url, data=get_params)

    if r.text.find('SAMLRequest') != -1:
        saml_request(r.url, r.text)
    elif r.url.find('https://login.liferay.com/') == 0:
        login_okta(r.url, r.text)
    elif len(r.history) > 0 and r.url.find('p_p_id=') != -1:
        url_params = parse.parse_qs(parse.urlparse(r.url).query)
        login_portlet(r.url, url_params, r.text)

def get_liferay_content(base_url, params=None, method='get'):
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

        r = session.get(full_url, data=params)
    else:
        r = session.post(base_url, data=params)

    return r.text

def saml_request(response_url, response_body):
    soup = BeautifulSoup(response_body, 'html.parser')

    form = soup.find('form')
    form_action = form.get('action')
    form_params = { node.get('name'): node.get('value') for node in form.find_all('input') if node.get('name') is not None }

    r = session.post(form_action, data=form_params)

    url_params = parse.parse_qs(parse.urlparse(r.url).query)

    if r.text.find('SAMLResponse') != -1:
        saml_response(r.url, r.text)
    elif r.url.find('https://login.liferay.com/') == 0:
        login_okta(r.url, r.text)
    elif 'p_p_id' in url_params:
        login_portlet(r.url, url_params, r.text)

def login_okta(response_url, response_text):
    start = response_text.find('{"redirectUri":')
    end = response_text.find('};', start) + 1

    okta_data = json.loads(response_text[start:end].replace('\\x', '\\u00'))

    # Check the state token

    state_token = okta_data['signIn']['stateToken']

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
        'username': '%s@liferay.com' % username,
        'password': password,
        'stateToken': state_token,
        'options': {
            'warnBeforePasswordExpired': 'false',
            'multiOptionalFactorEnroll': 'false'
        }
    }

    r = session.post('https://login.liferay.com/api/v1/authn', json=form_params, headers=headers)

    # Pretend we can follow the login redirect

    redirect_url = r.json()['_links']['next']['href']

    r = session.get(redirect_url, headers=headers)

    # Process the SAML response

    saml_response(r.url, r.text)

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

