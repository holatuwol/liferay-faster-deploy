var request = new XMLHttpRequest();
var requestURL = 'changelog.json';

function generateChangelog(releaseId, updates) {
	var container = document.createElement('div');

	var header = document.createElement('h1');
	header.textContent = releaseId;
	header.classList.add('header');

	container.appendChild(header);

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
	cell.textContent = 'Fix IDs';
	headerRow.appendChild(cell);

	return headerRow;
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
	}
};

request.open('GET', requestURL, true);
request.send();