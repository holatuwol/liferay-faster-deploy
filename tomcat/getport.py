#!/usr/bin/env python

from __future__ import print_function
from contextlib import closing
from socket import socket, AF_INET, SOCK_STREAM
import sys

base_ports = [int(x) for x in sys.argv[1:]]

if len(base_ports) == 0:
	base_ports = [8080, 7800, 7801, 8000, 8009, 8443, 11311]

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
	print(base_ports[0] + increment)