var request = new XMLHttpRequest();
var requestURL = 'changelog.json';

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
	cell.textContent = 'Name and Version';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-path');
	cell.textContent = 'Source Path';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-tag-name');
	cell.textContent = 'Patcher Tag';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-release-date');
	cell.textContent = 'Release Commit Date';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-fix-count');
	cell.textContent = 'Count';
	headerRow.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('app-fixes');
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

function generateChangelogEntry(releaseId, update) {
	var row = document.createElement('tr');

	var cell;

	cell = document.createElement('td');
	cell.classList.add('app-name');
	cell.innerHTML = '<a href="https://web.liferay.com/marketplace/-/mp/application/' + update.marketplace + '">' + update.name + '</a> (' + update.version + ')';
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-path');

	var githubURL = (update.path.indexOf('liferay/') != -1) ?
		'https://github.com/' + update.path + '/tree/' + update.branch :
			'liferay/liferay-portal-ee/tree/' + releaseId + '/' + update.path;

	cell.innerHTML = '<a href="' + githubURL + '">' + update.path + '</a>';
	row.appendChild(cell);

	cell = document.createElement('td');

	if (update.currentTags && (update.currentTags.length > 0)) {
		update.currentTags.sort(compareMarketplaceVersion);

		var tags = update.currentTags.map(function(tag) {
			return '<a href="https://github.com/liferay/liferay-portal-ee/tree/' + tag + '">' + tag + '</a>';
		}).join('<br/>');

		cell.innerHTML = tags;
	}
	else if (update.path.indexOf('liferay/') != -1) {
		cell.textContent = 'not patchable (subrepository)';
	}
	else if (update.category && (update.category == 'Themes')) {
		cell.textContent = 'not patchable (theme)';
	}
	else if (update.labs) {
		cell.textContent = 'not patchable (labs)';
	}
	else {
		cell.classList.add('missing');

		var pastTags = update.pastTags || [];

		pastTags.sort(compareMarketplaceVersion);

		if (pastTags.length > 0) {
			var maxVersion = getMarketplaceVersion(pastTags[pastTags.length - 1]);
			pastTags = pastTags.filter(function(x) {
				return isSameVersion(maxVersion, getMarketplaceVersion(x));
			});
		}

		var tags = pastTags.map(function(tag) {
			return '<a href="https://github.com/liferay/liferay-portal-ee/tree/' + tag + '">' + tag + '</a>';
		}).join('<br/>');

		cell.innerHTML = 'missing current release tag, ' + (tags == '' ? 'no past release tags' : 'latest past release tag:' + '<br/>' + tags);
	}

	cell.classList.add('app-tag-name');
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.textContent = update.releaseDate || 'no changelog';
	cell.classList.add('app-release-date');
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-fix-count');
	cell.textContent = update.fixes.length;
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('app-fixes');
	cell.innerHTML = update.fixes.length == 0 ? 'none' : update.fixes.map(createJiraLink).join(', ');
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

		if (document.location.hash) {
			document.getElementById(document.location.hash.substring(1)).scrollIntoView();
		}
	}
};

request.open('GET', requestURL, true);
request.send();