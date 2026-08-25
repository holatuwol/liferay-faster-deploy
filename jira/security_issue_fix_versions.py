#!/usr/bin/env python3
import os
import sys
import orjson as json
import re
from collections import defaultdict, deque

# Precise mapping of Liferay DXP quarterly releases to chronological update levels (7.4.13+)
QUARTERLY_RELEASES = {
    '2023.q3': 92, '2023.q4': 102,
    '2024.q1': 112, '2024.q2': 120, '2024.q3': 125, '2024.q4': 129,
    '2025.q1': 132, '2025.q2': 135, '2025.q3': 138, '2025.q4': 143,
    '2026.q1': 147, '2026.q2': 149, '2026.q3': 152,
}

def parse_product_line(vname):
    """
    Extracts the major/minor product line from a version string.
    For quarterly releases, it extracts the year and quarter (e.g. '2025.Q1').
    For standard releases, it extracts the main version line (e.g. '7.3').
    """
    vname = vname.strip().upper()
    
    # Match quarterly release patterns like '2025.Q1.16', 'DXP 2025.Q1', '2025.Q1'
    m_q = re.search(r'202[3-6]\.[qQ][1-4]', vname)
    if m_q:
        return m_q.group(0).upper()
        
    # Match standard major/minor lines
    for line in ['6.1', '6.2', '7.0', '7.1', '7.2', '7.3', '7.4']:
        if line in vname:
            return line
            
    return None

def get_patch_level(vname):
    """
    Extracts the patch level suffix (e.g. 15 in 2025.q1.15).
    Defaults to 0 if not present.
    """
    m = re.search(r'202[3-6]\.[qQ][1-4]\.(\d+)', vname)
    if m:
        return int(m.group(1))
    return 0

def is_applicable_fix_version(fv_name, target_version):
    """
    Determines if a fix version is applicable to the target version's product line.
    """
    target_q = re.search(r'202[3-6]\.[qQ][1-4]', target_version)
    fv_q = re.search(r'202[3-6]\.[qQ][1-4]', fv_name)
    
    if target_q:
        if fv_q:
            return target_q.group(0).upper() == fv_q.group(0).upper()
        return False
    else:
        target_line = parse_product_line(target_version)
        fv_line = parse_product_line(fv_name)
        return target_line == fv_line

def get_quarterly_level(vname):
    """
    Extracts the quarterly update level (7.4.13-uX equivalent number) for quarterly releases.
    """
    m = re.search(r'202[3-6]\.[qQ][1-4]', vname, re.IGNORECASE)
    if m:
        q_str = m.group(0).lower()
        return QUARTERLY_RELEASES.get(q_str, 999)
    return None

def get_version_rank(vname):
    """
    Assigns a comparable chronological integer rank to any version.
    """
    vname = vname.strip().upper()
    
    # Check quarterly pattern
    m_q = re.search(r'202[3-6]\.[qQ][1-4]', vname)
    if m_q:
        q_str = m_q.group(0).lower()
        u_level = QUARTERLY_RELEASES.get(q_str, 999)
        # Extract patch level if any, e.g. .15 in 2025.q1.15
        m_p = re.search(r'202[3-6]\.[qQ][1-4]\.(\d+)', vname)
        patch = int(m_p.group(1)) if m_p else 0
        return 704000 + u_level * 100 + patch

    # Check standard lines
    for line in ['6.1', '6.2', '7.0', '7.1', '7.2', '7.3', '7.4']:
        if line in vname:
            major, minor = map(int, line.split('.'))
            return major * 100000 + minor * 1000
            
    return 0

def get_closest_after(fix_versions, target_version):
    """
    Finds and returns the closest fix version chronologically after the target version.
    """
    target_rank = get_version_rank(target_version)
    after_versions = []
    
    for fv in fix_versions:
        fv_rank = get_version_rank(fv)
        if fv_rank > target_rank:
            after_versions.append((fv_rank, fv))
            
    if after_versions:
        # Sort by rank ascending, and return the closest one
        after_versions.sort(key=lambda x: x[0])
        return [after_versions[0][1]]
        
    return []

def get_immediately_after(ver):
    """
    Given an affects version, returns the immediately following patch/release (fix version).
    E.g. 2026.q2.11 -> 2026.q2.12
         2025.q1    -> 2025.q1.1
         7.1 DXP    -> 7.1.X EE
    """
    # 1. Quarterly release with patch number (e.g., 2026.q2.11 -> 2026.q2.12)
    m = re.search(r'(202[3-6]\.[qQ][1-4])\.(\d+)', ver)
    if m:
        prefix = m.group(1)
        patch = int(m.group(2))
        return f"{prefix}.{patch + 1}"
    
    # 2. Quarterly release without patch number (e.g., 2025.q1 -> 2025.q1.1)
    m_line = re.search(r'202[3-6]\.[qQ][1-4]', ver)
    if m_line:
        return f"{ver}.1"
        
    # 3. Standard release (e.g., '7.1 DXP (7.1.10)' -> '7.1.X EE')
    for line in ['6.1', '6.2', '7.0', '7.1', '7.2', '7.3', '7.4']:
        if line in ver:
            return f"{line}.X EE"
            
    return ver

def get_lsv_severity_group(lsv_keys, lsv_issues):
    """
    Determines the severity group (sev-1, sev-2, sev-3) from linked LSV tickets.
    Uses customfield_10786 first, then falls back to priority.
    """
    # 1. Check customfield_10786 (Severity) first across all linked LSVs
    for lk in sorted(lsv_keys):
        lsv_issue = lsv_issues.get(lk)
        if lsv_issue:
            cf_sev = lsv_issue.get('customfield_10786')
            if cf_sev and isinstance(cf_sev, dict) and cf_sev.get('value'):
                val = cf_sev.get('value')
                if val == 'Critical':
                    return 'sev-1'
                elif val == 'High':
                    return 'sev-2'
                elif val == 'Medium':
                    return 'sev-3'
                else:
                    return 'sev-3' # E.g. Low or other non-empty values

    # 2. Fall back to priority if severity is None/empty on all linked LSVs
    for lk in sorted(lsv_keys):
        lsv_issue = lsv_issues.get(lk)
        if lsv_issue:
            prio = lsv_issue.get('priority')
            if prio and isinstance(prio, dict) and prio.get('name'):
                val = prio.get('name')
                if val == 'Critical':
                    return 'sev-1'
                elif val == 'High':
                    return 'sev-2'
                else:
                    return 'sev-3' # all others = sev-3

    return None

def get_target_version_data(target_version):
    target_line = parse_product_line(target_version)
    target_q_level = get_quarterly_level(target_version)
    target_patch_level = get_patch_level(target_version)

    if not target_line:
        print(f"Error: Could not identify product line for version '{target_version}'.", file=sys.stderr)
        print("Please check the input format (e.g., '7.3 DXP (7.3.10)' or '2025.q1.15').", file=sys.stderr)
        sys.exit(1)

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

    # Build undirected adjacency graph across all issues for path finding
    graph = defaultdict(set)
    for k, v in issues_all.items():
        for link in v.get('issuelinks', []):
            for side in ['inwardIssue', 'outwardIssue']:
                if side in link:
                    lk = link[side]['key']
                    if lk in issues_all:
                        graph[k].add(lk)
                        graph[lk].add(k)

    # Find LSV issues that have no path to any LPE issue
    disconnected_lsv_keys = []
    for lsv_key in lsv_issues.keys():
        visited = {lsv_key}
        queue = deque([lsv_key])
        has_lpe_path = False
        while queue:
            curr = queue.popleft()
            if curr.startswith('LPE-'):
                has_lpe_path = True
                break
            for neighbor in graph[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        if not has_lpe_path:
            disconnected_lsv_keys.append(lsv_key)

    # Initialize grouped output structure
    output_data = {
        'sev-1': {},
        'sev-2': {},
        'sev-3': {},
        'unknown': {}
    }

    # We evaluate all LPE issues, and any disconnected LSV issues
    issues_to_evaluate = []
    for k, v in lpe_issues.items():
        issues_to_evaluate.append((k, v, False)) # key, issue dict, is_disconnected_lsv
    for k in disconnected_lsv_keys:
        issues_to_evaluate.append((k, lsv_issues[k], True))

    for key, issue, is_disconnected_lsv in issues_to_evaluate:
        # Find all linked LSV issues within 1 or 2 hops (only if this isn't a disconnected LSV itself)
        lsv_keys = set()
        if is_disconnected_lsv:
            lsv_keys.add(key)
        else:
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

        # Pool this issue and its directly linked parent/related issues (for fallback)
        pooled_issues = [issue]
        for link in issue.get('issuelinks', []):
            for side in ['inwardIssue', 'outwardIssue']:
                if side in link:
                    lk = link[side]['key']
                    if lk in issues_all:
                        pooled_issues.append(issues_all[lk])

        # Step 1: Collect affects versions from linked LSV tickets
        lsv_affects = set()
        for lk in lsv_keys:
            for ver in lsv_issues[lk].get('versions', []):
                lsv_affects.add(ver['name'])

        # Step 2: Extract pooled fix_versions (including customfield_10886)
        std_fix_versions = set()
        for issue_node in pooled_issues:
            # Standard fixVersions
            for fv in issue_node.get('fixVersions', []):
                if isinstance(fv, dict) and 'name' in fv:
                    std_fix_versions.add(fv['name'])
            # Customfield_10886 fix versions
            cf_val = issue_node.get('customfield_10886')
            if cf_val:
                if isinstance(cf_val, list):
                    for fv in cf_val:
                        if isinstance(fv, dict) and 'name' in fv:
                            std_fix_versions.add(fv['name'])
                elif isinstance(cf_val, dict) and 'name' in cf_val:
                    std_fix_versions.add(cf_val['name'])

        if lsv_affects:
            # Prefer LSV affects versions by computing their immediately following patch/release
            fix_versions = set(get_immediately_after(ver) for ver in lsv_affects)
            # Combine with precise customfield_10886 fix versions if available
            for issue_node in pooled_issues:
                cf_val = issue_node.get('customfield_10886')
                if cf_val:
                    if isinstance(cf_val, list):
                        for fv in cf_val:
                            if isinstance(fv, dict) and 'name' in fv:
                                fix_versions.add(fv['name'])
                    elif isinstance(cf_val, dict) and 'name' in cf_val:
                        fix_versions.add(cf_val['name'])
        else:
            # Fall back to standard pooled fixVersions + customfield_10886
            fix_versions = std_fix_versions

        affects_versions = set(ver['name'] for issue_node in pooled_issues for ver in issue_node.get('versions', []))

        # Step 3: Extract fix versions applicable to the target version's product line
        applicable_fixes = []
        is_target_quarterly = bool(re.search(r'202[3-6]\.[qQ][1-4]', target_version))
        target_rank = get_version_rank(target_version)

        for fv in fix_versions:
            if is_applicable_fix_version(fv, target_version):
                if is_target_quarterly:
                    # For quarterly releases, the fix must be chronologically after the target version
                    if get_version_rank(fv) > target_rank:
                        applicable_fixes.append(fv)
                else:
                    applicable_fixes.append(fv)

        applicable_fixes = sorted(list(set(applicable_fixes)))

        is_affected = False

        if applicable_fixes:
            # Check if target version is older than the applicable fixes
            for fv in applicable_fixes:
                fv_q_level = get_quarterly_level(fv)
                fv_patch_level = get_patch_level(fv)

                # If target is a quarterly patch release and fix is a quarterly patch release
                if target_patch_level > 0 or fv_patch_level > 0:
                    if target_patch_level < fv_patch_level:
                        is_affected = True
                        break
                elif target_q_level is not None and fv_q_level is not None:
                    if target_q_level < fv_q_level:
                        is_affected = True
                        break
                else:
                    # Default: standard line GA/base release does not contain maintenance branch fixes
                    is_affected = True
                    break
        else:
            # Step 4: Heuristic fallback (check if target line is explicitly in the affects version list)
            for ver in affects_versions:
                if parse_product_line(ver) == target_line:
                    is_affected = True
                    break

        if is_affected:
            # Determine the severity group
            group = None
            labels = issue.get('labels', [])
            
            # 1. Check LPE/disconnected LSV labels first
            if 'sev-1' in labels:
                group = 'sev-1'
            elif 'sev-2' in labels:
                group = 'sev-2'
            elif 'sev-3' in labels:
                group = 'sev-3'
            
            # 2. Check severity/priority of matching LSV
            if not group:
                if lsv_keys:
                    group = get_lsv_severity_group(lsv_keys, lsv_issues)
                
                # 3. If no matching LSV or all checks return None, mark as 'unknown'
                if not group:
                    group = 'unknown'

            # Populate resolved fixes
            if not applicable_fixes:
                output_data[group][key] = get_closest_after(fix_versions, target_version)
            else:
                output_data[group][key] = applicable_fixes

    # Sort inner keys naturally for each severity group and strip empty groups if preferred,
    # but let's keep all 4 groups as keys for clean structure
    sorted_output = {}
    for group_name in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
        inner_dict = output_data[group_name]
        sorted_inner_keys = sorted(inner_dict.keys(), key=lambda k: [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', k)])
        sorted_output[group_name] = {k: inner_dict[k] for k in sorted_inner_keys}

    return sorted_output

def main():
    with open(sys.argv[1], 'rt', encoding='utf-8') as f:
        target_versions = set([x['base_version'] for x in json.loads(f.read()) if x['base_version'] is not None and x['base_version'] != ''])

    sorted_output = { target_version: get_target_version_data(target_version) for target_version in target_versions }

    with open('security_issue_fix_versions.json', 'wb') as f:
        f.write(json.dumps(sorted_output))

if __name__ == '__main__':
    main()
