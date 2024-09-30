var modifyState = history.pushState ? history.pushState.bind(history) : null;

var select1 = document.getElementById('sourceVersion');
var select2 = document.getElementById('targetVersion');

var releaseVersions = {};
var releaseDetails = {};

var quarterlies = {
	'2023.q3': 92,
	'2023.q4': 102,
	'2024.q1': 112,
	'2024.q2': 120,
	'2024.q3': 125
};

function checkReleaseDetails() {
	var releaseCountsElement = document.getElementById('release-notes-count');

	releaseCountsElement.textContent = 'Loading...';

	var exportLink = document.getElementById('export-to-csv');

	if (exportLink.href) {
		URL.revokeObjectURL(exportLink.href);
		exportLink.removeAttribute('href');
	}

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

	setTimeout(populateReleaseDetails.bind(null, select1Value, select2Value), 100);
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

function exportReleaseNotesToCSV() {
	var ticketKeys = new Set(Array.from(document.querySelectorAll('.release-notes-component:not(.hide) .release-notes-ticket a[data-jira-ticket-link]')).map(x => x.getAttribute('data-jira-ticket-link')));

	var select1Value = select1.options[select1.selectedIndex].value;
	var select2Value = select2.options[select2.selectedIndex].value;

	var fetchVersions = getFetchVersions(select1Value, select2Value);

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
				'Summary': releaseDetails[version][ticketKey]['summary'],
				'Components': releaseDetails[version][ticketKey]['components'].join('\n'),
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

	var exportLink = document.getElementById('export-to-csv');
	exportLink.setAttribute('download', 'release_notes.csv');
	exportLink.href = URL.createObjectURL(new Blob([Papa.unparse(Object.values(tickets))], {'type': 'text/csv'}));
};

function generateComponentReleaseNotes(releaseCountsListElement, releaseNotesElement, componentName, tickets) {
	var componentElementId = componentName.toLowerCase().replace(/[^a-z]+/g, '_');

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
	headerTicketCountElement.textContent = '(' + getTicketCountString(tickets.length) + ')';
	componentHeaderContainerElement.appendChild(headerTicketCountElement);

	componentElement.appendChild(componentHeaderContainerElement);

	var tableOfContentsListItemElement = document.createElement('li');
	tableOfContentsListItemElement.classList.add('list-group-item');

	var enableCheckboxElement = document.createElement('input');
	enableCheckboxElement.setAttribute('type', 'checkbox');
	enableCheckboxElement.setAttribute('checked', '');
	enableCheckboxElement.setAttribute('name', componentElementId);
	enableCheckboxElement.onchange = toggleComponent;

	tableOfContentsListItemElement.appendChild(enableCheckboxElement);

	var tableOfContentsLinkElement = document.createElement('a');
	tableOfContentsLinkElement.setAttribute('href', '#' + componentElementId);
	tableOfContentsLinkElement.textContent = componentName;
	tableOfContentsListItemElement.appendChild(tableOfContentsLinkElement);

	var tableOfContentsCountElement = document.createElement('span');
	tableOfContentsCountElement.classList.add('badge');
	tableOfContentsCountElement.textContent = tickets.length.toLocaleString();

	tableOfContentsListItemElement.appendChild(tableOfContentsCountElement);

	releaseCountsListElement.appendChild(tableOfContentsListItemElement);

	tickets.forEach(ticket => {
    var ticketKey = ticket['key'];
		var divider = document.createElement('hr');
		divider.classList.add('release-notes-divider');

		componentElement.appendChild(divider);

		var ticketElement = document.createElement('div');
		ticketElement.classList.add('release-notes-ticket');

		var ticketURL = ticketKey.startsWith('CVE-') ? ('https://cve.mitre.org/cgi-bin/cvename.cgi?name=' + ticketKey) : ('https://liferay.atlassian.net/browse/' + ticketKey);

		var ticketAnchorElement = document.createElement('a');
		ticketAnchorElement.setAttribute('data-jira-ticket-link', ticketKey);
		ticketAnchorElement.setAttribute('href', ticketURL);
		ticketAnchorElement.setAttribute('target', '_blank');
		ticketAnchorElement.textContent = ticketKey;

		var headerElement = document.createElement('h3');
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

		componentElement.appendChild(ticketElement);
	});

	releaseNotesElement.appendChild(componentElement);
};

function generateReleaseNotes(fetchVersions, sourceUpdate, sourceQuarterly, sourcePatch, targetUpdate, targetQuarterly, targetPatch, releaseName) {
	if (releaseName) {
		fetchVersions.delete(releaseName);
	}

	if (fetchVersions.size > 0) {
		return;
	}

	var tickets = {};

	var sourceVersion, targetVersion;

	if (sourceQuarterly) {
		sourceVersion = sourceQuarterly + '.' + sourcePatch;
	}
	else {
		sourceVersion = '7.4.13-u' + sourceUpdate;
	}

	if (targetQuarterly) {
		targetVersion = targetQuarterly + '.' + targetPatch;
	}
	else {
		targetVersion = '7.4.13-u' + targetUpdate;
	}

	Object.assign(tickets, releaseDetails[targetVersion]);

	if (sourceVersion != targetVersion) {
		for (var i = sourceUpdate + 1; i < targetUpdate; i++) {
			var version = '7.4.13-u' + i;
			Object.assign(tickets, releaseDetails[version]);
		}

		if (targetQuarterly) {
			for (var i = 0; i < targetPatch; i++) {
				var version = targetQuarterly + '.' + i;

				if (!(version in releaseDetails)) {
					continue;
				}

				Object.assign(tickets, releaseDetails[version]);
			}

		}

		if (sourceQuarterly) {
			for (var i = 92; i <= sourceUpdate; i++) {
				var version = '7.4.13-u' + i;

				if (!(version in releaseDetails)) {
					continue;
				}

				for (ticketKey in releaseDetails[version]) {
					delete tickets[ticketKey];
				}
			}

			for (var i = 0; i <= sourcePatch; i++) {
				var version = sourceQuarterly + '.' + i;

				if (!(version in releaseDetails)) {
					continue;
				}

				for (ticketKey in releaseDetails[version]) {
					delete tickets[ticketKey];
				}
			}
		}
	}

	generateReleaseNotesHelper(tickets);
	exportReleaseNotesToCSV();
};

function generateReleaseNotesHelper(tickets) {
	var releaseCountsElement = document.getElementById('release-notes-count');

	releaseCountsElement.innerHTML = '';

	var releaseNotesElement = document.getElementById('release-notes-details');

	var ticketCount = Object.keys(tickets).length;

  var releaseCountsListElement = document.createElement('ul');
  releaseCountsListElement.classList.add('list-group');
  releaseCountsElement.appendChild(releaseCountsListElement);  

	var selectAllListItemElement = document.createElement('li');
	selectAllListItemElement.classList.add('list-group-item', 'active');
	releaseCountsListElement.appendChild(selectAllListItemElement);

	var selectAllCheckboxElement = document.createElement('input');
	selectAllCheckboxElement.setAttribute('type', 'checkbox');
	selectAllCheckboxElement.setAttribute('checked', '');
	selectAllCheckboxElement.setAttribute('id', 'select_all');
	selectAllListItemElement.appendChild(selectAllCheckboxElement);

	selectAllCheckboxElement.onclick = function() {
		var selectAll = this.checked;
		var changeEvent = new Event('change');
		document.querySelectorAll(
			'#release-notes-count .list-group-item:not(.active) input[type="checkbox"]' +
				(selectAll ? ':not(:checked)' : ':checked'))
			.forEach(checkbox => {
				checkbox.checked = selectAll;
				checkbox.dispatchEvent(changeEvent);
			});
	};

	var totalTicketCountElement = document.createElement('span');
	totalTicketCountElement.classList.add('badge');
	totalTicketCountElement.setAttribute('id', 'release-notes-total-count');
	totalTicketCountElement.textContent = getTicketCountString(ticketCount);
	selectAllListItemElement.appendChild(totalTicketCountElement);

	var ticketsByComponent = Object.keys(tickets).reduce((acc, ticketKey) => {
		var ticket = Object.assign({}, tickets[ticketKey]);
		ticket['key'] = ticketKey;

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

	Object.keys(ticketsByComponent).sort().forEach(componentName => {
		generateComponentReleaseNotes(releaseCountsListElement, releaseNotesElement, componentName, ticketsByComponent[componentName]);
	})
};

function getFetchVersions(sourceVersion, targetVersion) {
	var sourceUpdate = getUpdate(sourceVersion);
	var targetUpdate = getUpdate(targetVersion);

	var fetchVersions = new Set();

	for (var i = sourceUpdate; i <= targetUpdate; i++) {
		fetchVersions.add('7.4.13-u' + i);
	}

	if (sourceUpdate != targetVersion) {
		for (var i = 92; i <= sourceUpdate; i++) {
			fetchVersions.add('7.4.13-u' + i);
		}

		for (var i = 92; i <= targetUpdate; i++) {
			fetchVersions.add('7.4.13-u' + i);
		}
	}

	var sourceQuarterly = getQuarterly(sourceVersion);
	var sourcePatch = getPatch(sourceVersion);

	for (var i = 0; i <= sourcePatch; i++) {
		fetchVersions.add(sourceQuarterly + '.' + i);
	}

	var targetQuarterly = getQuarterly(targetVersion);
	var targetPatch = getPatch(targetVersion);

	for (var i = 0; i <= targetPatch; i++) {
		fetchVersions.add(targetQuarterly + '.' + i);
	}

	return fetchVersions;
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

function getPreviousQuarterly(update) {
	var maxYear = new Date().getUTCFullYear();

	for (var i = maxYear; i >= 2023; i--) {
		for (var j = 4; j > 0; j--) {
			var quarterlyName = i + '.q' + j;

			if (!(quarterlyName in quarterlies)) {
				continue;
			}

			if (update > quarterlies[quarterlyName]) {
				return quarterlyName;
			}
		}
	}

	return null;
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
		return parseInt(version.substring(version.indexOf('-u') + 2));
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
	var fetchVersions = getFetchVersions(sourceVersion, targetVersion);

	var joinCallback = generateReleaseNotes.bind(
		null, fetchVersions,
		getUpdate(sourceVersion), getQuarterly(sourceVersion), getPatch(sourceVersion),
		getUpdate(targetVersion), getQuarterly(targetVersion), getPatch(targetVersion));

	if (fetchVersions.size == 0) {
		joinCallback();
	}
	else {
		fetchVersions.forEach(version => loadReleaseDetails(version, joinCallback));
	}
};

function toggleComponent() {
	var componentElementId = this.getAttribute('name');
	var componentElement = document.getElementById(componentElementId);

	if (this.checked) {
		componentElement.classList.remove('hide');
	}
	else {
		componentElement.classList.add('hide');
	}

	var ticketCount = new Set(Array.from(document.querySelectorAll('.release-notes-component:not(.hide) .release-notes-ticket a[data-jira-ticket-link]')).map(x => x.getAttribute('data-jira-ticket-link'))).size;

	var totalTicketCountElement = document.getElementById('release-notes-total-count');
	totalTicketCountElement.textContent = getTicketCountString(ticketCount);
};

function initUI() {
	var requestURL = ((document.location.hostname == 'localhost') ? '' : 'https://s3-us-west-2.amazonaws.com/mdang.grow/') + 'releases.json';

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