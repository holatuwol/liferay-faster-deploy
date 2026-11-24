# How security issue fix versions are decided

`security_issue_fix_versions.py` builds `security_issue_fix_versions.ndjson`. For every release in `releases.json`, it lists the security tickets that affect that release, grouped by severity, along with the releases on that release's product line that contain the fix.

The process has three stages:

1. Exporting the Jira data (`security_issue_export.py`)
2. Working out the fix versions, affects versions and severity of each ticket, which doesn't depend on the target release
3. Deciding, for each target release, whether each ticket affects it and which of its fixes apply

`security_issue.sh` runs the export, then `security_issue_synonyms.py`, then `security_issue_fix_versions.py`.

## Stage 1: Exporting the Jira data

`security_issue_export.py` writes one JSON cache per Jira project to `security_issue_export/`. Only issues in these caches are considered later.

| File | What it contains |
|---|---|
| `LPS.json`, `LPSA.json` | Issues with the `Security Vulnerability` component |
| `LPD.json` | Issues whose `Cross Cutting Properties` is `Security Vulnerability` |
| `LPE.json` | Every LPE issue linked from the LPS, LPSA, LPD or COMMERCE issues above |
| `LSV.json` | Every LSV issue linked from the LPS, LPSA, LPD or COMMERCE issues above |
| `COMMERCE.json` | COMMERCE issues linked from LSV issues. This file is only built when it doesn't exist yet, so delete it to refresh it. |

LPS, LPSA and LPD issues must also have a security level, and either no resolution or a resolution other than `Discarded`, `Duplicate` or `Won't Fix`. `other_keys` in the script adds a few hardcoded LPS, LPSA and LPD keys that the queries miss.

The LPS, LPSA and LPD caches are rebuilt in full on every run. The LPE and LSV caches are updated incrementally:

- Keys that are already cached are fetched again only if they changed after the newest `updated` timestamp in the cache.
- Keys that aren't cached yet are always fetched, however long ago they were last updated.

Afterwards, `check_missing_lsvs` prints LSV issues that have a CVE but never made it into `LSV.json`. These LSV issues are excluded: those classified as `False Positive`, `Ignored` or `Not Exploitable`, and those resolved as `Discarded`, `Duplicate`, `Not a Bug` or `Won't Fix`. The check is only a report and doesn't change the caches.

## Stage 2: Working out each ticket's data

`get_precomputed_data` does this once for each ticket.

### Which tickets are evaluated

- Every issue in `LPE.json`.
- Every LSV issue that has no path to any LPE issue through issue links, in either direction and over any number of hops across all the cached projects. These are called *disconnected LSVs*.

### Inputs besides the Jira caches

- `releases.json`: the list of known releases. Release names are matched against it.
- `security_issue_extra_fix_versions.json`: extra fix versions for each ticket, added by hand.
- `releases.production/<version>.keys.json`: lists of tickets shipped in a 6.1, 6.2, 7.0 or 7.1 release. Each ticket listed is given that release as an extra fix version.
- `security_issue_extra_affects_versions.json`: extra affects versions for each ticket, added by hand. This file is optional.

### Reading the fix versions of a single Jira issue

`get_issue_fix_versions` reads these fields:

- `fixVersions`
- `customfield_10886` and `customfield_10978`, which are extra fix-version fields
- labels `liferay-fixpack-de-<N>-7010`, read as `7.0.10-de<N>`
- labels `liferay-fixpack-dxp-<N>-7110`, read as `7.1.10-fp<N>`

**Version names that are ignored** (`add_fix_version`):

- `master`, and anything containing `sprint`
- milestones, unless the name starts with `7.x.y`
- CE releases, unless the name starts with `7.` or is an RC, alpha or beta
- names starting with `ac`
- 5.1, 5.2, 6.0, 6.1 and 6.2 versions. The 6.x lines only get fix versions through `releases.production`.
- 7.2 service packs (`sp`)
- quarterly `-CMS` releases (such as `2026.Q4.0-CMS`), as in `releases.py`. Every ticket with one also has the release it accompanies (`2026.Q4.0`). An `-LTS` suffix is dropped, since it names the same release.

**Normalizing the remaining names:** `normalize_version` converts each name to its name in `releases.json`, ignoring case. Some examples:

| Jira name | Release name |
|---|---|
| `7.4.13 DXP U92` | `7.4.13-u92` |
| `7.3.10 DXP FP2`, `7.3.10 DXP SP3` | `7.3.10-uN` |
| `7.2.10 DXP FP15` | `7.2.10-fp15` |
| `7.0.10 DXP FP60` | `7.0.10-de60` |
| `7.4.3.N CE GA` | `7.4.13-uN` for N ≥ 15, `7.4.13-u(N-4)` for 5 ≤ N < 15 |
| `2025.Q1.15` | `2025.q1.15` |
| An RC, beta, alpha or milestone of 7.0 to 7.4 | That line's GA1 |

Names that don't match any pattern are dropped.

**`.x` versions** (for example `7.3.x` or `2025.Q1.x`), and versions for a whole product line (`7.4 DXP (7.4.13)`, `7.3 DXP (7.3.10)` or `DXP 2024.Q1`, see `LINE_VERSION_PATTERN`): these mean "fixed on this line, release not yet known". For example, LPE-18160 only has `7.4 DXP (7.4.13)` on 7.4, so the `7.4.3.132 CE GA132` (`7.4.13-u132`) recorded on LSV-1414 is used. If the issue has no concrete fix version on that product line, but an LSV linked to it (directly or through a linked ticket) has one in its own fix-version fields, that release is used (`get_lsv_x_line_fix_versions`). For example, LPE-17752 only has `7.4.X EE`, and LSV-1211 records `7.4.13-u77`. The LSV's fix versions are not used on any other line, because an LSV with several tickets is only fixed by the last of them. Otherwise, the latest release of the line in `releases.json` is used. For quarterly lines that is the highest patch number, and for other lines the highest update or fix pack number.

### Combining fix versions across linked issues

Each ticket is pooled with the cached issues it links to directly (one hop):

- **An LPE with its own fix versions** keeps them. Fix versions from the linked issues are added only for product lines that the LPE's own fix versions don't cover. This way, a backport on a line the LPE didn't track still counts, but the LPE's choice of release on a line it does track is never overridden.
- **An LPE without fix versions of its own** uses the union of the linked issues' fix versions.
- **A disconnected LSV** uses the union of its own fix versions and those of its linked issues.

### Affects versions

The affects versions are the raw `versions` names from the ticket and every issue it links to directly. They aren't normalized.

If an affects version is a milestone, alpha or beta of the 7.0 to 7.4 lines, and the ticket has no fix version on that line, then the line's GA1 is added as a fix version. The bug existed only before GA1, so GA1 counts as the fix.

### Adding the manual entries

Next, the entries from `security_issue_extra_fix_versions.json` and `releases.production` are added to the fix versions. The entries from `security_issue_extra_affects_versions.json` are added to the affects versions. These entries are added as written and aren't normalized.

### Quarterly lines inferred from 7.4.13 updates

Affects versions usually only list the releases that will be patched, so they often skip quarterly lines. `get_baseline_affects_versions` fills them in from the 7.4.13 updates, since each quarterly line was branched from the same code as the 7.4.13 update it's based on (`quarterly_releases` in `releases.py`, for example 2025.Q3 → `7.4.13-u138`):

- The first affected update is the earliest 7.4.13 update in the affects versions of the ticket, the issues it links to directly, and its LSV issues. For example, LPE-19127 only lists `7.4 DXP (7.4.13)`, but its LSV-2089 lists `7.4.13-u92`.
- If the ticket has a 7.4 fix version and the affects versions name no 7.4.13 update, or only `7.4.13-u92` (the baseline of 2023.Q3, the oldest line that is patched), every 7.4.13 update since GA1 is assumed to be affected.
- The fix is the earliest 7.4 fix version. Without one, the issue is assumed to be unfixed on every later line. The latest 7.4 release assumed for a `.x` fix version (such as `7.4.X EE`) doesn't count as a 7.4 fix version here, unless `security_issue_extra_fix_versions.json` names it. Otherwise LPE-18265, with `7.4.X EE` and `2024.Q1.19`, would affect every quarterly line based on an update before `7.4.13-u155`.
- Every quarterly line whose baseline is at or after the first affected update and before the fix is added as an affects version, such as `DXP 2025.Q3`, unless the affects versions already name that line. The added lines are kept in `baseline_affects_versions`.

A quarterly line with a fix version of its own is still decided by that fix (Stage 3). The added lines don't stop a ticket from counting as `master_only`. For a 7.4 target, nothing changes: a 7.4 fix version already makes every earlier 7.4.13 update affected.

### Severity group

The first rule that gives a result decides the group:

1. A `sev-1`, `sev-2` or `sev-3` label on the ticket itself.
2. The `Severity` field (`customfield_10786`) of the ticket's LSV issues: `Critical` → sev-1, `High` → sev-2, and any other value → sev-3. The LSV issues are checked in key order, and the first one with a value wins. They are:
   - the LSV issues linked directly to the ticket;
   - the LSV issues linked to an LPS, LPD or LPSA issue that the ticket links to;
   - for a disconnected LSV, the LSV itself.
3. The `priority` of those same LSV issues: `Critical` → sev-1, `High` → sev-2, and anything else → sev-3.
4. Otherwise, `unknown`.

## Stage 3: Deciding for each target release

`get_target_version_data` runs once for each release in `releases.json`.

### Product lines

`parse_product_line` decides which product line a release name belongs to:

- A quarterly release such as `2025.q1.15` belongs to `2025.Q1`.
- Otherwise, the first of these that appears in the name: `6.1.10`, `6.1.20`, `6.1.30`, `6.2.10`, `6.1`, `6.2`, `7.0`, `7.1`, `7.2`, `7.3`, `7.4`.
- `Master` has no product line.

### Which fixes apply

**Stream fixes** are the ticket's fix versions on the same product line as the target release. For a quarterly target, they must be in the same year and quarter. Fixes on a different quarterly line, or on 7.4, never count for a quarterly target, and the reverse is also true.

**Applicable fixes** are the fixes listed in the output:

- For a non-quarterly target, these are all the stream fixes.
- For a quarterly target, these are only the stream fixes that are later than the target release.

### Whether the ticket affects the target

The first rule that applies decides:

1. **7.0 fixed in GA1:** if the target is on 7.0 and `7.0.10-ga1` is a stream fix, the ticket doesn't affect the target. It was fixed before any DE release.
2. **The ticket has stream fixes:** it affects the target if at least one stream fix is later than the target.
   - On quarterly lines, the patch numbers are compared (`2025.q1.15` is earlier than `2025.q1.16`).
   - On other lines, the update or fix pack numbers are compared (`-uN`, `-fpN`, `-deN`, `-spN`), and GA1 counts as 0. For 6.1 and 6.2, the minor release (for example `6.1.20`) is weighted by ×1000 first.
3. **The ticket has no stream fixes:** this is a heuristic based on the affects versions.
   - It affects the target if any affects version belongs to the target's product line.
   - It also affects every target if all of these are true: the ticket has no fix versions on any line, none of its affects versions names a product line, and one of them is `Master`. Such a ticket is unfixed and was only reported against master, so every line is assumed to be affected. These tickets are flagged as `master_only` in Stage 2 and listed in `security_issue_affects_master_only.json`, so you can check whether each one really affects every line or only the latest release.
4. Otherwise, the ticket doesn't affect the target.

When a ticket affects the target, it's written under its severity group, with its sorted applicable fixes as the value. An empty list means the ticket affects this release and has no known fix on its line.

## Outputs

- **`security_issue_fix_versions.ndjson`** has one line per release in `releases.json`:
  `{"key": "<release>", "value": {"sev-1": {"<ticket>": [<fixes>]}, "sev-2": {...}, "sev-3": {...}, "unknown": {...}}}`
  Tickets are sorted in natural order.
- **`security_issue_empty_fix_versions.json`** lists, for each product line and severity, the tickets with an empty fix list. Only the first release of each product line in `releases.json` is used for this.
- **`security_issue_affects_master_only.json`** lists the tickets that are assumed to affect every release only because `Master` is their only affects version. For each ticket it gives the severity group, the affects versions and the linked LSV keys. Use it to check these tickets by hand. If a ticket only affected the latest release, add its real affects versions or fix versions in Jira, or in `security_issue_extra_affects_versions.json` or `security_issue_extra_fix_versions.json`. It then drops out of this file on the next run.
- **`security_issue_affects_version_gaps.json`** lists tickets whose affects versions are probably incomplete. A ticket is listed when:
  - its affects versions include at least one 7.4 or quarterly version;
  - and they skip one or more product lines in the expected range. The range ends at the newest 7.4 or quarterly line in its affects or fix versions. It starts at 7.4 if the affects versions also include a 6.2, 7.0, 7.1, 7.2 or 7.3 version, and otherwise at the oldest 7.4 or quarterly line in them.

  This usually happens when only the supported releases were listed (for example 7.4, 2024.Q1, 2025.Q1 and 2025.Q4), or only some of the later releases. For example, LPE-19127 lists 7.4, 2024.Q1, 2025.Q1, 2025.Q4, 2026.Q1 and 2026.Q2, so 2023.Q3, 2023.Q4, 2024.Q2 to 2024.Q4, 2025.Q2 and 2025.Q3 are reported as not affected until they are added. For each ticket, the file gives:
  - the severity group;
  - the product lines in its affects versions and fix versions;
  - `missing_lines`, the skipped lines;
  - `unfixed_missing_lines`, the skipped lines that also have no fix. The releases on these lines are currently reported as *not affected*, so they change the output.

  Tickets with `unfixed_missing_lines` are listed first. Lines newer than the newest one mentioned aren't checked, because the fix may have reached master before those lines branched. To correct a ticket, add the missing lines to `security_issue_extra_affects_versions.json`. The values in `missing_lines` can be copied as they are, and the ticket drops out of the file on the next run.
- **`security_issue_lsv_tickets.json`** lists the evaluated tickets linked to each LSV.
- **`security_issue_ticket_fix_versions.json`** lists the fix versions of each ticket linked to an LSV on every release line, including overrides from `security_issue_extra_fix_versions.json`. `lsv_checker.py` uses this file so that a release line with no fix can point to the release on another line that fixes it, since `security_issue_fix_versions.ndjson` only lists the fix versions on each release's own line.
- **`security_issue_lsv_resolving_tickets.json`** lists, for each LSV with more than one ticket, the ticket that resolves the LSV on its own. Usually the other tickets are follow-ups that were fixed later. `lsv_checker.py` uses this file. A ticket resolves the LSV when:
  - the LSV has its own fix versions (`customfield_10978`). Only the release lines of those fix versions are checked, and other lines are ignored;
  - on each of those lines, the ticket is fixed in the LSV's fix version or in an earlier release. A 7.4.13 update counts as a fix in the first release of every quarterly line based on that update or a later one. For example, `7.4.13-u52` counts as a fix in `2024.q1.1`, because 2024.q1 is based on `7.4.13-u112`.

  If several tickets resolve the LSV, the ones fixed in exactly the LSV's fix versions are kept. If several tickets are still left, they are all listed, and `lsv_checker.py` doesn't treat any one of them as resolving the LSV in a hotfix.

  `lsv_checker.py` works out an LSV's affected releases and fix versions from its resolving tickets alone, so its other tickets can't make it affect releases they are outstanding in. This also separates two LSVs that share a development ticket. For example, LPE-18875 is linked to LSV-1250 only through LPD-106203, which is the development ticket for LSV-1850. Once LSV-1250 records `2023.Q3.6`, LPE-17811 resolves it, so LPE-18875 no longer makes it affect every release up to LSV-1850's fixes.

  When a single ticket resolves the LSV, it is necessary and sufficient, and the entry also gives `insufficient_tickets`: the tickets that don't fix the LSV, although they may share its CVE. These are the LSV's other tickets, and the LPS, LPSA, LPD and COMMERCE tickets linked directly to one of them but not to the resolving ticket. For example, LPE-18800 resolves LSV-1793, so `insufficient_tickets` lists LPE-18843 and its LPD-105462. A ticket linked to neither (LPD-105461) is left out, since it is unknown which fix it belongs to. The dashboards in okr-cloud-health-index use this list so that a hotfix with only these tickets doesn't count as fixing the resolving ticket.

  Each entry also gives `fix_versions`, the releases where the LSV stops being affected:
  - on the release lines the LSV has fix versions on, the LSV's own fix versions;
  - on any other line, the resolving ticket's own recorded fix version. For example, LPE-19127 resolves LSV-2089 in `7.4.13-u155`, although LSV-2089 only records `2026.q3.10`. When several tickets are listed, a line is only included if all of them have a fix on it, and the latest of their fixes is used.
- **Debug mode:** `python security_issue_fix_versions.py <TICKET>` writes `security_issue_fix_versions.debug.json` instead. It contains the group and applicable fixes of that one ticket for every release it affects.

## Troubleshooting a missing ticket

1. Check that the ticket is in `security_issue_export/LPE.json`, or `LSV.json` for a disconnected LSV. If it isn't, the export didn't pick it up. It must be linked from a cached LPS, LPSA, LPD or COMMERCE issue that matches the export filters.
2. Run debug mode for the ticket, or check its precomputed `fix_versions` and `affects_versions`. If both are empty, or none of them maps to a product line, the ticket doesn't affect any release.
3. Check whether the fix versions were dropped: an unknown name, `master`, or a version that `add_fix_version` filters out.
