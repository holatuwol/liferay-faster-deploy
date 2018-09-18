from bs4 import BeautifulSoup
import inspect
import os
from os.path import abspath, dirname, isdir, isfile, join, relpath
import requests
import sys
from urllib import parse

sys.path.insert(0, dirname(dirname(abspath(inspect.getfile(inspect.currentframe())))))
import git

username = git.config('files.username')
password = git.config('files.password')
json_auth_token = {}

session = requests.session()

def authenticate(base_url, get_params):
	r = session.get(base_url, data=get_params)

	if r.text.find('SAMLRequest') != -1:
		saml_request(r.text)
	elif len(r.history) > 0:
		login_portlet(r.url, r.text)

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

def get_namespaced_parameters(portlet_id, parameters):
	return { ('_%s_%s' % (portlet_id, key)) : value for key, value in parameters.items() }

def login_portlet(login_url, login_response_body):
	soup = BeautifulSoup(login_response_body, 'html.parser')

	portlet_id = parse.parse_qs(parse.urlparse(login_url).query)['p_p_id'][0]

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
		saml_response(r.text)

def saml_request(response_body):
	soup = BeautifulSoup(response_body, 'html.parser')

	form = soup.find('form')
	form_action = form.get('action')
	form_params = { node.get('name'): node.get('value') for node in form.find_all('input') if node.get('name') is not None }

	r = session.post(form_action, data=form_params)
	login_portlet(r.url, r.text)

def saml_response(response_body):
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