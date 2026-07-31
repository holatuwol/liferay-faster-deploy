var schemaInfoList = null;

var versionFilter = document.getElementById('versionFilter');

var getReleaseLink = function(schemaInfo, name) {
	var tag = schemaInfo[name]

	if (!tag) {
		return '0.0.0';
	}

	return '<a target="_blank" href="' + schemaInfo.github + '/releases/tag/' + schemaInfo.tag.replace('${1}', tag) + '">' + tag + '</a>';
};

function toggleVisibleVersions() {
	var table = versionFilter.closest('table');

	var suffixes = ['', '-70', '-71', '-72', '-73', '-74'];

	for (var i = 0; i < suffixes.length; i++) {
		table.classList.remove('ce' + suffixes[i]);
		table.classList.remove('dxp' + suffixes[i]);
	}

	var value = versionFilter.options[versionFilter.selectedIndex].value;

	if (value) {
		table.classList.add(value);
	}
}

function updateCompleteVersionHistory(fixPackIds) {
	var libraryNames = document.getElementById('libraryNames');

	if (!libraryNames) {
		return;
	}

	var rows = fixPackIds.map(function(x) {
		var row = document.createElement('tr');
		var baseVersion = x.substring(0, 2);

		if (x.indexOf('-ga') == -1) {
			row.classList.add('dxp');
			row.classList.add('dxp-' + baseVersion);
		}
		else {
			row.classList.add('ce')
			row.classList.add('ce-' + baseVersion);
		}

		var cell = document.createElement('th');
		cell.textContent = x;
		row.appendChild(cell);

		return row;
	})

	for (var i = 0; i < schemaInfoList.length; i++) {
		var schemaInfo = schemaInfoList[i];

		var headerCell = document.createElement('th');
		headerCell.textContent = schemaInfo.name;
		libraryNames.appendChild(headerCell);

		for (var j = 0; j < fixPackIds.length; j++) {
			var version = fixPackIds[j];

			var row = rows[j];
			var cell = document.createElement('td');
			cell.innerHTML = getReleaseLink(schemaInfo, version);
			row.appendChild(cell);
		}
	}

	var libraryVersions = document.getElementById('libraryVersions');

	for (var i = 0; i < rows.length; i++) {
		libraryVersions.appendChild(rows[i]);
	}
};

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/dxpjslibrary.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		schemaInfoList = JSON.parse(this.responseText);

		var fixPackIds = Object.keys(schemaInfoList[0])
			.filter(function(x) { return x != 'name' && x != 'github' && x != 'tag'; })
			.sort(compareFixPackIds);

		if (versionFilter) {
			updateCompleteVersionHistory(fixPackIds);
			versionFilter.onchange = toggleVisibleVersions;
		}
	};
};

request.open('GET', requestURL, true);
request.send();
