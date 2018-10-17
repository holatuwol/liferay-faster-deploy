var projectVersionIds = {};

function setProductVersions(accumulator, next) {
	next.selected = true;
	_1_WAR_osbpatcherportlet_productVersionOnChange(next.value);

	AUI().all('#_1_WAR_osbpatcherportlet_patcherProjectVersionId option')._nodes.reduce(
		next.innerText.trim().indexOf('6.x') != -1 ? setProjectVersions6 : setProjectVersions7,
		accumulator
	);

	return accumulator;
};

function setProjectVersions6(accumulator, next) {
	if (next.innerText == '') {
		return accumulator;
	}

	var key = 'fix-pack-base-' + next.innerText.replace(/ /g, '-').replace(/\./g, '').toLowerCase();

	accumulator[key] = parseInt(next.value);

	return accumulator;
};

function setProjectVersions7(accumulator, next) {
	if (next.innerText == '') {
		return accumulator;
	}

	var key = next.innerText.trim();

	accumulator[key] = parseInt(next.value);

	return accumulator;
};

function getLiferayVersion(version) {
	if (version.indexOf('fix-pack-de-') != -1) {
		var pos = version.indexOf('-', 12);
		var deVersion = version.substring(12, pos);
		var shortVersion = version.substring(pos + 1);

		pos = shortVersion.indexOf('-private');

		if (pos != -1) {
			shortVersion = shortVersion.substring(0, pos);
		}

		return parseInt(shortVersion) * 1000 + parseInt(deVersion);
	}
	else if (version.indexOf('fix-pack-dxp-') != -1) {
		var pos = version.indexOf('-', 13);
		var deVersion = version.substring(13, pos);
		var shortVersion = version.substring(pos + 1);

		pos = shortVersion.indexOf('-private');

		if (pos != -1) {
			shortVersion = shortVersion.substring(0, pos);
		}

		return parseInt(shortVersion) * 1000 + parseInt(deVersion);
	}
	else {
		var shortVersion = version.substring('fix-pack-base-'.length);
		var pos = shortVersion.indexOf('-private');

		if (pos != -1) {
			shortVersion = shortVersion.substring(0, pos);
		}

		pos = shortVersion.indexOf('-');

		if (pos == -1) {
			return parseInt(shortVersion) * 1000;
		}

		return parseInt(shortVersion.substring(0, pos)) * 1000 + parseInt(shortVersion.substring(pos + 3));
	}
}

function compareLiferayVersions(a, b) {
	var aValue = getLiferayVersion(a);
	var bValue = getLiferayVersion(b);

	if (aValue != bValue) {
		return aValue - bValue;
	}

	return a > b ? 1 : a < b ? -1 : 0;
};

AUI().all('#_1_WAR_osbpatcherportlet_patcherProductVersionId option')._nodes.reduce(setProductVersions, projectVersionIds);

var jsonString = JSON.stringify(
	projectVersionIds,
	Object.keys(projectVersionIds).sort(compareLiferayVersions),
	4
);

console.log(jsonString.replace(/    /g, '\t'));