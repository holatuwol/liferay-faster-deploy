#!/usr/bin/env python3
import os
import sys
try:
    import orjson as json
    def dump_json(obj, f):
        f.write(json.dumps(obj))
    def load_json(content):
        return json.loads(content)
except ImportError:
    import json
    def dump_json(obj, f):
        f.write(json.dumps(obj).encode('utf-8'))
    def load_json(content):
        return json.loads(content)
import re
from collections import defaultdict, deque

# Hard-coded CVEs for LSV-1684 as defined in releases.py
HARD_CODED_LSV_1684 = [
    'CVE-2026-22735', 'CVE-2026-22737', 'CVE-2026-22740', 'CVE-2026-22741',
    'CVE-2026-41838', 'CVE-2026-41839', 'CVE-2026-41840', 'CVE-2026-41841',
    'CVE-2026-41842', 'CVE-2026-41843', 'CVE-2026-41844', 'CVE-2026-41845',
    'CVE-2026-41846', 'CVE-2026-41848', 'CVE-2026-41850', 'CVE-2026-41851',
    'CVE-2026-41852', 'CVE-2026-41853', 'CVE-2026-41854'
]

CVE_PATTERN = re.compile(r'CVE-\d{4}-\d+')

DEV_PROJECTS = {'LPS', 'LPD', 'LPSA', 'COMMERCE'}

def natural_sort_key(k):
    return [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', k)]

def get_security_issue_synonyms():
    # Resolve file paths relative to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    export_dir = os.path.join(script_dir, 'security_issue_export')

    required_files = ['COMMERCE.json', 'LPE.json', 'LPS.json', 'LPSA.json', 'LPD.json', 'LSV.json']
    missing_files = [f for f in required_files if not os.path.exists(os.path.join(export_dir, f))]

    if missing_files:
        print("Error: Missing required JSON files in security_issue_export/ directory:", file=sys.stderr)
        for f in missing_files:
            print(f"  - {f}", file=sys.stderr)
        print("Please run security_issue_export.py first to populate the cache.", file=sys.stderr)
        sys.exit(1)

    # Load cache files
    try:
        with open(os.path.join(export_dir, 'COMMERCE.json'), 'rb') as f:
            commerce_issues = load_json(f.read())
        with open(os.path.join(export_dir, 'LPE.json'), 'rb') as f:
            lpe_issues = load_json(f.read())
        with open(os.path.join(export_dir, 'LPS.json'), 'rb') as f:
            lps_issues = load_json(f.read())
        with open(os.path.join(export_dir, 'LPSA.json'), 'rb') as f:
            lpsa_issues = load_json(f.read())
        with open(os.path.join(export_dir, 'LPD.json'), 'rb') as f:
            lpd_issues = load_json(f.read())
        with open(os.path.join(export_dir, 'LSV.json'), 'rb') as f:
            lsv_issues = load_json(f.read())
    except Exception as e:
        print(f"Error loading JSON cache files: {e}", file=sys.stderr)
        sys.exit(1)

    # Combine into a single lookup index
    issues_all = {}
    for src in [commerce_issues, lpe_issues, lps_issues, lpsa_issues, lpd_issues, lsv_issues]:
        issues_all.update(src)

    graph = defaultdict(set)
    all_cves = set()

    # Link LSVs to CVEs
    for lk, lsv in lsv_issues.items():
        if lk == 'LSV-1684':
            for cve in HARD_CODED_LSV_1684:
                graph[lk].add(cve)
                graph[cve].add(lk)
                all_cves.add(cve)
        cf_val = lsv.get('customfield_10563')
        if cf_val:
            for cve in CVE_PATTERN.findall(cf_val):
                graph[lk].add(cve)
                graph[cve].add(lk)
                all_cves.add(cve)

    # Link issues based on issuelinks between:
    # - LPE <-> LSV
    # - LPE <-> Development projects (LPS, LPD, LPSA, COMMERCE)
    # - LSV <-> Development projects (LPS, LPD, LPSA, COMMERCE)
    for k, v in issues_all.items():
        k_proj = k.split('-')[0]
        for link in v.get('issuelinks', []):
            for side in ['inwardIssue', 'outwardIssue']:
                if side in link:
                    lk = link[side]['key']
                    if lk in issues_all:
                        lk_proj = lk.split('-')[0]
                        pair = {k_proj, lk_proj}
                        if (pair == {'LPE', 'LSV'} or
                            (k_proj == 'LPE' and lk_proj in DEV_PROJECTS) or
                            (lk_proj == 'LPE' and k_proj in DEV_PROJECTS) or
                            (k_proj == 'LSV' and lk_proj in DEV_PROJECTS) or
                            (lk_proj == 'LSV' and k_proj in DEV_PROJECTS)):
                            graph[k].add(lk)
                            graph[lk].add(k)

    all_keys = set(issues_all.keys()).union(all_cves)

    # Connected components using BFS
    visited = set()
    components = {}
    for node in all_keys:
        if node not in visited:
            comp = []
            q = deque([node])
            visited.add(node)
            while q:
                curr = q.popleft()
                comp.append(curr)
                for neighbor in graph[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        q.append(neighbor)
            for x in comp:
                components[x] = comp

    # Build final dictionary sorted naturally
    synonyms = {}
    for k in sorted(all_keys, key=natural_sort_key):
        comp = components.get(k, [k])
        other_synonyms = [x for x in comp if x != k]
        synonyms[k] = sorted(other_synonyms, key=natural_sort_key)

    return synonyms

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    synonyms = get_security_issue_synonyms()

    output_file = os.path.join(script_dir, 'security_issue_synonyms.ndjson')
    try:
        with open(output_file, 'wb') as f:
            encoded_new_line = '\n'.encode('utf-8')
            for key, value in synonyms.items():
                f.write(json.dumps({'key': key, 'value': value}))
                f.write(encoded_new_line)
        print(f"Successfully generated synonyms mapping for {len(synonyms)} tickets to {output_file}.")
    except Exception as e:
        print(f"Error writing to {output_file}: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
