// ==UserScript==
// @name           Generate patcher.json from Patcher Create Fix
// @namespace      holatuwol
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/create?_1_WAR_osbpatcherportlet_patcherProductVersionId=0
// @grant          unsafeWindow
// ==/UserScript==

/**
 * Switch the product versions so that we can peek inside each of the drop downs.
 */

var re = /^DXP ([0-9]*\.[0-9]*)$/ig

function setProductVersions(accumulator, next) {
  var textContent = next.textContent.trim();

  var match = re.exec(textContent);

  if (match) {
    if (match[1] == '7.0') {
      accumulator['ee-7.0.x'] = parseInt(next.value);
    }

    accumulator[match[1] + '.x'] = parseInt(next.value);
    accumulator[match[1] + '.x-private'] = parseInt(next.value);
  }
  else if (textContent == 'Portal 6.x') {
    accumulator['ee-6.1.x'] = parseInt(next.value);
    accumulator['ee-6.2.x'] = parseInt(next.value);
  }
  else {
    return accumulator;
  }

  next.selected = true;
  _1_WAR_osbpatcherportlet_productVersionOnChange(next.value);

  var projectVersions = document.querySelectorAll('#_1_WAR_osbpatcherportlet_patcherProjectVersionId option');

  Array.from(projectVersions).reduce(
    next.innerText.trim() == 'Portal 6.x' ? setProjectVersions6 : setProjectVersions7,
    accumulator
  );

  return accumulator;
};

/**
 * Code for extracting the 6.x product versions.
 */

function setProjectVersions6(accumulator, next) {
  var key = next.innerText.trim();

  if (key == '') {
    return accumulator;
  }

  var key = 'fix-pack-base-' + key.replace(/ /g, '-').replace(/\./g, '').toLowerCase();

  accumulator[key] = parseInt(next.value);

  return accumulator;
};

/**
 * Code for extracting the 7.x product versions, filtering out the special ones for
 * adding new hotfixes for marketplace applications.
 */

function setProjectVersions7(accumulator, next) {
  var key = next.innerText.trim();

  if ((key == '') || (key.indexOf('marketplace') != -1)) {
    return accumulator;
  }

  accumulator[key] = parseInt(next.value);

  return accumulator;
};

/**
 * Add product versions based on the giant JSON object on the page.
 */

function setProjectVersionsFromMap(accumulator, next) {
  var key = next.committish;

  if ((key == '') || (key.indexOf('marketplace') != -1)) {
    return accumulator;
  }

  accumulator[key] = next.patcherProjectVersionId;

  return accumulator;
}

/**
 * Parses the major/minor/patch version from the name of the fix pack.
 */

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
  else if (version.indexOf('fix-pack-base-') != -1) {
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
  else {
    var shortVersion = /[0-9]*\.[0-9]/.exec(version)[0].replace('.', '');

    return parseInt(shortVersion) * 100 * 1000;
  }
}

/**
 * Comparator so that we can take two fix pack versions and identify which one
 * should theoretically come first, if we were to group fix packs by version,
 * and then group them numerically.
 */

function compareLiferayVersions(a, b) {
  var aValue = getLiferayVersion(a);
  var bValue = getLiferayVersion(b);

  if (aValue != bValue) {
    return aValue - bValue;
  }

  return a > b ? 1 : a < b ? -1 : 0;
};

function getProjectVersionIdsFromScript(script) {
  var scriptContent = script.innerHTML;

  var x = scriptContent.indexOf('{', scriptContent.indexOf('Liferay.Patcher.populateProjectVersionField'));
  var y = scriptContent.indexOf(')', x);

  var data = eval('data = ' + scriptContent.substring(x, y));

  var projectVersionIds = {
    'ee-6.1.x': 101625503,
    'ee-6.2.x': 101625503,
    'ee-7.0.x': 101625504,
    '7.0.x': 101625504,
    '7.0.x-private': 101625504,
    '7.1.x': 102311424,
    '7.1.x-private': 102311424,
    '7.2.x': 130051253,
    '7.2.x-private': 130051253,
    '7.3.x': 175004848,
    '7.3.x-private': 175004848
  };

  for (projectVersionId in data) {
    data[projectVersionId].reduce(setProjectVersionsFromMap, projectVersionIds);
  }

  return projectVersionIds;
}

function getProjectVersionIdsFromSelects() {
  var productVersionOptions = document.querySelectorAll('#_1_WAR_osbpatcherportlet_patcherProductVersionId option');

  var projectVersionIds = {
    'ee-6.1.x': 101625503,
    'ee-6.2.x': 101625503,
    'ee-7.0.x': 101625504,
  };

  Array.from(productVersionOptions).reduce(setProductVersions, projectVersionIds);

  return projectVersionIds;
}

/**
 * Generate the patcher.json file whenever the projects are ready.
 */

function generatePatcherJSON() {
  var scripts = Array.from(document.querySelectorAll('script')).filter(x => x.innerHTML.indexOf('Liferay.Patcher.populateProjectVersionField') != -1);

  var projectVersionIds = scripts.length == 1 ? getProjectVersionIdsFromScript(scripts[0]) : getProjectVersionIdsFromSelects();

  delete projectVersionIds['fix-pack-base-6210-sp18'];

  var jsonString = JSON.stringify(
      projectVersionIds,
      Object.keys(projectVersionIds).sort(compareLiferayVersions),
      4
  );

  console.log(jsonString.replace(/    /g, '\t'));
}

unsafeWindow.generatePatcherJSON = generatePatcherJSON;