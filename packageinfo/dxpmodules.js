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
var select2Value = getParameter('targetVersion');
var nameFilter = document.getElementById('nameFilter');
nameFilter.value = getParameter('nameFilter');
var notableOnly = document.getElementById('notableOnly');

if (notableOnly) {
	notableOnly.checked = getParameter('notableOnly') == 'true';
}

function generateBOM() {
	var sourceVersion = select1.options[select1.selectedIndex].value;

	var artifactId = sourceVersion.indexOf('-ga') != -1 ? 'com.liferay.ce.bom' : 'com.liferay.dxp.bom';

	var versionId;
	var versionNumber = parseInt(sourceVersion.substring(0, 4));

	if ((versionNumber % 100 == 10) && (sourceVersion.indexOf('-base') == -1)) {
		var fixPackVersion = sourceVersion.substring(sourceVersion.indexOf('-', 5) + 1);
		versionId = Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.10.fp' + fixPackVersion;
	}
	else {
		var fixPackVersion = sourceVersion.substring(sourceVersion.indexOf('-', 5) + 1);
		versionId = Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100);
	}

	var bomXML = [
		'<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">',
		'<modelVersion>4.0.0</modelVersion>',
		'<groupId>com.liferay</groupId>',
		'<artifactId>', artifactId, '</artifactId>',
		'<version>', versionId, '</version>',
		'<packaging>pom</packaging>',
		'<licenses><license><name>LGPL 2.1</name><url>http://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt</url></license></licenses>',
		'<developers><developer><name>Brian Wing Shun Chan</name><organization>Liferay, Inc.</organization><organizationUrl>http://www.liferay.com</organizationUrl></developer></developers>',
		'<scm><connection>scm:git:git@github.com:liferay/liferay-portal.git</connection><developerConnection>scm:git:git@github.com:liferay/liferay-portal.git</developerConnection><url>https://github.com/liferay/liferay-portal</url></scm>',
		'<repositories><repository><id>liferay-public-snapshots</id><name>Liferay Public Snapshots</name><url>https://repository.liferay.com/nexus/content/repositories/liferay-public-snapshots/</url></repository></repositories>',
		'<dependencyManagement>',
		'<dependencies>'
	];

	var key ='version_' + sourceVersion;

	var isAvailableVersion = function(versionInfo) {
		return versionInfo[key] && versionInfo[key] != '0.0.0';
	};

	var asDependencyElement = function(accumulator, versionInfo) {
		accumulator.push(
			'<dependency>',
			'<groupId>', versionInfo['group'], '</groupId>',
			'<artifactId>', versionInfo['name'], '</artifactId>',
			'<version>', versionInfo[key], '</version>',
			'</dependency>'
		);

		return accumulator;
	}

	versionInfoList.filter(isAvailableVersion).reduce(asDependencyElement, bomXML);

	bomXML.push('</dependencies>', '</dependencyManagement>', '</project>');

	var bomBlob = new Blob(bomXML, {type : 'application/xml'});

	var downloadBOMLink = document.createElement('a');
	downloadBOMLink.style.display = 'none';

	downloadBOMLink.href = URL.createObjectURL(bomBlob);
	downloadBOMLink.download = artifactId + '-' + versionId + '.bom';

	document.body.appendChild(downloadBOMLink);
	downloadBOMLink.click();
	document.body.removeChild(downloadBOMLink);
};

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

		var newURL = baseURL + '?sourceVersion=' + select1.options[select1.selectedIndex].value + '&targetVersion=' + select2.options[select2.selectedIndex].value;

		if (nameFilter.value) {
			newURL += '&nameFilter=' + nameFilter.value;
		}

		modifyState({path: newURL}, '', newURL);
		modifyState = history.replaceState.bind(history);
	}

	var name1 = 'version_' + select1.options[select1.selectedIndex].value;
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'version_' + select2.options[select2.selectedIndex].value;
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	var nameFilterValue = nameFilter.value;
	var notableOnlyValue = notableOnly && notableOnly.checked;

	var isMatchingNameFilter = function(versionInfo) {
		return (versionInfo['group'].indexOf(nameFilterValue) != -1) || (versionInfo['name'].indexOf(nameFilterValue) != -1);
	};

	var isAvailableVersion = function(versionInfo) {
		var version1 = versionInfo[name1];
		var version2 = versionInfo[name2];

		return (version1 != '0.0.0') || (version2 != '0.0.0');
	};

	var isNotableVersionChange = function(versionInfo) {
		var name = versionInfo['name'];

		var version1 = versionInfo[name1];
		var version2 = versionInfo[name2];

		return (version1 != version2);
	};

	var filteredVersionInfoList = versionInfoList.filter(isMatchingNameFilter).filter(isAvailableVersion);

	if ((name1 != name2) && notableOnlyValue) {
		filteredVersionInfoList = filteredVersionInfoList.filter(isNotableVersionChange);
	}

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

		if (notableOnly) {
			notableOnly.onchange = checkVersionInfo;
		}

		checkVersionInfo();
	}
};

request.open('GET', requestURL, true);
request.send();
