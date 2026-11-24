var lsvData = null;

var severityOrder = ['Critical', 'High', 'Medium', 'Low', 'None', ''];

var severityLabels = {
	'Critical': 'label-danger',
	'High': 'label-warning',
	'Medium': 'label-primary',
	'Low': 'label-info',
	'None': 'label-default'
};

// Classifications that lsv_checker.py treats as never affecting any release

var notAffectedClassifications = ['Not Exploitable', 'False Positive', 'Ignored'];

var nameFilter = document.getElementById('nameFilter');
var titleFilter = document.getElementById('titleFilter');

// Checkbox value standing in for an issue with no severity, classification, or
// category

var noValueOption = '(none)';

var severityFilter = document.getElementById('severityFilter');
var classificationFilter = document.getElementById('classificationFilter');
var categoryFilter = document.getElementById('categoryFilter');

var attributeFilters = [
	{container: severityFilter, parameter: 'severity', property: 'severity', noValueText: 'No Severity'},
	{container: classificationFilter, parameter: 'classification', property: 'classification', noValueText: 'Unclassified'},
	// PaaS and SaaS run DXP in Docker, so checking either also checks (and
	// disables) DXP and Docker
	{container: categoryFilter, parameter: 'category', property: 'products', noValueText: 'No Category', impliedValues: {
		'PaaS': ['DXP', 'Docker'],
		'SaaS': ['DXP', 'Docker']
	}}
];

// Hides the vulnerabilities that are not published yet (to customers on the
// internal page, or publicly on the public page)

var hideUnpublished = document.getElementById('hideUnpublished');

var versionFilter = document.getElementById('versionFilter');
var versionSearch = document.getElementById('versionSearch');
var versionChips = document.getElementById('versionChips');

// The vulnerabilities and releases in the table, for the Markdown export

var listedResults = {issueKeys: [], versionIndices: []};

// Only the internal page has the hotfix field, since only its data lists each
// vulnerability's LPE tickets

var hotfixTickets = document.getElementById('hotfixTickets');
var hotfixSummary = document.getElementById('hotfixSummary');

// Development ticket (LPD) -> the vulnerability tickets (such as LPE) that it
// is linked to, from the internal page's lsvHotfixDataFile, so that a hotfix's
// tokens can be pasted without looking up its LPE tickets

var hotfixTicketMap = {};

// Vulnerability ticket -> the hotfix tickets entered for it (itself, or the
// development tickets that map to it), set by applyHotfix

var hotfixTicketSources = {};

// URL parameters, read and written the same way as security_utils.js in
// okr-cloud-health-index, so that the page also works when served by Google Apps
// Script (HtmlService), where it runs in a sandboxed iframe and window.location
// and window.history are the iframe's rather than the URL the user sees.

// Top-level URL parameters that app_script/Code.gs (doGet) uses to pick the folder and dashboard.
// The page builds its params from scratch, so these are carried over when writing through
// google.script.history, which replaces the whole top-level query string.
var APPS_SCRIPT_URL_PARAMS = ['dashboard', 'folder'];

/**
 * google.script.history when the page is served by Google Apps Script (HtmlService), else null.
 * There the page runs in a sandboxed iframe, so window.history can't change the URL the user sees.
 */
function getAppsScriptHistory() {
	return ((typeof google !== 'undefined') && google && google.script && google.script.history) ? google.script.history : null;
}

// The top-level location (google.script.url.getLocation), fetched once: only its Apps Script
// parameters and hash are used, and the page never changes those

var appsScriptLocationPromise = null;

function getAppsScriptLocation() {
	if (!appsScriptLocationPromise) {
		appsScriptLocationPromise = new Promise(function(resolve) {
			try {
				google.script.url.getLocation(resolve);
			}
			catch (e) {
				resolve(null);
			}
		});
	}

	return appsScriptLocationPromise;
}

// Writes wait for the location lookup, so they are chained to stay in order

var appsScriptHistoryQueue = Promise.resolve();

// Query parameters of the URL the user sees, under Apps Script: set by initUrlParams, then kept
// current by writeUrlParams and onUrlParamsChange. null when not under Apps Script (or not loaded).

var appsScriptUrlParams = null;

// google.script.url / google.script.history location -> URLSearchParams (parameters holds arrays)
function appsScriptLocationToParams(location) {
	var params = new URLSearchParams();
	var multi = (location && location.parameters) || {};

	Object.keys(multi).forEach(function(key) {
		[].concat(multi[key]).forEach(function(value) { params.append(key, value); });
	});

	return params;
}

/**
 * Loads the query parameters of the URL the user sees, so that readUrlParams can return them.
 * Only needed under Google Apps Script, where they come asynchronously from google.script.url
 * (window.location is the sandboxed iframe's); elsewhere it resolves immediately. The page starts
 * it together with its data fetch and reads the URL after both are done.
 */
async function initUrlParams() {
	if (!getAppsScriptHistory()) {
		return;
	}

	var location = await getAppsScriptLocation();

	if (location) {
		appsScriptUrlParams = appsScriptLocationToParams(location);
	}
}

/**
 * Reads the query parameters of the URL the user sees (under Apps Script, once initUrlParams is done).
 */
function readUrlParams() {
	if (appsScriptUrlParams && getAppsScriptHistory()) {
		return new URLSearchParams(appsScriptUrlParams);
	}

	return new URLSearchParams(window.location.search);
}

/**
 * Calls handler after the user goes back or forward, once readUrlParams returns the new URL's
 * parameters: google.script.history's change handler under Apps Script, popstate elsewhere.
 */
function onUrlParamsChange(handler) {
	var appsScriptHistory = getAppsScriptHistory();

	if (appsScriptHistory && (typeof appsScriptHistory.setChangeHandler === 'function')) {
		appsScriptHistory.setChangeHandler(function(e) {
			appsScriptUrlParams = appsScriptLocationToParams(e && e.location);
			handler();
		});

		return;
	}

	window.addEventListener('popstate', handler);
}

/**
 * Replaces the current page's query string without reloading, keeping the path and hash.
 * The page builds params from scratch, so parameters left at their defaults are simply omitted.
 * Under Google Apps Script this goes through google.script.history (asynchronously, keeping the
 * top-level dashboard/folder parameters and hash); otherwise through window.history.
 */
function writeUrlParams(params, pushState) {
	var appsScriptHistory = getAppsScriptHistory();

	if (appsScriptHistory) {
		// google.script.history takes { key: value or [values] }

		var query = {};

		params.forEach(function(value, key) {
			query[key] = Object.prototype.hasOwnProperty.call(query, key) ? [].concat(query[key], value) : value;
		});

		appsScriptHistoryQueue = appsScriptHistoryQueue
			.then(getAppsScriptLocation)
			.then(function(location) {
				var topParams = (location && location.parameter) || {};

				APPS_SCRIPT_URL_PARAMS.forEach(function(key) {
					if ((topParams[key] !== undefined) && !Object.prototype.hasOwnProperty.call(query, key)) {
						query[key] = topParams[key];
					}
				});

				appsScriptHistory[pushState ? 'push' : 'replace']({}, query, (location && location.hash) || '');
				appsScriptUrlParams = appsScriptLocationToParams({parameters: query});
			})
			.catch(function() {});

		return;
	}

	var qs = params.toString();
	var target = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;

	try {
		window.history[pushState ? 'pushState' : 'replaceState']({}, '', target);
	}
	catch (e) {
	}
}

function getParameter(name) {
	return readUrlParams().get(name) || '';
}

/**
 * Returns every value of a URL parameter that is repeated for each value, such
 * as the title filter phrases, which can contain commas.
 */
function getRepeatedParameterValues(name) {
	return readUrlParams().getAll(name).filter(function(value) { return value; });
}

/**
 * Returns the comma-separated values of a URL parameter.
 */
function getParameterValues(name) {
	var value = getParameter(name);

	return value ? value.split(',') : [];
}

function escapeHtml(str) {
	return String(str || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Returns the release line for a version, which is the quarter for quarterly
 * releases (e.g. '2025.q1.10' -> '2025.q1') and the major and minor version
 * otherwise (e.g. '7.4.13-u92' -> '7.4').
 */
function getReleaseLine(version) {
	var quarterMatch = /^(\d{4}\.q[1-4])/.exec(version);

	if (quarterMatch) {
		return quarterMatch[1];
	}

	var versionMatch = /^(\d+\.\d+)/.exec(version);

	return versionMatch ? versionMatch[1] : version;
}

/**
 * Returns the values of the issue for a filter as an array, since an issue has
 * one severity and classification but can have several categories.
 */
function getIssueValues(issue, property) {
	var value = issue[property];
	var values = Array.isArray(value) ? value : [value];

	values = values.filter(function(x) { return x; });

	return (values.length > 0) ? values : [noValueOption];
}

/**
 * Checks and disables the values implied by the checked values (such as DXP and
 * Docker for PaaS), remembering whether each was checked before, and restores
 * values that are no longer implied.
 */
function applyImpliedValues(attributeFilter) {
	if (!attributeFilter.impliedValues) {
		return;
	}

	var checkboxes = Array.from(attributeFilter.container.querySelectorAll('input'));

	var implied = new Set();

	checkboxes.forEach(function(checkbox) {
		if (checkbox.checked && !checkbox.disabled) {
			(attributeFilter.impliedValues[checkbox.value] || []).forEach(function(value) { implied.add(value); });
		}
	});

	checkboxes.forEach(function(checkbox) {
		if (implied.has(checkbox.value)) {
			if (!checkbox.disabled) {
				checkbox.dataset.wasChecked = checkbox.checked;
				checkbox.checked = true;
				checkbox.disabled = true;
			}
		}
		else if (checkbox.disabled) {
			checkbox.checked = (checkbox.dataset.wasChecked == 'true');
			checkbox.disabled = false;
			delete checkbox.dataset.wasChecked;
		}
	});
}

/**
 * Returns the checked values that were checked by the user, rather than implied
 * by another checked value, for the URL.
 */
function getExplicitValues(attributeFilter) {
	return Array.from(attributeFilter.container.querySelectorAll('input:checked:not(:disabled)')).map(function(checkbox) { return checkbox.value; });
}

function getSelectedValues(attributeFilter) {
	return Array.from(attributeFilter.container.querySelectorAll('input:checked')).map(function(checkbox) { return checkbox.value; });
}

/**
 * Returns whether the issue matches the values chosen in each severity and
 * classification filter, where choosing nothing matches every issue.
 */
function isMatchingAttributes(issue) {
	return attributeFilters.every(function(attributeFilter) {
		var values = getSelectedValues(attributeFilter);

		return (values.length == 0) || getIssueValues(issue, attributeFilter.property).some(function(value) {
			return values.indexOf(value) != -1;
		});
	});
}

function getIssueNumber(issueKey) {
	return parseInt(issueKey.substring(issueKey.indexOf('-') + 1));
}

/**
 * Returns the identifier filter text on one line, separated by spaces, so that a
 * bookmark fills the filter compactly.
 */
function getCompactNameFilter(value) {
	return value.split(/[\s,;]+/).filter(function(token) { return token; }).join(' ');
}

/**
 * Returns the CVE and LSV identifiers in the identifier filter (which select
 * those specific vulnerabilities, even when the checked releases are not
 * affected by them), along with any other text in it, which is most likely an
 * identifier that is mistyped or that this page does not know (such as a GHSA
 * one), so that it can be reported.
 */
function parseNameFilter(value) {
	var identifiers = [];
	var unrecognized = [];

	value.split(/[\s,;]+/).forEach(function(token) {
		if (!token) {
			return;
		}

		var text = token.replace(/(?:CVE|PRISMA)-\d{4}-\d+|LSV-\d+/gi, function(match) {
			identifiers.push(match.toUpperCase());
			return ' ';
		}).trim();

		// Ignore what only punctuation is left of, such as the parentheses
		// around an identifier

		if (/[a-z0-9]/i.test(text)) {
			unrecognized.push(text);
		}
	});

	return {
		identifiers: identifiers.filter(isFirstIgnoringCase),
		unrecognized: unrecognized.filter(isFirstIgnoringCase)
	};
}

/**
 * Returns the phrases in the title filter, one per line, which each list the
 * vulnerabilities with that text in their identifier, title, or details (when
 * the page's data has details).
 */
function parseTitleFilter(value) {
	return value.split('\n').map(function(phrase) {
		return phrase.replace(/\s+/g, ' ').trim();
	}).filter(function(phrase) { return phrase; }).filter(isFirstIgnoringCase);
}

function isFirstIgnoringCase(x, i, array) {
	return array.findIndex(function(y) { return y.toLowerCase() == x.toLowerCase(); }) == i;
}

/**
 * Returns the tickets entered in the hotfix field (LPE tickets, and development
 * tickets such as LPD-12345 that lsvHotfixDataFile maps to them), in the order
 * entered.
 */
function parseHotfixTickets(value) {
	var keys = (value.match(/\b(?:LPE|LPD|LPS|LPSA|COMMERCE)-\d+\b/gi) || []).map(function(key) { return key.toUpperCase(); });

	return keys.filter(function(key, i) { return keys.indexOf(key) == i; });
}

/**
 * Returns the tickets entered in the hotfix field, or none if the page has no
 * hotfix field.
 */
function getHotfixKeys() {
	return hotfixTickets ? parseHotfixTickets(hotfixTickets.value) : [];
}

/**
 * Returns the text of a vulnerability's details (HTML), in lower case, for the
 * title filter, or an empty string if the page's data has no details for it.
 */
function getDescriptionText(description) {
	if (!description) {
		return '';
	}

	// A parsed document that is not attached to the page does not load images
	// or run scripts

	var doc = new DOMParser().parseFromString(description, 'text/html');

	return (doc.body.textContent || '').replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Sets issue.allAffected (version index -> fix versions) for each vulnerability
 * from its affected versions, which lsv_checker.py has already combined across
 * the vulnerability's tickets.
 */
function initAffected() {
	for (var issueKey in lsvData.issues) {
		var issue = lsvData.issues[issueKey];

		// The public page's data has no descriptions or tickets, and only lists
		// the CVEs, severity, classification, and categories of a vulnerability
		// that has not been made public yet, so fill in empty details

		issue.title = issue.title || issue.cves.join(', ') || issueKey;
		issue.severity = issue.severity || '';
		issue.classification = issue.classification || '';
		issue.products = issue.products || [];
		issue.published = issue.published || '';
		issue.unpublished = !!issue.unpublished;
		issue.learnUnlisted = !!issue.learnUnlisted;
		issue.cveReserved = !!issue.cveReserved;
		// An advisory is a single URL, or for the public page's vulnerabilities
		// with advisories on liferay.dev, a list of URLs

		issue.advisories = [].concat(issue.advisory || []);
		issue.description = issue.description || '';
		issue.descriptionText = getDescriptionText(issue.description);
		issue.tickets = issue.tickets || [];
		issue.fixedBy = issue.fixedBy || [];

		issue.allAffected = {};

		for (var versionIndex in issue.affected) {
			issue.allAffected[versionIndex] = lsvData.fixLists[issue.affected[versionIndex]];
		}
	}
}

/**
 * Returns the tickets of a vulnerability that are still outstanding in the
 * version at the given index. Only the customer page's data has tickets, and it
 * only records which versions each ticket affects (issue.ticketVersions) when a
 * vulnerability has more than one ticket.
 */
function getOutstandingTickets(issue, versionIndex) {
	if (!issue.ticketVersions) {
		return issue.tickets;
	}

	return issue.tickets.filter(function(ticketKey) {
		return issue.ticketVersions[ticketKey].indexOf(parseInt(versionIndex)) != -1;
	});
}

/**
 * A hotfix fixes a vulnerability in a version if it includes every ticket that
 * is still outstanding in that version, or one of the tickets that resolve the
 * vulnerability on their own (issue.resolvedBy), in the versions they resolve
 * it in (issue.resolvedIn).
 * Sets issue.affected (version index -> fix versions) with the hotfix applied
 * (issue.allAffected is without it), and issue.hotfixFixed (version index -> the
 * hotfix tickets that fix it there), and issue.hotfixMatched (whether any hotfix
 * ticket belongs to it). Returns the hotfix tickets that belong to
 * any vulnerability.
 */
function applyHotfix(hotfixKeys) {
	var matchedKeys = new Set();

	// A development ticket stands in for the vulnerability tickets it maps to

	hotfixTicketSources = {};

	hotfixKeys.forEach(function(hotfixKey) {
		[hotfixKey].concat(hotfixTicketMap[hotfixKey] || []).forEach(function(ticketKey) {
			(hotfixTicketSources[ticketKey] = hotfixTicketSources[ticketKey] || []).push(hotfixKey);
		});
	});

	var inHotfix = function(ticketKey) { return hotfixTicketSources[ticketKey] !== undefined; };

	for (var issueKey in lsvData.issues) {
		var issue = lsvData.issues[issueKey];

		issue.tickets.filter(inHotfix).forEach(function(ticketKey) {
			hotfixTicketSources[ticketKey].forEach(function(hotfixKey) { matchedKeys.add(hotfixKey); });
		});

		var resolvingKeys = (issue.resolvedBy || []).filter(inHotfix);

		issue.hotfixMatched = issue.tickets.some(inHotfix) || (resolvingKeys.length > 0);

		issue.affected = {};
		issue.hotfixFixed = {};

		for (var versionIndex in issue.allAffected) {
			var outstandingKeys = getOutstandingTickets(issue, versionIndex);

			if ((resolvingKeys.length > 0) && (issue.resolvedIn.indexOf(parseInt(versionIndex)) != -1)) {
				issue.hotfixFixed[versionIndex] = resolvingKeys;
			}
			else if ((outstandingKeys.length > 0) && outstandingKeys.every(inHotfix)) {
				issue.hotfixFixed[versionIndex] = outstandingKeys;
			}
			else {
				issue.affected[versionIndex] = issue.allAffected[versionIndex];
			}
		}
	}

	return matchedKeys;
}

function updateHotfixSummary(hotfixKeys, matchedKeys) {
	if (!hotfixSummary) {
		return;
	}

	if (hotfixKeys.length == 0) {
		hotfixSummary.textContent = '';
		return;
	}

	var unmatchedKeys = hotfixKeys.filter(function(key) { return !matchedKeys.has(key); });

	hotfixSummary.textContent = hotfixKeys.length + ((hotfixKeys.length == 1) ? ' ticket' : ' tickets') + ', ' +
		matchedKeys.size + ' related to a published vulnerability' +
		((unmatchedKeys.length > 0) && (unmatchedKeys.length <= 10) ? ' (not related: ' + unmatchedKeys.join(', ') + ')' : '');
}

/**
 * Returns HTML for a vulnerability ticket that the hotfix includes, linking to
 * the ticket, with the tickets entered for it (itself, or the development
 * tickets that map to it) as the link's title.
 */
function getHotfixTicketHtml(ticketKey) {
	var hotfixKeys = hotfixTicketSources[ticketKey] || [ticketKey];

	return '<a href="https://issues.liferay.com/browse/' + encodeURIComponent(ticketKey) + '" target="_blank" rel="noopener" title="' +
		escapeHtml(hotfixKeys.join(', ')) + '"><span class="lsv-id">' + escapeHtml(ticketKey) + '</span></a>';
}

/**
 * Returns HTML explaining why a vulnerability does not affect the version at the given index,
 * using the release order of lsvData.versions to find the first release in the
 * same release line that no longer has the vulnerability. Releases are compared
 * without the hotfix, which only explains the releases that it alone fixes.
 */
function getNotAffectedReason(issue, versionIndex) {
	if (notAffectedClassifications.indexOf(issue.classification) != -1) {
		return escapeHtml(issue.classification);
	}

	if (issue.hotfixFixed[versionIndex] !== undefined) {
		return 'fixed by hotfix (' + issue.hotfixFixed[versionIndex].map(getHotfixTicketHtml).join(', ') + ')';
	}

	var versions = lsvData.versions;
	var releaseLine = getReleaseLine(versions[versionIndex]);

	for (var i = versionIndex - 1; i >= 0; i--) {
		if (getReleaseLine(versions[i]) != releaseLine) {
			continue;
		}

		if (issue.allAffected[i] !== undefined) {
			for (var j = i + 1; j <= versionIndex; j++) {
				if (getReleaseLine(versions[j]) == releaseLine) {
					return 'fixed in ' + getVersionHtml(versions[j]);
				}
			}
		}
	}

	for (var i = versionIndex + 1; i < versions.length; i++) {
		if ((getReleaseLine(versions[i]) == releaseLine) && (issue.allAffected[i] !== undefined)) {
			return 'introduced in a later release';
		}
	}

	for (var key in issue.allAffected) {
		return 'does not affect ' + getVersionHtml(releaseLine);
	}

	return 'no affected releases recorded';
}

function getVersionHtml(version) {
	return '<span class="lsv-id">' + escapeHtml(version) + '</span>';
}

/**
 * Returns the number of the earliest 7.4.13 update with the fix, among fix
 * versions that are a 7.4.13 update or the first release of a quarterly release
 * line (which has the fix of the 7.4.13 update that the line is based on, such
 * as 7.4.13-u143 for 2025.q4.0), or Infinity if there is none.
 */
function getFirstFixedUpdate(fixVersions) {
	var quarterlyBaselines = lsvData.quarterlyBaselines || {};
	var firstFixedUpdate = Infinity;

	for (var update in quarterlyBaselines) {
		var updateNumber = parseInt(update.substring(update.lastIndexOf('-u') + 2));

		if (fixVersions.has(update) || fixVersions.has(quarterlyBaselines[update])) {
			firstFixedUpdate = Math.min(firstFixedUpdate, updateNumber);
		}
	}

	fixVersions.forEach(function(fixVersion) {
		var updateMatch = /^7\.4\.13-u(\d+)$/.exec(fixVersion);

		if (updateMatch) {
			firstFixedUpdate = Math.min(firstFixedUpdate, parseInt(updateMatch[1]));
		}
	});

	return firstFixedUpdate;
}

/**
 * Returns the release that has the fix in a release line, which is its own fix
 * version on that line if it has one, or else the first release of a quarterly
 * release line based on a 7.4.13 update at or after the first fixed update (see
 * getFirstFixedUpdate), since each quarterly release line is branched from the
 * 7.4.13 update it is based on.
 */
function getLineFixVersion(releaseLine, orderedFixVersions, firstFixedUpdate) {
	var lineFixVersion = orderedFixVersions.find(function(version) { return getReleaseLine(version) == releaseLine; });

	if (lineFixVersion) {
		return lineFixVersion;
	}

	var quarterlyBaselines = lsvData.quarterlyBaselines || {};

	for (var update in quarterlyBaselines) {
		var firstRelease = quarterlyBaselines[update];

		if ((getReleaseLine(firstRelease) == releaseLine) && (parseInt(update.substring(update.lastIndexOf('-u') + 2)) >= firstFixedUpdate)) {
			return firstRelease;
		}
	}

	return null;
}

/**
 * Returns HTML naming where a vulnerability is fixed outside the release line of
 * the version at the given index, which has no fix:
 *
 * - the fix in the next LTS (.q1) release line after it that has one (such as
 *   2026.q1 rather than 2024.q1 or 2025.q1 for 2025.q3), including an LTS
 *   release line that has the fix from the start because an earlier quarterly
 *   release line was fixed in its first release (such as 2026.q1.0 when
 *   2025.q4.0 has the fix), since a customer can only upgrade to an LTS release
 * - or if no later LTS release line has it, the fix in the next release line
 *   after it that has one
 * - or if no later release line has it, the first release with the fix at all
 *
 * Fix versions come from the vulnerability's fix versions on every release line
 * (issue.fixVersions), as well as those of every affected release (without the
 * hotfix), and lsvData.versions gives their order, which lists release lines in
 * order. A fix in the 7.4.13 update that a quarterly release line is based on
 * (such as 7.4.13-u155 for 2026.q4) is named by that line's first release
 * (lsvData.quarterlyBaselines).
 */
function getOtherFixHtml(issue, versionIndex) {
	var quarterlyBaselines = lsvData.quarterlyBaselines || {};
	var fixVersions = new Set(issue.fixVersions || []);

	for (var affectedIndex in issue.allAffected) {
		issue.allAffected[affectedIndex].forEach(function(fixVersion) { fixVersions.add(fixVersion); });
	}

	var orderedFixVersions = lsvData.versions.filter(function(version) { return fixVersions.has(version); });

	if (orderedFixVersions.length == 0) {
		return 'fix version undocumented';
	}

	var releaseLine = getReleaseLine(lsvData.versions[versionIndex]);

	var laterLines = [];

	lsvData.versions.forEach(function(version, index) {
		var versionLine = getReleaseLine(version);

		if ((index > versionIndex) && (versionLine != releaseLine) && (laterLines.indexOf(versionLine) == -1)) {
			laterLines.push(versionLine);
		}
	});

	var firstFixedUpdate = getFirstFixedUpdate(fixVersions);

	for (var i = 0; i < laterLines.length; i++) {
		if (!/^\d{4}\.q1$/.test(laterLines[i])) {
			continue;
		}

		var ltsFixVersion = getLineFixVersion(laterLines[i], orderedFixVersions, firstFixedUpdate);

		if (ltsFixVersion) {
			return 'LTS fix in ' + getVersionHtml(ltsFixVersion);
		}
	}

	var laterFixVersion = lsvData.versions.find(function(version, index) {
		return (index > versionIndex) && (getReleaseLine(version) != releaseLine) && orderedFixVersions.some(function(fixVersion) {
			return (fixVersion == version) || (quarterlyBaselines[fixVersion] == version);
		});
	});

	if (laterFixVersion) {
		return 'fixed in ' + getVersionHtml(laterFixVersion);
	}

	var firstFixVersion = orderedFixVersions[0];

	return 'first fixed in ' + getVersionHtml(quarterlyBaselines[firstFixVersion] || firstFixVersion);
}

function getStatusHtml(issue, versionIndex) {
	var fixVersions = issue.affected[versionIndex];

	// A vulnerability that the hotfix fixes in this release is patched rather
	// than not affected

	if (fixVersions === undefined) {
		var statusText = (issue.hotfixFixed[versionIndex] !== undefined) ? 'Patched' : 'Not affected';

		return '<span class="label label-success">' + statusText + '</span> <span class="lsv-status-text">' + getNotAffectedReason(issue, versionIndex) + '</span>';
	}

	// No release in this release line has the fix yet (e.g. "not fixed in 2025.q1")

	if (fixVersions.length == 0) {
		return '<span class="label label-danger">Affected</span> <span class="lsv-fix-versions lsv-status-text">not fixed in ' +
			getVersionHtml(getReleaseLine(lsvData.versions[versionIndex])) + '; ' + getOtherFixHtml(issue, versionIndex) + '</span>';
	}

	return '<span class="label label-danger">Affected</span> <span class="lsv-fix-versions lsv-status-text">fixed in ' + fixVersions.map(getVersionHtml).join(', ') + '</span>';
}

/**
 * Returns the HTML for a vulnerability's identifier, followed (on the customer
 * page, whose data has tickets) by the LPE tickets that fix it.
 */
/**
 * Returns the URL for a vulnerability, which is its page on learn.liferay.com
 * once its customer publication date has passed (even if it is not public
 * yet). learn.liferay.com does not list any other vulnerability, so link to its
 * advisory on liferay.dev (issue.lsvUrl) instead, or if it has none, to its
 * Jira ticket.
 */
function getLsvUrl(issueKey, issue) {
	if (!issue.learnUnlisted) {
		return 'https://learn.liferay.com/security-vulnerabilities#/' + issueKey;
	}

	return issue.lsvUrl || ('https://liferay.atlassian.net/browse/' + issueKey);
}

function getLsvHtml(issueKey, issue) {
	var html = '<a class="lsv-id" href="' + getLsvUrl(issueKey, issue) + '" target="_blank" rel="noopener">' + issueKey + '</a>';

	if (issue.fixedBy.length > 0) {
		html += '<span class="lsv-fixed-by" title="Fixed by">' + issue.fixedBy.map(function(ticketKey) {
			return '<a class="lsv-id" href="https://liferay.atlassian.net/browse/' + ticketKey + '" target="_blank" rel="noopener">' + ticketKey + '</a>';
		}).join('<br>') + '</span>';
	}

	return html;
}

function getCvesHtml(issue) {
	return '<span class="lsv-cves">' + issue.cves.map(function(cve) {
		if (cve.indexOf('CVE-') != 0) {
			return '<span class="lsv-id">' + escapeHtml(cve) + '</span>';
		}

		// A confirmed vulnerability that is not public yet has reserved CVEs,
		// which have no NVD page yet

		if (issue.cveReserved) {
			return '<span class="lsv-id">' + escapeHtml(cve) + ' ' +
				'<span class="lsv-reserved" role="img" aria-label="Reserved CVE, not published yet" title="Reserved CVE, not published yet">&#x1F4C5;</span></span>';
		}

		return '<a class="lsv-id" href="https://nvd.nist.gov/vuln/detail/' + cve + '" target="_blank" rel="noopener">' + cve + '</a>';
	}).join('<br>') + '</span>';
}

/**
 * Returns what to call a link to an advisory: liferay.dev if it is on
 * liferay.dev, and otherwise an advisory (such as a customer-facing article on
 * help.liferay.com).
 */
function getAdvisoryLabel(advisory) {
	return /^https:\/\/liferay\.dev[:\/]/.test(advisory) ? 'liferay.dev' : 'Advisory';
}

/**
 * Returns the HTML for a title, showing the text between backticks (such as
 * `backURL`) as code.
 */
function getTitleTextHtml(title) {
	return escapeHtml(title).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function getTitleHtml(issueKey, issue) {
	var html = '<span class="lsv-title">' + getTitleTextHtml(issue.title) + '</span>';

	issue.advisories.forEach(function(advisory) {
		html += ' <a href="' + escapeHtml(advisory) + '" target="_blank" rel="noopener">(' + getAdvisoryLabel(advisory).toLowerCase() + ')</a>';
	});

	if (issue.description) {
		html += ' <a class="lsv-toggle" data-issue-key="' + issueKey + '">(details)</a>';
	}

	return html;
}

function getSeverityHtml(issue) {
	if (!issue.severity) {
		return '';
	}

	return '<span class="label ' + (severityLabels[issue.severity] || 'label-default') + '">' + escapeHtml(issue.severity) + '</span>';
}

function getClassificationHtml(issue) {
	return '<span class="lsv-classification">' + escapeHtml(issue.classification) + '</span>';
}

function getCategoryHtml(issue) {
	return '<span class="lsv-category">' + issue.products.map(escapeHtml).join('<br>') + '</span>';
}

/**
 * Returns what a vulnerability that is not published yet has not been published
 * to, which depends on the page's data.
 */
function getUnpublishedTitle() {
	return (lsvData.audience == 'public') ? 'Not published publicly yet' : 'Not published to customers yet';
}

function getPublishedHtml(issue) {
	var html = '<span class="lsv-published">' + escapeHtml(issue.published) + '</span>';

	if (issue.unpublished) {
		html += (issue.published ? '<br>' : '') +
			'<span class="label label-default lsv-unpublished" title="' + escapeHtml(getUnpublishedTitle()) + '">Unpublished</span>';
	}

	return html;
}

function compareIssues(a, b) {
	var x1 = severityOrder.indexOf(lsvData.issues[a].severity);
	var x2 = severityOrder.indexOf(lsvData.issues[b].severity);

	if (x1 != x2) {
		return x1 - x2;
	}

	return getIssueNumber(b) - getIssueNumber(a);
}

// The column the table is sorted by (null for the default order, by severity and
// then newest first), as the sort URL parameter: lsv, severity, classification,
// published, or status:<release> for a status column, prefixed with - when the
// order is reversed

var sortColumn = null;
var sortDescending = false;

/**
 * Returns how fixed a vulnerability is in a release, for sorting a status column:
 * affected with no fix in that release line, then affected with a fix in a later
 * release, then not affected.
 */
function getFixedRank(issue, versionIndex) {
	var fixVersions = issue.affected[versionIndex];

	if (fixVersions === undefined) {
		return 2;
	}

	return (fixVersions.length == 0) ? 0 : 1;
}

function compareText(x1, x2) {
	// Issues without a value sort last either way, as with the default order

	if (!x1 != !x2) {
		return !x1 ? 1 : -1;
	}

	return x1.localeCompare(x2);
}

/**
 * Returns a comparator for the given sort column, or null if the column cannot be
 * sorted by (such as a status column for a release that is no longer checked).
 * Each column's order is its most useful one (newest LSVs and publication dates
 * first, most severe first, alphabetical classifications, and least fixed first),
 * reversed when sortDescending is set, with ties in the default order.
 */
function getColumnComparator(column, versionIndices) {
	var compareValues = null;

	if (column == 'lsv') {
		compareValues = function(a, b) { return getIssueNumber(b) - getIssueNumber(a); };
	}
	else if (column == 'severity') {
		compareValues = function(a, b) {
			return severityOrder.indexOf(lsvData.issues[a].severity) - severityOrder.indexOf(lsvData.issues[b].severity);
		};
	}
	else if (column == 'classification') {
		compareValues = function(a, b) { return compareText(lsvData.issues[a].classification, lsvData.issues[b].classification); };
	}
	else if (column == 'published') {
		compareValues = function(a, b) {
			var x1 = lsvData.issues[a].published;
			var x2 = lsvData.issues[b].published;

			return (!x1 != !x2) ? compareText(x1, x2) : compareText(x2, x1);
		};
	}
	else if (column && column.startsWith('status:')) {
		var versionIndex = lsvData.versions.indexOf(column.substring('status:'.length));

		if (versionIndices.indexOf(versionIndex) == -1) {
			return null;
		}

		compareValues = function(a, b) {
			return getFixedRank(lsvData.issues[a], versionIndex) - getFixedRank(lsvData.issues[b], versionIndex);
		};
	}

	if (!compareValues) {
		return null;
	}

	return function(a, b) {
		var result = compareValues(a, b);

		if (result != 0) {
			return sortDescending ? -result : result;
		}

		return compareIssues(a, b);
	};
}

function getSortParameter() {
	return sortColumn ? ((sortDescending ? '-' : '') + sortColumn) : '';
}

function setSortParameter(value) {
	sortDescending = value.startsWith('-');
	sortColumn = (sortDescending ? value.substring(1) : value) || null;
}

/**
 * Sorts by the clicked column, or reverses the order if the table is already
 * sorted by it.
 */
function sortByColumn(column) {
	if (sortColumn == column) {
		sortDescending = !sortDescending;
	}
	else {
		sortColumn = column;
		sortDescending = false;
	}

	checkLsvInfoWithHistory();
}

/**
 * Marks the sortable column headers (those with a data-sort attribute) with the
 * current sort order.
 */
function updateSortIndicators(activeColumn) {
	document.querySelectorAll('#columnHeaders th[data-sort]').forEach(function(cell) {
		var active = cell.getAttribute('data-sort') == activeColumn;

		cell.classList.add('lsv-sortable');
		cell.tabIndex = 0;

		if (active) {
			cell.setAttribute('aria-sort', sortDescending ? 'descending' : 'ascending');
		}
		else {
			cell.removeAttribute('aria-sort');
		}

		var indicator = cell.querySelector('.lsv-sort-indicator');

		if (!indicator) {
			indicator = document.createElement('span');
			indicator.className = 'lsv-sort-indicator';
			cell.appendChild(indicator);
		}

		indicator.textContent = active ? (sortDescending ? ' \u25B2' : ' \u25BC') : '';
	});
}

/**
 * Returns the indices (into lsvData.versions) of the checked releases, in
 * release order.
 */
function getSelectedVersionIndices() {
	return Array.from(versionFilter.querySelectorAll('input:checked')).map(function(checkbox) {
		return parseInt(checkbox.value);
	}).sort(function(a, b) { return a - b; });
}

function updateURL(versionIndices, pushState) {
	var params = new URLSearchParams();

	if (versionIndices.length > 0) {
		params.set('releases', versionIndices.map(function(i) { return lsvData.versions[i]; }).join(','));
	}

	var compactNameFilter = getCompactNameFilter(nameFilter.value);

	if (compactNameFilter) {
		params.set('nameFilter', compactNameFilter);
	}

	parseTitleFilter(titleFilter.value).forEach(function(phrase) {
		params.append('titleFilter', phrase);
	});

	var hotfixKeys = getHotfixKeys();

	if (hotfixKeys.length > 0) {
		params.set('hotfix', hotfixKeys.join(','));
	}

	attributeFilters.forEach(function(attributeFilter) {
		var values = getExplicitValues(attributeFilter);

		if (values.length > 0) {
			params.set(attributeFilter.parameter, values.join(','));
		}
	});

	// Unpublished vulnerabilities are hidden by default, so the URL only
	// records when they are shown

	if (hideUnpublished && !hideUnpublished.checked) {
		params.set('showUnpublished', 'true');
	}

	if (sortColumn) {
		params.set('sort', getSortParameter());
	}

	writeUrlParams(params, pushState);
}

// Whether the next update adds a history entry: checking or unchecking a release
// or filter does, so that back and forward step through those changes, while
// typing in the filter or hotfix fields only replaces the current entry

var pushNextUpdate = false;

function checkLsvInfoWithHistory() {
	pushNextUpdate = true;
	checkLsvInfo();
}

/**
 * Grows a filter textarea to fit its text in browsers that do not support the
 * CSS field-sizing property (the CSS minimum height keeps it at two rows).
 */
function fitTextarea(textarea) {
	if (window.CSS && CSS.supports('field-sizing', 'content')) {
		return;
	}

	textarea.style.height = 'auto';
	textarea.style.height = (textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight) + 'px';
}

/**
 * Sets the fields, releases, and filters from the URL, on page load and after the
 * user goes back or forward.
 */
function applyUrlParameters() {
	nameFilter.value = getParameter('nameFilter');
	titleFilter.value = getRepeatedParameterValues('titleFilter').join('\n');
	fitTextarea(nameFilter);
	fitTextarea(titleFilter);
	if (hotfixTickets) {
		hotfixTickets.value = getParameterValues('hotfix').join('\n');
	}

	if (hideUnpublished) {
		hideUnpublished.checked = (getParameter('showUnpublished') != 'true');
	}

	setSortParameter(getParameter('sort'));

	var versions = getParameterValues('releases');

	versionFilter.querySelectorAll('input').forEach(function(checkbox) {
		checkbox.checked = versions.indexOf(lsvData.versions[parseInt(checkbox.value)]) != -1;
	});

	updateVersionChips();

	attributeFilters.forEach(function(attributeFilter) {
		var values = getParameterValues(attributeFilter.parameter);

		attributeFilter.container.querySelectorAll('input').forEach(function(checkbox) {
			checkbox.checked = values.indexOf(checkbox.value) != -1;
			checkbox.disabled = false;
			delete checkbox.dataset.wasChecked;
		});

		applyImpliedValues(attributeFilter);

		attributeFilter.updateClearLink();
	});
}

/**
 * Whether the hotfix fixes the vulnerability in the version at the given index
 * (it would otherwise affect that version).
 */
function isFixedByHotfix(issueKey, versionIndex) {
	var hotfixFixed = lsvData.issues[issueKey].hotfixFixed;

	return (hotfixFixed !== undefined) && (hotfixFixed[versionIndex] !== undefined);
}

function isAffected(issueKey, versionIndex) {
	return lsvData.issues[issueKey].affected[versionIndex] !== undefined;
}

function getVulnerabilityCountText(count) {
	return count + ((count == 1) ? ' published security vulnerability' : ' published security vulnerabilities');
}

function updateCounts(issueKeys, versionIndices) {
	var totalCount = Object.keys(lsvData.issues).length;

	var text = (issueKeys.length == totalCount) ?
		'Listing all ' + getVulnerabilityCountText(totalCount) + '.' :
		'Listing ' + issueKeys.length + ' of ' + getVulnerabilityCountText(totalCount) + '.';

	if (versionIndices.length > 0) {
		text += ' Of those listed, ' + versionIndices.map(function(versionIndex) {
			var count = issueKeys.filter(function(issueKey) { return isAffected(issueKey, versionIndex); }).length;
			var hotfixCount = issueKeys.filter(function(issueKey) { return isFixedByHotfix(issueKey, versionIndex); }).length;

			return count + ((count == 1) ? ' affects ' : ' affect ') + lsvData.versions[versionIndex] +
				((hotfixCount > 0) ? ' (' + hotfixCount + ' more patched by the hotfix)' : '');
		}).join(', ') + '.';
	}

	document.getElementById('counts').textContent = text;
}

/**
 * Rebuilds the column headers so that there is one status column for each
 * checked release, and returns the total number of columns.
 */
function updateColumnHeaders(versionIndices) {
	var headerRow = document.getElementById('columnHeaders');

	headerRow.querySelectorAll('.lsv-status-header').forEach(function(cell) { cell.remove(); });

	versionIndices.forEach(function(versionIndex) {
		var cell = document.createElement('th');
		cell.className = 'lsv-status-header';
		cell.setAttribute('data-sort', 'status:' + lsvData.versions[versionIndex]);
		cell.title = 'Sort by whether ' + lsvData.versions[versionIndex] + ' is fixed';
		cell.innerHTML = 'Status in ' + getVersionHtml(lsvData.versions[versionIndex]);
		headerRow.appendChild(cell);
	});

	var columnCount = headerRow.children.length;

	document.getElementById('nameFilterHeader').setAttribute('colspan', columnCount);

	return columnCount;
}

function checkLsvInfo() {
	var hotfixKeys = getHotfixKeys();

	updateHotfixSummary(hotfixKeys, applyHotfix(hotfixKeys));

	var versionIndices = getSelectedVersionIndices();

	updateURL(versionIndices, pushNextUpdate);

	pushNextUpdate = false;

	var columnCount = updateColumnHeaders(versionIndices);

	var filter = parseNameFilter(nameFilter.value);
	var phrases = parseTitleFilter(titleFilter.value);

	var isMatchingTerm = function(issueKey, term) {
		var issue = lsvData.issues[issueKey];

		term = term.toLowerCase();

		return (issueKey.toLowerCase().indexOf(term) != -1) ||
			(issue.title.toLowerCase().indexOf(term) != -1) ||
			issue.cves.some(function(cve) { return cve.toLowerCase().indexOf(term) != -1; }) ||
			(issue.descriptionText.indexOf(term) != -1);
	};

	// A vulnerability that the hotfix fixes is still listed, with its status
	// showing that the hotfix fixed it, so that the table shows what the hotfix
	// addressed

	var isAffectingAny = function(issueKey) {
		return versionIndices.some(function(versionIndex) {
			return isAffected(issueKey, versionIndex) || isFixedByHotfix(issueKey, versionIndex);
		});
	};

	// Without a filter, list the vulnerabilities that affect any of the checked
	// releases, or every vulnerability if no release is checked. Otherwise, list
	// the vulnerabilities for each identifier whether or not they affect the
	// checked releases, along with those vulnerabilities that match any title
	// phrase, and report the identifiers and other text that match nothing

	var allKeys = Object.keys(lsvData.issues);
	var baseKeys = (versionIndices.length > 0) ? allKeys.filter(isAffectingAny) : allKeys;

	var issueKeys;
	var notFound = filter.unrecognized.slice();
	var notAffectingPhrases = [];

	if ((filter.identifiers.length == 0) && (filter.unrecognized.length == 0) && (phrases.length == 0)) {
		issueKeys = baseKeys;
	}
	else {
		var selectedKeys = new Set();

		filter.identifiers.forEach(function(identifier) {
			var matchingKeys = allKeys.filter(function(issueKey) {
				return (issueKey == identifier) || (lsvData.issues[issueKey].cves.indexOf(identifier) != -1);
			});

			if (matchingKeys.length == 0) {
				notFound.push(identifier);
			}

			matchingKeys.forEach(function(issueKey) { selectedKeys.add(issueKey); });
		});

		// A phrase can match vulnerabilities that do not affect the checked
		// releases, so report those phrases separately from the ones that match
		// no vulnerability at all

		phrases.forEach(function(phrase) {
			var isMatching = function(issueKey) { return isMatchingTerm(issueKey, phrase); };

			var matchingKeys = baseKeys.filter(isMatching);

			if (matchingKeys.length == 0) {
				(allKeys.some(isMatching) ? notAffectingPhrases : notFound).push('"' + phrase + '"');
			}

			matchingKeys.forEach(function(issueKey) { selectedKeys.add(issueKey); });
		});

		issueKeys = Array.from(selectedKeys);
	}

	// An unpublished vulnerability that the hotfix tickets match is listed even
	// when unpublished vulnerabilities are hidden, since the hotfix addresses it

	issueKeys = issueKeys.filter(function(issueKey) {
		var issue = lsvData.issues[issueKey];

		return isMatchingAttributes(issue) &&
			!(hideUnpublished && hideUnpublished.checked && issue.unpublished && !issue.hotfixMatched);
	});

	var comparator = getColumnComparator(sortColumn, versionIndices);

	issueKeys.sort(comparator || compareIssues);

	updateSortIndicators(comparator ? sortColumn : null);

	var table = document.getElementById('summary');
	table.innerHTML = '';

	if (issueKeys.length == 0) {
		var row = document.createElement('tr');
		row.innerHTML = '<td colspan="' + columnCount + '">No matching published security vulnerabilities' +
			((versionIndices.length > 0) ? ' affect the checked releases' : '') + '.</td>';
		table.appendChild(row);
	}

	issueKeys.forEach(function(issueKey) {
		var issue = lsvData.issues[issueKey];

		var row = document.createElement('tr');

		// A vulnerability listed by identifier can affect none of the checked
		// releases, so dim it

		if ((versionIndices.length > 0) && !isAffectingAny(issueKey)) {
			row.className = 'not-affected';
		}

		var cells = [
			getLsvHtml(issueKey, issue),
			getCvesHtml(issue),
			getTitleHtml(issueKey, issue),
			getSeverityHtml(issue),
			getClassificationHtml(issue),
			getCategoryHtml(issue),
			getPublishedHtml(issue)
		].map(function(html) { return '<td>' + html + '</td>'; });

		versionIndices.forEach(function(versionIndex) {
			cells.push('<td' + (isAffected(issueKey, versionIndex) ? '' : ' class="success"') + '>' + getStatusHtml(issue, versionIndex) + '</td>');
		});

		row.innerHTML = cells.join('');

		table.appendChild(row);

		if (issue.description) {
			var descriptionRow = document.createElement('tr');
			descriptionRow.className = 'lsv-description';
			descriptionRow.setAttribute('data-issue-key', issueKey);
			descriptionRow.style.display = 'none';
			descriptionRow.innerHTML = '<td colspan="' + columnCount + '">' + issue.description + '</td>';
			table.appendChild(descriptionRow);
		}
	});

	var notFoundElement = document.getElementById('notFound');

	var messages = [];

	if (notFound.length > 0) {
		messages.push('No published security vulnerabilities were found for: ' + notFound.join(', '));
	}

	if (notAffectingPhrases.length > 0) {
		messages.push('No published security vulnerabilities that affect the checked releases were found for: ' + notAffectingPhrases.join(', '));
	}

	notFoundElement.className = (messages.length > 0) ? 'alert alert-warning' : '';
	notFoundElement.innerHTML = messages.map(function(message) { return '<div>' + escapeHtml(message) + '</div>'; }).join('');

	updateCounts(issueKeys, versionIndices);

	listedResults = {issueKeys: issueKeys, versionIndices: versionIndices};
}

checkLsvInfo = _.debounce(checkLsvInfo, 100);

function createCheckbox(value, text, checked) {
	var checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.value = value;
	checkbox.checked = checked;

	var label = document.createElement('label');
	label.appendChild(checkbox);
	label.appendChild(document.createTextNode(text));

	return label;
}

/**
 * Shows the checked releases as chips that uncheck the release when clicked,
 * and the number of checked releases next to each release line.
 */
function updateVersionChips() {
	var versionIndices = getSelectedVersionIndices();

	versionChips.innerHTML = versionIndices.map(function(versionIndex) {
		return '<a class="lsv-chip" data-version-index="' + versionIndex + '" title="Remove">' +
			escapeHtml(lsvData.versions[versionIndex]) + ' &times;</a>';
	}).join('');

	versionFilter.querySelectorAll('details').forEach(function(details) {
		var count = details.querySelectorAll('input:checked').length;

		details.querySelector('.lsv-line-count').textContent = (count > 0) ? '(' + count + ')' : '';
	});

	document.querySelector('.lsv-clear[data-filter="versionFilter"]').classList.toggle('active', versionIndices.length > 0);
}

/**
 * Shows only the releases containing the search text, expanding the release
 * lines that have a match, and restores the collapsed release lines once the
 * search is cleared.
 */
function applyVersionSearch() {
	var text = versionSearch.value.trim().toLowerCase();

	versionFilter.querySelectorAll('details').forEach(function(details) {
		var matchCount = 0;

		details.querySelectorAll('label').forEach(function(label) {
			var isMatch = !text || (label.textContent.toLowerCase().indexOf(text) != -1);

			label.style.display = isMatch ? '' : 'none';

			if (isMatch) {
				matchCount++;
			}
		});

		details.style.display = (matchCount > 0) ? '' : 'none';
		details.open = !!text;
	});
}

/**
 * Lists the releases grouped by release line, newest first (applyUrlParameters
 * checks those named in the URL). Checkbox values are indices into lsvData.versions.
 */
function initVersionFilter() {
	var groups = {};
	var releaseLines = [];

	lsvData.versions.forEach(function(version, versionIndex) {
		var releaseLine = getReleaseLine(version);

		if (!groups[releaseLine]) {
			var details = document.createElement('details');
			details.innerHTML = '<summary>' + escapeHtml(releaseLine) + ' <span class="lsv-line-count"></span></summary>';
			groups[releaseLine] = details;
			releaseLines.push(releaseLine);
		}

		groups[releaseLine].insertBefore(
			createCheckbox(versionIndex, version, false),
			groups[releaseLine].querySelector('summary').nextSibling);
	});

	releaseLines.reverse().forEach(function(releaseLine) {
		versionFilter.appendChild(groups[releaseLine]);
	});

	versionFilter.onchange = function() {
		updateVersionChips();
		checkLsvInfoWithHistory();
	};

	versionChips.onclick = function(event) {
		var chip = event.target.closest('.lsv-chip');

		if (chip) {
			versionFilter.querySelector('input[value="' + chip.getAttribute('data-version-index') + '"]').checked = false;
			versionFilter.onchange();
		}
	};

	document.querySelector('.lsv-clear[data-filter="versionFilter"]').onclick = function() {
		versionFilter.querySelectorAll('input:checked').forEach(function(checkbox) { checkbox.checked = false; });
		versionFilter.onchange();
	};

	versionSearch.oninput = applyVersionSearch;
}

/**
 * Lists the values present in the data (severities in severity order and
 * classifications alphabetically; applyUrlParameters checks those named in the URL).
 */
function initAttributeFilter(attributeFilter) {
	var values = [];

	for (var issueKey in lsvData.issues) {
		getIssueValues(lsvData.issues[issueKey], attributeFilter.property).forEach(function(value) {
			if (values.indexOf(value) == -1) {
				values.push(value);
			}
		});
	}

	values.sort(function(a, b) {
		if (a == noValueOption || b == noValueOption) {
			return (a == noValueOption) - (b == noValueOption);
		}

		if (attributeFilter.property == 'severity') {
			return severityOrder.indexOf(a) - severityOrder.indexOf(b);
		}

		return a.localeCompare(b);
	});

	values.forEach(function(value) {
		attributeFilter.container.appendChild(createCheckbox(
			value, (value == noValueOption) ? attributeFilter.noValueText : value, false));
	});

	var clearLink = document.querySelector('.lsv-clear[data-filter="' + attributeFilter.container.id + '"]');

	attributeFilter.updateClearLink = function() {
		clearLink.classList.toggle('active', getSelectedValues(attributeFilter).length > 0);
	};

	attributeFilter.container.onchange = function() {
		applyImpliedValues(attributeFilter);
		attributeFilter.updateClearLink();
		checkLsvInfoWithHistory();
	};

	clearLink.onclick = function() {
		attributeFilter.container.querySelectorAll('input').forEach(function(checkbox) {
			checkbox.checked = false;
			checkbox.disabled = false;
			delete checkbox.dataset.wasChecked;
		});
		attributeFilter.updateClearLink();
		checkLsvInfoWithHistory();
	};
}

/**
 * Sets up the option to hide unpublished vulnerabilities, which is only shown
 * when some vulnerabilities are not published yet.
 */
function initHideUnpublished() {
	if (!hideUnpublished) {
		return;
	}

	var hasUnpublished = Object.keys(lsvData.issues).some(function(issueKey) { return lsvData.issues[issueKey].unpublished; });

	hideUnpublished.closest('fieldset').hidden = !hasUnpublished;
	hideUnpublished.parentNode.title = getUnpublishedTitle();
	hideUnpublished.onchange = checkLsvInfoWithHistory;
}

/**
 * Escapes the characters that Markdown would otherwise treat as formatting.
 */
function escapeMarkdown(text) {
	return text.replace(/([\\`*_\[\]<>|])/g, '\\$1');
}

/**
 * Returns the Markdown for a title, keeping the text between backticks (such as
 * `backURL`) as code and escaping the rest.
 */
function getTitleMarkdown(title) {
	return title.split(/(`[^`]+`)/).map(function(part, i) {
		return (i % 2) ? part : escapeMarkdown(part);
	}).join('');
}

/**
 * Wraps inline Markdown in a marker (such as ** for bold), keeping surrounding
 * whitespace outside the marker so that the formatting still applies.
 */
function wrapMarkdown(text, marker) {
	var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);

	return m[2] ? m[1] + marker + m[2] + marker + m[3] : text;
}

/**
 * Converts the inline content of an element (text, links, and emphasis) to
 * Markdown. Line breaks inside table cells become <br>, since a Markdown table
 * row must stay on one line.
 */
function getInlineMarkdown(node, inTable) {
	return Array.from(node.childNodes).map(function(child) {
		if (child.nodeType == Node.TEXT_NODE) {
			return escapeMarkdown(child.textContent.replace(/\s+/g, ' '));
		}

		if (child.nodeType != Node.ELEMENT_NODE) {
			return '';
		}

		var tag = child.tagName.toLowerCase();

		if (tag == 'br') {
			return inTable ? '<br>' : '\\\n';
		}

		if (tag == 'code') {
			var code = child.textContent;
			var fence = (code.indexOf('`') != -1) ? '``' : '`';

			return fence + ((fence == '``') ? ' ' + code + ' ' : code) + fence;
		}

		var inner = getInlineMarkdown(child, inTable);

		if ((tag == 'strong') || (tag == 'b')) {
			return wrapMarkdown(inner, '**');
		}

		if ((tag == 'em') || (tag == 'i')) {
			return wrapMarkdown(inner, '*');
		}

		if (tag == 'a') {
			var href = child.getAttribute('href') || '';

			if (!href) {
				return inner;
			}

			return (child.textContent == href) ? '<' + href + '>' : '[' + inner + '](' + href.replace(/[()\s]/g, encodeURIComponent) + ')';
		}

		// Block elements inside table cells (such as paragraphs) are joined with
		// line breaks

		if (inTable && ((tag == 'p') || (tag == 'li'))) {
			return inner.trim() + '<br>';
		}

		return inner;
	}).join('');
}

function getTableMarkdown(table) {
	var rows = Array.from(table.querySelectorAll('tr')).map(function(row) {
		return Array.from(row.children).map(function(cell) {
			return getInlineMarkdown(cell, true).replace(/(<br>)+$/, '').trim();
		});
	});

	if (rows.length == 0) {
		return '';
	}

	var columnCount = Math.max.apply(null, rows.map(function(row) { return row.length; }));

	var lines = rows.map(function(row) {
		while (row.length < columnCount) {
			row.push('');
		}

		return '| ' + row.join(' | ') + ' |';
	});

	lines.splice(1, 0, '|' + ' --- |'.repeat(columnCount));

	return lines.join('\n');
}

/**
 * Converts the block content of an element (paragraphs, headings, lists, code
 * blocks, and tables) to a list of Markdown blocks.
 */
function getBlockMarkdown(node) {
	var blocks = [];
	var inlineNodes = document.createElement('div');

	var flushInline = function() {
		var text = getInlineMarkdown(inlineNodes).trim();

		if (text) {
			blocks.push(text);
		}

		inlineNodes = document.createElement('div');
	};

	Array.from(node.childNodes).forEach(function(child) {
		var tag = (child.nodeType == Node.ELEMENT_NODE) ? child.tagName.toLowerCase() : '';

		if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'pre', 'hr', 'table'].indexOf(tag) == -1) {
			inlineNodes.appendChild(child.cloneNode(true));
			return;
		}

		flushInline();

		if ((tag == 'p') || (tag == 'div')) {
			blocks = blocks.concat(getBlockMarkdown(child));
		}
		else if (tag[0] == 'h') {
			var text = getInlineMarkdown(child).trim();

			if (text) {
				blocks.push('#'.repeat(parseInt(tag[1])) + ' ' + text);
			}
		}
		else if ((tag == 'ul') || (tag == 'ol')) {
			var items = Array.from(child.children).filter(function(item) { return item.tagName.toLowerCase() == 'li'; });

			blocks.push(items.map(function(item, i) {
				var prefix = (tag == 'ol') ? (i + 1) + '. ' : '- ';
				var indent = ' '.repeat(prefix.length);

				return prefix + getBlockMarkdown(item).join('\n\n').split('\n').map(function(line, j) {
					return ((j == 0) || !line) ? line : indent + line;
				}).join('\n');
			}).join('\n'));
		}
		else if (tag == 'pre') {
			var code = child.textContent.replace(/\n+$/, '');
			var fence = (code.indexOf('```') != -1) ? '~~~' : '```';

			blocks.push(fence + '\n' + code + '\n' + fence);
		}
		else if (tag == 'hr') {
			blocks.push('---');
		}
		else if (tag == 'table') {
			blocks.push(getTableMarkdown(child));
		}
	});

	flushInline();

	return blocks;
}

function htmlToMarkdown(html) {
	var template = document.createElement('template');
	template.innerHTML = html;

	return getBlockMarkdown(template.content).join('\n\n');
}

function getStatusMarkdown(issue, versionIndex) {
	var status = document.createElement('div');
	status.innerHTML = getStatusHtml(issue, versionIndex);

	var label = status.querySelector('.label');
	var labelText = label.textContent;

	label.remove();

	return '**' + labelText + '**, ' + getInlineMarkdown(status).trim();
}

/**
 * Returns the listed vulnerabilities as Markdown, one section per vulnerability:
 * the title as a heading, its CVEs as a subheading, its fields (including the
 * status in each checked release), and then (if included) its details.
 */
function getResultsMarkdown(includeDetails) {
	var lines = [
		'# Liferay Security Vulnerabilities',
		'',
		'Exported ' + new Date().toISOString().substring(0, 10) + '.',
		'',
		escapeMarkdown(document.getElementById('counts').textContent),
		'',
		'**Warning**: This is NOT an official Liferay tool, nor is it supported by Liferay in any way. The published security advisories remain the authoritative source.'
	];

	var hotfixKeys = getHotfixKeys();

	if (hotfixKeys.length > 0) {
		lines.push('', 'Treated as fixed by the hotfix tickets: ' + hotfixKeys.join(', '));
	}

	listedResults.issueKeys.forEach(function(issueKey) {
		var issue = lsvData.issues[issueKey];

		lines.push('', '## ' + (getTitleMarkdown(issue.title) || issueKey));

		if (issue.cves.length > 0) {
			lines.push('', '### ' + issue.cves.join(', '));
		}

		lines.push('');
		lines.push('- **LSV**: [' + issueKey + '](' + getLsvUrl(issueKey, issue) + ')');

		if (issue.fixedBy.length > 0) {
			lines.push('- **Fixed by**: ' + issue.fixedBy.map(function(ticketKey) {
				return '[' + ticketKey + '](https://liferay.atlassian.net/browse/' + ticketKey + ')';
			}).join(', '));
		}

		if (issue.severity) {
			lines.push('- **Severity**: ' + escapeMarkdown(issue.severity));
		}

		if (issue.classification) {
			lines.push('- **Classification**: ' + escapeMarkdown(issue.classification));
		}

		if (issue.products.length > 0) {
			lines.push('- **Category**: ' + issue.products.map(escapeMarkdown).join(', '));
		}

		if (issue.published || issue.unpublished) {
			lines.push('- **Published**: ' + [issue.published, issue.unpublished ? 'Unpublished (' + getUnpublishedTitle().toLowerCase() + ')' : ''].filter(function(x) { return x; }).join(' '));
		}

		issue.advisories.forEach(function(advisory) {
			lines.push('- **' + getAdvisoryLabel(advisory) + '**: <' + advisory + '>');
		});

		listedResults.versionIndices.forEach(function(versionIndex) {
			lines.push('- **Status in ' + lsvData.versions[versionIndex] + '**: ' + getStatusMarkdown(issue, versionIndex));
		});

		var details = (includeDetails && issue.description) ? htmlToMarkdown(issue.description) : '';

		if (details) {
			lines.push('', details);
		}
	});

	return lines.join('\n') + '\n';
}

function exportMarkdown(includeDetails) {
	var versionNames = listedResults.versionIndices.map(function(versionIndex) { return lsvData.versions[versionIndex]; });

	var link = document.createElement('a');
	link.href = URL.createObjectURL(new Blob([getResultsMarkdown(includeDetails)], {type: 'text/markdown'}));
	link.download = 'liferay-security-vulnerabilities' + ((versionNames.length > 0) ? '-' + versionNames.join('-') : '') +
		(includeDetails ? '' : '-summary') + '.md';

	document.body.appendChild(link);
	link.click();
	link.remove();

	setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
}

// Only the customer page has the details buttons, since the public page's data
// has no descriptions

document.getElementById('exportSummary').onclick = function() { exportMarkdown(false); };

if (document.getElementById('exportDetails')) {
	document.getElementById('exportDetails').onclick = function() { exportMarkdown(true); };
}

/**
 * Returns the page's styles for the printable document. The page's stylesheet is
 * linked when served as files (such as from S3), but inlined when served by Google
 * Apps Script, so the rules of every stylesheet are copied into a style element,
 * which also means that printing does not have to wait for a stylesheet to load.
 * A stylesheet whose rules cannot be read (such as one from another origin) is
 * linked by its absolute URL instead.
 */
function getPrintStyles() {
	return Array.from(document.styleSheets).map(function(styleSheet) {
		try {
			var cssText = Array.from(styleSheet.cssRules).map(function(rule) { return rule.cssText; }).join('\n');

			return '<style>' + cssText.replace(/<\/style/gi, '<\\/style') + '</style>';
		}
		catch (e) {
			return styleSheet.href ? '<link rel="stylesheet" href="' + escapeHtml(styleSheet.href) + '">' : '';
		}
	}).join('');
}

/**
 * Returns a standalone document with the title, warning, counts, and the table as
 * it is currently shown, with every vulnerability's details expanded or with no
 * details at all (and without the filter row or the details links), styled with
 * the page's own styles.
 */
function getPrintHtml(includeDetails) {
	var table = document.querySelector('table.table').cloneNode(true);

	table.querySelectorAll('#nameFilterHeader, .lsv-toggle').forEach(function(element) {
		var row = element.closest('tr');

		((element.id == 'nameFilterHeader') ? row : element).remove();
	});

	table.querySelectorAll('tr.lsv-description').forEach(function(row) {
		if (includeDetails) {
			row.style.display = '';
		}
		else {
			row.remove();
		}
	});

	var styles = getPrintStyles();

	var hotfixKeys = getHotfixKeys();

	return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(document.title) + '</title>' + styles +
		'<style>body { padding: 0 15px; }</style></head><body>' +
		document.querySelector('h1').outerHTML +
		document.querySelector('.alert-warning').outerHTML +
		'<p>' + escapeHtml(document.getElementById('counts').textContent) + '</p>' +
		((hotfixKeys.length > 0) ? '<p>Treated as fixed by the hotfix tickets: ' + escapeHtml(hotfixKeys.join(', ')) + '</p>' : '') +
		table.outerHTML + '</body></html>';
}

/**
 * Prints the table. The printable document is written into a hidden iframe and
 * printed from there, which works the same whether or not this page is itself in
 * an iframe (such as when served by Google Apps Script), where printing the page
 * would print the frame with its sidebar and controls, and opening a new window
 * may be blocked. If the hidden iframe cannot be used, the page itself is printed,
 * and its print styles hide everything but the table (and the details, when
 * printing without them).
 */
function printTable(includeDetails) {
	// The class stays until afterprint, since print() does not block in every browser

	var printPage = function() {
		document.body.classList.toggle('lsv-print-summary', !includeDetails);

		window.addEventListener('afterprint', function() {
			document.body.classList.remove('lsv-print-summary');
		}, {once: true});

		window.print();
	};

	var previousFrame = document.getElementById('lsvPrintFrame');

	if (previousFrame) {
		previousFrame.remove();
	}

	var frame = document.createElement('iframe');
	frame.id = 'lsvPrintFrame';
	frame.setAttribute('aria-hidden', 'true');
	frame.style.cssText = 'border: 0; height: 0; position: fixed; right: 0; bottom: 0; width: 0;';

	document.body.appendChild(frame);

	try {
		var frameDocument = frame.contentWindow.document;

		frameDocument.open();
		frameDocument.write(getPrintHtml(includeDetails));
		frameDocument.close();
	}
	catch (e) {
		frame.remove();
		printPage();
		return;
	}

	// Let the frame lay out before printing, and remove it once printing is done
	// (print() blocks in most browsers, but not all, hence also afterprint)

	setTimeout(function() {
		try {
			frame.contentWindow.onafterprint = function() { frame.remove(); };
			frame.contentWindow.focus();
			frame.contentWindow.print();
		}
		catch (e) {
			frame.remove();
			printPage();
		}
	}, 100);
}

document.getElementById('printSummary').onclick = function() { printTable(false); };

if (document.getElementById('printDetails')) {
	document.getElementById('printDetails').onclick = function() { printTable(true); };
}

document.getElementById('summary').onclick = function(event) {
	var toggle = event.target.closest('.lsv-toggle');

	if (!toggle) {
		return;
	}

	var issueKey = toggle.getAttribute('data-issue-key');
	var descriptionRow = document.querySelector('tr.lsv-description[data-issue-key="' + issueKey + '"]');

	if (descriptionRow) {
		descriptionRow.style.display = (descriptionRow.style.display == 'none') ? '' : 'none';
	}
};

/**
 * Returns the response for a data file, the same way as security_utils.js in
 * okr-cloud-health-index: if the page has an element whose id is the file name
 * (a <script type="text/plain"> holding the gzipped, base64-encoded file, as
 * staged by upload.sh and inlined by inline_html_files.py), the file is decoded
 * from it, and otherwise the file is fetched. The element is looked up by the
 * file name rather than the whole URL, since the URL may point to S3.
 */
async function getResponse(url) {
	var path = (url.indexOf('?') != -1) ? url.substring(0, url.indexOf('?')) : url;
	var elementId = path.substring(path.lastIndexOf('/') + 1);
	var element = document.getElementById(elementId);

	if (!element) {
		var res = await fetch(url);

		if (!res.ok) {
			throw new Error(res.status + ' ' + res.statusText + ' for ' + url);
		}

		return res;
	}

	var compressedStream = new Blob([Uint8Array.fromBase64(element.textContent)]).stream();
	var decompressedStream = compressedStream.pipeThrough(new DecompressionStream('gzip'));

	return new Response(decompressedStream);
}

async function fetchJson(url) {
	var res = await getResponse(url);

	return JSON.parse(await res.text());
}

// The URL's parameters are read once both the data and (under Apps Script) the
// URL the user sees have loaded

// Each page names its own data files (lsvDataFile, and lsvHotfixDataFile on the
// internal page), rather than this script, so that upload.sh and
// inline_html_files.py, which look for data file names in a page and its
// scripts, only include that page's data (the public page must not include the
// internal data)

var hotfixDataPromise = (typeof lsvHotfixDataFile !== 'undefined') ? fetchJson(lsvHotfixDataFile) : Promise.resolve({});

Promise.all([fetchJson(lsvDataFile), initUrlParams(), hotfixDataPromise]).then(([data, , hotfixData]) => {
	lsvData = data;
	hotfixTicketMap = hotfixData;

	initAffected();

	initVersionFilter();

	attributeFilters.forEach(initAttributeFilter);

	initHideUnpublished();

	applyUrlParameters();

	[nameFilter, titleFilter].forEach(function(textarea) {
		textarea.oninput = function() {
			fitTextarea(textarea);
			checkLsvInfo();
		};
	});
	if (hotfixTickets) {
		hotfixTickets.oninput = checkLsvInfo;
	}

	var columnHeaders = document.getElementById('columnHeaders');

	columnHeaders.addEventListener('click', function(event) {
		var cell = event.target.closest('th[data-sort]');

		if (cell) {
			sortByColumn(cell.getAttribute('data-sort'));
		}
	});

	columnHeaders.addEventListener('keydown', function(event) {
		var cell = event.target.closest('th[data-sort]');

		if (cell && ((event.key == 'Enter') || (event.key == ' '))) {
			event.preventDefault();
			sortByColumn(cell.getAttribute('data-sort'));
		}
	});

	// Back/Forward navigation (google.script.history under Apps Script)

	onUrlParamsChange(function() {
		applyUrlParameters();
		checkLsvInfo();
	});

	checkLsvInfo();
});
