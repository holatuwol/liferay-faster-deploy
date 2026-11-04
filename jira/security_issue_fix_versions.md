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

**`.x` versions** (for example `7.3.x` or `2025.Q1.x`): these mean "fixed on this line, release not yet known". If the issue has no concrete fix version on that product line, the latest release of the line in `releases.json` is used. For quarterly lines that is the highest patch number, and for other lines the highest update or fix pack number.

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
  - its affects versions include at least one 6.2, 7.0, 7.1, 7.2 or 7.3 version;
  - they also include at least one 7.4 or quarterly version;
  - and they skip one or more product lines between 7.4 and the newest 7.4 or quarterly line in its affects or fix versions.

  This usually happens when only the supported releases were listed (for example 7.4, 2024.Q1 and 2025.Q1), or only some of the later releases. For each ticket, the file gives:
  - the severity group;
  - the product lines in its affects versions and fix versions;
  - `missing_lines`, the skipped lines;
  - `unfixed_missing_lines`, the skipped lines that also have no fix. The releases on these lines are currently reported as *not affected*, so they change the output.

  Tickets with `unfixed_missing_lines` are listed first. Lines newer than the newest one mentioned aren't checked, because the fix may have reached master before those lines branched. To correct a ticket, add the missing lines to `security_issue_extra_affects_versions.json`. The values in `missing_lines` can be copied as they are, and the ticket drops out of the file on the next run.
- **Debug mode:** `python security_issue_fix_versions.py <TICKET>` writes `security_issue_fix_versions.debug.json` instead. It contains the group and applicable fixes of that one ticket for every release it affects.

## Troubleshooting a missing ticket

1. Check that the ticket is in `security_issue_export/LPE.json`, or `LSV.json` for a disconnected LSV. If it isn't, the export didn't pick it up. It must be linked from a cached LPS, LPSA, LPD or COMMERCE issue that matches the export filters.
2. Run debug mode for the ticket, or check its precomputed `fix_versions` and `affects_versions`. If both are empty, or none of them maps to a product line, the ticket doesn't affect any release.
3. Check whether the fix versions were dropped: an unknown name, `master`, or a version that `add_fix_version` filters out.
