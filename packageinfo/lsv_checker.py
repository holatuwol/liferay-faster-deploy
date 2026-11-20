from bs4 import BeautifulSoup
from datetime import datetime, timezone
from html import escape
import inspect
import orjson as json
from glob import glob
from os import remove
from os.path import abspath, basename, dirname, exists, join
import re

script_folder = dirname(abspath(inspect.getfile(inspect.currentframe())))

# security_issue_fix_versions.py writes its output to the jira folder

jira_folder = join(dirname(script_folder), 'jira')

# Builds lsv_checker.json for lsv_checker.html (internal-facing) and
# lsv_checker_public.json for lsv_checker_public.html (public-facing) by
# combining the published LSVs exported by lsv_export.py (LSV.json) with the
# per-version affected issues computed by security_issue_fix_versions.py
#
# Both files list every exported LSV with its affected versions combined across
# its tickets (see combine_affected). The internal file also lists the LPE
# tickets of each LSV, so that the page can treat an LSV as fixed by a hotfix,
# and records whether each LSV has been made public. The public file has no
# ticket keys or descriptions, and links to the LSV's advisories on liferay.dev
# where there are any (see read_public_advisories).
#
# The internal page also gets lsv_checker_hotfix.json, which maps the
# development tickets (LPD, LPS, LPSA, COMMERCE) linked to each of those tickets
# back to them, so that a customer's hotfix tokens can be pasted as is.
#
# An LSV affects a version if the LSV itself or any ticket linked to it (as
# recorded in security_issue_lsv_tickets.json) is listed as outstanding for that
# version in security_issue_fix_versions.ndjson, unless one of its resolving
# tickets (see read_resolving_tickets) has resolved the LSV in that version.
#
# Only the LSV's own linked tickets are used, rather than every ticket that
# shares one of its CVEs (security_issue_synonyms.ndjson), because a later LSV
# can repeat a CVE from an earlier LSV (such as a follow-up library upgrade),
# and the earlier LSV would then appear to affect every release up to the later
# fix. For the same reason, only the CVEs recorded on the LSV itself are shown.

not_affected_classifications = {'Not Exploitable', 'False Positive', 'Ignored'}

cve_pattern = re.compile(r'(?:CVE|PRISMA)-\d{4}-\d+', re.IGNORECASE)

def natural_key(value):
    return [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', value)]

def read_ndjson(file_name):
    result = {}

    with open(file_name, 'rb') as f:
        for line in f:
            if line.strip():
                entry = json.loads(line)
                result[entry['key']] = entry['value']

    return result

def get_option_value(field):
    if isinstance(field, dict):
        return field.get('value')

    return None

def adf_text(node):
    if node.get('type') == 'text':
        return node.get('text', '')

    return ''.join(adf_text(child) for child in node.get('content', []))

def adf_to_html(node):
    node_type = node.get('type')
    content = ''.join(adf_to_html(child) for child in node.get('content', []))

    if node_type == 'text':
        html = escape(node.get('text', ''))

        for mark in node.get('marks', []):
            mark_type = mark.get('type')

            if mark_type == 'strong':
                html = f'<strong>{html}</strong>'
            elif mark_type == 'em':
                html = f'<em>{html}</em>'
            elif mark_type == 'underline':
                html = f'<u>{html}</u>'
            elif mark_type == 'code':
                html = f'<code>{html}</code>'
            elif mark_type == 'link':
                href = mark.get('attrs', {}).get('href', '')

                if href.startswith('http'):
                    html = f'<a href="{escape(href)}" target="_blank" rel="noopener">{html}</a>'

        return html

    if node_type == 'inlineCard':
        url = node.get('attrs', {}).get('url', '')

        if url.startswith('http'):
            return f'<a href="{escape(url)}" target="_blank" rel="noopener">{escape(url)}</a>'

        return ''

    if node_type == 'hardBreak':
        return '<br>'

    if node_type == 'rule':
        return '<hr>'

    if node_type == 'heading':
        level = min(max(int(node.get('attrs', {}).get('level', 3)) + 2, 4), 6)
        return f'<h{level}>{content}</h{level}>'

    if node_type == 'codeBlock':
        return f'<pre>{escape(adf_text(node))}</pre>'

    if node_type == 'table':
        return f'<table class="table table-bordered table-condensed">{content}</table>'

    tags = {
        'paragraph': 'p',
        'bulletList': 'ul',
        'orderedList': 'ol',
        'listItem': 'li',
        'tableRow': 'tr',
        'tableHeader': 'th',
        'tableCell': 'td',
    }

    if node_type in tags:
        return f'<{tags[node_type]}>{content}</{tags[node_type]}>'

    return content

def get_advisory_url(node):
    for mark in node.get('marks', []):
        if mark.get('type') == 'link':
            href = mark.get('attrs', {}).get('href', '')

            if '/articles/' in href:
                return href.split('#')[0]

    for child in node.get('content', []):
        url = get_advisory_url(child)

        if url:
            return url

    return None

# The public advisories on https://liferay.dev/vulnerabilities, which
# security_issue_public_export.py saves as one HTML file per advisory (named by
# its external reference code), along with an index of their URLs and titles

public_export_folder = join(jira_folder, 'security_issue_public_export')

def normalize_title(title):
    """
    Returns an advisory title without its leading identifiers (such as CVE-2020-
    7961, CST-7113, or LPS-46552) and with only lowercase letters and digits
    separated by single spaces, so that an LSV's title can be compared with the
    title of its public advisory.
    """

    title = re.sub(r'^\s*(?:(?:CVE-\d{4}-\d+|CST-[\d-]+|LPS-\d+)[\s,:-]*)+', '', title, flags=re.IGNORECASE)

    return re.sub(r'[^a-z0-9]+', ' ', title.lower()).strip()

cve_list_pattern = re.compile(r'(?:(?:CVE|PRISMA)-\d{4}-\d+[\s,]*)+', re.IGNORECASE)

def get_public_advisory_elements(soup, content):
    """
    Returns the elements of a public advisory that hold its sections (such as
    Description, Severity, and Fixed Version(s)), leaving out the title, the
    publication date, and the links to each CVE at the end.
    """

    # Older advisories are a single web content article

    if 'journal-content-article' in (content.get('class') or []):
        article = content.find('article') or content

        return [
            child for child in article.find_all(recursive=False)
            if 'publication date' not in child.get_text(' ').lower()
        ]

    # Newer advisories are a display page, with a heading and a paragraph
    # fragment for each section, followed by a heading for each CVE

    title = soup.find('h1', class_='autofit-row')
    container = title.find_parent(class_='lfr-layout-structure-item-container') if title else None

    if container is None:
        return []

    def is_section(tag):
        classes = tag.get('class') or []

        return (tag.name == 'h3' and 'component-heading' in classes) or ('component-paragraph' in classes)

    # The publication date is filled in by another fragment, which leaves only
    # its label in the paragraph fragment

    return [
        tag for tag in container.find_all(is_section)
        if not cve_list_pattern.fullmatch(tag.get_text(' ', strip=True))
            and 'publication date' not in tag.get_text(' ').lower()
    ]

def read_public_advisories():
    """
    Returns the public advisories saved by security_issue_public_export.py, each
    with its URL, title, and CVEs. An advisory's CVEs are the
    ones in its title, or if its title has none, the ones in its content, since
    an advisory can mention the CVE of an earlier, incomplete fix.
    """

    index_file_name = join(public_export_folder, 'index.json')

    if not exists(index_file_name):
        print('Skipping public advisories:', 'security_issue_public_export/index.json', 'does not exist (run security_issue_public_export.py)')
        return []

    with open(index_file_name, 'rb') as f:
        index = json.loads(f.read())

    advisories = []

    for external_reference_code, entry in index.items():
        file_name = join(public_export_folder, external_reference_code + '.html')

        if not exists(file_name):
            continue

        with open(file_name, 'rb') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        content = soup.find(attrs={'data-analytics-external-reference-code': True})

        if content is None:
            continue

        title = content.get('data-analytics-asset-title') or entry['title']
        elements = get_public_advisory_elements(soup, content)

        if not elements:
            print('security_issue_public_export:', 'no content found for', entry['url'])
            continue

        cves = {x.upper() for x in cve_pattern.findall(title)}

        if not cves:
            cves = {x.upper() for element in elements for x in cve_pattern.findall(element.get_text(' '))}

        advisories.append({
            'url': entry['url'],
            'title': title,
            'cves': cves,
        })

    return advisories

def get_public_advisories(fields, cves, advisories_by_cve, advisories_by_title):
    """
    Returns the public advisories for an LSV: the ones for any of the LSV's own
    CVEs, or if there are none, the one advisory with the same title as the LSV
    (such as the CST advisories for LSVs that never had a CVE).
    """

    advisories = {id(x): x for cve in cves for x in advisories_by_cve.get(cve, [])}

    if not advisories:
        title_advisories = advisories_by_title.get(normalize_title(fields.get('customfield_10959') or ''), [])

        if len(title_advisories) == 1:
            advisories = {id(x): x for x in title_advisories}

    return sorted(advisories.values(), key=lambda x: natural_key(x['title']))

export_file_name = 'LSV.json'

# The customer-facing (cf[10955]) and public-facing (cf[10956]) publication date
# fields, which lsv_export.py selected the LSVs by

published_fields = ['customfield_10955', 'customfield_10956']
public_published_field = 'customfield_10956'

# (page data file, whether to include LPE tickets and audience, which only the
# internal page gets)

builds = [
    ('lsv_checker.json', True),
    ('lsv_checker_public.json', False),
]

def read_export(export_file_name):
    with open(join(script_folder, 'lsv_export', export_file_name), 'rb') as f:
        return json.loads(f.read())

def parse_jira_datetime(value):
    # Jira datetimes look like 2024-05-01T09:00:00.000-0700

    return datetime.strptime(value, '%Y-%m-%dT%H:%M:%S.%f%z')

def is_public(fields, now):
    published = fields.get(public_published_field)

    return bool(published) and parse_jira_datetime(published) <= now

def get_release_line(version):
    quarter_match = re.match(r'(\d{4}\.q[1-4])', version)

    if quarter_match:
        return quarter_match.group(1)

    version_match = re.match(r'(\d+\.\d+)', version)

    return version_match.group(1) if version_match else version

# LSVs mapped to the tickets that fully resolve the LSV on their own, even if
# its other tickets are still outstanding (such as LPE-18800, fixed in
# 2025.q1.28, which resolves LSV-1793 although LPE-18843 was never fixed in
# 2025.q1). security_issue_fix_versions.py finds these tickets by matching them
# against the LSV's own fix versions.

resolving_tickets_file_name = 'security_issue_lsv_resolving_tickets.json'

def read_resolving_tickets():
    """
    Returns LSV key -> a dictionary with:

    - tickets: the resolving tickets
    - fix_versions: the releases they resolve the LSV in, along with the later
      releases of the same release lines
    - alone: whether any one of the tickets resolves the LSV by itself (such as
      in a hotfix), which is unknown when several tickets matched the LSV's fix
      versions equally well
    """

    with open(join(jira_folder, resolving_tickets_file_name), 'rb') as f:
        return {
            lsv_key: {
                'tickets': value['tickets'],
                'fix_versions': value['fix_versions'],
                'alone': len(value['tickets']) == 1,
            } for lsv_key, value in json.loads(f.read()).items()
        }

def is_fixed_by(version_index, fix_version_indices, versions):
    # Whether one of the fix versions is this release or an earlier release of
    # the same release line

    release_line = get_release_line(versions[version_index])

    return any(
        fix_version_index <= version_index and get_release_line(versions[fix_version_index]) == release_line
        for fix_version_index in fix_version_indices)

def combine_affected(ticket_keys, resolving, outstanding, versions, version_indices):
    """
    Returns version index -> fix versions for an LSV, combining its tickets. An
    LSV affects a release if any of its tickets is outstanding there, except
    where it has been resolved (see read_resolving_tickets) in that release or
    an earlier release of the same release line.
    """

    affected = {}

    for ticket_key in ticket_keys:
        for version_index, values in outstanding[ticket_key]:
            affected.setdefault(version_index, set()).update(values)

    resolving_fix_version_indices = {
        version_indices[fix_version]
        for fix_version in (resolving['fix_versions'] if resolving else [])
        if fix_version in version_indices
    }

    for version_index in list(affected.keys()):
        if is_fixed_by(version_index, resolving_fix_version_indices, versions):
            del affected[version_index]

    # A release that fixes one of the tickets is not a fix for the LSV if another
    # ticket still affects that release (such as when one ticket was fixed in
    # 2025.q1.28, but another was never fixed in 2025.q1), so only keep the fix
    # versions that the LSV no longer affects

    affected_versions = {versions[version_index] for version_index in affected}

    return {version_index: values - affected_versions for version_index, values in affected.items()}

def build(lsv_issues, output_file_name, include_tickets):
    now = datetime.now(timezone.utc)

    # Only the public page gets the public advisories, since the internal page
    # has each LSV's own description

    advisories_by_cve = {}
    advisories_by_title = {}

    if not include_tickets:
        for advisory in read_public_advisories():
            for cve in advisory['cves']:
                advisories_by_cve.setdefault(cve, []).append(advisory)

            advisories_by_title.setdefault(normalize_title(advisory['title']), []).append(advisory)

    fix_versions = read_ndjson(join(jira_folder, 'security_issue_fix_versions.ndjson'))

    with open(join(jira_folder, 'security_issue_lsv_tickets.json'), 'rb') as f:
        lsv_tickets = json.loads(f.read())

    resolving_tickets = read_resolving_tickets()

    # security_issue_fix_versions.ndjson lists versions in release order (from
    # releases.json), which the page relies on to find the release that fixed an
    # issue, so keep that order rather than sorting.

    versions = list(fix_versions.keys())
    version_indices = {version: version_index for version_index, version in enumerate(versions)}

    # issue key -> list of (version index, fix versions)

    outstanding = {}

    for version_index, version in enumerate(versions):
        for group in fix_versions[version].values():
            for issue_key, issue_fix_versions in group.items():
                outstanding.setdefault(issue_key, []).append((version_index, issue_fix_versions))

    # Fix version lists repeat across every version of a release line, so store
    # each distinct list once and refer to it by index.

    fix_lists = []
    fix_list_indices = {}

    def get_fix_list_index(values):
        fix_list_key = tuple(sorted(set(values), key=natural_key))

        if fix_list_key not in fix_list_indices:
            fix_list_indices[fix_list_key] = len(fix_lists)
            fix_lists.append(list(fix_list_key))

        return fix_list_indices[fix_list_key]

    # Both pages get each LSV's affected versions combined across its tickets.
    # The internal page also gets each LSV's tickets, so that an LSV can be
    # treated as fixed when a customer's hotfix includes one of its LPE tickets
    # (or a development ticket linked to one, see write_hotfix_tickets). The
    # public page gets no ticket keys (and so no LPE mappings).

    issues = {}

    for lsv_key in sorted(lsv_issues.keys(), key=natural_key):
        fields = lsv_issues[lsv_key]

        cves = set(x.upper() for x in cve_pattern.findall(fields.get('customfield_10563') or ''))

        classification = get_option_value(fields.get('customfield_10961'))

        issue_tickets = []
        issue_affected = {}

        if classification not in not_affected_classifications:
            issue_tickets = [
                ticket_key for ticket_key in sorted({lsv_key} | set(lsv_tickets.get(lsv_key, [])), key=natural_key)
                if ticket_key in outstanding
            ]

            issue_affected = combine_affected(issue_tickets, resolving_tickets.get(lsv_key), outstanding, versions, version_indices)

        description = fields.get('customfield_10960')

        # The publication date is a datetime (e.g. 2024-05-01T09:00:00.000-0700),
        # but only the date is shown. The earliest date field is when the LSV was
        # first published.

        published_dates = [fields.get(field)[:10] for field in published_fields if fields.get(field)]
        published = min(published_dates) if published_dates else ''

        issues[lsv_key] = {
            'published': published,
            # An LSV without a title (summary) is titled by its CVEs instead
            'title': fields.get('customfield_10959') or ', '.join(sorted(cves, key=natural_key)),
            # An LSV without a severity is treated as having a severity of None
            'severity': get_option_value(fields.get('customfield_10786')) or 'None',
            'classification': classification or '',
            'products': [get_option_value(x) for x in (fields.get('customfield_10983') or [])],
            'cves': sorted(cves, key=natural_key),
            'advisory': get_advisory_url(description) if description else None,
            'description': adf_to_html(description) if description else '',
        }

        if include_tickets:
            issues[lsv_key]['tickets'] = issue_tickets

            # So that the page can tell whether a hotfix includes every ticket
            # that is still outstanding in a release, record which releases each
            # ticket affects when an LSV has more than one ticket (with a single
            # ticket, that ticket is outstanding wherever the LSV is affected)

            if len(issue_tickets) > 1:
                issues[lsv_key]['ticketVersions'] = {
                    ticket_key: [version_index for version_index, values in outstanding[ticket_key]]
                    for ticket_key in issue_tickets
                }

            # A hotfix that includes a resolving ticket fixes the LSV on its own,
            # on the release lines of the LSV's fix versions

            resolving = resolving_tickets.get(lsv_key)

            issue_resolving_tickets = [
                ticket_key for ticket_key in resolving['tickets'] if ticket_key in issue_tickets
            ] if resolving and resolving['alone'] else []

            if issue_resolving_tickets:
                issues[lsv_key]['resolvedBy'] = issue_resolving_tickets

                resolved_lines = {get_release_line(fix_version) for fix_version in resolving['fix_versions']}

                issues[lsv_key]['resolvedIn'] = [
                    version_index for version_index in sorted(issue_affected.keys())
                    if get_release_line(versions[version_index]) in resolved_lines
                ]
            issues[lsv_key]['audience'] = 'Public' if is_public(fields, now) else 'Customers Only'
        else:
            # The public page does not have any descriptions, and links to the
            # LSV's advisories on liferay.dev rather than the advisory linked
            # from the LSV's description (if any). An LSV can have more than one
            # advisory on liferay.dev (one for each of its CVEs), so the page
            # accepts a list of advisories as well as a single advisory.

            del issues[lsv_key]['description']

            public_advisories = get_public_advisories(fields, cves, advisories_by_cve, advisories_by_title)

            if public_advisories:
                issues[lsv_key]['advisory'] = [x['url'] for x in public_advisories]

            # An LSV whose public publication date has not passed yet only lists
            # its CVEs, severity, classification, and categories (and the versions
            # it affects), without the title, advisory, or publication date that
            # have only been published to customers

            if not is_public(fields, now):
                issues[lsv_key] = {field: issues[lsv_key][field] for field in ['cves', 'severity', 'classification', 'products']}

        issues[lsv_key]['affected'] = {str(version_index): get_fix_list_index(values) for version_index, values in sorted(issue_affected.items())}

    data = {'versions': versions, 'fixLists': fix_lists, 'issues': issues}

    with open(join(script_folder, output_file_name), 'wb') as f:
        f.write(json.dumps(data))

    print(output_file_name + ':', len(issues), 'issues,', sum(1 for x in issues.values() if x['affected']), 'affecting at least one version' + (', %d tickets' % len({y for x in issues.values() for y in x['tickets']}) if include_tickets else ''))

    if include_tickets:
        print(output_file_name + ':', sum(1 for x in issues.values() if x['audience'] != 'Public'), 'issues not public')
    else:
        print(output_file_name + ':', sum(1 for x in issues.values() if 'title' not in x), 'issues without details (not public)')
        print(output_file_name + ':', sum(1 for x in issues.values() if isinstance(x.get('advisory'), list)), 'issues with an advisory on liferay.dev')

    return data

# Compares the fix versions recorded on each LSV (cf[10978]) with the fix
# versions computed from its tickets, within each release line that the field
# names, and writes the differences for each severity to its own file, such as
# lsv_mismatch_critical.json

def get_mismatch_file_name(severity):
    return 'lsv_mismatch_%s.json' % re.sub(r'[^a-z0-9]+', '_', severity.lower())

# The order of severities, as on the pages

severity_order = ['Critical', 'High', 'Medium', 'Low', 'None']
lsv_fix_versions_field = 'customfield_10978'

def normalize_lsv_fix_version(name, version_indices):
    """
    Returns the release name (as in security_issue_fix_versions.ndjson) for a
    Jira version name in the LSV's fix versions field, or None if it does not
    name a single DXP release (such as a CE release, or a whole release line like
    'DXP 2024.Q1').
    """

    lower_name = name.strip().lower()

    # 2025.Q1.28

    if re.fullmatch(r'\d{4}\.q[1-4]\.\d+', lower_name):
        return lower_name

    # 7.1.10-dxp-3 (fix pack 3)

    m = re.fullmatch(r'(7\.[12]\.10)-dxp-(\d+)', lower_name)

    if m:
        return '%s-fp%s' % (m.group(1), m.group(2))

    # 7.0.10-de-65

    m = re.fullmatch(r'7\.0\.10-de-(\d+)', lower_name)

    if m:
        return '7.0.10-de%s' % m.group(1)

    # 7.4.13 DXP U144

    m = re.fullmatch(r'7\.4\.13 dxp u(\d+)', lower_name)

    if m:
        return '7.4.13-u%s' % m.group(1)

    # 7.4 CE GA releases (7.4.3.112-ga112, 7.4.13.120 CE GA120), which share an
    # update level with DXP, using the same mapping as normalize_version in
    # security_issue_fix_versions.py

    m = re.fullmatch(r'7\.4\.(?:3|13)\.(\d+)(?:-| ce )ga\d+', lower_name)

    if m:
        release_num = int(m.group(1))

        if release_num >= 15:
            return '7.4.13-u%d' % release_num
        elif release_num > 4:
            return '7.4.13-u%d' % (release_num - 4)

        return None

    # Already a release name (7.3.10-u36, 7.0.10-ga1), but not a CE release
    # (7.1.1-ga2)

    if lower_name in version_indices:
        return lower_name

    return None

def get_named_release_line(name):
    """
    Returns the release line that a Jira version name belongs to, even if it does
    not name a single DXP release (7.1.1-ga2 and 7.3 DXP (7.3.10) are in 7.1 and
    7.3, and DXP 2024.Q1 is 2024.q1).
    """

    lower_name = name.lower()

    quarter_match = re.search(r'\d{4}\.q[1-4]', lower_name)

    if quarter_match:
        return quarter_match.group(0)

    version_match = re.search(r'\d+\.\d+', lower_name)

    return version_match.group(0) if version_match else lower_name

def is_release_line_name(name):
    """
    Whether a Jira version name names a whole release line rather than a single
    release, such as DXP 2024.Q1 or 7.3 DXP (7.3.10).
    """

    lower_name = name.strip().lower()

    return bool(
        re.fullmatch(r'(?:dxp )?\d{4}\.q[1-4]', lower_name) or
        re.fullmatch(r'\d+\.\d+ dxp \(\d+\.\d+\.\d+\)', lower_name))

def write_mismatches(lsv_issues, data):
    versions = data['versions']
    fix_lists = data['fixLists']
    version_indices = {version: version_index for version_index, version in enumerate(versions)}

    # Releases in release order, with releases that are newer than the known
    # releases (such as a quarterly release that is not out yet) last

    def version_order(version):
        return (version_indices.get(version, len(versions)), natural_key(version))

    # release line -> its first release, which a fix version can name to say
    # that no release of that line is affected

    first_versions = {}

    for version in versions:
        first_versions.setdefault(get_release_line(version), version)

    mismatches = {}
    unrecognized = {}

    for lsv_key in sorted(lsv_issues.keys(), key=natural_key):
        fields = lsv_issues[lsv_key]
        field_names = [x['name'] for x in (fields.get(lsv_fix_versions_field) or [])]

        if not field_names:
            continue

        # LSVs that are never treated as affecting any release are not compared

        if get_option_value(fields.get('customfield_10961')) in not_affected_classifications:
            continue

        # Both sections are grouped by severity, treating an LSV without a
        # severity as having a severity of None (as the pages do)

        severity = get_option_value(fields.get('customfield_10786')) or 'None'

        # release line -> fix versions recorded on the LSV, and the names they
        # were recorded as

        field_lines = {}
        field_line_names = {}

        # release line -> names that are not a single DXP release

        unrecognized_line_names = {}

        for name in field_names:
            fix_version = normalize_lsv_fix_version(name, version_indices)

            if fix_version is None:
                unrecognized_line_names.setdefault(get_named_release_line(name), []).append(name)
                continue

            field_lines.setdefault(get_release_line(fix_version), set()).add(fix_version)
            field_line_names.setdefault(get_release_line(fix_version), []).append(name)

        # release line -> fix versions computed from the LSV's tickets, combined
        # across the affected releases of that line

        computed_lines = {}

        for version_index, fix_list_index in data['issues'][lsv_key]['affected'].items():
            computed_lines.setdefault(get_release_line(versions[int(version_index)]), set()).update(fix_lists[fix_list_index])

        # The computed fix versions for a release line: None if no release of
        # the line is affected, an empty list if a release is affected but no
        # release fixes it, and otherwise the fix versions in release order

        def get_computed(release_line):
            if release_line not in computed_lines:
                return None

            return sorted(computed_lines[release_line], key=version_order)

        issue_mismatches = {}

        # The earliest fix version in a line is the release that ends the
        # affected releases (the page lists one fix version per ticket, and the
        # field sometimes lists several), so compare the earliest ones

        for release_line, field_fix_versions in sorted(field_lines.items(), key=lambda x: natural_key(x[0])):
            field_fix_versions = sorted(field_fix_versions, key=version_order)

            computed = get_computed(release_line)

            # No release of this line is affected, which agrees with a fix in
            # the line's first release

            if (computed is None) and (field_fix_versions[0] == first_versions.get(release_line)):
                continue

            if computed and (computed[0] == field_fix_versions[0]):
                continue

            # The field's values are reported as recorded on the LSV, since a CE
            # release (such as 7.4.3.112-ga112) is only compared as the DXP
            # update it maps to

            issue_mismatches[release_line] = {
                'computed': computed,
                'field': field_line_names[release_line],
            }

        if issue_mismatches:
            mismatches.setdefault(severity, {})[lsv_key] = issue_mismatches

        issue_unrecognized = {}

        for release_line, names in sorted(unrecognized_line_names.items(), key=lambda x: natural_key(x[0] or '')):
            computed = get_computed(release_line)

            # A name for the whole release line (such as DXP 2024.Q1) agrees with
            # no release of that line being affected, which is the case when the
            # fix is in the line's first release (such as 2024.q1.1)

            if computed is None:
                names = [name for name in names if not is_release_line_name(name)]

            if names:
                issue_unrecognized[release_line] = {
                    'computed': computed,
                    'field': names,
                }

        if issue_unrecognized:
            unrecognized.setdefault(severity, {})[lsv_key] = issue_unrecognized

    # Most severe first, with any unexpected severities last

    # One file per severity (section -> LSV), most severe first (with any
    # unexpected severities last), leaving out empty sections. Files from an
    # earlier run for a severity that no longer has any differences are removed,
    # so that they are not mistaken for current ones.

    severities = sorted(set(mismatches.keys()) | set(unrecognized.keys()), key=lambda x: (severity_order.index(x) if x in severity_order else len(severity_order), x))

    file_names = {get_mismatch_file_name(severity) for severity in severities}

    for old_file_name in glob(join(script_folder, 'lsv_mismatch*.json')):
        if basename(old_file_name) not in file_names:
            remove(old_file_name)

    for severity in severities:
        report = {}

        if severity in mismatches:
            report['mismatches'] = mismatches[severity]

        if severity in unrecognized:
            report['unrecognized'] = unrecognized[severity]

        file_name = get_mismatch_file_name(severity)

        with open(join(script_folder, file_name), 'wb') as f:
            f.write(json.dumps(report, option=json.OPT_INDENT_2))

        print(file_name + ':', len(mismatches.get(severity, {})), 'LSVs with', sum(len(x) for x in mismatches.get(severity, {}).values()), 'release lines that differ;', sum(len(x) for x in unrecognized.get(severity, {}).values()), 'release lines not compared in', len(unrecognized.get(severity, {})), 'LSVs')

# Maps the development tickets that a hotfix lists (such as LPD-62070) to the
# tickets of the internal page's LSVs that they are linked to (such as
# LPE-18301), so that the page can accept a customer's hotfix tokens without
# first looking up each LPE ticket

hotfix_tickets_file_name = 'lsv_checker_hotfix.json'

development_projects = ('LPD', 'LPS', 'LPSA', 'COMMERCE')
jira_export_projects = ('LPE', 'LSV') + development_projects

def get_linked_keys(fields):
    for issue_link in fields.get('issuelinks', []):
        for side in ['inwardIssue', 'outwardIssue']:
            if side in issue_link:
                yield issue_link[side]['key']

def get_project(issue_key):
    return issue_key[:issue_key.find('-')]

def write_hotfix_tickets(data):
    """
    Writes development ticket -> the LSV tickets (LPE tickets, or an LSV that has
    no LPE ticket, such as LSV-1369) that it is linked to. A link is used from
    either side, since security_issue_export.py only exports the development
    tickets that are marked as security vulnerabilities, and an LPE can link to
    a development ticket that is not.

    Only direct links are used: a development ticket that is only linked to the
    LSV is not mapped to the LSV's LPE tickets, since an LSV with several LPE
    tickets needs every outstanding one of them in the hotfix.
    """

    ticket_keys = {ticket_key for issue in data['issues'].values() for ticket_key in issue['tickets']}

    hotfix_tickets = {}

    def add_link(development_key, ticket_key):
        if (get_project(development_key) in development_projects) and (ticket_key in ticket_keys):
            hotfix_tickets.setdefault(development_key, set()).add(ticket_key)

    export_folder = join(jira_folder, 'security_issue_export')

    for project in jira_export_projects:
        file_name = join(export_folder, project + '.json')

        if not exists(file_name):
            print('Skipping:', 'security_issue_export/' + project + '.json', 'does not exist (run security_issue_export.py)')
            continue

        with open(file_name, 'rb') as f:
            issues = json.loads(f.read())

        for issue_key, fields in issues.items():
            for linked_key in get_linked_keys(fields):
                add_link(issue_key, linked_key)
                add_link(linked_key, issue_key)

    output = {
        development_key: sorted(hotfix_tickets[development_key], key=natural_key)
            for development_key in sorted(hotfix_tickets.keys(), key=natural_key)
    }

    with open(join(script_folder, hotfix_tickets_file_name), 'wb') as f:
        f.write(json.dumps(output, option=json.OPT_INDENT_2))

    mapped_keys = {ticket_key for values in output.values() for ticket_key in values}

    print(hotfix_tickets_file_name + ':', len(output), 'development tickets mapped to', len(mapped_keys), 'of', len(ticket_keys), 'LSV tickets')

    unmapped_keys = sorted(ticket_keys - mapped_keys, key=natural_key)

    if unmapped_keys:
        print(hotfix_tickets_file_name + ':', 'no development ticket is linked to', ', '.join(unmapped_keys))

def main():
    if not exists(join(script_folder, 'lsv_export', export_file_name)):
        print('Skipping:', 'lsv_export/' + export_file_name, 'does not exist (run lsv_export.py)')
        return

    lsv_issues = read_export(export_file_name)

    # Warn about resolving tickets that are not linked to their LSV, since they
    # are ignored

    with open(join(jira_folder, 'security_issue_lsv_tickets.json'), 'rb') as f:
        lsv_tickets = json.loads(f.read())

    for lsv_key, resolving in read_resolving_tickets().items():
        for ticket_key in resolving['tickets']:
            if ticket_key not in lsv_tickets.get(lsv_key, []):
                print(resolving_tickets_file_name + ':', ticket_key, 'is not linked to', lsv_key)

    for output_file_name, include_tickets in builds:
        data = build(lsv_issues, output_file_name, include_tickets)

        # The internal data has every LSV's computed fix versions

        if include_tickets:
            write_mismatches(lsv_issues, data)
            write_hotfix_tickets(data)

if __name__ == '__main__':
    main()
