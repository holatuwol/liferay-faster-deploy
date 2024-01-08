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

var select0 = document.getElementById('bomVersion');

var select1 = document.getElementById('sourceVersion');
var select1Value = getParameter('sourceVersion');
var select2 = document.getElementById('targetVersion');
var select2Value = getParameter('targetVersion') || select1Value;
var nameFilter = document.getElementById('nameFilter');
nameFilter.value = getParameter('nameFilter');

var includeFilter = document.getElementById('includeFilter');

if (includeFilter) {
	var selectedIndex = 1;

	if (getParameter('includeLiferay') != 'false' && getParameter('includeThirdParty')) {
		selectedIndex = 0;
	}
	else if (getParameter('includeThirdParty')) {
		selectedIndex = 2;
	}

	includeFilter.selectedIndex = selectedIndex;
}

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

var servicePacks = {
	'7010-de-07': 1,
	'7010-de-12': 2,
	'7010-de-14': 3,
	'7010-de-22': 4,
	'7010-de-30': 5,
	'7010-de-32': 6,
	'7010-de-40': 7,
	'7010-de-50': 8,
	'7010-de-60': 9,
	'7010-de-70': 10,
	'7010-de-80': 11,
	'7010-de-87': 12,
	'7010-de-90': 13,
	'7010-de-93': 14,
	'7010-de-96': 15,
	'7010-de-99': 16,
	'7010-de-102': 17,
	'7110-dxp-5': 1,
	'7110-dxp-10': 2,
	'7110-dxp-15': 3,
	'7110-dxp-17': 4,
	'7110-dxp-20': 5,
	'7210-dxp-2': 1,
	'7210-dxp-5': 2,
	'7210-dxp-8': 3
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
	selectId = selectId || 'bomVersion';

	var select = document.getElementById(selectId);
	var selectValue = select.options[select.selectedIndex].value;

	var script = ['#!/bin/bash'];

	var zip = new JSZip();
	var zipFileName;

	if (selectValue == 'all') {
		zipFileName = 'release.portal.bom.zip';

		for (var i = 1; i < select.options.length; i++) {
			addBOMs(select.options[i].value, zip, script);
		}
	}
	else {
		zipFileName = addBOMs(selectValue, zip, script);
	}

	zip.file('install-bom.sh', script.join('\n'));

	zip.generateAsync({
		type: 'blob',
		compression: 'DEFLATE'
	}).then(function(bomBlob) {
		var downloadBOMLink = document.createElement('a');
		downloadBOMLink.style.display = 'none';

		downloadBOMLink.href = URL.createObjectURL(bomBlob);
		downloadBOMLink.download = zipFileName;

		document.body.appendChild(downloadBOMLink);
		downloadBOMLink.click();
		document.body.removeChild(downloadBOMLink);
	})
}

function addBOMs(selectValue, zip, script) {
	var artifactId = selectValue.indexOf('-ga') != -1 ? 'release.portal.bom' : 'release.dxp.bom';

	var versionIds = [];
	var versionNumber = parseInt(selectValue.substring(0, 4));

	if ((selectValue.indexOf('-ga') == -1) && (selectValue.indexOf('-base') == -1)) {
		var fixPackVersion = selectValue.substring(selectValue.indexOf('-', 5) + 1);

		var versionSuffix = '.fp' + fixPackVersion;
		versionIds.push(Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.10' + versionSuffix);

		if (selectValue in servicePacks) {
			versionSuffix = '.' + servicePacks[selectValue];
			versionIds.push(Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.10' + versionSuffix);
		}
	}
	else {
		var fixPackVersion = selectValue.substring(selectValue.indexOf('-', 5) + 1);
		versionIds.push(Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100));
	}

	var key ='version_' + selectValue;

	var isAvailableVersion = function(repository, versionInfo) {
		return (key in versionInfo) && versionInfo[key] != '0.0.0' && versionInfo['repository'] == repository;
	};

	var publicDependencies = versionInfoList.filter(isAvailableVersion.bind(null, 'public'));
	var privateDependencies = versionInfoList.filter(isAvailableVersion.bind(null, 'private'));
	var thirdPartyDependencies = versionInfoList.filter(isAvailableVersion.bind(null, 'third-party'));

	for (var i = 0; i < versionIds.length; i++) {
		var versionId = versionIds[i];

		var fileNames = [artifactId, artifactId + '.private', artifactId + '.third.party'];
		Array.prototype.push.apply(script, fileNames.map(getCommand.bind(null, versionId)));

		addBOM(zip, key, artifactId, versionId, publicDependencies);
		addBOM(zip, key, artifactId + '.private', versionId, privateDependencies);
		addBOM(zip, key, artifactId + '.third.party', versionId, thirdPartyDependencies);
	}

	return artifactId + '-' + versionIds[0] + '.zip';
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

		if (includeFilter) {
			if (includeFilter.selectedIndex == 0) {
				newURL += '&includeThirdParty=true';
			}
			else if (includeFilter.selectedIndex == 2) {
				newURL += '&includeLiferay=false&includeThirdParty=true';
			}
		}

		modifyState({path: newURL}, '', newURL);
		modifyState = history.replaceState.bind(history);
	}

	var getTagName = function(selectValue) {
		var versionId;
		var versionNumber = parseInt(selectValue.substring(0, 4));

		var tagName = null;

		if (selectValue.indexOf('-ga') != -1) {
			tagName = Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100) + selectValue.substring(selectValue.lastIndexOf('-'));
		}
		else if (selectValue.indexOf('-u') != -1) {
			tagName = Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100) + '-u' + selectValue.substring(selectValue.indexOf('-u') + 2);
		}
		else if (selectValue.indexOf('.q') != -1) {
			tagName = selectValue.substring(selectValue.indexOf('-') + 1);
		}
		else if (selectValue.indexOf('base') == -1) {
			var classifierPos = selectValue.indexOf('-', 5) + 1;
			var fixPackPrefix = 'fix-pack-' + selectValue.substring(5, classifierPos);
			tagName = fixPackPrefix + parseInt(selectValue.substring(classifierPos)) + '-' + versionNumber;
		}
		else {
			tagName = 'fix-pack-base-' + versionNumber;
		}

		return tagName;
	}

	var name1 = 'version_' + select1.options[select1.selectedIndex].value;
	var tagName1 = getTagName(select1.options[select1.selectedIndex].value);
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'version_' + select2.options[select2.selectedIndex].value;
	var tagName2 = getTagName(select2.options[select2.selectedIndex].value);
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

	var includeFilterValue = includeFilter ? includeFilter.selectedIndex : 1;
	var includeLiferayValue = includeFilterValue == 0 || includeFilterValue == 1;
	var includeThirdPartyValue = includeFilterValue == 0 || includeFilterValue == 2;

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

	var isVersionChange = function(versionInfo) {
		var name = versionInfo['name'];

		var version1 = versionInfo[name1];
		var version2 = versionInfo[name2];

		return (version1 != version2);
	};

	var isNotableVersionChange = function(versionInfo) {
		var name = versionInfo['name'];

		var version1 = versionInfo[name1];
		var version2 = versionInfo[name2];

		var pos11 = version1.indexOf('.');
		var majorVersion1 = version1.substring(0, pos11);

		var pos21 = version2.indexOf('.');
		var majorVersion2 = version2.substring(0, pos21);

		if (majorVersion1 != majorVersion2) {
			return (majorVersion1 != '0') || !isDEVersionIncrease;
		}

		var pos12 = version1.indexOf('.', pos11 + 1);
		var minorVersion1 = version1.substring(pos11, pos12);

		var pos22 = version2.indexOf('.', pos21 + 1);
		var minorVersion2 = version2.substring(pos21, pos22);

		return minorVersion1 != minorVersion2;
	};

	var filteredVersionInfoList = versionInfoList.filter(isMatchingRepositoryFilter).filter(isMatchingNameFilter).filter(isAvailableVersion);

	if ((name1 != name2) && notableOnlyValue) {
		filteredVersionInfoList = filteredVersionInfoList.filter(isNotableVersionChange);
	}
	else if ((name1 != name2) && changesOnlyValue) {
		filteredVersionInfoList = filteredVersionInfoList.filter(isVersionChange);
	}

	var table = document.getElementById('summary');
	table.innerHTML = '';

	var getRowBackgroundAlpha = function(version1, version2) {
		return (version1.children[0].textContent != version2.children[0].textContent) ? 0.1 : 0.0;
	};

	var getRowForegroundAlpha = function(version1, version2) {
		return (version1.children[0].textContent != version2.children[0].textContent) ? 0.9 : 0.4;
	};

	var addRow = function(rowData) {
		var row = document.createElement('tr');

		if (rowData.length > 3) {
			row.style.opacity = getRowForegroundAlpha(rowData[2], rowData[3]);
			row.style.backgroundColor = 'rgba(0,0,0,' + getRowBackgroundAlpha(rowData[2], rowData[3]) + ')';
		}

		for (var i = 0; i < rowData.length; i++) {
			var cell = document.createElement('td');

			if ((typeof rowData[i]) == 'string') {
				cell.innerHTML = rowData[i];
			}
			else {
				cell.appendChild(rowData[i]);
			}

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

		var artifactHolder = document.createElement('span');

		if ((version == '0.0.0') || (version.indexOf('-SNAPSHOT') != -1)) {
			var artifactLink = document.createElement('a');
			artifactLink.textContent = version;

			artifactHolder.appendChild(artifactLink);

			return artifactHolder;
		}

		var dependencyClassifier = null;
		var classifierSeparator = version.indexOf(':');

		if (classifierSeparator != -1) {
			dependencyClassifier = version.substring(classifierSeparator + 1);
			version = version.substring(0, classifierSeparator);
		}

		var artifactHREF = [
			repositoryURLs[versionInfo['repository']],
			versionInfo['group'].replace(/\./g, '/'), '/',
			versionInfo['name'], '/',
			version, '/',
			versionInfo['name'], '-', version,
			dependencyClassifier ? '-' + dependencyClassifier : '',
			'.', versionInfo['packaging']
		].join('');

		var artifactLink = document.createElement('a');
		artifactLink.setAttribute('href', artifactHREF);
		artifactLink.textContent = versionInfo[name];

		artifactHolder.appendChild(artifactLink);

		if (versionInfo['sourceFolder']) {
			var commitHREF = [
				'https://github.com/liferay/',
				tagName.indexOf('fix-pack-') == 0 ? 'liferay-portal-ee' : 'liferay-portal',
				'/commits/',
				tagName,
				'/',
				versionInfo['sourceFolder']
			].join('');

			var commitLink = document.createElement('a');
			commitLink.setAttribute('href', commitHREF);
			commitLink.textContent = 'commits';

			artifactHolder.appendChild(document.createTextNode(' ('));
			artifactHolder.appendChild(commitLink);
			artifactHolder.appendChild(document.createTextNode(')'));
		}

		return artifactHolder;
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
var requestURL = ((document.location.hostname == 'localhost') ? '' : 'https://s3-us-west-2.amazonaws.com/mdang.grow/') + 'dxpmodules.json';

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

		var getBaseVersion = function(a) {
			return parseInt(a.substring(0, a.indexOf('-')));
		}

		var getFixPackVersion = function(a) {
			var fixPackVersion = a.substring(a.lastIndexOf('-') + 1);

			if (fixPackVersion == 'base') {
				return 0;
			}

			if (fixPackVersion.indexOf('ga') == 0) {
				return parseInt(fixPackVersion.substring(2));
			}

			while (fixPackVersion.indexOf('0') == 0) {
				fixPackVersion = fixPackVersion.substring(1);
			}

			if (fixPackVersion.indexOf('u') == 0) {
				return parseInt(fixPackVersion.substring(1));
			}

			if (fixPackVersion.indexOf('.q') != -1) {
				return fixPackVersion;
			}

			return parseInt(fixPackVersion);
		}

		var fixPackIds = Object.keys(versionInfoList[0])
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

				return x1 > x2 ? 1 : -1;
			});

		if (select0) {
			fixPackIds.reduce(addFixPack, select0);
		}

		fixPackIds.reduce(addFixPack, select1);
		fixPackIds.reduce(addFixPack, select2);

		setIndex(select1, select1Value);
		setIndex(select2, select2Value);

		select1.onchange = checkVersionInfo;
		select2.onchange = checkVersionInfo;
		nameFilter.oninput = checkVersionInfo;
		nameFilter.onpropertychange = checkVersionInfo;

		if (changeFilter) {
			changeFilter.onchange = checkVersionInfo;
		}

		if (includeFilter) {
			includeFilter.onchange = checkVersionInfo;
		}

		checkVersionInfo();
	}
};

request.open('GET', requestURL, true);
request.send();
