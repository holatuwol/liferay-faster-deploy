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

var includeLiferay = document.getElementById('includeLiferay');

if (includeLiferay) {
	includeLiferay.checked = getParameter('includeLiferay') == 'false';
}

var includeThirdParty = document.getElementById('includeThirdParty');

if (includeThirdParty) {
	includeThirdParty.checked = getParameter('includeThirdParty') == 'true';
}

var servicePacks = {
	'7010-de-07': 1,
	'7010-de-12': 2,
	'7010-de-14': 3,
	'7010-de-22': 4,
	'7010-de-30': 5,
	'7010-de-32': 6,
	'7010-de-40': 7,
	'7010-de-50': 8,
	'7010-de-60': 9
};

var repositoryURLs = {
	'public': 'https://repository-cdn.liferay.com/nexus/content/repositories/liferay-public-releases/',
	'private': 'https://repository-cdn.liferay.com/nexus/content/repositories/liferay-private-releases/',
	'third-party': 'https://repository-cdn.liferay.com/nexus/content/repositories/public/'
} ;

function addBOM(zip, key, artifactId, versionId, dependencies) {
	if (dependencies.length == 0) {
		return;
	}

	var bomXML = [
		'<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">',
		'  <modelVersion>4.0.0</modelVersion>',
		'  <groupId>com.liferay.portal</groupId>',
		'  <artifactId>' + artifactId + '</artifactId>',
		'  <version>' + versionId + '</version>',
		'  <packaging>pom</packaging>',
		'  <licenses>',
		'    <license>',
		'      <name>LGPL 2.1</name>',
		'      <url>http://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt</url>',
		'    </license>',
		'  </licenses>',
		'  <developers>',
		'    <developer>',
		'      <name>Brian Wing Shun Chan</name>',
		'      <organization>Liferay, Inc.</organization>',
		'      <organizationUrl>http://www.liferay.com</organizationUrl>',
		'    </developer>',
		'  </developers>',
		'  <scm>',
		'    <connection>scm:git:git@github.com:liferay/liferay-portal.git</connection>',
		'    <developerConnection>scm:git:git@github.com:liferay/liferay-portal.git</developerConnection>',
		'    <url>https://github.com/liferay/liferay-portal</url>',
		'  </scm>',
		'  <repositories>',
		'    <repository>',
		'      <id>liferay-public-releases</id>',
		'      <name>Liferay Public Releases (CDN)</name>',
		'      <url>', repositoryURLs['public'], '</url>',
		'    </repository>',
		'    <repository>',
		'      <id>liferay-private-releases</id>',
		'      <name>Liferay Private Releases (CDN)</name>',
		'      <url>', repositoryURLs['private'], '</url>',
		'    </repository>',
		'    <repository>',
		'      <id>liferay-third-party</id>',
		'      <name>Liferay Third Party (CDN)</name>',
		'      <url>', repositoryURLs['third-party'], '</url>',
		'    </repository>',
		'  </repositories>',
		'  <dependencyManagement>',
		'    <dependencies>'
	];

	dependencies.reduce(asDependencyElement.bind(null, key), bomXML);

	bomXML.push(
		'    </dependencies>',
		'  </dependencyManagement>',
		'</project>'
	);

	zip.file(artifactId + '-' + versionId + '.pom', bomXML.join('\n'));
}

function getCommand(versionId, artifactId) {
	return [
		'mvn install:install-file -Dfile=', artifactId, '-', versionId, '.pom -DgroupId=com.liferay.portal -DartifactId=', artifactId, ' -Dversion=', versionId, ' -Dpackaging=pom'
	].join('');
}

function addScripts(zip, baseArtifactId, versionId) {
	var script = ['#!/bin/bash'];
	var artifactIds = [baseArtifactId, baseArtifactId + '.private', baseArtifactId + '.third.party'];

	Array.prototype.push.apply(script, artifactIds.map(getCommand.bind(null, versionId)));

	zip.file(baseArtifactId + '-' + versionId + '.sh', script.join('\n'));
}

function asDependencyElement(key, accumulator, versionInfo) {
	var dependencyVersion = versionInfo[key];

	if (dependencyVersion.indexOf('-SNAPSHOT') != -1) {
		var x = dependencyVersion.indexOf('.');
		var y = dependencyVersion.indexOf('.', x + 1);

		var majorVersion = parseInt(dependencyVersion.substring(0, x));
		var minorVersion = parseInt(dependencyVersion.substring(x + 1, y));
		var patchVersion = parseInt(dependencyVersion.substring(y + 1, dependencyVersion.indexOf('-SNAPSHOT')));

		if (patchVersion > 0) {
			dependencyVersion = majorVersion + '.' + minorVersion + '.0';
		}
		else if (minorVersion > 0) {
			dependencyVersion = majorVersion + '.' + (minorVersion - 1) + '.0';
		}
		else {
			dependencyVersion = majorVersion + '.' + minorVersion + '.' + patchVersion;
		}
	}

	var dependencyClassifier = null;
	var classifierSeparator = dependencyVersion.indexOf(':');

	if (classifierSeparator != -1) {
		dependencyClassifier = dependencyVersion.substring(classifierSeparator + 1);
		dependencyVersion = dependencyVersion.substring(0, classifierSeparator);
	}

	var dependencyPackaging = versionInfo['packaging'] || 'jar';

	accumulator.push(
		'      <dependency>',
		'        <groupId>' + versionInfo['group'] + '</groupId>',
		'        <artifactId>' + versionInfo['name'] + '</artifactId>',
		'        <version>' + dependencyVersion + '</version>'
	);

	if (dependencyClassifier) {
		accumulator.push('        <classifier>' + dependencyClassifier + '</classifier>');
	}

	if (dependencyPackaging != 'jar') {
		accumulator.push('        <packaging>' + dependencyPackaging + '</packaging>');
	}

	accumulator.push('      </dependency>');

	return accumulator;
};

function generateBOM(selectId) {
	selectId = selectId || 'sourceVersion';

	var select = document.getElementById(selectId);
	var selectValue = select.options[select.selectedIndex].value;

	var artifactId = selectValue.indexOf('-ga') != -1 ? 'release.portal.bom' : 'release.dxp.bom';

	var versionId;
	var versionNumber = parseInt(selectValue.substring(0, 4));

	if ((versionNumber % 100 == 10) && (selectValue.indexOf('-base') == -1)) {
		var fixPackVersion = selectValue.substring(selectValue.indexOf('-', 5) + 1);
		var versionSuffix = selectValue in servicePacks ? ('.' + servicePacks[selectValue]) : ('.fp' + fixPackVersion);
		versionId = Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.10' + versionSuffix;
	}
	else {
		var fixPackVersion = selectValue.substring(selectValue.indexOf('-', 5) + 1);
		versionId = Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100);
	}

	var key ='version_' + selectValue;

	var isAvailableVersion = function(repository, versionInfo) {
		return (key in versionInfo) && versionInfo[key] != '0.0.0' && versionInfo['repository'] == repository;
	};

	var publicDependencies = versionInfoList.filter(isAvailableVersion.bind(null, 'public'));
	var privateDependencies = versionInfoList.filter(isAvailableVersion.bind(null, 'private'));
	var thirdPartyDependencies = versionInfoList.filter(isAvailableVersion.bind(null, 'third-party'));

	var zip = new JSZip();

	addScripts(zip, artifactId, versionId);

	addBOM(zip, key, artifactId, versionId, publicDependencies);
	addBOM(zip, key, artifactId + '.private', versionId, privateDependencies);
	addBOM(zip, key, artifactId + '.third.party', versionId, thirdPartyDependencies);

	zip.generateAsync({
		type: 'blob',
		compression: 'DEFLATE'
	}).then(function(bomBlob) {
		var downloadBOMLink = document.createElement('a');
		downloadBOMLink.style.display = 'none';

		downloadBOMLink.href = URL.createObjectURL(bomBlob);
		downloadBOMLink.download = artifactId + '-' + versionId + '.zip';

		document.body.appendChild(downloadBOMLink);
		downloadBOMLink.click();
		document.body.removeChild(downloadBOMLink);
	})
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

		if (notableOnly) {
			newURL += '&notableOnly=' + (notableOnly.checked);
		}

		if (includeLiferay) {
			newURL += '&includeLiferay=' + (includeLiferay.checked);
		}

		if (includeThirdParty) {
			newURL += '&includeThirdParty=' + (includeThirdParty.checked);
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
			return Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100);
		}
	}

	var name1 = 'version_' + select1.options[select1.selectedIndex].value;
	var tagName1 = getTagName(select1.options[select1.selectedIndex].value);
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'version_' + select2.options[select2.selectedIndex].value;
	var tagName2 = getTagName(select2.options[select2.selectedIndex].value);
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	var nameFilterValue = nameFilter.value;
	var notableOnlyValue = notableOnly && notableOnly.checked;

	var includeLiferayValue = !includeLiferay || includeLiferay.checked;
	var includeThirdPartyValue = !includeThirdParty || includeThirdParty.checked;

	var isMatchingRepositoryFilter = function(versionInfo) {
		if (versionInfo['repository'] == 'third-party') {
			return includeThirdPartyValue;
		}

		return includeLiferayValue;
	};

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

	var filteredVersionInfoList = versionInfoList.filter(isMatchingRepositoryFilter).filter(isMatchingNameFilter).filter(isAvailableVersion);

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
			row.style.opacity = getRowForegroundAlpha(rowData[2], rowData[3]);
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
	}

	var getArtifactLink = function(versionInfo, name) {
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

		return [
			'<a href="',
			repositoryURLs[versionInfo['repository']],
			versionInfo['group'].replace(/\./g, '/'), '/',
			versionInfo['name'], '/',
			version, '/',
			versionInfo['name'], '-', version,
			dependencyClassifier ? '-' + dependencyClassifier : '',
			'.', versionInfo['packaging'],
			'">', versionInfo[name], '</a>'
		].join('');
	};

	var getRowData = function(versionInfo) {
		if (name1 == name2) {
			return [versionInfo['group'], versionInfo['name'], getArtifactLink(versionInfo, name1)];
		}
		else {
			return [versionInfo['group'], versionInfo['name'], getArtifactLink(versionInfo, name1), getArtifactLink(versionInfo, name2)];
		}
	};

	filteredVersionInfoList.map(getRowData).forEach(addRow.bind(null, false));
};

checkVersionInfo = _.debounce(checkVersionInfo, 200);

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/dxpmodules.json';

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
			option.innerHTML = x in servicePacks ? (x + ' (sp' + servicePacks[x] + ')') : x;
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

		if (includeLiferay) {
			includeLiferay.onchange = checkVersionInfo;
		}

		if (includeThirdParty) {
			includeThirdParty.onchange = checkVersionInfo;
		}

		checkVersionInfo();
	}
};

request.open('GET', requestURL, true);
request.send();
