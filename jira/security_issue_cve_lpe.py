#!/usr/bin/env python3
import os
import sys
import orjson as json
import re
from collections import defaultdict

def generate_reverse_mapping():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, 'security_issue_lpe_cve.json')
    output_file = os.path.join(script_dir, 'security_issue_cve_lpe.json')

    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' does not exist.", file=sys.stderr)
        print("Please run security_issue_lpe_cves.py first to generate it.", file=sys.stderr)
        sys.exit(1)

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            lpe_to_cves = json.loads(f.read())
    except Exception as e:
        print(f"Error loading {input_file}: {e}", file=sys.stderr)
        sys.exit(1)

    cve_to_lpes = defaultdict(list)

    for lpe_key, cves in lpe_to_cves.items():
        for cve in cves:
            cve_to_lpes[cve].append(lpe_key)

    # Sort the CVE keys naturally
    natural_sort_key = lambda k: [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', k)]
    sorted_cve_keys = sorted(cve_to_lpes.keys(), key=natural_sort_key)

    # Build the final sorted dictionary
    sorted_cve_to_lpes = {}
    for cve in sorted_cve_keys:
        # Sort the LPE list naturally
        sorted_cve_to_lpes[cve] = sorted(cve_to_lpes[cve], key=natural_sort_key)

    try:
        with open(output_file, 'wb') as f:
            f.write(json.dumps(sorted_cve_to_lpes))
        print(f"Successfully generated reverse mapping for {len(sorted_cve_to_lpes)} CVEs to {output_file}.")
    except Exception as e:
        print(f"Error writing to {output_file}: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    generate_reverse_mapping()
