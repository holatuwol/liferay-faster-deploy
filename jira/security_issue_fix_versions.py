import ast
import os
import sys
import orjson as json
import re
from collections import defaultdict, deque

def read_releases_py_value(name):
    """
    Returns the value of a module-level literal (such as quarterly_releases) in
    releases.py. The value is read from the source rather than imported, since
    importing releases.py pulls releases from Jira.
    """
    releases_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'releases.py')

    with open(releases_py, 'rt', encoding='utf-8') as f:
        tree = ast.parse(f.read())

    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == name for target in node.targets):
            return ast.literal_eval(node.value)

    raise ValueError(name + ' not found in ' + releases_py)

def read_quarterly_releases():
    """
    Returns the 7.4.13 update that each quarterly release line is based on, from
    quarterly_releases in releases.py.
    """
    return read_releases_py_value('quarterly_releases')

# Mapping of Liferay DXP quarterly releases to the 7.4.13 update they are based on
QUARTERLY_RELEASES = read_quarterly_releases()

# Mapping of Liferay DXP 7.0 to 7.3 service packs to the fix pack (or update) they are equivalent to
SERVICE_PACK_FIX_PACKS = read_releases_py_value('service_pack_fix_packs')

# The kind of release that the service packs of each line map to, if not a fix pack
SERVICE_PACK_RELEASE_TYPES = read_releases_py_value('service_pack_release_types')

# 7.0 to 7.3 service pack names, such as 7.2.10 DXP SP3, 7.2.10.3 DXP SP3,
# 7.0.10.10 DXP SP11, 7.1.10.1 SP1 or 7.2.10-sp3
SERVICE_PACK_PATTERN = re.compile(r'^(7\.[0-3])\.\d+(?:\.\d+)?[\s.-]*(?:dxp\s*)?sp\s*(\d+)$', re.IGNORECASE)

# 7.4 CE GA names, such as 7.4.3.120 CE GA120, 7.4.3.4-ga4, 7.4.3.100 GA100 or
# 7.4.13.125 CE GA125 (where 7.4.13 is a typo for 7.4.3)
CE_GA_74_PATTERN = re.compile(r'^7\.4\.(?:3|13)\.(\d+)(?:\s+(?:ce\s+)?ga\d*|-ga\d*)$', re.IGNORECASE)

# Fix pack names with an extra hyphen, such as 7.2.10-dxp-17 or 7.0.10-de-65
HYPHENATED_FIX_PACK_PATTERN = re.compile(r'^(7\.[0-2])\.10-(?:dxp|de)-(\d+)$', re.IGNORECASE)

# 7.3 CE GA names, such as 7.3.5 CE GA6 or 7.3.6-ga7. CE GA1 to GA6 came before
# 7.3 DXP GA1, and later CE GAs are each equivalent to a 7.3 DXP service pack.
CE_GA_73_SERVICE_PACKS = {7: 1, 8: 2}
# 7.4 CE GAs before 7.4.3 (7.4.0 CE GA1, 7.4.1 CE GA2 and 7.4.2 CE GA3), which
# came before the first 7.4.13 update, so a fix in them is a fix in 7.4.13 GA1
EARLY_CE_GA_74_PATTERN = re.compile(r'^7\.4\.[0-2](?:\s+ce\s+ga|-ga)\d+$', re.IGNORECASE)

CE_GA_73_PATTERN = re.compile(r'^7\.3\.\d+(?:\s+ce\s+ga|-ga)(\d+)$', re.IGNORECASE)

with open('releases.json', 'rt') as f:
    ALL_VERSIONS = list(json.loads(f.read()).keys())

ALL_VERSIONS_LOWER = {v.lower().strip(): v for v in ALL_VERSIONS}

unknown_versions = set()

def normalize_version(name):
    global unknown_versions

    if not isinstance(name, str):
        return name

    v_clean = name.strip().lower()
    if v_clean in ALL_VERSIONS_LOWER:
        return ALL_VERSIONS_LOWER[v_clean]

    short_name = None
    if v_clean[0] == 'u':
        short_name = '7.4.13-%s' % v_clean
    elif SERVICE_PACK_PATTERN.match(v_clean):
        line, service_pack = SERVICE_PACK_PATTERN.match(v_clean).groups()
        if int(service_pack) in SERVICE_PACK_FIX_PACKS[line]:
            release_type = SERVICE_PACK_RELEASE_TYPES.get(line, 'fp')
            short_name = '%s.10-%s%d' % (line, release_type, SERVICE_PACK_FIX_PACKS[line][int(service_pack)])
    elif CE_GA_74_PATTERN.match(v_clean):
        release_num = int(CE_GA_74_PATTERN.match(v_clean).group(1))
        if release_num >= 15:
            short_name = '7.4.13-u%d' % release_num
        elif release_num > 4:
            short_name = '7.4.13-u%d' % (release_num - 4)
        else:
            # CE GAs up to GA4 came before the first 7.4.13 update, so like a
            # milestone, a fix in them is a fix in 7.4.13 GA1
            short_name = '7.4.13-ga1'
    elif CE_GA_73_PATTERN.match(v_clean):
        ce_ga = int(CE_GA_73_PATTERN.match(v_clean).group(1))
        if ce_ga <= 6:
            short_name = '7.3.10-ga1'
        elif ce_ga in CE_GA_73_SERVICE_PACKS:
            return normalize_version('7.3.10-sp%d' % CE_GA_73_SERVICE_PACKS[ce_ga])
    elif HYPHENATED_FIX_PACK_PATTERN.match(v_clean):
        line, release_num = HYPHENATED_FIX_PACK_PATTERN.match(v_clean).groups()
        short_name = '%s.10-%s%d' % (line, 'de' if line == '7.0' else 'fp', int(release_num))
    elif name == '7.4.13 DXP GA1' or EARLY_CE_GA_74_PATTERN.match(v_clean):
        short_name = '7.4.13-ga1'
    elif name[:12] == '7.4.13 DXP U':
        try:
            release_num = int(name[12:])
            short_name = '7.4.13-u%d' % release_num
        except ValueError:
            pass
    elif len(name) > 8 and (name[4:6] == '.Q' or name[4:6] == '.q'):
        short_name = name.lower().strip()
    elif name[:6] == '7.3.10' and name.find(' DXP U') != -1:
        try:
            release_num = int(name[name.rfind('U')+1:])
            short_name = '7.3.10-u%d' % release_num
        except ValueError:
            pass
    elif name == '7.3.10 DXP GA1' or v_clean in ('7.3.0 ce ga1', '7.3.0-ga1'):
        short_name = '7.3.10-ga1'
    elif name[:6] == '7.3.10' and name.find(' DXP FP') != -1:
        try:
            release_num = int(name[name.rfind('FP')+2:])
            short_name = '7.3.10-u%d' % release_num
        except ValueError:
            pass
    elif name[:6] == '7.2.10' and name.find(' DXP FP') != -1:
        try:
            release_num = int(name[name.rfind('FP')+2:].strip())
            short_name = '7.2.10-fp%d' % release_num
        except ValueError:
            pass
    elif name == '7.2.10 DXP GA1' or v_clean in ('7.2.0 ga1', '7.2.0 ce ga1', '7.2.0-ga1'):
        short_name = '7.2.10-ga1'
    elif name[:6] == '7.1.10' and name.find(' DXP FP') != -1:
        try:
            release_num = int(name[name.rfind('FP')+2:].strip())
            short_name = '7.1.10-fp%d' % release_num
        except ValueError:
            pass
    elif name == '7.1.10 DXP GA1' or v_clean in ('7.1.0 ce ga1', '7.1.0-ga1'):
        short_name = '7.1.10-ga1'
    elif (name[:6] == '7.0.10' or name[:5] == '7.0.0') and name.find(' DXP FP') != -1:
        try:
            release_num = int(name[name.rfind('FP')+2:].strip())
            short_name = '7.0.10-de%d' % release_num
        except ValueError:
            pass
    elif name == '7.0.0 DXP GA1' or name == '7.0.10 DXP GA1':
        short_name = '7.0.10-ga1'
    elif re.match(r'^7\.0\.\d+(?:\s+ce)?\s+(?:ga\d*|m\d+|milestone(?:\s+\d+)?|rc\d*|release\s+candidate(?:\s+\d+)?|alpha(?:\s+\d+)?|beta(?:\s+\d+)?)$', v_clean, re.IGNORECASE):
        short_name = '7.0.10-ga1'
    elif re.match(r'^7\.1\.\d+(?:\s+ce)?\s+(?:m\d+|milestone(?:\s+\d+)?|rc\d*|release\s+candidate(?:\s+\d+)?|alpha(?:\s+\d+)?|beta(?:\s+\d+)?)$', v_clean, re.IGNORECASE):
        short_name = '7.1.10-ga1'
    elif re.match(r'^7\.2\.\d+(?:\s+ce)?\s+(?:m\d+|milestone(?:\s+\d+)?|rc\d*|release\s+candidate(?:\s+\d+)?|alpha(?:\s+\d+)?|beta(?:\s+\d+)?)$', v_clean, re.IGNORECASE):
        short_name = '7.2.10-ga1'
    elif re.match(r'^7\.3\.\d+(?:\s+ce)?\s+(?:m\d+|milestone(?:\s+\d+)?|rc\d*|release\s+candidate(?:\s+\d+)?|alpha(?:\s+\d+)?|beta(?:\s+\d+)?)$', v_clean, re.IGNORECASE):
        short_name = '7.3.10-ga1'
    elif re.match(r'^7\.4\.\d+(?:\s+ce)?\s+(?:m\d+|milestone(?:\s+\d+)?|rc\d*|release\s+candidate(?:\s+\d+)?|alpha(?:\s+\d+)?|beta(?:\s+\d+)?)$', v_clean, re.IGNORECASE):
        short_name = '7.4.13-ga1'
    elif name[:10] == '7.0.10-de':
        try:
            release_num = int(name[10:])
            short_name = '7.0.10-de%d' % release_num
        except ValueError:
            pass
    elif name[:10] == '7.1.10-fp':
        try:
            release_num = int(name[10:])
            short_name = '7.1.10-fp%d' % release_num
        except ValueError:
            pass

    if short_name is not None:
        short_clean = short_name.strip().lower()
        if short_clean in ALL_VERSIONS_LOWER:
            return ALL_VERSIONS_LOWER[short_clean]
        return short_name

    if name not in unknown_versions:
        unknown_versions.add(name)
        # print(name)

    return None

QUARTERLY_VERSIONS = [version for version in ALL_VERSIONS if version.find('.q') != -1]

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
    for line in ['6.1.10', '6.1.20', '6.1.30', '6.2.10', '6.1', '6.2', '7.0', '7.1', '7.2', '7.3', '7.4']:
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

def get_standard_ulevel(vname):
    """
    Extracts the update level / fix pack level suffix (e.g. 24 in 7.3.10-u24 or 15 in 7.2.10-fp15 or 60 in 7.0.10-de60).
    Defaults to 0 for GA1.
    """
    vname = vname.strip().lower()
    base_ulevel = 0

    if vname[:4] == '6.1.':
        base_ulevel = int(vname[4:6].replace('.', '')) * 1000
    elif vname[:4] == '6.2.':
        base_ulevel = int(vname[4:6].replace('.', '')) * 1000

    if '-ga1' in vname or 'ga1' in vname:
        return base_ulevel
    m = re.search(r'(?:-u|-fp|-sp|-de|u|fp|sp|de)(\d+)', vname)
    if m:
        return base_ulevel + int(m.group(1))
    return base_ulevel

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
        return 740000 + u_level * 100 + patch

    for line in ['6.1.10', '6.1.20', '6.1.30', '6.2.10']:
        if line in vname:
            major, minor, patch = map(int, line.split('.'))
            return major * 100000 + minor * 10000 + patch * 1000

    if '6.1' in vname:
        return 6 * 100000 + 1 * 10000

    if '6.2' in vname:
        return 6 * 100000 + 2 * 10000
    
    # Check standard lines
    for line in ['7.0', '7.1', '7.2', '7.3', '7.4']:
        if line in vname:
            major, minor = map(int, line.split('.'))
            return major * 100000 + minor * 10000
            
    return 0

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

def add_fix_version(fvs, name):
    lower_name = name.lower()

    if lower_name == 'master' or 'sprint' in lower_name:
        return

    if 'milestone' in lower_name and not re.match(r'^7\.\d+\.\d+', lower_name):
        return

    if ' ce ' in lower_name and not re.search(r'\b(?:rc\d*|release\s+candidate|alpha(?:\s+\d+)?|beta(?:\s+\d+)?)\b', lower_name):
        if not lower_name.startswith('7.'):
            return
    
    if lower_name[:2] == 'ac':
        return

    if '.x' in lower_name:
        return

    if lower_name[:3] in ['5.1', '5.2', '6.0', '6.1', '6.2']:
        return
    
    normalized_version = normalize_version(name)
    if normalized_version is not None:
        fvs.add(normalized_version)

def get_issue_fix_versions(issue_node):
    """
    Extracts fix versions, customfield_10886 fix versions, and fixpack labels from an issue node,
    resolving .x fix versions using only this issue's own fix versions.
    """
    fvs, x_lines = get_issue_fix_versions_and_x_lines(issue_node)
    return resolve_x_lines(fvs, x_lines)

def get_issue_fix_versions_and_x_lines(issue_node):
    """
    Extracts fix versions, customfield_10886 fix versions, and fixpack labels from an issue node.
    Returns the concrete fix versions and the product lines named by .x fix versions separately,
    so that the .x lines can be resolved after merging in the fix versions of linked issues.
    """
    fvs = set()
    x_lines = set()

    def process_fv(fv_node):
        if isinstance(fv_node, dict) and 'name' in fv_node:
            name = fv_node['name']
            if '.x' in name.lower():
                product_line = parse_product_line(name)
                if product_line:
                    x_lines.add(product_line)
            else:
                add_fix_version(fvs, name)

    for fv in issue_node.get('fixVersions', []):
        process_fv(fv)

    for cf_key in ['customfield_10886', 'customfield_10978']:
        cf_val = issue_node.get(cf_key)
        if cf_val:
            if isinstance(cf_val, list):
                for fv in cf_val:
                    process_fv(fv)
            elif isinstance(cf_val, dict):
                process_fv(cf_val)

    for label in issue_node.get('labels', []):
        m_70 = re.match(r'^liferay-fixpack-(?:de-)+(\d+)-7010$', label)
        if m_70:
            add_fix_version(fvs, f'7.0.10-de{m_70.group(1)}')
        m_71 = re.match(r'^liferay-fixpack-(?:dxp-)+(\d+)-7110$', label)
        if m_71:
            add_fix_version(fvs, f'7.1.10-fp{m_71.group(1)}')

    return fvs, x_lines

def is_first_quarterly_release(v):
    """
    Returns whether a fix version is the first release of a quarterly release
    line (such as 2025.q2.0, or 2024.q1.1 since there was no 2024.q1.0).
    """
    product_line = parse_product_line(v)

    if not product_line or not re.fullmatch(r'202\d\.Q[1-4]', product_line):
        return False

    line_versions = [x for x in ALL_VERSIONS if parse_product_line(x) == product_line]

    return bool(line_versions) and v == min(line_versions, key=get_patch_level)

def get_first_quarterly_baselines(fvs):
    """
    Returns the 7.4.13 baseline updates (such as 7.4.13-u135) of the fix versions
    that are the first release of a quarterly release line (such as 2025.q2.0, or
    2024.q1.1 since there was no 2024.q1.0).

    A first release is skipped if a later quarterly release line was only fixed
    in a later release of that line (such as 2025.q3.4), since that line already
    existed when the issue was fixed, so the fix was not in master when the
    earlier line was branched.
    """
    baselines = set()

    quarterly_lines = {v: parse_product_line(v) for v in fvs if re.fullmatch(r'202\d\.Q[1-4]', parse_product_line(v) or '')}
    backported_lines = {line for v, line in quarterly_lines.items() if not is_first_quarterly_release(v)}

    for v, product_line in quarterly_lines.items():
        if not is_first_quarterly_release(v):
            continue

        if any(line > product_line for line in backported_lines):
            continue

        baseline = QUARTERLY_RELEASES.get(product_line.lower())

        if baseline is not None:
            baselines.add(normalize_version('7.4.13-u%d' % baseline))

    return baselines

def add_quarterly_baseline_fixes(fvs):
    """
    A fix in the first release of a quarterly release line (such as 2025.q2.0, or
    2024.q1.1 since there was no 2024.q1.0) means that the fix was already in the
    7.4.13 update that the line is based on (such as 7.4.13-u135 for 2025.q2), so
    add that update as a fix version. It is only added if no 7.4 release is
    already named, so that an earlier 7.4 fix is not replaced by a later one.
    """
    fvs = set(fvs)

    if any(parse_product_line(v) == '7.4' for v in fvs):
        return fvs

    return fvs | get_first_quarterly_baselines(fvs)

def resolve_x_lines(fvs, x_lines):
    """
    For each product line named by a .x fix version that has no concrete fix version,
    assume the fix is in the latest release of that product line.
    """
    fvs = set(fvs)

    for product_line in x_lines:
        has_version = False
        for v in fvs:
            v_line = parse_product_line(v)
            if v_line and v_line.startswith(product_line):
                has_version = True
                break
        if not has_version:
            is_quarterly = bool(re.search(r'202[3-6]\.[qQ][1-4]', product_line))
            versions = [v for v in ALL_VERSIONS if parse_product_line(v) == product_line]
            if versions:
                if is_quarterly:
                    latest_v = max(versions, key=get_patch_level)
                else:
                    latest_v = max(versions, key=get_standard_ulevel)
                fvs.add(normalize_version(latest_v))

    return fvs

def keep_latest_fix_version_per_stream(fix_versions):
    """
    Keeps only the latest fix version within each release stream, because fix versions
    merged from fix version fields, labels, and linked tickets can name several releases
    of the same stream (such as both 2025.q1.23 and 2025.q1.24), and the latest one is
    the release that is known to contain the complete fix.

    The exception is 7.0.10-ga1, which is kept instead of any later 7.0 fix version,
    because a fix in GA1 means that no 7.0 DE release is affected.
    """
    by_stream = defaultdict(set)
    retained = set()

    for fv in fix_versions:
        stream = parse_product_line(fv)
        if stream:
            by_stream[stream].add(fv)
        else:
            retained.add(fv)

    for stream, stream_fvs in by_stream.items():
        if stream == '7.0' and '7.0.10-ga1' in stream_fvs:
            retained.add('7.0.10-ga1')
        elif re.search(r'202[3-6]\.[qQ][1-4]', stream):
            retained.add(max(stream_fvs, key=get_patch_level))
        else:
            retained.add(max(stream_fvs, key=get_standard_ulevel))

    return retained

def is_master_only(fix_versions, affects_versions):
    """
    Returns True if the issue has no fix versions on any product line, and its
    only affects version that names anything is master.
    """
    if fix_versions:
        return False

    if any(parse_product_line(ver) for ver in affects_versions):
        return False

    return any(ver.strip().lower() == 'master' for ver in affects_versions)

OLD_PRODUCT_LINES = {'6.2', '6.2.10', '7.0', '7.1', '7.2', '7.3'}

def get_affects_version_gaps(precomputed):
    """
    Finds tickets whose affects versions include an old product line (6.2 to
    7.3) and at least one later product line (7.4 or a quarterly release), but
    skip some of the later product lines. This usually means that only the
    supported releases were listed (e.g. 7.4, 2024.Q1, 2025.Q1), even though
    the releases in between are also affected.

    The later product lines that are expected run from 7.4 up to the newest
    later product line in the ticket's affects versions or fix versions.
    """
    all_lines = sorted({parse_product_line(v) for v in ALL_VERSIONS} - {None}, key=get_version_rank)
    later_lines = all_lines[all_lines.index('7.4'):]

    gaps = {}

    for key, data in precomputed.items():
        affects_lines = {parse_product_line(v) for v in data['affects_versions']} - {None}
        fix_lines = {parse_product_line(v) for v in data['fix_versions']} - {None}

        if not (affects_lines & OLD_PRODUCT_LINES) or not (affects_lines & set(later_lines)):
            continue

        newest_line = max((line for line in affects_lines | fix_lines if line in later_lines), key=later_lines.index)
        expected_lines = later_lines[:later_lines.index(newest_line) + 1]
        missing_lines = [line for line in expected_lines if line not in affects_lines]

        if not missing_lines:
            continue

        gaps[key] = {
            'group': data['group'],
            'affects_lines': [line.lower() for line in sorted(affects_lines, key=get_version_rank)],
            'fix_lines': [line.lower() for line in sorted(fix_lines, key=get_version_rank)],
            'missing_lines': [line.lower() for line in missing_lines],
            'unfixed_missing_lines': [line.lower() for line in missing_lines if line not in fix_lines],
        }

    # Tickets where the gaps change the output (missing lines without fixes,
    # whose releases are reported as not affected) come first

    return dict(sorted(
        gaps.items(),
        key=lambda item: (not item[1]['unfixed_missing_lines'], [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', item[0])])))

_PRECOMPUTED_DATA = None

def get_precomputed_data():
    global _PRECOMPUTED_DATA
    if _PRECOMPUTED_DATA is not None:
        return _PRECOMPUTED_DATA

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
        with open(os.path.join(export_dir, 'COMMERCE.json'), 'r', encoding='utf-8') as f:
            commerce_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LPE.json'), 'r', encoding='utf-8') as f:
            lpe_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LPS.json'), 'r', encoding='utf-8') as f:
            lps_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LPSA.json'), 'r', encoding='utf-8') as f:
            lpsa_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LPD.json'), 'r', encoding='utf-8') as f:
            lpd_issues = json.loads(f.read())
        with open(os.path.join(export_dir, 'LSV.json'), 'r', encoding='utf-8') as f:
            lsv_issues = json.loads(f.read())
    except Exception as e:
        print(f"Error loading JSON cache files: {e}", file=sys.stderr)
        sys.exit(1)

    with open('security_issue_extra_fix_versions.json','rt', encoding='utf-8') as f:
        extra_fix_versions = json.loads(f.read())
        
    releases_prod_dir = os.path.join(script_dir, 'releases.production')
    if os.path.exists(releases_prod_dir):
        for fname in os.listdir(releases_prod_dir):
            if fname.endswith('.keys.json'):
                version_name = fname[:-10]
                if version_name.startswith(('6.1.', '6.2.', '7.0.', '7.1.')):
                    try:
                        with open(os.path.join(releases_prod_dir, fname), 'rt', encoding='utf-8') as f:
                            keys = json.loads(f.read())
                            for key in keys:
                                if key not in extra_fix_versions:
                                    extra_fix_versions[key] = []
                                extra_fix_versions[key].append(version_name)
                    except Exception as e:
                        print(f"Error loading {fname}: {e}", file=sys.stderr)
        
    try:
        with open('security_issue_extra_affects_versions.json','rt', encoding='utf-8') as f:
            extra_affects_versions = json.loads(f.read())
    except FileNotFoundError:
        extra_affects_versions = {}

    # Groups of tickets that are duplicates of each other (such as two LPEs that
    # upgrade the same dependency), whose fix versions and affects versions are
    # shared, for duplicates that are not recorded in Jira

    try:
        with open('security_issue_duplicate_tickets.json','rt', encoding='utf-8') as f:
            duplicate_tickets = json.loads(f.read())
    except FileNotFoundError:
        duplicate_tickets = []

    # Combine into a single lookup index
    issues_all = {}
    for src in [commerce_issues, lpe_issues, lps_issues, lpsa_issues, lpd_issues, lsv_issues]:
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

    issues_to_evaluate = []
    for k, v in lpe_issues.items():
        issues_to_evaluate.append((k, v, False))
    for k in disconnected_lsv_keys:
        issues_to_evaluate.append((k, lsv_issues[k], True))

    precomputed = {}
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
                        elif lk.startswith(('LPS-', 'LPD-', 'LPSA-', 'COMMERCE-')) and lk in issues_all:
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

        # Step 1 & 2: Identify fix versions. If this is an LPE and has its own valid fix versions, use them.
        # Otherwise, fall back to other linked tickets (such as LPS, LPSA, LPD, COMMERCE, LSV).
        # Note: If the LPE has its own fix versions, we also pull additional fix versions from linked tickets
        # for release streams/product lines that are not already covered by the LPE's own fix versions.
        is_lpe = key.startswith('LPE-')
        # A .x fix version is only resolved to the latest release of its product line after
        # all linked tickets are checked, because a linked ticket may name the concrete release.
        lpe_own_fvs, lpe_own_x_lines = get_issue_fix_versions_and_x_lines(issue)

        if is_lpe and (lpe_own_fvs or lpe_own_x_lines):
            covered_lines = set()
            for fv in lpe_own_fvs:
                line = parse_product_line(fv)
                if line:
                    covered_lines.add(line)

            fallback_issues = pooled_issues[1:]
            std_fix_versions = set()
            x_lines = set(lpe_own_x_lines)
            for issue_node in fallback_issues:
                node_fvs, node_x_lines = get_issue_fix_versions_and_x_lines(issue_node)
                std_fix_versions.update(node_fvs)
                x_lines.update(node_x_lines)

            additional_fixes = set()
            for fv in std_fix_versions:
                line = parse_product_line(fv)
                if line and line not in covered_lines:
                    additional_fixes.add(fv)

            known_fix_versions = lpe_own_fvs.union(additional_fixes)
        else:
            fallback_issues = pooled_issues[1:] if is_lpe else pooled_issues

            std_fix_versions = set()
            x_lines = set()
            for issue_node in fallback_issues:
                node_fvs, node_x_lines = get_issue_fix_versions_and_x_lines(issue_node)
                std_fix_versions.update(node_fvs)
                x_lines.update(node_x_lines)

            known_fix_versions = std_fix_versions

        # The 7.4.13 baseline of a quarterly line's first release is added before
        # .x fix versions are resolved, so that a 7.4.x fix version resolves to
        # the baseline rather than to the latest 7.4 release. The added baselines
        # are remembered, so that merging duplicate tickets can prefer a 7.4 fix
        # version that was recorded on a ticket.

        fix_versions = add_quarterly_baseline_fixes(known_fix_versions)
        baseline_fix_versions = fix_versions - known_fix_versions
        fix_versions = resolve_x_lines(fix_versions, x_lines)

        affects_versions = set(ver['name'] for issue_node in pooled_issues for ver in issue_node.get('versions', []))

        # Check for milestone affects versions
        for ver in affects_versions:
            if re.search(r'\b(?:m\d+|alpha(?:\s+\d+)?|beta(?:\s+\d+)?)\b', ver, re.IGNORECASE):
                stream = parse_product_line(ver)
                if stream:
                    has_stream_fix = any(parse_product_line(fv) == stream for fv in fix_versions)
                    if not has_stream_fix:
                        ga1_version = None
                        if stream == '7.0':
                            ga1_version = '7.0.10-ga1'
                        elif stream == '7.1':
                            ga1_version = '7.1.10-ga1'
                        elif stream == '7.2':
                            ga1_version = '7.2.10-ga1'
                        elif stream == '7.3':
                            ga1_version = '7.3.10-ga1'
                        elif stream == '7.4':
                            ga1_version = '7.4.13-ga1'
                        
                        if ga1_version:
                            fix_versions.add(ga1_version)

        # Step 3: Extract fix versions applicable to the target version's product line
        group = None
        labels = issue.get('labels', [])
        if 'sev-1' in labels:
            group = 'sev-1'
        elif 'sev-2' in labels:
            group = 'sev-2'
        elif 'sev-3' in labels:
            group = 'sev-3'
        
        if not group:
            if lsv_keys:
                group = get_lsv_severity_group(lsv_keys, lsv_issues)
            if not group:
                group = 'unknown'

        if key in extra_fix_versions:
            fix_versions.update(extra_fix_versions[key])
            
        if key in extra_affects_versions:
            affects_versions.update(extra_affects_versions[key])

        fix_versions = keep_latest_fix_version_per_stream(fix_versions)

        precomputed[key] = {
            'fix_versions': list(fix_versions),
            'affects_versions': list(affects_versions),
            'group': group,
            'lsv_keys': sorted(lsv_keys),
            'master_only': is_master_only(fix_versions, affects_versions),
            'baseline_fix_versions': sorted(baseline_fix_versions & set(fix_versions)),
        }

    apply_duplicate_tickets(precomputed, duplicate_tickets)

    _PRECOMPUTED_DATA = precomputed
    return _PRECOMPUTED_DATA

def apply_duplicate_tickets(precomputed, duplicate_tickets):
    """
    Gives every ticket in each group of duplicates the fix versions and affects
    versions of the whole group, so that a fix recorded on one of them (such as
    LPE-18421 being fixed in 2025.q1.20) also fixes the others (such as
    LPE-18388, which upgrades the same dependency but has no 2025.q1 fix
    version). Each ticket keeps its own severity group and linked LSVs.
    """
    for group_keys in duplicate_tickets:
        missing_keys = [key for key in group_keys if key not in precomputed]

        if missing_keys:
            print('security_issue_duplicate_tickets.json: ignoring tickets that were not evaluated:', ', '.join(missing_keys), file=sys.stderr)

        keys = [key for key in group_keys if key in precomputed]

        if len(keys) < 2:
            continue

        # keep_latest_fix_version_per_stream keeps the latest fix version of each
        # stream (or 7.0.10-ga1), so applying it to the tickets' already-kept fix
        # versions gives the same result as applying it to all of their fix versions

        fix_versions = set(fv for key in keys for fv in precomputed[key]['fix_versions'])

        # A 7.4.13 baseline that was only inferred from a quarterly fix version
        # (see add_quarterly_baseline_fixes) gives way to a 7.4 fix version that
        # another ticket in the group records, rather than replacing it because
        # it happens to be a later update

        baseline_fix_versions = set(fv for key in keys for fv in precomputed[key].get('baseline_fix_versions', []))
        recorded_fix_versions = fix_versions - baseline_fix_versions

        if any(parse_product_line(fv) == '7.4' for fv in recorded_fix_versions):
            fix_versions = recorded_fix_versions

        fix_versions = keep_latest_fix_version_per_stream(fix_versions)
        affects_versions = set(ver for key in keys for ver in precomputed[key]['affects_versions'])

        for key in keys:
            precomputed[key]['fix_versions'] = list(fix_versions)
            precomputed[key]['affects_versions'] = list(affects_versions)
            precomputed[key]['master_only'] = is_master_only(fix_versions, affects_versions)
            precomputed[key]['baseline_fix_versions'] = sorted(baseline_fix_versions & fix_versions)


def get_lsv_tickets(precomputed):
    """
    Returns the evaluated tickets linked to each LSV, inverting the LSV keys found for each ticket.
    """
    natural_key = lambda k: [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', k)]

    lsv_tickets = defaultdict(set)

    for key, data in precomputed.items():
        for lsv_key in data['lsv_keys']:
            lsv_tickets[lsv_key].add(key)

    return {
        lsv_key: sorted(lsv_tickets[lsv_key], key=natural_key)
            for lsv_key in sorted(lsv_tickets.keys(), key=natural_key)
    }

def get_fix_level(vname):
    """
    Returns a number for comparing two fix versions on the same release line.
    """
    if re.search(r'202[3-6]\.[qQ][1-4]', vname):
        return get_patch_level(vname)

    return get_standard_ulevel(vname)

def get_fix_versions_by_line(fix_versions, include_quarterly_from_74=False):
    """
    Returns release line -> fix version, keeping the latest fix version of each
    line.

    With include_quarterly_from_74, a 7.4.13 update also fixes every quarterly
    line based on that update or a later one (such as 7.4.13-u52 fixing 2024.q1,
    which is based on 7.4.13-u112), since each quarterly line was branched from
    a 7.4.13 update. A fix in 7.4.13 GA1 (or anything else normalized to it,
    such as a 7.4 milestone) came before every update, so it fixes every
    quarterly line. Those lines are given their first release, unless the line
    has a fix version of its own.
    """
    by_line = {}

    for fv in keep_latest_fix_version_per_stream(fix_versions):
        line = parse_product_line(fv)

        if line:
            by_line[line] = fv

    if include_quarterly_from_74 and by_line.get('7.4', '').startswith(('7.4.13-u', '7.4.13-ga')):
        fix_level = get_standard_ulevel(by_line['7.4'])

        for q_str, baseline in QUARTERLY_RELEASES.items():
            line = q_str.upper()

            if baseline < fix_level or line in by_line:
                continue

            line_versions = [v for v in ALL_VERSIONS if parse_product_line(v) == line]
            by_line[line] = min(line_versions, key=get_patch_level) if line_versions else q_str + '.0'

    return by_line

def get_lsv_resolving_tickets(precomputed, lsv_issues, lsv_tickets):
    """
    When an LSV has more than one ticket, a single ticket often resolves the LSV
    on its own, and the other tickets are follow-ups (such as LPE-18800, fixed in
    2025.q1.28 like LSV-1793, while LPE-18843 was fixed in 2025.q1.30). Returns
    LSV key -> the resolving tickets and the releases they resolve the LSV in.

    Only the release lines that the LSV itself has fix versions on are checked.
    A ticket resolves the LSV if it is fixed on each of those lines in the LSV's
    fix version or earlier. If several tickets qualify and some of them are
    fixed in exactly the LSV's fix versions, only those are kept.

    Several tickets can still be left (such as identical tickets for different
    modules). Each of them is fixed wherever the LSV is, so the LSV is still
    fixed there, but it is unknown whether any one of them would resolve the
    LSV on its own (such as in a hotfix).
    """
    resolving = {}

    for lsv_key, ticket_keys in lsv_tickets.items():
        if len(ticket_keys) < 2 or lsv_key not in lsv_issues:
            continue

        lsv_fixes = get_fix_versions_by_line(get_issue_fix_versions(lsv_issues[lsv_key]))

        if not lsv_fixes:
            continue

        ticket_fixes = {
            key: get_fix_versions_by_line(precomputed[key]['fix_versions'], include_quarterly_from_74=True)
                for key in ticket_keys
        }

        candidates = [
            key for key in ticket_keys
            if all(line in ticket_fixes[key] and get_fix_level(ticket_fixes[key][line]) <= get_fix_level(fv) for line, fv in lsv_fixes.items())
        ]

        exact_candidates = [
            key for key in candidates
            if all(ticket_fixes[key][line] == fv for line, fv in lsv_fixes.items())
        ]

        if exact_candidates:
            candidates = exact_candidates

        if not candidates:
            continue

        # On release lines that the LSV has no fix versions on, the resolving
        # tickets' own recorded fix versions are trusted instead (such as
        # LPE-19127 fixing LSV-2089 in 7.4.13-u155, although LSV-2089 only
        # records 2026.q3.10). If there are several resolving tickets, a line
        # is only fixed once all of them are.

        fix_versions = dict(lsv_fixes)

        candidate_fixes = [get_fix_versions_by_line(precomputed[key]['fix_versions']) for key in candidates]

        for line in set.intersection(*(set(fixes) for fixes in candidate_fixes)) - set(lsv_fixes):
            fix_versions[line] = max((fixes[line] for fixes in candidate_fixes), key=get_fix_level)

        resolving[lsv_key] = {
            'tickets': candidates,
            'fix_versions': sorted(fix_versions.values(), key=lambda fv: (get_version_rank(fv), get_fix_level(fv))),
        }

    return resolving

def get_target_version_data(target_version):
    target_line = parse_product_line(target_version)
    target_q_level = get_quarterly_level(target_version)
    target_patch_level = get_patch_level(target_version)

    if not target_line:
        print(f"Error: Could not identify product line for version '{target_version}'.", file=sys.stderr)
        print("Please check the input format (e.g., '7.3 DXP (7.3.10)' or '2025.q1.15').", file=sys.stderr)
        sys.exit(1)

    precomputed = get_precomputed_data()

    output_data = {
        'sev-1': {},
        'sev-2': {},
        'sev-3': {},
        'unknown': {}
    }

    is_target_quarterly = bool(re.search(r'202[3-6]\.[qQ][1-4]', target_version))
    target_rank = get_version_rank(target_version)

    for key, data in precomputed.items():
        fix_versions = set(data['fix_versions'])
        affects_versions = set(data['affects_versions'])
        group = data['group']

        stream_fixes = []
        applicable_fixes = []

        for fv in fix_versions:
            if is_applicable_fix_version(fv, target_version):
                stream_fixes.append(fv)
                if is_target_quarterly:
                    # For quarterly releases, the fix must be chronologically after the target version
                    if get_version_rank(fv) > target_rank:
                        applicable_fixes.append(fv)
                else:
                    applicable_fixes.append(fv)

        applicable_fixes = sorted(list(set(applicable_fixes)))

        is_affected = False

        if target_line == '7.0' and '7.0.10-ga1' in stream_fixes:
            # If an issue is fixed in GA1, it does not affect any DE releases
            is_affected = False
        elif stream_fixes:
            # Check if target version is older than any of the stream fixes
            for fv in stream_fixes:
                fv_q_level = get_quarterly_level(fv)
                fv_patch_level = get_patch_level(fv)

                if target_q_level is not None or fv_q_level is not None:
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
                    # Standard line releases (7.2, 7.3, 7.4)
                    target_ulevel = get_standard_ulevel(target_version)
                    fv_ulevel = get_standard_ulevel(fv)
                    if target_ulevel < fv_ulevel:
                        is_affected = True
                        break
        else:
            # Step 4: Heuristic fallback (check if target line is explicitly in the affects version list)
            for ver in affects_versions:
                ver_line = parse_product_line(ver)
                if ver_line and target_line.startswith(ver_line):
                    is_affected = True
                    break

            # An issue that only affects master and has no fix versions on any
            # product line is assumed to be unfixed everywhere, so it affects
            # every product line (tracked in security_issue_affects_master_only.json
            # for manual verification)
            if not is_affected and data['master_only']:
                is_affected = True

        if is_affected:
            if not applicable_fixes:
                output_data[group][key] = []
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
    if len(sys.argv) > 1:
        specific_ticket = sys.argv[1]
        target_versions = ALL_VERSIONS
    else:
        specific_ticket = None
        target_versions = ALL_VERSIONS

    if specific_ticket:
        ticket_results = {}
        for target_version in sorted(target_versions, key=lambda x: [int(c) if c.isdigit() else c for c in re.split(r'(\d+)', x)]):
            data = get_target_version_data(target_version)
            for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
                if specific_ticket in data[group]:
                    ticket_results[target_version] = {group: data[group][specific_ticket]}
                    break
        with open('security_issue_fix_versions.debug.json', 'wb') as f:
            f.write(json.dumps(ticket_results, option=json.OPT_INDENT_2))
    else:
        empty_tickets = defaultdict(dict)
        sorted_output = { target_version: get_target_version_data(target_version) for target_version in target_versions }

        with open('security_issue_fix_versions.ndjson', 'wb') as f:
            encoded_new_line = '\n'.encode('utf-8')
            for key, value in sorted_output.items():
                f.write(json.dumps({'key': key, 'value': value}))

                product_line = parse_product_line(key)

                if product_line not in empty_tickets:
                    empty_tickets[product_line] = {
                        severity: sorted([ticket for ticket, fix_versions in tickets.items() if len(fix_versions) == 0])
                            for severity, tickets in value.items()
                    }

                f.write(encoded_new_line)

        with open('security_issue_empty_fix_versions.json', 'wb') as f:
            f.write(json.dumps(empty_tickets))

        # Tickets assumed to affect every release only because master is their
        # only affects version, so they can be verified manually

        precomputed = get_precomputed_data()

        master_only_keys = sorted(
            [key for key, data in precomputed.items() if data['master_only']],
            key=lambda k: [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', k)])

        master_only_tickets = {
            key: {
                'group': precomputed[key]['group'],
                'affects_versions': sorted(precomputed[key]['affects_versions']),
                'lsv_keys': precomputed[key]['lsv_keys'],
            } for key in master_only_keys
        }

        with open('security_issue_affects_master_only.json', 'wb') as f:
            f.write(json.dumps(master_only_tickets, option=json.OPT_INDENT_2))

        # Tickets whose affects versions skip some of the later product lines,
        # so they can be verified manually

        with open('security_issue_affects_version_gaps.json', 'wb') as f:
            f.write(json.dumps(get_affects_version_gaps(precomputed), option=json.OPT_INDENT_2))

        # The evaluated tickets linked to each LSV (an LSV with no path to an LPE is
        # evaluated as itself), so that an LSV's affected versions come only from its
        # own tickets rather than from every ticket sharing one of its CVEs

        lsv_tickets = get_lsv_tickets(precomputed)

        with open('security_issue_lsv_tickets.json', 'wb') as f:
            f.write(json.dumps(lsv_tickets, option=json.OPT_INDENT_2))

        # The ticket that resolves each LSV with several tickets on its own, on
        # the release lines the LSV has fix versions on

        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'security_issue_export', 'LSV.json'), 'rb') as f:
            lsv_issues = json.loads(f.read())

        with open('security_issue_lsv_resolving_tickets.json', 'wb') as f:
            f.write(json.dumps(get_lsv_resolving_tickets(precomputed, lsv_issues, lsv_tickets), option=json.OPT_INDENT_2))

if __name__ == '__main__':
    main()
