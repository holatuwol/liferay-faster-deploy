var request = new XMLHttpRequest();
var requestURL = 'changelog.json';

function generateMissingReport(changelog) {
	var releaseIds = Object.keys(changelog).sort();

	document.getElementById('jira-header').textContent = 'Add missing MP tags for ' + releaseIds.join(', ') + ' apps';

	var missingReportEntries = [];

	for (var i = 0; i < releaseIds.length; i++) {
		var releaseId = releaseIds[i];
		var entries = changelog[releaseId];

		for (var j = 0; j < entries.length; j++) {
			var update = entries[j];

			if (update.currentTags.length != 0) {
				continue;
			}
			else if (update.path.indexOf('liferay/') != -1) {
				continue;
			}
			else if (update.category && (update.category == 'Themes')) {
				continue;
			}
			else if (update.labs) {
				continue;
			}

			missingReportEntries.push(generateMissingReportEntry(releaseId, update));
		}
	}

	var jiraText = document.getElementById('jira-text');

	jiraText.innerHTML =
		'||App Name||Version||Branch||Carol\'s tag||Status||\n' + missingReportEntries.join('\n');

	jiraText.onclick = function () {
        jiraText.setSelectionRange(0, jiraText.value.length);
    };
}

function generateMissingReportEntry(releaseId, update) {
	var carolTags = update.carolTags || [];

	var carolTagsText = carolTags
		.map(tag => '[' + tag + '|https://github.com/carolmoreschi/liferay-portal-ee/releases/tags/' + tag + ']')
		.join(' \\ ');

	if (carolTagsText == '') {
		carolTagsText = '(missing)';
	}

	return [
		'',
		update.name.replace('Liferay CE ', '').replace('Liferay ', ''),
		update.version,
		releaseId,
		carolTagsText,
		' ',
		''
	].join('|');
}

function generateChangelog(releaseId, updates) {
	var container = document.createElement('div');

	var header = document.createElement('h1');
	header.textContent = releaseId;
	header.setAttribute('id', releaseId);
	header.classList.add('header');

	container.appendChild(header);

	var toc = document.getElementById('toc');

	var tocEntry = document.createElement('a');
	tocEntry.textContent = releaseId;
	tocEntry.setAttribute('href', '#' + releaseId);

	var tocEntryItem = document.createElement('li');
	tocEntryItem.appendChild(tocEntry);
	toc.appendChild(tocEntryItem);

	var changelog = document.createElement('table');
	changelog.classList.add('changelog');
	changelog.classList.add('sortable-theme-bootstrap');
	changelog.setAttribute('data-sortable', '');

	var thead = document.createElement('thead');
	thead.appendChild(generateChangelogHeaderRow());

	var tbody = document.createElement('tbody');

	for (var i = 0; i < updates.length; i++) {
		var entry = generateChangelogEntry(releaseId, updates[i]);
		tbody.appendChild(entry);
	}

	changelog.appendChild(thead);
	changelog.appendChild(tbody);

	container.appendChild(changelog);

	document.getElementById('changelogs').appendChild(container);

	Sortable.initTable(changelog);
	changelog.querySelector('.app-path').click();
}

function generateChangelogHeaderRow() {
	var headerRow = document.createElement('tr');

	cell = document.createElement('th');
	cell.classList.add('app-name');
	cell.textContent = 'App Name';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-path');
	cell.textContent = 'Source Path';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-version');
	cell.textContent = 'Version';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-version');
	cell.textContent = 'Branch';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-tags');
	cell.textContent = 'Patcher Tag';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-release-date');
	cell.textContent = 'Patcher Date';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-fix-count');
	cell.textContent = 'Unreleased Fix Count';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-fix-list');
	cell.setAttribute('data-sortable', 'false');
	cell.textContent = 'Unreleased Fix IDs';
	headerRow.appendChild(cell);

	return headerRow;
}

function isSameVersion(a, b) {
	var partA = a.split('.').map(function(x) { return parseInt(x); });
	var partB = b.split('.').map(function(x) { return parseInt(x); });

	var maxI = Math.min(partA.length, partB.length);

	for (var i = 0; i < 3; i++) {
		if (partA[i] != partB[i]) {
			return false;
		}
	}

	return true;
}

function compareVersion(a, b) {
	var partA = a.split('.').map(function(x) { return parseInt(x); });
	var partB = b.split('.').map(function(x) { return parseInt(x); });

	var maxI = Math.min(partA.length, partB.length);

	for (var i = 0; i < maxI; i++) {
		if (partA[i] != partB[i]) {
			return partA[i] - partB[i];
		}
	}

	return partA.length - partB.length;
}

function getMarketplaceVersion(tag) {
	var suffix = '';
	var y = tag.lastIndexOf('-');

	if (tag.substring(y + 1) == 'private') {
		suffix = '.private';
		y = tag.lastIndexOf('-', y - 1);
	}

	var x = tag.lastIndexOf('-', y - 1);

	return tag.substring(x + 1, y) + suffix;
}

function compareMarketplaceVersion(a, b) {
	return compareVersion(getMarketplaceVersion(a), getMarketplaceVersion(b));
}

function setCellHTML(cell, html) {
	cell.innerHTML = '<div>' + html + '</div>';
}

function generateChangelogEntry(releaseId, update) {
	var row = document.createElement('tr');

	var cell;

	cell = document.createElement('td');
	cell.classList.add('app-name');

	setCellHTML(cell, '<a href="https://web.liferay.com/marketplace/-/mp/application/' + update.marketplace + '">' + update.name + '</a>');
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-path');

	var githubURL = (update.path.indexOf('liferay/') != -1) ?
		'https://github.com/' + update.path + '/tree/' + update.branch :
			'liferay/liferay-portal-ee/tree/' + releaseId + '/' + update.path;

	setCellHTML(cell, '<a href="' + githubURL + '">' + update.path + '</a>');
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-version');

	setCellHTML(cell, update.version);
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-branch');

	setCellHTML(cell, releaseId);
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-tags');

	var tagsHTML = '';

	if (update.currentTags && (update.currentTags.length > 0)) {
		update.currentTags.sort(compareMarketplaceVersion);

		tagsHTML = update.currentTags.map(function(tag) {
			return '<a href="https://github.com/liferay/liferay-portal-ee/tree/' + tag + '">' + tag + '</a>';
		}).join('<br/>');
	}
	else if (update.path.indexOf('liferay/') != -1) {
		tagsHTML = 'not patchable (subrepository)';
	}
	else if (update.category && (update.category == 'Themes')) {
		tagsHTML = 'not patchable (theme)';
	}
	else if (update.labs) {
		tagsHTML = 'not patchable (labs)';
	}
	else {
		row.classList.add('missing');

		var pastTags = update.pastTags || [];

		pastTags.sort(compareMarketplaceVersion);

		if (pastTags.length > 0) {
			var maxVersion = getMarketplaceVersion(pastTags[pastTags.length - 1]);
			pastTags = pastTags.filter(function(x) {
				return isSameVersion(maxVersion, getMarketplaceVersion(x));
			});
		}

		tagsHTML = pastTags.map(function(tag) {
			return '<a href="https://github.com/liferay/liferay-portal-ee/tree/' + tag + '">' + tag + '</a>';
		}).join('<br/>');

		if (tagsHTML == '') {
			tagsHTML = 'missing current release tag, no past release tags';
		}
		else {
			tagsHTML = 'missing current release tag, latest past release tag:<br/>' + tagsHTML;
		}
	}

	setCellHTML(cell, tagsHTML);
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-release-date');

	setCellHTML(cell, update.releaseDate || 'no changelog');
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-fix-count');

	setCellHTML(cell, update.fixes.length);
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-fix-list');

	setCellHTML(cell, update.fixes.length == 0 ? 'none' : update.fixes.map(createJiraLink).join(', '));
	row.appendChild(cell);

	return row;
}

function createJiraLink(fixId) {
	return '<a href="https://issues.liferay.com/browse/' + fixId + '">' + fixId + '</a>';
}

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		var metadata = JSON.parse(this.responseText);

		document.getElementById('timestamp').textContent = metadata.timestamp;

		var releaseIds = Object.keys(metadata.changelog).sort();

		for (var i = 0; i < releaseIds.length; i++) {
			generateChangelog(releaseIds[i], metadata.changelog[releaseIds[i]]);
		}

		generateMissingReport(metadata.changelog);

		if (document.location.hash) {
			document.getElementById(document.location.hash.substring(1)).scrollIntoView();
		}
	}
};

request.open('GET', requestURL, true);
request.send();