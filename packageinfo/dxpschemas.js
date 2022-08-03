function getParameter(name) {
	if (!location.search) {
		return '';
	}

	var re = new RegExp('[?&]' + name + '=([^&]*)');
	var m = re.exec(location.search);
	return m ? m[1] : '';
};

var schemaInfoList = null;
var modifyState = history.pushState ? history.pushState.bind(history) : null;

var select1 = document.getElementById('sourceVersion');
var select1Value = getParameter('sourceVersion');
var select2 = document.getElementById('targetVersion');
var select2Value = getParameter('targetVersion') || select1Value;
var nameFilter = document.getElementById('nameFilter');
nameFilter.value = getParameter('nameFilter');

var changeFilter = document.getElementById('changeFilter');

if (changeFilter) {
	var selectedIndex = 0;

	if (getParameter('notableOnly')) {
		selectedIndex = 2;
	}
	else if (getParameter('changesOnly')) {
		selectedIndex = 1;
	}

	changeFilter.selectedIndex = selectedIndex;
}

function isPermaLink(element) {
	return element.getAttribute('data-original-title') == 'Permalink'
};

function checkSchemaInfo() {
	// https://stackoverflow.com/questions/12508225/how-do-we-update-url-or-query-strings-using-javascript-jquery-without-reloading

	if (modifyState) {
		var baseURL = window.location.protocol + "//" + window.location.host + window.location.pathname;

		if (window.location.host == 'grow.liferay.com') {
			var permaLinks = Array.from(document.getElementsByTagName('a')).filter(isPermaLink);

			if (permaLinks.length > 0) {
				baseURL = permaLinks[0].href;
			}
		}

		var newURL = baseURL + '?sourceVersion=' + select1.options[select1.selectedIndex].value;

		if (select1.options[select1.selectedIndex].value != select2.options[select2.selectedIndex].value) {
			newURL += '&targetVersion=' + select2.options[select2.selectedIndex].value;
		}

		if (nameFilter.value) {
			newURL += '&nameFilter=' + nameFilter.value;
		}

		if (changeFilter) {
			if (changeFilter.selectedIndex == 2) {
				newURL += '&notableOnly=true';
			}
			else if (changeFilter.selectedIndex == 1) {
				newURL += '&changesOnly=true';
			}
		}

		modifyState({path: newURL}, '', newURL);
		modifyState = history.replaceState.bind(history);
	}

	var name1 = 'requireSchemaVersion_' + select1.options[select1.selectedIndex].value;
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'requireSchemaVersion_' + select2.options[select2.selectedIndex].value;
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	if (changeFilter && (name1 == name2)) {
		changeFilter.selectedIndex = 0;
		changeFilter.disabled = true
	}
	else {
		changeFilter.disabled = false;
	}

	var nameFilterValue = nameFilter.value;

	var changeFilterValue = changeFilter ? changeFilter.selectedIndex : 0;
	var changesOnlyValue = changeFilterValue == 1;
	var notableOnlyValue = changeFilterValue == 2;

	var isDEVersionIncrease = (name2 > name1);

	var isMatchingNameFilter = function(schemaInfo) {
		return (schemaInfo['name'].indexOf(nameFilterValue) != -1);
	};

	var isAvailableVersion = function(schemaInfo) {
		var version1 = schemaInfo[name1];
		var version2 = schemaInfo[name2];

		return (version1 != '0.0.0') || (version2 != '0.0.0');
	};

	var isVersionChange = function(schemaInfo) {
		var name = schemaInfo['name'];

		var version1 = schemaInfo[name1];
		var version2 = schemaInfo[name2];

		return version1 != version2;
	};

	var isNotableVersionChange = function(schemaInfo) {
		var name = schemaInfo['name'];

		var version1 = schemaInfo[name1];
		var version2 = schemaInfo[name2];

		if ((version1.indexOf('(implicit)') != -1) && (version2.indexOf('(implicit)') != -1)) {
			return false;
		}

		return (version1 != '0.0.0') && (version2 != '0.0.0') && (version1 != version2);
	};

	var filteredSchemaInfoList = schemaInfoList.filter(isMatchingNameFilter).filter(isAvailableVersion);

	if ((name1 != name2) && changesOnlyValue) {
		filteredSchemaInfoList = filteredSchemaInfoList.filter(isVersionChange);
	}

	if ((name1 != name2) && notableOnlyValue) {
		filteredSchemaInfoList = filteredSchemaInfoList.filter(isNotableVersionChange);
	}

	var table = document.getElementById('summary');
	table.innerHTML = '';

	var getRowBackgroundAlpha = function(version1, version2) {
		return (version1 != version2) ? 0.1 : 0.0;
	};

	var getRowForegroundAlpha = function(version1, version2) {
		return (version1 != version2) ? 0.9 : 0.4;
	};

	var addRow = function(rowData) {
		var row = document.createElement('tr');

		if (rowData.length > 2) {
			row.style.color = 'rgba(0,0,0,' + getRowForegroundAlpha(rowData[1], rowData[2]) + ')'
			row.style.backgroundColor = 'rgba(0,0,0,' + getRowBackgroundAlpha(rowData[1], rowData[2]) + ')';
		}

		for (var i = 0; i < rowData.length; i++) {
			var cell = document.createElement('td');
			cell.innerHTML = rowData[i];

			if ((rowData.length == 2) && (i == 1)) {
				cell.setAttribute('colspan', 2);
			}

			row.appendChild(cell);
		}

		table.appendChild(row);
	};

	var getRowData = function(schemaInfo) {
		if (name1 == name2) {
			return [schemaInfo['name'], schemaInfo[name1]];
		}
		else {
			return [schemaInfo['name'], schemaInfo[name1], schemaInfo[name2]];
		}
	};

	filteredSchemaInfoList.map(getRowData).forEach(addRow);
};

checkSchemaInfo = _.debounce(checkSchemaInfo, 100);

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/dxpschemas.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		schemaInfoList = JSON.parse(this.responseText);

		var prefix = 'requireSchemaVersion_';

		var addFixPack = function(select, x) {
			for (var i = 0; i < select.options.length; i++) {
				if (select.options[i].value == x) {
					return select;
				}
			}

			var option = document.createElement('option');

			option.value = x;
			option.innerHTML = x;
			select.appendChild(option);

			return select;
		};

		var setIndex = function(select, x) {
			for (var i = 0; i < select.options.length; i++) {
				if (select.options[i].value == x) {
					select.selectedIndex = i;
					return;
				}
			}

			select.selectedIndex = select.options.length - 1;
		};

		var getBaseVersion = function(a) {
			return parseInt(a.substring(0, a.indexOf('-')));
		}

		var getFixPackVersion = function(a) {
			var fixPackVersion = a.substring(a.lastIndexOf('-') + 1);

			if (fixPackVersion.indexOf('ga') == 0) {
				return parseInt(fixPackVersion.substring(2));
			}

			if (fixPackVersion.indexOf('u') == 0) {
				return parseInt(fixPackVersion.substring(1));
			}

			return parseInt(fixPackVersion);
		}

		var fixPackIds = Object.keys(schemaInfoList[0])
			.filter(x => x.indexOf(prefix) == 0)
			.map(x => x.substring(prefix.length))
			.sort(function(a, b) {
				var x1 = getBaseVersion(a);
				var x2 = getBaseVersion(b);

				if (x1 != x2) {
					return x1 - x2;
				}

				x1 = getFixPackVersion(a);
				x2 = getFixPackVersion(b);

				return x1 - x2;
			});

		fixPackIds.reduce(addFixPack, select1);
		fixPackIds.reduce(addFixPack, select2);

		setIndex(select1, select1Value);
		setIndex(select2, select2Value);

		select1.onchange = checkSchemaInfo;
		select2.onchange = checkSchemaInfo;
		nameFilter.oninput = checkSchemaInfo;
		nameFilter.onpropertychange = checkSchemaInfo;

		if (changeFilter) {
			changeFilter.onchange = checkSchemaInfo;
		}

		checkSchemaInfo();
	};
};

request.open('GET', requestURL, true);
request.send();