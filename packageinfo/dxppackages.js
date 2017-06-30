var packageInfoList = null;

var select1 = document.getElementById('sourceVersion');
var select2 = document.getElementById('targetVersion');
var nameFilter = document.getElementById('nameFilter');
var notableOnly = document.getElementById('notableOnly');

function checkPackageInfo() {
	var name1 = 'packageVersion_' + select1.options[select1.selectedIndex].value;
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'packageVersion_' + select2.options[select2.selectedIndex].value;
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	var nameFilterValue = nameFilter.value;
	var notableOnlyValue = notableOnly.checked;

	var isDEVersionIncrease = (name2 > name1);

	var isMatchingNameFilter = function(packageInfo) {
		return (packageInfo['name'].indexOf(nameFilterValue) != -1) || (packageInfo['package'].indexOf(nameFilterValue) != -1);
	};

	var isAvailableVersion = function(packageInfo) {
		var version1 = packageInfo[name1];
		var version2 = packageInfo[name2];

		return (version1 != '0.0.0') || (version2 != '0.0.0');
	};

	var isNotableVersionChange = function(packageInfo) {
		var name = packageInfo['name'];

		var version1 = packageInfo[name1];
		var version2 = packageInfo[name2];

		var pos11 = version1.indexOf('.');
		var majorVersion1 = version1.substring(0, pos11);

		var pos21 = version2.indexOf('.');
		var majorVersion2 = version2.substring(0, pos21);

		if (majorVersion1 != majorVersion2) {
			return (majorVersion1 != '0') || !isDEVersionIncrease;
		}

		if (isDEVersionIncrease) {
			return false;
		}

		var pos12 = version1.indexOf('.', pos11 + 1);
		var minorVersion1 = version1.substring(pos11, pos12);

		var pos22 = version2.indexOf('.', pos21 + 1);
		var minorVersion2 = version2.substring(pos21, pos22);

		return minorVersion1 != minorVersion2;
	};

	var summary = document.getElementById('summary');

	var filteredPackageInfoList = packageInfoList.filter(isMatchingNameFilter).filter(isAvailableVersion);

	if ((name1 != name2) && notableOnlyValue) {
		filteredPackageInfoList = filteredPackageInfoList.filter(isNotableVersionChange);
	}

	summary.innerHTML = '';

	var table = document.createElement('table');
	table.className = 'table';
	summary.appendChild(table);

	var addRow = function(isHeader, rowData) {
		var row = document.createElement('tr');

		for (var i = 0; i < rowData.length; i++) {
			var cell = document.createElement(isHeader ? 'th' : 'td');
			cell.innerHTML = rowData[i];
			row.appendChild(cell);
		}

		table.appendChild(row);
	};

	if (name1 == name2) {
		addRow(true, ['Artifact Name', 'Package Name', header1]);
	}
	else {
		addRow(true, ['Artifact Name', 'Package Name', header1, header2]);
	}

	var getRowData = function(packageInfo) {
		if (name1 == name2) {
			return [packageInfo['name'], packageInfo['package'], packageInfo[name1]];
		}
		else {
			return [packageInfo['name'], packageInfo['package'], packageInfo[name1], packageInfo[name2]];
		}
	};

	filteredPackageInfoList.map(getRowData).forEach(addRow.bind(null, false));
};

checkPackageInfo = _.debounce(checkPackageInfo, 100);

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/dxppackages.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		packageInfoList = JSON.parse(this.responseText);

		var prefix = 'packageVersion_';

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

		var fixPackIds = Object.keys(packageInfoList[0])
			.filter(x => x.indexOf(prefix) == 0)
			.map(x => x.substring(prefix.length));

		fixPackIds.reduce(addFixPack, select1);
		fixPackIds.reduce(addFixPack, select2);

		select1.selectedIndex = fixPackIds.length - 1;
		select2.selectedIndex = fixPackIds.length - 1;

		select1.onchange = checkPackageInfo;
		select2.onchange = checkPackageInfo;
		nameFilter.oninput = checkPackageInfo;
		nameFilter.onpropertychange = checkPackageInfo;
		notableOnly.onchange = checkPackageInfo;

		checkPackageInfo();
	};
};

request.open('GET', requestURL, true);
request.send();