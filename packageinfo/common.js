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

function getParameter(name) {
	if (!location.search) {
		return '';
	}

	var re = new RegExp('[?&]' + name + '=([^&]*)');
	var m = re.exec(location.search);
	return m ? m[1] : '';
};

function isPermaLink(element) {
	return element.getAttribute('data-original-title') == 'Permalink'
};

/**
 * Initializes the sourceVersion/targetVersion selects and their
 * accompanying sourceVersionFilter/targetVersionFilter base-version
 * filters (see applyVersionFilter), including enabling Chosen on all
 * four. Centralized here since every comparison tool (modules,
 * packages, schemas, js libraries) wires these up identically.
 */
function initVersionSelects() {
	var select1 = document.getElementById('sourceVersion');
	var select1Value = getParameter('sourceVersion');
	var select2 = document.getElementById('targetVersion');
	var select2Value = getParameter('targetVersion') || select1Value;

	var sourceVersionFilter = document.getElementById('sourceVersionFilter');
	var targetVersionFilter = document.getElementById('targetVersionFilter');

	$(select1).chosen({width: '200px'});
	$(select2).chosen({width: '200px'});
	$(sourceVersionFilter).chosen({width: '200px'});
	$(targetVersionFilter).chosen({width: '200px'});

	return {
		select1: select1,
		select1Value: select1Value,
		select2: select2,
		select2Value: select2Value,
		sourceVersionFilter: sourceVersionFilter,
		targetVersionFilter: targetVersionFilter
	};
}

/**
 * Returns the '<major>.<minor>.<patch>' base version for a fix pack id
 * (e.g. '7010-de-07' -> '7.0.10'), derived arithmetically from the id's
 * leading version number rather than a hardcoded table, so it stays
 * correct as new baselines (7.5.x, etc.) show up in the data.
 */
function getBaseVersionLabel(fixPackId) {
	var versionNumber = parseInt(fixPackId.substring(0, fixPackId.indexOf('-')));

	return Math.floor(versionNumber / 1000) + '.' + Math.floor((versionNumber % 1000) / 100) + '.' + (versionNumber % 100);
}

/**
 * Returns the label a fix pack id should be filtered under. Quarterly
 * releases (ids containing '<year>.q<quarter>', e.g. '7413-2023.q3.5')
 * are filtered by that year and quarter alone ('2023.q3'), since that's
 * how those releases are identified; every other id is filtered by its
 * base version.
 */
function getVersionFilterLabel(fixPackId) {
	var quarterMatch = /(\d{4}\.q[1-4])/.exec(fixPackId);

	return quarterMatch ? quarterMatch[1] : getBaseVersionLabel(fixPackId);
}

/**
 * Returns user-friendly display text for a fix pack id, using the
 * dotted base version instead of the raw numeric prefix the backend
 * uses (e.g. '7413-u32' -> '7.4.13-u32'). Quarterly releases (ids
 * containing '<year>.q<quarter>') are shown using just that portion
 * (e.g. '7413-2025.q1.10' -> '2025.q1.10'), since the numeric prefix
 * doesn't add anything a user would recognize there. Fix pack ids that
 * introduced a service pack are suffixed with '(spN)', since that's a
 * more recognizable name for the same release than the fix pack number.
 */
function getFixPackDisplayText(fixPackId) {
	var suffix = fixPackId.substring(fixPackId.indexOf('-') + 1);
	var displayText = (suffix.indexOf('.q') != -1) ? suffix : (getBaseVersionLabel(fixPackId) + '-' + suffix);

	if (fixPackId in servicePacks) {
		displayText += ' (sp' + servicePacks[fixPackId] + ')';
	}

	return displayText;
}

/**
 * Orders version filter labels chronologically: dotted base versions
 * (e.g. '7.4.13') numerically by major/minor/patch, followed by
 * quarterly release labels (e.g. '2023.q3') by year and quarter. Kept
 * separate from the fix pack id sort used to populate the version
 * selects themselves, since that sort mixes numeric fix pack numbers
 * with quarterly strings and doesn't order them consistently.
 */
function compareVersionFilterLabels(a, b) {
	var aQuarter = /^(\d{4})\.q([1-4])$/.exec(a);
	var bQuarter = /^(\d{4})\.q([1-4])$/.exec(b);

	if (!!aQuarter != !!bQuarter) {
		return aQuarter ? 1 : -1;
	}

	if (aQuarter && bQuarter) {
		return (aQuarter[1] - bQuarter[1]) || (aQuarter[2] - bQuarter[2]);
	}

	var aParts = a.split('.').map(Number);
	var bParts = b.split('.').map(Number);

	return (aParts[0] - bParts[0]) || (aParts[1] - bParts[1]) || (aParts[2] - bParts[2]);
}

function populateVersionFilterSelect(filterSelect, fixPackIds) {
	var seenLabels = {};
	var labels = [];

	for (var i = 0; i < fixPackIds.length; i++) {
		var label = getVersionFilterLabel(fixPackIds[i]);

		if (!seenLabels[label]) {
			seenLabels[label] = true;
			labels.push(label);
		}
	}

	labels.sort(compareVersionFilterLabels);

	for (var i = 0; i < labels.length; i++) {
		var option = document.createElement('option');
		option.value = labels[i];
		option.textContent = labels[i];
		filterSelect.appendChild(option);
	}

	$(filterSelect).trigger('chosen:updated');
}

/**
 * Rebuilds a version select (sourceVersion/targetVersion) to only show
 * the fix pack ids matching the selected base version filter, keeping
 * the previous selection if it still matches or falling back to the
 * newest matching entry otherwise.
 */
function applyVersionFilter(filterSelect, versionSelect, fixPackIds, addFixPack, setIndex, onChangeHandler) {
	var filterValue = filterSelect.options[filterSelect.selectedIndex].value;
	var previousOption = versionSelect.options[versionSelect.selectedIndex];
	var previousValue = previousOption ? previousOption.value : null;

	while (versionSelect.options.length) {
		versionSelect.options[0].remove();
	}

	var matchingFixPackIds = !filterValue ? fixPackIds : fixPackIds.filter(function(fixPackId) {
		return getVersionFilterLabel(fixPackId) == filterValue;
	});

	matchingFixPackIds.reduce(addFixPack, versionSelect);

	setIndex(versionSelect, previousValue);

	$(versionSelect).trigger('chosen:updated');

	onChangeHandler();
}

/**
 * Returns the numeric base version prefix of a fix pack id (e.g.
 * '7010-de-07' -> 7010), used to group fix pack ids by DXP line before
 * ordering them within that line by getFixPackVersion.
 */
function getBaseVersion(a) {
	return parseInt(a.substring(0, a.indexOf('-')));
}

/**
 * Returns a number that fix pack ids within the same base version can
 * be ordered by: 0 for '-base', the ga/u/fix pack number for those
 * suffixes, or a numeric encoding of '<year>.q<quarter>.<update>' for
 * quarterly releases (year * 10000 + quarter * 1000 + update) so they
 * sort numerically instead of as strings (otherwise '.q1.10' would
 * sort before '.q1.2').
 */
function getFixPackVersion(a) {
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

	var quarterMatch = /^(\d{4})\.q([1-4])\.(\d+)$/.exec(fixPackVersion);

	if (quarterMatch) {
		return (parseInt(quarterMatch[1], 10) * 10000) + (parseInt(quarterMatch[2], 10) * 1000) + parseInt(quarterMatch[3], 10);
	}

	return parseInt(fixPackVersion);
}

/**
 * Standard comparator for ordering fix pack ids: by base version line
 * first, then by position within that line.
 */
function compareFixPackIds(a, b) {
	var x1 = getBaseVersion(a);
	var x2 = getBaseVersion(b);

	if (x1 != x2) {
		return x1 - x2;
	}

	x1 = getFixPackVersion(a);
	x2 = getFixPackVersion(b);

	return x1 - x2;
}

function setIndex(select, x) {
	for (var i = 0; i < select.options.length; i++) {
		if (select.options[i].value == x) {
			select.selectedIndex = i;
			return;
		}
	}

	select.selectedIndex = select.options.length - 1;
}
