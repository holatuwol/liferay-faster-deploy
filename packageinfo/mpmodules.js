function getParameter(name) {
	if (!location.search) {
		return '';
	}

	var re = new RegExp('[?&]' + name + '=([^&]*)');
	var m = re.exec(location.search);
	return m ? m[1] : '';
};

var versionInfoList = null;
var modifyState = history.pushState ? history.pushState.bind(history) : null;

var select1 = document.getElementById('sourceVersion');
var select1Value = getParameter('sourceVersion');
var select2 = document.getElementById('targetVersion');
var select2Value = getParameter('targetVersion') || select1Value;
var nameFilter = document.getElementById('nameFilter');
nameFilter.value = getParameter('nameFilter');

var repositoryURLs = {
	'public': 'https://repository-cdn.liferay.com/nexus/content/repositories/liferay-public-releases/',
	'private': 'https://repository-cdn.liferay.com/nexus/content/repositories/liferay-private-releases/',
	'third-party': 'https://repository-cdn.liferay.com/nexus/content/repositories/public/'
} ;

function isPermaLink(element) {
	return element.getAttribute('data-original-title') == 'Permalink'
};

function checkVersionInfo() {
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

	var getTagName = function(selectValue) {
		var versionId;
		var versionNumber = parseInt(selectValue.substring(0, 4));

		if (versionNumber % 100 == 10) {
			if (selectValue.indexOf('base') == -1) {
				var classifierPos = selectValue.indexOf('-', 5) + 1;
				var fixPackPrefix = 'fix-pack-' + selectValue.substring(5, classifierPos);
				return fixPackPrefix + parseInt(selectValue.substring(classifierPos)) + '-' + versionNumber;
			}
			else {
				return 'fix-pack-base-' + versionNumber;
			}
		}
		else {
			return Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100) + selectValue.substring(selectValue.lastIndexOf('-'));
		}
	}

	var name1 = 'version_' + select1.options[select1.selectedIndex].value;
	var tagName1 = getTagName(select1.options[select1.selectedIndex].value);
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'version_' + select2.options[select2.selectedIndex].value;
	var tagName2 = getTagName(select2.options[select2.selectedIndex].value);
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	var nameFilterValue = nameFilter.value;

	var includeFilterValue = (includeFilter && includeFilter.selectedIndex > -1) ?
		includeFilter.options[includeFilter.selectedIndex].value : null;

	var isMatchingApplicationFilter = function(versionInfo) {
		return versionInfo['application'] == includeFilterValue;
	};

	var isMatchingNameFilter = function(versionInfo) {
		return (versionInfo['group'].indexOf(nameFilterValue) != -1) || (versionInfo['name'].indexOf(nameFilterValue) != -1);
	};

	var isAvailableVersion = function(versionInfo) {
		var version1 = versionInfo[name1];
		var version2 = versionInfo[name2];

		return (version1 != '0.0.0') || (version2 != '0.0.0');
	};

	var isVersionChange = function(versionInfo) {
		var name = versionInfo['name'];

		var version1 = versionInfo[name1];
		var version2 = versionInfo[name2];

		return (version1 != version2);
	};

	var filteredVersionInfoList = versionInfoList.filter(isMatchingApplicationFilter).filter(isMatchingNameFilter).filter(isAvailableVersion);

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

		if (rowData.length > 3) {
			row.style.opacity = getRowForegroundAlpha(rowData[2], rowData[3]);
			row.style.backgroundColor = 'rgba(0,0,0,' + getRowBackgroundAlpha(rowData[2], rowData[3]) + ')';
		}

		for (var i = 0; i < rowData.length; i++) {
			var cell = document.createElement('td');
			cell.innerHTML = rowData[i];

			if ((rowData.length == 3) && (i == 2)) {
				cell.setAttribute('colspan', 2);
			}

			row.appendChild(cell);
		}

		table.appendChild(row);
	};

	var usePrivateTag = function(tagName, repository) {
		if (repository != 'private') {
			return false;
		}

		if (tagName.indexOf('fix-pack-de-') != 0) {
			return true;
		}

		var deVersionId = tagName.substring(12, tagName.indexOf('-', 12));

		if (parseInt(deVersionId) <= 27) {
			return false;
		}

		return true;
	};

	var getArtifactLink = function(versionInfo, name, tagName) {
		if (!(versionInfo['repository'] in repositoryURLs)) {
			return versionInfo[name];
		}

		var version = versionInfo[name];

		if ((version == '0.0.0') || (version.indexOf('-SNAPSHOT') != -1)) {
			return versionInfo[name];
		}

		var dependencyClassifier = null;
		var classifierSeparator = version.indexOf(':');

		if (classifierSeparator != -1) {
			dependencyClassifier = version.substring(classifierSeparator + 1);
			version = version.substring(0, classifierSeparator);
		}

		var artifactLink = [
			'<a href="',
			repositoryURLs[versionInfo['repository']],
			versionInfo['group'].replace(/\./g, '/'), '/',
			versionInfo['name'], '/',
			version, '/',
			versionInfo['name'], '-', version,
			dependencyClassifier ? '-' + dependencyClassifier : '',
			'.', versionInfo['packaging'],
			'">', versionInfo[name], '</a>'
		];

		return artifactLink.join('');
	};

	var getRowData = function(versionInfo) {
		if (name1 == name2) {
			return [versionInfo['group'], versionInfo['name'], getArtifactLink(versionInfo, name1, tagName1)];
		}
		else {
			return [versionInfo['group'], versionInfo['name'], getArtifactLink(versionInfo, name1, tagName1), getArtifactLink(versionInfo, name2, tagName2)];
		}
	};

	filteredVersionInfoList.map(getRowData).forEach(addRow);
};

checkVersionInfo = _.debounce(checkVersionInfo, 200);

var request = new XMLHttpRequest();
var requestURL = 'mpmodules.json';

function hasRepository(versionInfo) {
	return versionInfo['repository'] && versionInfo['repository'] != 'none';
};

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		versionInfoList = JSON.parse(this.responseText).filter(hasRepository);

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
			.map(x => x.substring(prefix.length))
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

		select1.onchange = checkVersionInfo;
		select2.onchange = checkVersionInfo;
		nameFilter.oninput = checkVersionInfo;
		nameFilter.onpropertychange = checkVersionInfo;

		if (includeFilter) {
			includeFilter.onchange = checkVersionInfo;
		}

		checkVersionInfo();
	}
};

request.open('GET', requestURL, true);
request.send();
