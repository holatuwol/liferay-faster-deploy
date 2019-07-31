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

function isPermaLink(element) {
	return element.getAttribute('data-original-title') == 'Permalink'
};

function checkLibraryInfo() {
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

		modifyState({path: newURL}, '', newURL);
		modifyState = history.replaceState.bind(history);
	}

	var name1 = select1.options[select1.selectedIndex].value;
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = select2.options[select2.selectedIndex].value;
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	var nameFilterValue = nameFilter.value;
	var isDEVersionIncrease = (name2 > name1);

	var isMatchingNameFilter = function(schemaInfo) {
		return (schemaInfo['name'].indexOf(nameFilterValue) != -1);
	};

	var isAvailableVersion = function(schemaInfo) {
		var version1 = schemaInfo[name1];
		var version2 = schemaInfo[name2];

		return (version1 && version1 != '0.0.0') || (version2 && version2 != '0.0.0');
	};

	var isVersionChange = function(schemaInfo) {
		var name = schemaInfo['name'];

		var version1 = schemaInfo[name1];
		var version2 = schemaInfo[name2];

		return version1 != version2;
	};

	var filteredSchemaInfoList = schemaInfoList.filter(isMatchingNameFilter).filter(isAvailableVersion);

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

	var getReleaseLink = function(schemaInfo, name) {
		var tag = schemaInfo[name]

		if (!tag) {
			return '0.0.0';
		}

		return '<a target="_blank" href="' + schemaInfo.github + '/releases/tag/' + schemaInfo.tag.replace('${1}', tag) + '">' + tag + '</a>';
	};

	var getCompareLink = function(schemaInfo, name1, name2) {
		var tag1 = schemaInfo[name1];
		var tag2 = schemaInfo[name2];

		if (!tag2) {
			return '0.0.0';
		}

		var releaseLink = getReleaseLink(schemaInfo, name2);

		if (!tag1 || (tag1 == tag2)) {
			return releaseLink;
		}

		var oldTag = (tag1 < tag2) ? tag1 : tag2;
		var newTag = (tag2 > tag1) ? tag2 : tag1;

		var compareLink = '<a target="_blank" href="' + schemaInfo.github + '/compare/' + schemaInfo.tag.replace('${1}', oldTag) + '...' + schemaInfo.tag.replace('${1}', newTag) + '">diff</a>';

		return releaseLink + ' (' + compareLink + ')';
	}

	var getRowData = function(schemaInfo) {
		if (name1 == name2) {
			return [schemaInfo['name'], getReleaseLink(schemaInfo, name1)];
		}
		else {
			return [schemaInfo['name'], getReleaseLink(schemaInfo, name1), getCompareLink(schemaInfo, name1, name2)];
		}
	};

	filteredSchemaInfoList.map(getRowData).forEach(addRow);
};

checkLibraryInfo = _.debounce(checkLibraryInfo, 100);

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/dxpjslibrary.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		schemaInfoList = JSON.parse(this.responseText);

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

		var fixPackIds = Object.keys(schemaInfoList[0])
			.filter(function(x) { return x != 'name' && x != 'github' && x != 'tag'; })
			.sort(function(a, b) {
				var x1 = parseInt(a.substring(0, a.indexOf('-')));
				var x2 = parseInt(b.substring(0, b.indexOf('-')));

				if (x1 != x2) {
					return x1 - x2;
				}

				if ((a.indexOf('-') == a.lastIndexOf('-')) || (b.indexOf('-') == b.lastIndexOf('-'))) {
					return a > b ? 1 : a < b ? -1 : 0;
				}

				x1 = parseInt(a.substring(a.lastIndexOf('-') + 1));
				x2 = parseInt(b.substring(b.lastIndexOf('-') + 1));

				return x1 - x2;
			});

		fixPackIds.reduce(addFixPack, select1);
		fixPackIds.reduce(addFixPack, select2);

		setIndex(select1, select1Value);
		setIndex(select2, select2Value);

		select1.onchange = checkLibraryInfo;
		select2.onchange = checkLibraryInfo;
		nameFilter.oninput = checkLibraryInfo;
		nameFilter.onpropertychange = checkLibraryInfo;

		checkLibraryInfo();
	};
};

request.open('GET', requestURL, true);
request.send();