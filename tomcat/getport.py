from __future__ import print_function
from contextlib import closing
from socket import socket, AF_INET, SOCK_STREAM

base_ports = [7800, 7801, 8000, 8009, 8080, 8443, 11311]

def test_port(port):
	with closing(socket(AF_INET, SOCK_STREAM)) as s:
		try:
			s.bind(('127.0.0.1', port))
			return True
		except:
			return False

def test_increment(increment):
	for base_port in base_ports:
		if not test_port(base_port + increment):
			return False

	return True

def get_increment():
	for increment in range(0, 65535 - max(base_ports), 100):
		if test_increment(increment):
			return increment

	return None

increment = get_increment()

if increment is not None:
	print(8080 + increment)