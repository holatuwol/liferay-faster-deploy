function getParameter(name) {
	if (!location.search) {
		return '';
	}

	var re = new RegExp('[?&]' + name + '=([^&]*)');
	var m = re.exec(location.search);
	return m ? m[1] : '';
};

var versionInfoList = null;

var select1 = document.getElementById('sourceVersion');
var select1Value = getParameter('sourceVersion');
var select2 = document.getElementById('targetVersion');
var select2Value = getParameter('targetVersion');
var nameFilter = document.getElementById('nameFilter');
nameFilter.value = getParameter('nameFilter');

function isPermaLink(element) {
	return element.getAttribute('data-original-title') == 'Permalink'
};

function checkVersionInfo() {
	// https://stackoverflow.com/questions/12508225/how-do-we-update-url-or-query-strings-using-javascript-jquery-without-reloading

	if (history.pushState) {
		var baseURL = window.location.protocol + "//" + window.location.host + window.location.pathname;

		if (window.location.pathname == '/share') {
			baseURL = Array.from(document.getElementsByTagName('a')).filter(isPermaLink)[0].href;
		}

		var newURL = baseURL + '?sourceVersion=' + select1.options[select1.selectedIndex].value + '&targetVersion=' + select2.options[select2.selectedIndex].value;

		if (nameFilter.value) {
			newURL += '&nameFilter=' + nameFilter.value;
		}

		history.pushState({path: newURL}, '', newURL);
	}

	var name1 = 'version_' + select1.options[select1.selectedIndex].value;
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'version_' + select2.options[select2.selectedIndex].value;
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	var nameFilterValue = nameFilter.value;

	var isMatchingNameFilter = function(versionInfo) {
		return (versionInfo['group'].indexOf(nameFilterValue) != -1) || (versionInfo['name'].indexOf(nameFilterValue) != -1);
	};

	var isAvailableVersion = function(versionInfo) {
		var version1 = versionInfo[name1];
		var version2 = versionInfo[name2];

		return (version1 != '0.0.0') || (version2 != '0.0.0');
	};

	var filteredVersionInfoList = versionInfoList.filter(isMatchingNameFilter).filter(isAvailableVersion);

	var summary = document.getElementById('summary');
	summary.innerHTML = '';

	var table = document.createElement('table');
	table.className = 'table';
	summary.appendChild(table);
	var tableBody = document.createElement('tbody');
	table.appendChild(tableBody);
	table = tableBody;

	var getRowBackgroundAlpha = function(version1, version2) {
		return (version1 != version2) ? 0.1 : 0.0;
	};

	var getRowForegroundAlpha = function(version1, version2) {
		return (version1 != version2) ? 0.9 : 0.4;
	};

	var addRow = function(isHeader, rowData) {
		var row = document.createElement('tr');

		if (!isHeader && (rowData.length > 3)) {
			row.style.color = 'rgba(0,0,0,' + getRowForegroundAlpha(rowData[2], rowData[3]) + ')'
			row.style.backgroundColor = 'rgba(0,0,0,' + getRowBackgroundAlpha(rowData[2], rowData[3]) + ')';
		}

		for (var i = 0; i < rowData.length; i++) {
			var cell = document.createElement(isHeader ? 'th' : 'td');
			cell.innerHTML = rowData[i];
			row.appendChild(cell);
		}

		table.appendChild(row);
	};

	if (name1 == name2) {
		addRow(true, ['group', 'name', header1]);
	}
	else {
		addRow(true, ['group', 'name', header1, header2]);
	}

	var getRowData = function(versionInfo) {
		if (name1 == name2) {
			return [versionInfo['group'], versionInfo['name'], versionInfo[name1]];
		}
		else {
			return [versionInfo['group'], versionInfo['name'], versionInfo[name1], versionInfo[name2]];
		}
	};

	filteredVersionInfoList.map(getRowData).forEach(addRow.bind(null, false));
};

checkVersionInfo = _.debounce(checkVersionInfo, 200);

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/dxpmodules.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		versionInfoList = JSON.parse(this.responseText);

		var prefix = 'version_';

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

		var fixPackIds = Object.keys(versionInfoList[0])
			.filter(x => x.indexOf(prefix) == 0)
			.map(x => x.substring(prefix.length));

		fixPackIds.reduce(addFixPack, select1);
		fixPackIds.reduce(addFixPack, select2);

		setIndex(select1, select1Value);
		setIndex(select2, select2Value);

		select1.onchange = checkVersionInfo;
		select2.onchange = checkVersionInfo;
		nameFilter.oninput = checkVersionInfo;
		nameFilter.onpropertychange = checkVersionInfo;

		checkVersionInfo();
	}
};

request.open('GET', requestURL, true);
request.send();
