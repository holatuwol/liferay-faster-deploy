var modifyState = history.pushState ? history.pushState.bind(history) : null;

var select1 = document.getElementById('sourceVersion');
var select2 = document.getElementById('targetVersion');

var releaseVersions = {};
var releaseDetails = {};

var quarterlies = {
	'2023.q3': 7413092,
	'2023.q4': 7413102,
	'2024.q1': 7413112,
	'2024.q2': 7413120,
	'2024.q3': 7413125,
	'2024.q4': 7413129,
	'2025.q1': 7413132,
	'2025.q2': 7413135,
};

var renderedComponents = {};
var renderedTicketsByType = {};
var renderedTicketsByComponent = {};

function debounce(callback) {
	var timer;

	return function() {
		detachExportURL();

		clearTimeout(timer);
		timer = setTimeout(callback, 100);
	};
}

function getLiferayVersion(version) {
  if (version.trim() == '') {
    return 0;
  }
  else if (version.indexOf('-ga1') != -1) {
    var shortVersionMatcher = /^([0-9]*)\.([0-9]*)\.([0-9]*)/.exec(version);
    var shortVersion = shortVersionMatcher[0].replace(/\./g, '');
    return parseInt(shortVersion) * 1000;
  }
  else if (version.indexOf('-u') != -1) {
    var shortVersionMatcher = /[0-9]*\.[0-9]\.[0-9]+/.exec(version);
    var shortVersion = shortVersionMatcher[0].replace(/\./g, '');
    var updateVersionMatcher = /-u([0-9]*)/.exec(version);
    var updateVersion = updateVersionMatcher[1];
    return parseInt(shortVersion) * 1000 + parseInt(updateVersion);
  }
  else if (version.indexOf('.q') != -1) {
    var shortVersionMatcher = /([0-9][0-9][0-9][0-9])\.q([0-9])\.([0-9]*)/.exec(version);
    var shortVersion = shortVersionMatcher[1] + shortVersionMatcher[2];
    var updateVersion = shortVersionMatcher[3];
    return 8000000 + parseInt(shortVersion) * 100 + parseInt(updateVersion);
  }
  else {
    console.log('unrecognized version pattern', version);
    return 0;
  }
}

function checkReleaseDetails() {
	var releaseCountsElement = document.getElementById('release-notes-count');

	releaseCountsElement.textContent = 'Loading...';

	var releaseNotesElement = document.getElementById('release-notes-details');

	releaseNotesElement.innerHTML = '';

	var select1Value = select1.options[select1.selectedIndex].value;
	var select2Value = select2.options[select2.selectedIndex].value;

	if (modifyState) {
		var baseURL = window.location.protocol + "//" + window.location.host + window.location.pathname;

		var newURL = baseURL + '?sourceVersion=' + select1Value;

		if (select1Value != select2Value) {
			newURL += '&targetVersion=' + select2Value;
		}

		modifyState({path: newURL}, '', newURL);
		modifyState = history.replaceState.bind(history);
	}

	populateReleaseDetails(select1Value, select2Value);
};

function copyReleaseNotesToClipboard() {
	var releaseNotesElement = document.getElementById('release-notes-details');

	navigator.clipboard.write([
		new ClipboardItem({
			'text/plain': new Blob([releaseNotesElement.textContent], {type: 'text/plain'}),
			'text/html': new Blob([releaseNotesElement.innerHTML], {type: 'text/html'})
		})
	]).then(function() {
		var alertElement = document.createElement('div');
		alertElement.classList.add('alert', 'alert-success', 'alert-dismissible');
		alertElement.setAttribute('role', 'alert');

		var closeButton = document.createElement('button');
		closeButton.classList.add('close');
		closeButton.setAttribute('aria-label', 'Close');
		closeButton.setAttribute('data-dismiss', 'alert');
		closeButton.setAttribute('type', 'button');
		closeButton.innerHTML = '&times;';

		alertElement.appendChild(closeButton);
		alertElement.appendChild(document.createTextNode('Copied to clipboard!'));

		document.getElementById('extraActions').appendChild(alertElement);
	});
};

function createSelectAllElement(filterType, filterName) {
	var selectAllListItemElement = document.createElement('li');
	selectAllListItemElement.classList.add('list-group-item', 'active');

	var selectAllCheckboxElement = document.createElement('input');
	selectAllCheckboxElement.setAttribute('type', 'checkbox');
	selectAllCheckboxElement.setAttribute('checked', '');
	selectAllCheckboxElement.setAttribute('id', 'select_all');
	selectAllListItemElement.appendChild(selectAllCheckboxElement);

	selectAllCheckboxElement.onchange = function() {
		detachExportURL();

		var selectAll = this.checked;
		var changeEvent = new Event('change');
		var checkboxes = document.querySelectorAll(
			'#release-notes-' + filterType + '-filter input[value]' +
				(selectAll ? ':not(:checked)' : ':checked'));

		checkboxes.forEach(checkbox => {
			checkbox.checked = selectAll;
		});

		setTimeout(function() {
			checkboxes.forEach(checkbox => {
				checkbox.dispatchEvent(changeEvent);
			});
		}, 100);
	};

	var selectAllHeaderElement = document.createElement('strong');
	selectAllHeaderElement.textContent = 'Filter by ' + filterName;
	selectAllListItemElement.appendChild(selectAllHeaderElement);

	return selectAllListItemElement;
};

function createTableOfContentsElement(checkboxName, elementId, label, count, toggleListener) {
	var tableOfContentsListItemElement = document.createElement('li');
	tableOfContentsListItemElement.classList.add('list-group-item');

	var enableCheckboxElement = document.createElement('input');
	enableCheckboxElement.setAttribute('type', 'checkbox');
	enableCheckboxElement.setAttribute('checked', '');
	enableCheckboxElement.setAttribute('name', checkboxName);
	enableCheckboxElement.setAttribute('value', elementId || label);

	enableCheckboxElement.onchange = toggleListener;

	tableOfContentsListItemElement.appendChild(enableCheckboxElement);

	if (elementId) {
		var tableOfContentsLinkElement = document.createElement('a');
		tableOfContentsLinkElement.setAttribute('href', '#' + elementId);
		tableOfContentsLinkElement.textContent = label;
		tableOfContentsListItemElement.appendChild(tableOfContentsLinkElement);
	}
	else {
		tableOfContentsListItemElement.appendChild(document.createTextNode(label));	
	}

	var tableOfContentsCountElement = document.createElement('span');
	tableOfContentsCountElement.classList.add('badge');
	tableOfContentsCountElement.setAttribute('data-value', elementId || label);
	tableOfContentsCountElement.textContent = count.toLocaleString();

	tableOfContentsListItemElement.appendChild(tableOfContentsCountElement);

	return tableOfContentsListItemElement;
};

function exportReleaseNotesToCSV(ticketKeys) {
	var select1Value = select1.options[select1.selectedIndex].value;
	var select2Value = select2.options[select2.selectedIndex].value;

	var [versionsToAdd, versionsToRemove] = getFetchVersions(select1Value, select2Value);

	var fetchVersions = new Set([...versionsToAdd, ...versionsToRemove]);

	if (select1Value != select2Value) {
		fetchVersions.delete(select1Value);
	}

	var targetQuarterlyVersions = Array.from(fetchVersions).filter(it => it.indexOf('.q') != -1).sort((a, b) => {
		return getPatch(a) - getPatch(b);
	});

	var hasQuarterlyVersion = targetQuarterlyVersions.length > 0;

	var tickets = Array.from(fetchVersions).reduce((acc1, version) => {
		if (!(version in releaseDetails)) {
			return acc1;
		}

		var versionTickets = Object.keys(releaseDetails[version]);

		var updateVersion = null;
		var nextQuarterly = null;

		var updateVersionIndex = version.indexOf('-u');

		if (hasQuarterlyVersion && (updateVersionIndex != -1)) {
			updateVersion = parseInt(version.substring(updateVersionIndex + 2));
			nextQuarterly = getNextQuarterly(updateVersion);
		}

		return versionTickets.filter(key => ticketKeys.has(key)).reduce((acc2, ticketKey) => {
			if (ticketKey in acc2) {
				return acc2;
			}

			acc2[ticketKey] = {
				'Issue Key': ticketKey,
				'Issue Type': releaseDetails[version][ticketKey]['type'],
				'Fix Priority': releaseDetails[version][ticketKey]['fix_priority'],
				'Create Date': releaseDetails[version][ticketKey]['create_date'],
				'Status': releaseDetails[version][ticketKey]['status'],
				'Status Date': releaseDetails[version][ticketKey]['status_date'],
				'Resolution': releaseDetails[version][ticketKey]['resolution'],
				'Resolution Date': releaseDetails[version][ticketKey]['resolution_date'],
				'Components': releaseDetails[version][ticketKey]['components'].join('\n'),
				'Summary': releaseDetails[version][ticketKey]['summary'],
			};

			if (nextQuarterly != null) {
				if (hasQuarterlyVersion && targetQuarterlyVersions[0].indexOf(nextQuarterly) == 0) {
					acc2[ticketKey]['Fix Version'] = targetQuarterlyVersions[0];
				}
				else {
					acc2[ticketKey]['Fix Version'] = nextQuarterly;
				}

				return acc2;
			}

			acc2[ticketKey]['Fix Version'] = version;
			return acc2;
		}, acc1);
	}, {});

	var exportLink = document.getElementById('exportToCSV');
	exportLink.href = '#';
	exportLink.setAttribute('download', 'release_notes.csv');
	exportLink.href = URL.createObjectURL(new Blob([Papa.unparse(Object.values(tickets))], {'type': 'text/csv'}));
};

function getTicketElement(ticket, componentElementId) {
  var ticketKey = ticket['key'];

	var ticketElement = document.createElement('div');
	ticketElement.classList.add('release-notes-ticket');
	ticketElement.setAttribute('data-jira-ticket-key', ticketKey);
	ticketElement.setAttribute('data-jira-ticket-type', ticket['type']);
	ticketElement.setAttribute('data-jira-ticket-component', componentElementId);

	var divider = document.createElement('hr');
	divider.classList.add('release-notes-divider');
	ticketElement.appendChild(divider);

	var headerElement = document.createElement('h3');

	var ticketURL = ticketKey.startsWith('CVE-') ? ('https://cve.mitre.org/cgi-bin/cvename.cgi?name=' + ticketKey) : ('https://liferay.atlassian.net/browse/' + ticketKey);

	var ticketAnchorElement = document.createElement('a');
	ticketAnchorElement.setAttribute('href', ticketURL);
	ticketAnchorElement.setAttribute('target', '_blank');
	ticketAnchorElement.textContent = ticketKey;

	headerElement.appendChild(ticketAnchorElement);

	ticketElement.appendChild(headerElement);

	var summaryElement = document.createElement('h4');
	summaryElement.appendChild(document.createTextNode(ticket['summary']));

	ticketElement.appendChild(summaryElement);

	var componentsElement = ticket['components'].reduce((acc, ticketComponentName) => {
		var componentListItemElement = document.createElement('li');
		componentListItemElement.textContent = ticketComponentName;
		acc.appendChild(componentListItemElement);
		return acc;
	}, document.createElement('ul'));

	ticketElement.appendChild(componentsElement);

	ticketElement.appendChild(componentsElement);

	var descriptionElement = document.createElement('div');
	descriptionElement.innerHTML = ticket['description'];

	descriptionElement.querySelectorAll('img[src],embed[src]').forEach(element => {
		var src = element.getAttribute('src');
		if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
			return;
		}
		else if (src.charAt(0) == '/') {
			src = 'https://liferay.atlassian.net' + src;
		}
		else {
			src = 'https://liferay.atlassian.net/browse/' + src;
		}
		if (element.tagName == 'IMG') {
			element.setAttribute('src', src);
		}
		else {
			var linkElement = document.createElement('a');
			linkElement.setAttribute('href', src);
			linkElement.textContent = src;

			var wrapperElement = document.createElement('div');
			wrapperElement.appendChild(document.createTextNode('EMBED: '));
			wrapperElement.appendChild(linkElement);

			element.replaceWith(wrapperElement);
		}
	});

	ticketElement.appendChild(descriptionElement);

	return ticketElement;
};

function generateComponentReleaseNotes(releaseNotesElement, componentName, componentElementId, tickets) {
	var componentElement = document.createElement('div');
	componentElement.setAttribute('id', componentElementId);
	componentElement.classList.add('release-notes-component');

	var divider = document.createElement('hr');
	divider.classList.add('release-notes-divider');
	componentElement.appendChild(divider);

	var componentHeaderContainerElement = document.createElement('div');
	componentHeaderContainerElement.classList.add('release-notes-component-name');

	var componentHeaderElement = document.createElement('h2');
	componentHeaderElement.textContent = componentName;
	componentHeaderContainerElement.appendChild(componentHeaderElement);

	var headerTicketCountElement = document.createElement('h2');
	headerTicketCountElement.classList.add('component-ticket-count');
	headerTicketCountElement.textContent = '(' + getTicketCountString(tickets.length) + ')';
	componentHeaderContainerElement.appendChild(headerTicketCountElement);

	componentElement.appendChild(componentHeaderContainerElement);

	tickets.forEach(ticket => {
		componentElement.appendChild(getTicketElement(ticket, componentElementId));
	});

	releaseNotesElement.appendChild(componentElement);

	return componentElement;
};

function generateReleaseNotes(fetchVersions, releasesToAdd, releasesToRemove, sourceVersion, targetVersion, releaseName) {
	if (releaseName) {
		fetchVersions.delete(releaseName);
	}

	if (fetchVersions.size > 0) {
		return;
	}

	var tickets = {};

	Object.assign(tickets, releaseDetails[targetVersion]);

	if (sourceVersion != targetVersion) {
		releasesToAdd.forEach(function(version) {
			Object.assign(tickets, releaseDetails[version]);
		});

		releasesToRemove.forEach(function(version) {
			for (ticketKey in releaseDetails[version]) {
				delete tickets[ticketKey];
			}
		});
	}

	generateReleaseNotesHelper(tickets);
	exportReleaseNotesToCSV(new Set(Object.keys(tickets)));
};

function generateReleaseNotesHelper(tickets) {
	var releaseCountsElement = document.getElementById('release-notes-count');

	releaseCountsElement.innerHTML = '';

	var ticketCount = Object.keys(tickets).length;
	var totalTicketCountElement = null;

	// filter by types

	var typeListElement = document.createElement('ul');
  typeListElement.classList.add('list-group');
  typeListElement.setAttribute('id', 'release-notes-types-filter');
  releaseCountsElement.appendChild(typeListElement);

  var selectAllTypesListItemElement = createSelectAllElement('types', 'Type');
	typeListElement.appendChild(selectAllTypesListItemElement);

	totalTicketCountElement = document.createElement('span');
	totalTicketCountElement.classList.add('badge', 'release-notes-total-count');
	totalTicketCountElement.textContent = getTicketCountString(ticketCount);
	selectAllTypesListItemElement.appendChild(totalTicketCountElement);

	var ticketsByType = Object.values(tickets).reduce((acc, ticket) => {
		var type = ticket['type'];

		if (acc[type]) {
			acc[type].push(ticket);
		}
		else {
			acc[type] = [ticket];
		}

		return acc;
	}, {});

	Object.keys(ticketsByType).sort().forEach(type => {
		typeListElement.appendChild(createTableOfContentsElement('type', null, type, ticketsByType[type].length, updateFacets));
	});

	// filter by components

  var componentListElement = document.createElement('ul');
  componentListElement.classList.add('list-group');
  componentListElement.setAttribute('id', 'release-notes-components-filter');
  releaseCountsElement.appendChild(componentListElement);

  var selectAllComponentsListItemElement = createSelectAllElement('components', 'Component');
	componentListElement.appendChild(selectAllComponentsListItemElement);

	totalTicketCountElement = document.createElement('span');
	totalTicketCountElement.classList.add('badge', 'release-notes-total-count');
	totalTicketCountElement.textContent = getTicketCountString(ticketCount);
	selectAllComponentsListItemElement.appendChild(totalTicketCountElement);

	var ticketsByComponent = Object.values(tickets).reduce((acc, ticket) => {
		Array.from(new Set(ticket['components'].map(it => it.split(' > ')[0]))).forEach(componentName => {
			if (acc[componentName]) {
				acc[componentName].push(ticket);
			}
			else {
				acc[componentName] = [ticket];
			}
		})

		return acc;
	}, {});

	var releaseNotesElement = document.getElementById('release-notes-details');

	for (var componentName in renderedComponents) {
		delete renderedComponents[type];
	}

	for (var componentName in renderedTicketsByComponent) {
		delete renderedTicketsByComponent[componentName];
	}

	Object.keys(ticketsByComponent).sort().forEach(componentName => {
		var componentElementId = componentName.toLowerCase().replace(/[^a-z]+/g, '_');
		var componentTickets = ticketsByComponent[componentName];

		componentListElement.appendChild(createTableOfContentsElement('component', componentElementId, componentName, componentTickets.length, updateFacets));

		renderedComponents[componentElementId] = generateComponentReleaseNotes(releaseNotesElement, componentName, componentElementId, componentTickets);
		renderedTicketsByComponent[componentElementId] = Array.from(renderedComponents[componentElementId].querySelectorAll('.release-notes-ticket'));
	});

	// populate the rendered ticket caches

	for (var type in renderedTicketsByType) {
		delete renderedTicketsByType[type];
	}

	var typesFilter = document.getElementById('release-notes-types-filter')
	var availableTypes = Array.from(typesFilter.querySelectorAll('input[value]')).map(it => it.value);

	availableTypes.forEach(type => {
		renderedTicketsByType[type] = Array.from(document.querySelectorAll('.release-notes-ticket[data-jira-ticket-type="' + type + '"]'));
	});
};

function isVersionToAdd(sourceUpdate, sourceQuarterly, sourcePatch, targetUpdate, targetQuarterly, targetPatch, version) {
	// If the version range is swapped (earlier release listed first), then
	// nothing will match.

	if (sourceUpdate > targetUpdate) {
		return false;
	}

	if (sourceQuarterly && targetQuarterly && sourceQuarterly > targetQuarterly) {
		return false;
	}

	var update = getUpdate(version);
	var quarterly = getQuarterly(version);
	var patch = getPatch(version);

	// If the starting and ending are from different updates, then we don't need
	// to fetch tickets from the starting update.

	if (sourceUpdate != targetUpdate && update == sourceUpdate) {
		return false;
	}

	// If the starting and ending are the same quarterly release, then we only
	// fetch tickets from the same quarterly release that fall within the patch
	// version range.

	if (sourceQuarterly && sourceQuarterly == targetQuarterly) {
		return quarterly != targetQuarterly ? false :
			 sourcePatch == targetPatch ? patch == sourcePatch :
				quarterly == targetQuarterly && patch > sourcePatch && patch <= targetPatch;
	}

	// If it is an older update baseline than our starting point, or a newer
	// update baseline than our ending point, then we do not use those tickets.

	if (update < sourceUpdate || update > targetUpdate) {
		return false;
	}

	// If we're looking at a quarterly release, then we ignore it unless it's
	// the same as the ending point's quarterly release, and it is within the
	// patch version range.

	if (quarterly) {
		return quarterly === targetQuarterly && patch <= targetPatch;
	}

	// We're now looking at an update that falls within the version range, so
	// we will always fetch it.

	return true;
}

function isVersionToRemove(sourceUpdate, sourceQuarterly, sourcePatch, targetUpdate, targetQuarterly, targetPatch, version) {
	// If the version range is swapped (earlier release listed first), then
	// nothing will match.

	if (sourceUpdate > targetUpdate) {
		return false;
	}

	if (sourceQuarterly && targetQuarterly && sourceQuarterly > targetQuarterly) {
		return false;
	}

	var update = getUpdate(version);
	var quarterly = getQuarterly(version);
	var patch = getPatch(version);

	// If the starting point and ending point are the same quarterly release,
	// then we aren't fetching anything extra, so we have nothing to remove.	

	if (sourceUpdate == targetUpdate && sourceQuarterly == targetQuarterly) {
		return false;
	}

	// If the starting point is a quarterly release, then we need to remove any
	// tickets fixed since the GA of the quarterly release, because those are
	// likely duplicated.

	if (sourceQuarterly) {
		return quarterly == sourceQuarterly && patch <= sourcePatch;
	}

	// If the ending point is a quarterly release and the starting point was a
	// regular update, then we aren't fetching anything extra, so we have nothing
	// to remove.

	return false;
}

function getFetchVersions(sourceVersion, targetVersion) {
	var releasesToAdd = new Set(Array.from(Object.keys(releaseVersions)).filter(
		isVersionToAdd.bind(
			null,
			getUpdate(sourceVersion), getQuarterly(sourceVersion), getPatch(sourceVersion),
			getUpdate(targetVersion), getQuarterly(targetVersion), getPatch(targetVersion))
		));

	var releasesToRemove = new Set(Array.from(Object.keys(releaseVersions)).filter(
		isVersionToRemove.bind(
			null,
			getUpdate(sourceVersion), getQuarterly(sourceVersion), getPatch(sourceVersion),
			getUpdate(targetVersion), getQuarterly(targetVersion), getPatch(targetVersion))
		));

	console.log('adding tickets from', releasesToAdd);
	console.log('removing tickets from', releasesToRemove);

	return [releasesToAdd, releasesToRemove];
};

function getNextQuarterly(update) {
	if (update < 92) {
		return null;
	}

	var maxYear = new Date().getUTCFullYear();

	for (var i = 2023; i <= maxYear; i++) {
		for (var j = 1; j <= 4; j++) {
			var quarterlyName = i + '.q' + j;

			if (!(quarterlyName in quarterlies)) {
				continue;
			}

			if (update <= quarterlies[quarterlyName]) {
				return quarterlyName;
			}
		}
	}

	return null;
};

function getParameter(name) {
	if (!location.search) {
		return '';
	}

	var re = new RegExp('[?&]' + name + '=([^&]*)');
	var m = re.exec(location.search);
	return m ? m[1] : '';
};

function getPatch(version) {
	if (version.indexOf('.q') == -1) {
		return -1;
	}
	else {
		return parseInt(version.substring(8));
	}
};

function getQuarterly(version) {
	if (version.indexOf('.q') == -1) {
		return undefined;
	}
	else {
		return version.substring(0, 7);
	}
};

function getTicketCountString(ticketCount) {
	return ticketCount.toLocaleString() + ' ticket' + (ticketCount != 1 ? 's' : '');
};

function getUpdate(version) {
	if (version.indexOf('-u') != -1) {
		var baseVersion = parseInt(version.substring(0, 6).substring(0, 6).replaceAll('.', ''));
		return (baseVersion * 1000) + parseInt(version.substring(version.indexOf('-u') + 2));
	}
	else if (version.indexOf('-ga1') != -1) {
		var baseVersion = parseInt(version.substring(0, 6).substring(0, 6).replaceAll('.', ''));
		return (baseVersion * 1000);
	}
	else {
		return quarterlies[version.substring(0, 7)];
	}
};

function loadReleaseDetails(releaseName, joinCallback) {
	if (!(releaseName in releaseVersions) || (releaseName in releaseDetails)) {
		joinCallback(releaseName);
		return;
	}

	var requestURL = ((document.location.hostname == 'localhost') ? '' : 'https://s3-us-west-2.amazonaws.com/mdang.grow/') + 'releases/' + releaseName + '.json';

	fetch(requestURL).then(x => x.json()).then(tickets => {
		releaseDetails[releaseName] = tickets;
		joinCallback(releaseName);
	}).catch(joinCallback.bind(null, releaseName));
};

function populateReleaseDetails(sourceVersion, targetVersion) {
	var [versionsToAdd, versionsToRemove] = getFetchVersions(sourceVersion, targetVersion);

	var fetchVersions = new Set([...versionsToAdd, ...versionsToRemove]);

	var joinCallback = generateReleaseNotes.bind(
		null, fetchVersions, versionsToAdd, versionsToRemove, sourceVersion, targetVersion);

	if (fetchVersions.size == 0) {
		joinCallback();
	}
	else {
		fetchVersions.forEach(version => loadReleaseDetails(version, joinCallback));
	}
};

function detachExportURL() {
	var exportLink = document.getElementById('exportToCSV');

	if (exportLink.href) {
		URL.revokeObjectURL(exportLink.href);
		exportLink.removeAttribute('href');
	}
};

var updateFacets = debounce(function() {
	// filter by type

	var typesFilter = document.getElementById('release-notes-types-filter')
	var availableTypes = Object.keys(renderedTicketsByType);
	var visibleTypes = new Set(Array.from(typesFilter.querySelectorAll('input[value]:checked')).map(it => it.value));

	Object.keys(renderedTicketsByType).forEach(type => {
		if (visibleTypes.has(type)) {
			renderedTicketsByType[type].forEach(it => {
				if (it.classList.contains('hide')) {
					it.classList.remove('hide');
				}
			});
		}
		else {
			renderedTicketsByType[type].forEach(it => {
				if (!it.classList.contains('hide')) {
					it.classList.add('hide');
				}
			});
		}
	});

	// filter by component

	var componentsFilter = document.getElementById('release-notes-components-filter')

	var availableComponents = Object.keys(renderedComponents);
	var visibleComponents = new Set(Array.from(componentsFilter.querySelectorAll('input[value]:checked')).map(it => it.value));

	availableComponents.forEach(componentName => {
		if (visibleComponents.has(componentName)) {
			if (renderedComponents[componentName].classList.contains('hide')) {
				renderedComponents[componentName].classList.remove('hide');
			}
		}
		else {
			if (!renderedComponents[componentName].classList.contains('hide')) {
				renderedComponents[componentName].classList.add('hide');
			}
		}
	});

	// recompute type badge values

	var allTicketKeys = availableTypes.reduce((acc, type) => {
		var badge = typesFilter.querySelector('span[data-value="' + type + '"]');

		if (visibleTypes.has(type)) {
			badge.classList.remove('hide');
			var ticketKeys = new Set(renderedTicketsByType[type].filter(it => visibleComponents.has(it.getAttribute('data-jira-ticket-component'))).map(it => it.getAttribute('data-jira-ticket-key')));
			badge.textContent = ticketKeys.size.toLocaleString();

			return acc.union(ticketKeys);
		}
		else {
			if (!badge.classList.contains('hide')) {
				badge.classList.add('hide');
			}

			return acc;
		}
	}, new Set());

	// recompute component badge values

	availableComponents.forEach(componentName => {
		var badge = componentsFilter.querySelector('span[data-value="' + componentName + '"]');

		if (visibleComponents.has(componentName)) {
			badge.classList.remove('hide');
			var ticketKeys = new Set(renderedTicketsByComponent[componentName].filter(it => visibleTypes.has(it.getAttribute('data-jira-ticket-type'))).map(it => it.getAttribute('data-jira-ticket-key')));
			badge.textContent = ticketKeys.size.toLocaleString();

			var headerTicketCountElement = renderedComponents[componentName].querySelector('.component-ticket-count');
			headerTicketCountElement.textContent = '(' + getTicketCountString(ticketKeys.size) + ')';
		}
		else {
			if (!badge.classList.contains('hide')) {
				badge.classList.add('hide');
			}
		}
	});

	// update the total counts

	var ticketCount = allTicketKeys.size;
	var totalTicketCountElements = document.querySelectorAll('.release-notes-total-count');
	totalTicketCountElements.forEach(element => element.textContent = getTicketCountString(ticketCount));

	exportReleaseNotesToCSV(allTicketKeys);
});

function initUI() {
	var requestURL = (document.location.hostname == 'localhost') ? 'releases.json' : ('https://s3-us-west-2.amazonaws.com/mdang.grow/releases.json?t=' + new Date().getTime());

	fetch(requestURL).then(x => x.json()).then(releases => {
		releaseVersions = releases;

		var setIndex = function(select, x) {
			for (var i = 0; i < select.options.length; i++) {
				if (select.options[i].value == x) {
					select.selectedIndex = i;
					return;
				}
			}

			select.selectedIndex = select.options.length - 1;
		};

		Object.keys(releases).forEach(it => {
			var option1 = document.createElement('option');
			var option2 = document.createElement('option');
			option1.value = option1.textContent = option2.value = option2.textContent = it;
			select1.appendChild(option1);
			select2.appendChild(option2);
		});

		setIndex(select1, getParameter('sourceVersion'));
		setIndex(select2, getParameter('targetVersion'));

		var button = document.getElementById('updateButton');
		button.onclick = checkReleaseDetails;

		checkReleaseDetails();
	});
};

initUI();