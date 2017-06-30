var versionInfoList = null;

var select1 = document.getElementById('sourceVersion');
var select2 = document.getElementById('targetVersion');
var nameFilter = document.getElementById('nameFilter');

function checkVersionInfo() {
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

	var getRowBackgroundAlpha = function(version1, version2) {
		if (version1 != version2) {
			return 0.1;
		}

		return 0.0;
	};

	var addRow = function(isHeader, rowData) {
		var row = document.createElement('tr');

		if (!isHeader && (rowData.length > 3)) {
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

		var fixPackIds = Object.keys(versionInfoList[0])
			.filter(x => x.indexOf(prefix) == 0)
			.map(x => x.substring(prefix.length));

		fixPackIds.reduce(addFixPack, select1);
		fixPackIds.reduce(addFixPack, select2);

		select1.selectedIndex = fixPackIds.length - 1;
		select2.selectedIndex = fixPackIds.length - 1;

		select1.onchange = checkVersionInfo;
		select2.onchange = checkVersionInfo;
		nameFilter.oninput = checkVersionInfo;
		nameFilter.onpropertychange = checkVersionInfo;

		checkVersionInfo();
	}
};

request.open('GET', requestURL, true);
request.send();
