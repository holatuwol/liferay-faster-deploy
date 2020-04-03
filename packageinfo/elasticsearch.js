var compatibility = null;

var fixPacks = {
	"Liferay 7.0": 90,
	"Liferay 7.1": 17,
	"Liferay 7.2": 4
};

var servicePacks = {
	'7.0.10.fp7': 1,
	'7.0.10.fp12': 2,
	'7.0.10.fp14': 3,
	'7.0.10.fp22': 4,
	'7.0.10.fp30': 5,
	'7.0.10.fp32': 6,
	'7.0.10.fp40': 7,
	'7.0.10.fp50': 8,
	'7.0.10.fp60': 9,
	'7.0.10.fp70': 10,
	'7.0.10.fp80': 11,
	'7.0.10.fp87': 12,
	'7.0.10.fp90': 13,
	'7.1.10.fp5': 1,
	'7.1.10.fp10': 2,
	'7.1.10.fp15': 3,
	'7.1.10.fp17': 4,
	'7.2.10.fp2': 1
};

var compatibility = {
	"1.0": {
		"2.2.x": {
			"plugins": [
				"Shield 2.2",
				"Marvel 2.2",
				"Kibana 4.4"
			],
			"liferay": {
				"7.0.10": {
					"connectors": {
						"Liferay Enterprise Search - Elastic Marvel Integration (1.0.x)": "https://web.liferay.com/marketplace/-/mp/download/78883781/1.0.0/7010",
						"Liferay Enterprise Search - Elastic Shield Integration (1.0.x)": "https://web.liferay.com/marketplace/-/mp/download/78883853/1.0.0/7010"
					},
					"jdk": [
						"Oracle JDK 8"
					]
				}
			}
		},
		"2.4.x": {
			"plugins": [
				"Shield 2.4",
				"Marvel 2.4",
				"Kibana 4.6"
			],
			"liferay": {
				"7.0.10.fp22": {
					"connectors": {
						"Liferay Enterprise Search - Elastic Marvel Integration (1.1.x)": "https://web.liferay.com/marketplace/-/mp/download/78883781/1.1.0/7010",
						"Liferay Enterprise Search - Elastic Shield Integration (1.1.x)": "https://web.liferay.com/marketplace/-/mp/download/78883853/1.1.0/7010"
					},
					"jdk": [
						"Oracle JDK 8"
					]
				}
			}
		}
	},
	"2.0": {
		"6.1.x - 6.8.x": {
			"plugins": [
				"X-Pack 6.1 - 6.8",
				"Kibana 6.1 - 6.8"
			],
			"liferay": {
				"7.0.10.fp79": {
					"connectors": {
						"Liferay Connector to Elasticsearch 6 (1.1.x)": "https://web.liferay.com/marketplace/-/mp/application/106004266",
						"Liferay Connector to X-Pack Monitoring [Elastic Stack 6.x] (1.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106163750",
						"Liferay Connector to X-Pack Security [Elastic Stack 6.x] (1.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106163963"
					},
					"jdk": [
						"Oracle JDK 8"
					]
				},
				"7.1.10.fp5": {
					"connectors": {
						"Liferay Connector to Elasticsearch 6 (2.0.x, bundled with 7.1)": null,
						"Liferay Connector to X-Pack Monitoring [Elastic Stack 6.x] (2.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106163750",
						"Liferay Connector to X-Pack Security [Elastic Stack 6.x] (2.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106163963"
					},
					"jdk": [
						"Oracle JDK 8",
						"Oracle JDK 11",
						"All Java TCK compliant builds of Java 8 and Java 11"
					]
				}
			}
		},
		"6.2.x - 6.8.x": {
			"plugins": [
				"X-Pack 6.2 - 6.8",
				"Kibana 6.2 - 6.8"
			],
			"liferay": {
				"7.2.10": {
					"connectors": {
						"Liferay Connector to Elasticsearch 6 (3.0.x, bundled with 7.2)": null,
						"Liferay Connector to X-Pack Monitoring [Elastic Stack 6.x] (3.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106163750",
						"Liferay Connector to X-Pack Security [Elastic Stack 6.x] (3.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106163963",
						"Liferay Connector to Elasticsearch Learning to Rank (2.0.x)": "https://web.liferay.com/marketplace/-/mp/application/170666298"
					},
					"jdk": [
						"Oracle JDK 8",
						"Oracle JDK 11",
						"All Java TCK compliant builds of Java 8 and Java 11"
					]
				}
			}
		}
	},
	"3.0": {
		"7.3.x - 7.4.x": {
			"plugins": [
				"X-Pack 7.3 - 7.4",
				"Kibana 7.3 - 7.4",
				"Elasticsearch Learning to Rank 7.3.x"
			],
			"liferay": {
				"7.2.10.fp2": {
					"connectors": {
						"Liferay Connector to Elasticsearch 7 (3.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106004266",
						"Liferay Connector to X-Pack Monitoring [Elastic Stack 6.x] (3.0.x)": "https://web.liferay.com/marketplace/-/mp/application/106163750",
						"Liferay Connector to Elasticsearch Learning to Rank (2.0.x)": "https://web.liferay.com/marketplace/-/mp/application/170666298"
					},
					"jdk": [
						"Oracle JDK 8",
						"Oracle JDK 11",
						"All Java TCK compliant builds of Java 8 and Java 11"
					]
				}
			}
		}
	}
}

var versionSelect = Object.keys(fixPacks).reduce(function(select, x) {
	var option = document.createElement('option');
	option.textContent = x;
	select.appendChild(option);
	return select;
}, document.getElementById('version'));

var fixPackSelect = document.getElementById('fixpack');

function getFixPackLabel(version, i) {
	if (i == 0) {
		return version + '.10';
	}

	var fp = 'fp' + i;
	var name = version + '.10.' + fp;

	if (servicePacks[name]) {
		return name + ' (sp' +  servicePacks[name] + ')';
	}

	return name;
}

function updateFixPackSelect() {
	var versionName = versionSelect.options[versionSelect.selectedIndex].value;
	var version = versionName.substring(8);

	for (var i = 0; i <= fixPacks[versionName] && i < fixPackSelect.options.length; i++) {
		fixPackSelect.options[i].textContent = getFixPackLabel(version, i);
	}

	for (var i = fixPackSelect.options.length; i <= fixPacks[versionName]; i++) {
		var option = document.createElement('option');

		option.textContent = getFixPackLabel(version, i);

		fixPackSelect.appendChild(option);
	}

	for (var i = fixPackSelect.options.length - 1; i > fixPacks[versionName]; i--) {
		fixPackSelect.options[i].remove();
	}

	updateCompatibilityMatrix();
}

versionSelect.onchange = updateFixPackSelect;
fixPackSelect.onchange = updateCompatibilityMatrix;

function isCompatible(fixPackVersion) {
	var selectedFixPackIndex = fixPackSelect.selectedIndex;
	var fixPackVersionWithSP = fixPackVersion + ' (sp';

	for (var i = 0; i < fixPackSelect.options.length; i++) {
		var optionText = fixPackSelect.options[i].textContent;

		if ((optionText == fixPackVersion) || (optionText.indexOf(fixPackVersionWithSP) == 0)) {
			return selectedFixPackIndex >= i;
		}
	}

	return false;
}

function getReadableLiferayVersion(fixPackVersion) {
	var versionSplit = fixPackVersion.split('.');

	var readableVersion = 'Liferay DXP ' + versionSplit[0] + '.' + versionSplit[1];

	if (versionSplit.length == 4) {
		if (servicePacks[fixPackVersion]) {
			readableVersion += '<br/>Service Pack ' + servicePacks[fixPackVersion] + '+';
		}
		else if (versionSplit[3].indexOf('fp') == 0) {
			readableVersion += '<br/>Fix Pack ' + versionSplit[3].substring(2) + '+';
		}
	}

	return readableVersion;
}

function addCompatibilityRow(tbody, lesVersion, elasticVersion, fixPackVersion) {
	var row = document.createElement('tr');

	var cell = document.createElement('td');
	cell.textContent = lesVersion;
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.textContent = elasticVersion;
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.innerHTML = compatibility[lesVersion][elasticVersion]['plugins'].join('<br/>');
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.innerHTML = getReadableLiferayVersion(fixPackVersion);
	row.appendChild(cell);

	cell = document.createElement('td');

	var connectors = compatibility[lesVersion][elasticVersion]['liferay'][fixPackVersion]['connectors'];

	for (connector in connectors) {
		if (connectors[connector]) {
			var link = document.createElement('a');
			link.textContent = connector;
			link.href = connectors[connector];
			cell.appendChild(link);
		}
		else {
			cell.appendChild(document.createTextNode(connector));
		}

		cell.appendChild(document.createElement('br'));
	}

	row.appendChild(cell);

	cell = document.createElement('td');
	cell.innerHTML = compatibility[lesVersion][elasticVersion]['liferay'][fixPackVersion]['jdk'].join('<br/>');
	row.appendChild(cell);

	tbody.appendChild(row);
}

function updateCompatibilityMatrix() {
	if (compatibility == null) {
		return;
	}

	var tbody = document.querySelector('#elastic-compatibility-matrix tbody');

	var oldRows = Array.from(tbody.querySelectorAll('tr'));

	for (var i = 0; i < oldRows.length; i++) {
		oldRows[i].remove();
	}

	var anyCompatible = false;

	for (lesVersion in compatibility) {
		for (elasticVersion in compatibility[lesVersion]) {
			for (fixPackVersion in compatibility[lesVersion][elasticVersion]['liferay']) {
				if (isCompatible(fixPackVersion)) {
					anyCompatible = true;

					addCompatibilityRow(tbody, lesVersion, elasticVersion, fixPackVersion);
				}
			}
		}
	}

	if (!anyCompatible) {
		var row = document.createElement('tr');

		var cell = document.createElement('td');
		cell.setAttribute('colspan', '6');
		cell.setAttribute('align', 'center');
		cell.textContent = 'No compatible marketplace releases of the Elasticsearch connector';
		row.appendChild(cell);

		tbody.appendChild(row);
	}
};

updateFixPackSelect();