from __future__ import print_function
import psutil

used_ports = set([conn.laddr.port for conn in psutil.net_connections()])

increment = 0
base_ports = [7800, 7801, 8000, 8009, 8080, 8443, 11311]

test_ports = [base_port+increment for base_port in base_ports]
conflict_ports = [test_port for test_port in test_ports if test_port in used_ports]

while len(conflict_ports) > 0:
	increment += 100
	test_ports = [base_port+increment for base_port in base_ports]
	conflict_ports = [test_port for test_port in test_ports if test_port in used_ports]

print(8080+increment)