#!/usr/bin/env python3
import os
import sys
import orjson as json
import re

def get_lpe_to_cve_mapping():
    # Resolve file paths relative to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    export_dir = os.path.join(script_dir, 'security_issue_export')

    required_files = ['LPE.json', 'LPS.json', 'LPD.json', 'LSV.json']
    missing_files = [f for f in required_files if not os.path.exists(os.path.join(export_dir, f))]

    if missing_files:
        print("Error: Missing required JSON files in security_issue_export/ directory:", file=sys.stderr)
        for f in missing_files:
            print(f"  - {f}", file=sys.stderr)
        print("Please run security_issue_export.py first to populate the cache.", file=sys.stderr)
        sys.exit(1)

    # Load cache files
    try:
        with open(os.path.join(export_dir, 'LPE.json'), 'r', encoding='utf-8') as f:
            lpe_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LPS.json'), 'r', encoding='utf-8') as f:
            lps_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LPD.json'), 'r', encoding='utf-8') as f:
            lpd_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LSV.json'), 'r', encoding='utf-8') as f:
            lsv_issues = json.loads(f.read())
    except Exception as e:
        print(f"Error loading JSON cache files: {e}", file=sys.stderr)
        sys.exit(1)

    # Combine into a single lookup index
    issues_all = {}
    for src in [lpe_issues, lps_issues, lpd_issues, lsv_issues]:
        issues_all.update(src)

    # Hard-coded CVEs for LSV-1684 as defined in releases.py
    hard_coded_lsv_1684 = [
        'CVE-2026-22735', 'CVE-2026-22737', 'CVE-2026-22740', 'CVE-2026-22741',
        'CVE-2026-41838', 'CVE-2026-41839', 'CVE-2026-41840', 'CVE-2026-41841',
        'CVE-2026-41842', 'CVE-2026-41843', 'CVE-2026-41844', 'CVE-2026-41845',
        'CVE-2026-41846', 'CVE-2026-41848', 'CVE-2026-41850', 'CVE-2026-41851',
        'CVE-2026-41852', 'CVE-2026-41853', 'CVE-2026-41854'
    ]

    cve_pattern = re.compile(r'CVE-\d{4}-\d+')

    lpe_to_cves = {}

    # Sort LPE keys naturally
    natural_sort_key = lambda k: [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', k)]
    sorted_lpe_keys = [k for k in sorted(lpe_issues.keys(), key=natural_sort_key) if k.startswith('LPE-')]

    for key in sorted_lpe_keys:
        issue = lpe_issues[key]
        lsv_keys = set()

        # Find all linked LSV issues within 1 or 2 hops
        for link in issue.get('issuelinks', []):
            for side in ['inwardIssue', 'outwardIssue']:
                if side in link:
                    lk = link[side]['key']
                    if lk.startswith('LSV-') and lk in lsv_issues:
                        lsv_keys.add(lk)
                    elif (lk.startswith('LPS-') or lk.startswith('LPD-')) and lk in issues_all:
                        parent_issue = issues_all[lk]
                        for plink in parent_issue.get('issuelinks', []):
                            for pside in ['inwardIssue', 'outwardIssue']:
                                if pside in plink:
                                    plk = plink[pside]['key']
                                    if plk.startswith('LSV-') and plk in lsv_issues:
                                        lsv_keys.add(plk)

        # Collect CVEs from linked LSV tickets
        cves_set = set()
        for lk in sorted(lsv_keys):
            if lk == 'LSV-1684':
                cves_set.update(hard_coded_lsv_1684)
            
            lsv_issue = lsv_issues[lk]
            cf_val = lsv_issue.get('customfield_10563')
            if cf_val:
                # Find all CVE matches in the customfield string
                found_cves = cve_pattern.findall(cf_val)
                cves_set.update(found_cves)

        # Map this LPE to the sorted list of unique CVEs
        lpe_to_cves[key] = sorted(list(cves_set))

    return lpe_to_cves

def main():
    lpe_to_cves = get_lpe_to_cve_mapping()

    # Write the resulting mapping to security_issue_lpe_cve.json
    output_file = 'security_issue_lpe_cve.json'
    with open(output_file, 'wb') as f:
        f.write(json.dumps(lpe_to_cves))

    print(f"Successfully generated mapping for {len(lpe_to_cves)} LPE tickets to {output_file}.")

if __name__ == '__main__':
    main()
