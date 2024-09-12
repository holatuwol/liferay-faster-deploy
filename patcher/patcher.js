// ==UserScript==
// @name           Generate patcher.json from Patcher Create Fix
// @namespace      holatuwol
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/create?_1_WAR_osbpatcherportlet_patcherProductVersionId=0
// @grant          unsafeWindow
// ==/UserScript==

/**
 * Switch the product versions so that we can peek inside each of the drop downs.
 */

function setProductVersions(accumulator, next) {
  next.selected = true;
  _1_WAR_osbpatcherportlet_productVersionOnChange(next.value);

  var projectVersions = document.querySelectorAll('#_1_WAR_osbpatcherportlet_patcherProjectVersionId option');

  Array.from(projectVersions).reduce(
    next.innerText.trim() == 'Portal 6.x' ? setProductVersions6.bind(null, parseInt(next.value)) : setProductVersions7.bind(null, parseInt(next.value)),
    accumulator
  );

  return accumulator;
};

function setProjectVersions(accumulator, next) {
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

function setProductVersions6(version, accumulator, next) {
  var key = next.innerText.trim();

  if (key == '') {
    return accumulator;
  }

  var key = 'fix-pack-base-' + key.replace(/ /g, '-').replace(/\./g, '').toLowerCase();

  accumulator[key] = version;

  return accumulator;
}

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
 * Code for extracting the 7.x product versions.
 */

function setProductVersions7(version, accumulator, next) {
  var key = next.innerText.trim();

  if (key == '') {
    return accumulator;
  }

  accumulator[key] = version;

  return accumulator;
};

function setProjectVersions7(accumulator, next) {
  var key = next.innerText.trim();

  if (key == '') {
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

  if (key == '') {
    return accumulator;
  }

  accumulator[key] = next.patcherProjectVersionId;

  return accumulator;
}

/**
 * Parses the major/minor/patch version from the name of the fix pack.
 */

function getLiferayVersion(version) {
  if (version.indexOf('marketplace-') != -1) {
    var pos = version.indexOf('-private');
    pos = version.lastIndexOf('-', pos == -1 ? version.length : pos - 1);
    var shortVersion = version.substring(pos + 1);
    return parseInt(shortVersion) * 1000;
  }
  else if (version.indexOf('fix-pack-de-') != -1) {
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
  else if (version.indexOf('-ga1') != -1) {
    var shortVersionMatcher = /^([0-9]*)\.([0-9]*)\.([0-9]*)/.exec(version);
    var shortVersion = shortVersionMatcher[1] + shortVersionMatcher[2];
    return parseInt(shortVersion) * 1000 + parseInt(shortVersionMatcher[3]);
  }
  else if (version.indexOf('-u') != -1) {
    var shortVersionMatcher = /[0-9]*\.[0-9]/.exec(version);
    var shortVersion = shortVersionMatcher[0].replace('.', '');
    var updateVersionMatcher = /-u([0-9]*)/.exec(version);
    var updateVersion = updateVersionMatcher[1];
    return parseInt(shortVersion) * 100 * 1000 + parseInt(updateVersion);
  }
  else if (version.indexOf('.q') != -1) {
    var shortVersionMatcher = /([0-9][0-9][0-9][0-9])\.q([0-9])\.([0-9]*)/.exec(version);
    var shortVersion = shortVersionMatcher[1] + shortVersionMatcher[2];
    var updateVersion = shortVersionMatcher[3];
    return parseInt(shortVersion) * 100 + parseInt(updateVersion);
  }
  else {
    console.log('unrecognized version pattern', version);
    return 0;
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

  return a > b ? 1 : a < b ? -1 : a.localeCompare(b);
};

function getProjectVersionIdsFromScript(script) {
  var scriptContent = script.innerHTML;

  var x = scriptContent.indexOf('{', scriptContent.indexOf('Liferay.Patcher.populateProjectVersionField'));
  var y = scriptContent.indexOf(')', x);

  var data = eval('data = ' + scriptContent.substring(x, y));

  var projectVersionIds = {};

  for (projectVersionId in data) {
    data[projectVersionId].reduce(setProjectVersionsFromMap, projectVersionIds);
  }

  return projectVersionIds;
}

function removeBadVersions(versionIds) {
  delete versionIds['fix-pack-base-6210-sp18'];
  delete versionIds['marketplace-portal-search-solr7-1.1.0-7110']
  delete versionIds['marketplace-portal-search-solr8-2.0.0-7110']
}

/**
 * Generate the patcher.json file whenever the projects are ready.
 */

function generatePatcherJSON() {
  var scripts = Array.from(document.querySelectorAll('script')).filter(x => x.innerHTML.indexOf('Liferay.Patcher.populateProjectVersionField') != -1);

  var productVersionOptions = document.querySelectorAll('#_1_WAR_osbpatcherportlet_patcherProductVersionId option');

  var productVersionIds = Array.from(productVersionOptions).reduce(setProductVersions, {});

  removeBadVersions(productVersionIds);

  var jsonString = JSON.stringify(
    productVersionIds,
    Object.keys(productVersionIds).sort(compareLiferayVersions),
    4
  );

  console.log('product versions');
  console.log(jsonString.replace(/    /g, '\t'));

  var projectVersionIds = (scripts.length == 1) ? getProjectVersionIdsFromScript(scripts[0]) : Array.from(productVersionOptions).reduce(setProjectVersions, {});

  removeBadVersions(projectVersionIds);

  jsonString = JSON.stringify(
    projectVersionIds,
    Object.keys(projectVersionIds).sort(compareLiferayVersions),
    4
  );

  console.log('project versions');
  console.log(jsonString.replace(/    /g, '\t'));
}

//unsafeWindow.generatePatcherJSON = generatePatcherJSON;