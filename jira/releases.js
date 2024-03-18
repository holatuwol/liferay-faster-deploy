function getParameter(name) {
	if (!location.search) {
		return '';
	}

	var re = new RegExp('[?&]' + name + '=([^&]*)');
	var m = re.exec(location.search);
	return m ? m[1] : '';
};

var modifyState = history.pushState ? history.pushState.bind(history) : null;

var select1 = document.getElementById('sourceVersion');
var select2 = document.getElementById('targetVersion');

var releaseVersions = {};
var releaseDetails = {};

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
}

function generateReleasePages(fetchVersions, sourceUpdate, sourceQuarterly, sourcePatch, targetUpdate, targetQuarterly, targetPatch, releaseName) {
	if (releaseName) {
		fetchVersions.delete(releaseName);
	}

	if (fetchVersions.size > 0) {
		return;
	}

	var tickets = {};

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

		var version = targetQuarterly + '.' + targetPatch;
		Object.assign(tickets, releaseDetails[version]);
	}
	else {
		var version = '7.4.13-u' + targetUpdate;
		Object.assign(tickets, releaseDetails[version]);
	}

	if (sourceUpdate != targetUpdate || sourceQuarterly != targetQuarterly) {
		for (var i = 92; i <= sourceUpdate; i++) {
			var version = '7.4.13-u' + i;

			if (!(version in releaseDetails)) {
				continue;
			}

			for (ticketKey in releaseDetails[version]) {
				delete tickets[ticketKey];
			}
		}

		if (sourceQuarterly) {
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

	var releaseCountsElement = document.getElementById('release-notes-count');
	var releaseNotesElement = document.getElementById('release-notes-details');

	var ticketKeys = Object.keys(tickets);

	releaseCountsElement.textContent = ticketKeys.length.toLocaleString() + ' ticket(s)';

	ticketKeys.sort().forEach(ticketKey => {
		var divider = document.createElement('hr');
		divider.classList.add('release-notes-divider');

		releaseNotesElement.appendChild(divider);

		var ticket = tickets[ticketKey];

		var ticketElement = document.createElement('div');
		ticketElement.classList.add('release-notes-ticket');

		var ticketURL = ticketKey.startsWith('CVE-') ? ('https://cve.mitre.org/cgi-bin/cvename.cgi?name=' + ticketKey) : ('https://liferay.atlassian.net/browse/' + ticketKey);

		var ticketAnchorElement = document.createElement('a');
		ticketAnchorElement.setAttribute('href', ticketURL);
		ticketAnchorElement.setAttribute('target', '_blank');
		ticketAnchorElement.textContent = ticketKey;

		var headerElement = document.createElement('h1');
		headerElement.appendChild(ticketAnchorElement);

		ticketElement.appendChild(headerElement);

		var summaryElement = document.createElement('h2');
		summaryElement.appendChild(document.createTextNode(ticket['summary']));

		ticketElement.appendChild(summaryElement);

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

		releaseNotesElement.appendChild(ticketElement);
	});
}

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
}

var quarterlies = {
	'2023.q3': 92,
	'2023.q4': 102,
	'2024.q1': 112
};

function populateReleaseDetails(sourceVersion, targetVersion) {
	var getUpdate = function(version) {
		if (version.indexOf('-u') != -1) {
			return parseInt(version.substring(version.indexOf('-u') + 2));
		}
		else {
			return quarterlies[version.substring(0, 7)];
		}
	};

	var sourceUpdate = getUpdate(sourceVersion);
	var targetUpdate = getUpdate(targetVersion);

	var fetchVersions = new Set();

	for (var i = sourceUpdate; i <= targetUpdate; i++) {
		fetchVersions.add('7.4.13-u' + i);
	}

	for (var i = 92; i <= sourceUpdate; i++) {
		fetchVersions.add('7.4.13-u' + i);
	}

	for (var i = 92; i <= targetUpdate; i++) {
		fetchVersions.add('7.4.13-u' + i);
	}

	var getQuarterly = function(version) {
		if (version.indexOf('.q') == -1) {
			return undefined;
		}
		else {
			return version.substring(0, 7);
		}
	}

	var getPatch = function(version) {
		if (version.indexOf('.q') == -1) {
			return -1;
		}
		else {
			return parseInt(version.substring(8));
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

	var joinCallback = generateReleasePages.bind(
		null, fetchVersions,
		sourceUpdate, sourceQuarterly, sourcePatch,
		targetUpdate, targetQuarterly, targetPatch);

	if (fetchVersions.size == 0) {
		joinCallback();
	}
	else {
		fetchVersions.forEach(version => loadReleaseDetails(version, joinCallback));
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

	setTimeout(populateReleaseDetails.bind(null, select1Value, select2Value), 100);
}

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
}

initUI();