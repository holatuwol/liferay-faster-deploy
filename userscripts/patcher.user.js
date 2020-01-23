// ==UserScript==
// @name           Patcher Read-Only Views Links
// @namespace      holatuwol
// @version        4.5
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/patcher.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/patcher.user.js
// @match          https://patcher.liferay.com/group/guest/patching
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/*
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
a.included-in-baseline,
a.included-in-baseline:hover {
  color: #ddd;
  text-decoration: line-through;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId,
#_1_WAR_osbpatcherportlet_patcherProjectVersionId {
  width: auto;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId option {
  display: none;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="6.x"] option[data-liferay-version="6.x"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.0"] option[data-liferay-version="7.0"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.1"] option[data-liferay-version="7.1"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.2"] option[data-liferay-version="7.2"] {
  display: block;
}

th.branch-type,
th.branch-type a {
  font-weight: bold;
  width: 5em;
}

/**
 * http://vrl.cs.brown.edu/color
 * 4 colors, lightness between 25 and 85, add alpha of 0.3
 */

tr.qa-analysis-needed.version-6210 td {
  background-color: rgba(79,140,157,0.3) !important;
}

tr.qa-analysis-needed.version-7010 td {
  background-color: rgba(75,214,253,0.3) !important;
}

tr.qa-analysis-needed.version-7110 td {
  background-color: rgba(101,52,102,0.3) !important;
}

tr.qa-analysis-needed.version-7210 td {
  background-color: rgba(131,236,102,0.3) !important;
}

tr.qa-analysis-unneeded {
  opacity: 0.3;
}
`;

document.head.appendChild(styleElement);

AUI = unsafeWindow.AUI;
Liferay = unsafeWindow.Liferay;

var portletId = '1_WAR_osbpatcherportlet';
var ns = '_' + portletId + '_';

/**
 * Utility function to convert an object into a query string with namespaced
 * parameter names.
 */

function getQueryString(params) {
  return Object.keys(params).map(key => (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + params[key]).join('&');
}

/**
 * Shorthand for fetching an element with a namespaced ID.
 */

function querySelector(target) {
  return document.getElementById(ns + target);
}

/**
 * Replaces the "Download" link with the name of the hotfix you're downloading
 */

function replaceHotfixLink(target) {
  var labelNode = document.querySelector('label[for="' + ns + target + '"]');

  if (!labelNode) {
    return;
  }

  var containerNode = labelNode.parentNode;

  var anchor = containerNode.querySelector('a');

  if (!anchor || !anchor.textContent) {
    return;
  }

  var href = anchor.getAttribute('href');
  anchor.textContent = href.substring(href.lastIndexOf('/') + 1);

  if (target == 'official') {
    var buildMetadataCallback = function(obj) {
      buildMetadata = obj.data;
      anchor.parentNode.appendChild(document.createElement('br'));
      var qaStatusNode = document.createTextNode('(' + Liferay.Language.get(buildMetadata.qaStatusLabel) + ')');
      anchor.parentNode.appendChild(qaStatusNode);
    }

    if (exportFunction) {
      buildMetadataCallback = exportFunction(buildMetadataCallback, unsafeWindow);
    }

    var buildId = document.location.pathname.substring(document.location.pathname.lastIndexOf('/') + 1);

    var buildMetadataArguments = {
      id: buildId
    };

    if (cloneInto) {
      buildMetadataArguments = cloneInto(buildMetadataArguments, unsafeWindow);
    }

    Liferay.Service(
      '/osb-patcher-portlet.builds/view',
      buildMetadataArguments,
      buildMetadataCallback
    );
  }
}

/**
 * Looks up the 6.2 fix pack.
 */

var fixPackMetadata = null;

function get62FixPack() {
  if (fixPackMetadata) {
    return fixPackMetadata;
  }

  var fixPackListURL = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fix_packs?' + getQueryString({delta: 200});

  var oldNode = querySelector('patcherFixName');

  if (!oldNode) {
    oldNode = querySelector('patcherBuildName');
  }

  var baseTag = null;
  var fixPackName = oldNode.value.split(',').filter(x => x.indexOf('portal-') == 0)[0];

  if (fixPackName) {
    var xhr1 = new XMLHttpRequest();

    xhr1.open('GET', fixPackListURL, false);
    xhr1.onload = function() {
      // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
      var container1 = document.implementation.createHTMLDocument().documentElement;
      container1.innerHTML = xhr1.responseText;

      var fixPackURL = Array.from(container1.querySelectorAll('table tbody tr td a'))
        .filter(x => x.textContent.trim() == fixPackName)
        .map(x => x.href)[0];

      var xhr2 = new XMLHttpRequest();

      xhr2.open('GET', fixPackURL, false);
      xhr2.onload = function() {
        // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
        var container2 = document.implementation.createHTMLDocument().documentElement;
        container2.innerHTML = xhr2.responseText;

        var gitHubURL = container2.querySelector('label[for="' + ns + 'git-hash"]').parentNode.querySelector('a').href;
        baseTag = gitHubURL.substring(gitHubURL.indexOf('...') + 3);
      };

      xhr2.send(null);
    };

    xhr1.send(null);
  }
  else {
    fixPackName = document.querySelector('label[for="' + ns + 'patcherProjectVersionId"]').parentNode.querySelector('a').textContent;
    baseTag = 'fix-pack-base-6210-' + fixPackName.toLowerCase().substring(fixPackName.indexOf(' ') + 1);
  }

  return {
    'tag': baseTag,
    'name': fixPackName
  };
}

/**
 * Replaces the plain text branch name with a link to GitHub.
 */

function replaceBranchName() {
  var branchNode = querySelector('committish');
  var gitRemoteNode = querySelector('gitRemoteURL');

  if (!branchNode || !gitRemoteNode || !branchNode.readOnly) {
    return;
  }

  var branchName = branchNode.value;

  var projectNode = querySelector('patcherProjectVersionId');
  var baseTag = projectNode.options[projectNode.selectedIndex].textContent.trim();

  if (baseTag.indexOf('6.2') == 0) {
    baseTag = get62FixPack().tag;
  }

  var gitRemoteNode = querySelector('gitRemoteURL');

  var gitRemoteURL = gitRemoteNode.value;
  var gitRemotePath = gitRemoteURL.substring(gitRemoteURL.indexOf(':') + 1, gitRemoteURL.lastIndexOf('.git'));
  var gitRemoteUser = gitRemotePath.substring(0, gitRemotePath.indexOf('/'));

  var gitHubPath = 'https://github.com/' + gitRemotePath;

  replaceNode(branchNode, '<a href="https://github.com/liferay/liferay-portal-ee/compare/' + baseTag + '...' + gitRemoteUser + ':' + branchName + '">' + branchName + '</a>');
  replaceNode(gitRemoteNode, '<a href="' + gitHubPath + '">' + gitRemoteURL + '</a>');
}

/**
 * Replaces any links to a jenkins fix pack builder result with a link that
 * ends with '/consoleText' to take you directly to the build log.
 */

function replaceJenkinsLinks() {
  var links = document.querySelectorAll('a[href*="/job/fixpack-builder"]');

  for (var i = 0; i < links.length; i++) {
    var href = links[i].href;

    if (href.indexOf('consoleText') != -1) {
      continue;
    }

    if (href.charAt(href.length - 1) != '/') {
      href += '/';
    }

    links[i].href = href + 'consoleText';
  }
}

/**
 * Replaces any links that would have opened in a modal dialog / popup
 * window with one that opens in a regular new window.
 */

function replacePopupWindowLinks() {
  var buttons = document.querySelectorAll('button[onclick]');

  for (var i = 0; i < buttons.length; i++) {
    var onclickAttribute = buttons[i].attributes['onclick'];
    var onclickValue = onclickAttribute.value;

    if (onclickValue.indexOf('javascript:') == 0) {
      onclickValue = onclickValue.substring('javascript:'.length);
    }

    onclickValue = onclickValue.replace(/Liferay.Patcher.openWindow\('([^']*)',[^\)]*/g, "window.open('$1','_blank'");
    onclickValue = onclickValue.replace('?p_p_state=pop_up', '');
    onclickValue = onclickValue.replace('&p_p_state=pop_up', '');

    onclickAttribute.value = onclickValue;
  }
}

/**
 * Utility function to extract the currently selected value of a
 * select box.
 */

function getSelectedValue(target) {
  var select = querySelector(target);

  if (!select || select.selectedIndex == -1) {
    return '';
  }

  return select.options[select.selectedIndex].value;
}

/**
 * Update the link to "Use as Build Template" to include additional
 * parameters so that they can be auto-selected.
 */

function addBaselineToBuildTemplate() {
  var baselineLinks = Array.from(document.querySelectorAll('.taglib-text-icon')).filter(function(x) { return x.textContent.toLowerCase() == 'use as build template'; });

  if (baselineLinks.length != 1) {
    return;
  }

  var buildTemplateAnchor = baselineLinks[0].parentNode;

  buildTemplateAnchor.href += '&' + getQueryString({
    'patcherProductVersionId': getSelectedValue('patcherProductVersionId'),
    'patcherProjectVersionId': getSelectedValue('patcherProjectVersionId')
  });
}

/**
 * Utility function replace the specified input element with the given HTML
 * view, creating a hidden input so that forms still submit properly.
 */

function replaceNode(oldNode, newHTML) {
  var newNode = document.createElement('span');
  newNode.innerHTML = newHTML;

  var newHiddenInputNode = document.createElement('input');
  newHiddenInputNode.type = 'hidden';
  newHiddenInputNode.name = oldNode.name;
  newHiddenInputNode.id = oldNode.id;

  if (oldNode.tagName.toLowerCase() == 'select') {
    newHiddenInputNode.value = oldNode.options[oldNode.selectedIndex].value;
  }
  else if (oldNode.innerHTML) {
    newHiddenInputNode.value = oldNode.innerHTML
  }
  else {
    newHiddenInputNode.value = oldNode.value;
  }

  var parentNode = oldNode.parentNode;

  parentNode.replaceChild(newHiddenInputNode, oldNode);
  parentNode.insertBefore(newNode, newHiddenInputNode);
}

/**
 * Replaces a GMT date with a date in the user's current time zone, according to
 * their web browser.
 */

function replaceDate(target) {
  var labelNode = document.querySelector('label[for="' + ns + target + '"]');

  if (!labelNode) {
    return;
  }

  var containerNode = labelNode.parentNode;

  var dateNode = containerNode.childNodes[2];

  var dateString = new Date(dateNode.textContent.trim() + ' GMT-0000').toString();

  dateNode.textContent = dateString;
}

/**
 * Returns the HTML for a build link. If it links to the current page, then just return
 * regular text.
 */

function getBuildLinkHTML(build) {
  var currentURL = document.location.protocol + '//' + document.location.host + document.location.pathname;

  return (currentURL == build.buildLink) ? build.branchType : '<a href="' + build.buildLink + '">' + build.branchType + '</a>';
}

/**
 * Processes a single child build and generates the HTML for its git hash compare link.
 */

function getChildBuildHash(mergeCompareLink, build) {
  var baseTag = build.branchName;

  if (baseTag.indexOf('6.2') == 0) {
    var baseTag = get62FixPack().tag;
  }

  var compareLink = 'https://github.com/liferay/liferay-portal-ee/compare/' + baseTag + '...fix-pack-fix-' + build.patcherFixId;

  var extraHTML = (compareLink == mergeCompareLink) ? ' (build tag)' : '';

  return '<tr><th class="branch-type">' + getBuildLinkHTML(build) + '</th><td><a href="' + compareLink + '" target="_blank">fix-pack-fix-' + build.patcherFixId + '</a>' + extraHTML + '</td></tr>';
}

/**
 * Processes a single child build and generates the HTML for its fixes.
 */

function replaceGitHashes(childBuildsMetadata) {
  var oldNode = document.querySelector('label[for="' + ns + 'git-hash"]').parentNode.querySelector('a');
  var mergeCompareLink = oldNode.href;

  var patcherFixIds = {};
  var patcherFixIdCount = 0;

  var joinFunction = function(build, obj) {
    build.patcherFixId = obj.data.patcherFixId;

    if (++patcherFixIdCount != childBuildsMetadata.length) {
      return;
    }

    var tableRows = childBuildsMetadata.map(getChildBuildHash.bind(null, mergeCompareLink));

    replaceNode(oldNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + tableRows.join('') + '</tbody></table>');
  }

  for (var i = 0; i < childBuildsMetadata.length; i++) {
    var childBuildFunction = joinFunction.bind(null, childBuildsMetadata[i]);

    if (exportFunction) {
      childBuildFunction = exportFunction(childBuildFunction, unsafeWindow);
    }

    var childBuildArguments = { id: childBuildsMetadata[i].buildId };

    if (cloneInto) {
      childBuildArguments = cloneInto(childBuildArguments, unsafeWindow);
    }

    Liferay.Service(
      '/osb-patcher-portlet.builds/view',
      childBuildArguments,
      childBuildFunction
    );
  }
}

/**
 * Parses the row for any build metadata
 */

function getBuildMetadata(row) {
  var buildId = row.cells[0].textContent.trim();
  var buildLink = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/' + buildId;
  var branchName = row.cells[3].textContent.trim();
  var branchType = branchName.indexOf('-private') != -1 ? 'private' : 'public';

  return {
    buildId: buildId,
    buildLink: buildLink,
    branchName: branchName,
    branchType: branchType,
    fixes: getTicketLinks(row.cells[2].textContent, '')
  }
}

/**
 * Processes the child build text.
 */

function processChildBuilds(xhr, oldFixesNode) {
  // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
  var container = document.implementation.createHTMLDocument().documentElement;
  container.innerHTML = xhr.responseText;

  var rows = Array.from(container.querySelectorAll('table tbody tr')).filter(row => !row.classList.contains('lfr-template'));

  var childBuildsMetadata = rows.map(getBuildMetadata);
  var childBuildFixesHTML = childBuildsMetadata.map(build => '<tr><th class="branch-type">' + getBuildLinkHTML(build) + '</th><td>' + build.fixes + '</td></tr>');

  replaceNode(oldFixesNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + childBuildFixesHTML.join('') + '</tbody></table>');
  replaceGitHashes(childBuildsMetadata);
}

/**
 * Returns a link to the ticket.
 */

function getTicketLink(className, ticket) {
  if (ticket.toUpperCase() != ticket) {
    return ticket;
  }

  var ticketURL = 'https://issues.liferay.com/browse/' + ticket;

  if (className) {
    var productVersionId = querySelector('patcherProductVersionId').value;
    var projectVersionId = querySelector('patcherProjectVersionId').value;

    var params = {
      advancedSearch: true,
      andOperator: true,
      hideOldFixVersions: true,
      patcherFixName: ticket,
      patcherProductVersionId: productVersionId,
      patcherProjectVersionIdFilter: projectVersionId
    };

    ticketURL = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher?' + getQueryString(params);
  }

  return '<a class="' + className + '" href="' + ticketURL + '" target="_blank">' + ticket + '</a>';
}

/**
 * Compares two tickets.
 */

function compareTicket(a, b) {
  var aParts = a.split('-');
  var bParts = b.split('-');

  if (aParts[0] != bParts[0]) {
    return aParts[0] > bParts[0] ? 1 : -1;
  }

  if ((aParts.length == 1) || (bParts.length == 1)) {
    return bParts.length - aParts.length;
  }

  return parseInt(aParts[1]) - parseInt(bParts[1]);
}

/**
 * Converts the provided list of tickets into a nice HTML version.
 */

function getTicketLinks(text, className) {
  return text.split(',').map(x => x.trim()).sort(compareTicket).map(getTicketLink.bind(null, className)).join(', ');
}

function replaceBuild() {
  if (document.location.pathname.indexOf('/builds/') == -1) {
    return;
  }

  var buildNode = querySelector('patcherBuildName');

  if (!buildNode || !buildNode.readOnly) {
    return;
  }

  var fixes = buildNode.innerHTML.split(',').map(x => x.trim());
  var childBuildsButton = Array.from(document.querySelectorAll('button')).filter(x => x.textContent.trim() == 'View Child Builds');

  var buildId = document.location.pathname.substring(document.location.pathname.lastIndexOf('/') + 1);
  var buildLink = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/' + buildId;
  var projectVersionSelect = querySelector('patcherProjectVersionId');
  var branchName = projectVersionSelect.options[projectVersionSelect.selectedIndex].textContent.trim();
  var branchType = branchName.indexOf('-private') != -1 ? 'private' : 'public';

  var build = {
    buildId: buildId,
    buildLink: buildLink,
    branchName: branchName,
    branchType: branchType,
    fixes: getTicketLinks(buildNode.innerHTML, '')
  };

  var childBuildFixesHTML = '<tr><th class="branch-type">' + getBuildLinkHTML(build) + '</th><td>' + build.fixes;

  if (childBuildsButton.length == 0) {
    replaceNode(buildNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + childBuildFixesHTML + '</tbody></table>');
    replaceGitHashes([build]);
  }
  else {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', document.location.pathname + '/childBuilds');
    xhr.onload = processChildBuilds.bind(null, xhr, buildNode);
    xhr.send(null);
  }

  var originalBuildNode = querySelector('patcherBuildOriginalName');

  if (originalBuildNode) {
    var excludedFixes = originalBuildNode.innerHTML.split(',').map(x => x.trim()).filter(x => !fixes.includes(x));
    var excludedHTML = excludedFixes.sort(compareTicket).map(getTicketLink.bind(null, 'included-in-baseline')).join(', ');

    var excludedFixesHTML = '<tr><th class="branch-type">excluded</th><td>' + excludedHTML + '</td></tr>';
    replaceNode(originalBuildNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + childBuildFixesHTML + excludedFixesHTML + '</tbody></table>');
  }
}

/**
 * Replaces the list of fixes with a list of JIRA links.
 */

function replaceFixes() {
  var oldNode = querySelector('patcherFixName');

  if (!oldNode || !oldNode.readOnly) {
    return;
  }

  replaceNode(oldNode, oldNode.innerHTML.split(',').map(getTicketLink.bind(null, '')).join(', '));
}

/**
 * Replaces the account name with a link to all builds for the account.
 */

function replaceAccountLink(target) {
  var oldNode = querySelector(target);

  if (oldNode && oldNode.readOnly) {
    var params = {
      'p_p_id': portletId,
      'patcherBuildAccountEntryCode': oldNode.value,
      'patcherProductVersionId': querySelector('patcherProductVersionId').value
    };

    replaceNode(oldNode, '<a href="https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?' + getQueryString(params) + '" target="_blank">' + oldNode.value + '</a>');
  }
}

/**
 * Replaces a ticket name with a link to LESA or Help Center.
 */

function replaceLesaLink(target) {
  var oldNode = querySelector(target);

  if (oldNode && oldNode.readOnly) {
    var ticketURL;

    if (oldNode.value.indexOf('https:') == 0) {
      ticketURL = oldNode.value;
    }
    else if (isNaN(oldNode.value)) {
      if ((oldNode.value.indexOf('LPP-') == 0) || (oldNode.value.indexOf('GROW-') == 0)) {
        ticketURL = 'https://issues.liferay.com/browse/' + oldNode.value;
      }
      else {
        ticketURL = 'https://web.liferay.com/group/customer/support/-/support/ticket/' + oldNode.value;
      }
    }
    else {
      ticketURL = 'https://liferay-support.zendesk.com/agent/tickets/' + oldNode.value;
    }

    replaceNode(oldNode, '<a href="' + ticketURL + '" target="_blank">' + ticketURL + '</a>');
  }
}

/**
 * Adds a new element to the page to allow you to select from a list of
 * Liferay versions before choosing a product version.
 */

function addProductVersionFilter() {
  var productVersionSelect = querySelector('patcherProductVersionId');

  if (!productVersionSelect) {
    return;
  }
  else if (productVersionSelect.disabled) {
    var projectVersionSelect = querySelector('patcherProjectVersionId');

    var patcherTagName = projectVersionSelect.options[projectVersionSelect.selectedIndex].textContent.trim();
    var branchName = patcherTagName;

    if (patcherTagName.indexOf('6.2') == 0) {
      var metadata = get62FixPack();

      patcherTagName = metadata.tag;
      branchName = metadata.name;
    }

    replaceNode(projectVersionSelect, '<a href="https://github.com/liferay/liferay-portal-ee/tree/' + patcherTagName + '">' + branchName + '</a>');
    return;
  }

  var versions = ['', '6.x', '7.0', '7.1', '7.2'];

  for (var i = 0; i < productVersionSelect.options.length; i++) {
    var option = productVersionSelect.options[i];

    for (var j = 1; j < versions.length; j++) {
      if ((option.textContent.indexOf('DXP ' + versions[j]) != -1) || (option.textContent.indexOf('Portal ' + versions[j]) != -1)) {
        option.setAttribute('data-liferay-version', versions[j]);
      }
    }
  }

  var liferayVersionSelect = document.createElement('select');
  liferayVersionSelect.id = ns + 'liferayVersion';

  for (var i = 0; i < versions.length; i++) {
    var option = document.createElement('option');
    option.value = versions[i];
    option.textContent = versions[i];
    liferayVersionSelect.appendChild(option);
  };

  liferayVersionSelect.onchange = updateProductVersionSelect;
  productVersionSelect.parentNode.insertBefore(liferayVersionSelect, productVersionSelect);
}

/**
 * Updates the product version select based on the value of the Liferay
 * version select.
 */

function updateProductVersionSelect() {
  var productVersionSelect = querySelector('patcherProductVersionId');

  var liferayVersion = getSelectedValue('liferayVersion');
  productVersionSelect.setAttribute('data-liferay-version', liferayVersion);

  if (productVersionSelect.selectedIndex != -1) {
    var selectedOption = productVersionSelect.options[productVersionSelect.selectedIndex];

    if (selectedOption.getAttribute('data-liferay-version') == liferayVersion) {
      if (selectedOption.textContent.trim() == 'DXP ' + liferayVersion) {
        setTimeout(updateProjectVersionOrder, 500);
      }

      return;
    }
  }

  var option = productVersionSelect.querySelector('option[data-liferay-version="' + liferayVersion + '"]');

  if (option) {
    option.selected = true;
    window[ns + 'productVersionOnChange'](option.value);
    setTimeout(updateProjectVersionOrder, 500);
  }
}

/**
 * Converts the tag name into a seven digit version number that can be
 * used for sorting. First four digits are the base version (7010, 7110),
 * and the remander are the fix pack level.
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
 * Comparison function that uses getLiferayVersion to compute versions,
 * and then sorts in alphabetical order for equivalent versions (thus,
 * we get private branches sorted after the equivalent public branch).
 */

function compareLiferayVersions(a, b) {
  var aValue = getLiferayVersion(a.textContent);
  var bValue = getLiferayVersion(b.textContent);

  if (aValue != bValue) {
    return aValue - bValue;
  }

  return a > b ? 1 : a < b ? -1 : 0;
}

/**
 * Places the project versions in numeric order rather than alphabetical
 * order, to make it easier to find the latest baseline.
 */

function updateProjectVersionOrder() {
  var projectVersionSelect = querySelector('patcherProjectVersionId');

  var sortedOptions =  Array.from(projectVersionSelect.options).sort(compareLiferayVersions);

  for (var i = 0; i < sortedOptions.length; i++) {
    projectVersionSelect.appendChild(sortedOptions[i]);
  }
}

/**
 * Selects anything that was specified in the query string.
 */

function updateFromQueryString() {
  var liferayVersionSelect = querySelector('liferayVersion');

  if (!liferayVersionSelect) {
    return;
  }

  var productVersionSelect = querySelector('patcherProductVersionId');

  var re = new RegExp(ns + 'patcherProductVersionId=(\\d+)');
  var match = re.exec(document.location.search);

  if (match) {
    var patcherProductVersionId = match[1];
    var option = productVersionSelect.querySelector('option[value="' + patcherProductVersionId + '"]');

    if (option) {
      var liferayVersion = option.getAttribute('data-liferay-version');

      option = liferayVersionSelect.querySelector('option[value="' + liferayVersion + '"]');

      if (option) {
        option.selected = true;
        updateProductVersionSelect();
      }
    }
  }

  var projectVersionSelect = querySelector('patcherProjectVersionId');

  re = new RegExp(ns + 'patcherProjectVersionId=(\\d+)');
  match = re.exec(document.location.search);

  if (match) {
    var patcherProjectVersionId = match[1];
    var option = projectVersionSelect.querySelector('option[value="' + patcherProjectVersionId + '"]');

    if (option) {
      option.selected = true;
    }
    else {
      setTimeout(updateFromQueryString, 500);
    }
  }
}

function highlightAnalysisNeededBuilds() {
  var activeTab = document.querySelector('.tab.active');

  if (!activeTab) {
    return;
  }

  var tabs = document.querySelectorAll('.tab > a');

  for (var i = 0; i < tabs.length; i++) {
    if ('QA Builds' == tabs[i].textContent.trim()) {
      tabs[i].href += '&_1_WAR_osbpatcherportlet_delta=200';
    }
  }

  if ('QA Builds' != activeTab.textContent.trim()) {
    return;
  }

  var buildsTable = querySelector('patcherBuildsSearchContainer');

  if (!buildsTable) {
    return;
  }

  var headerRow = buildsTable.querySelectorAll('thead tr th');

  var statusIndex = -1;
  var versionIndex = -1;

  for (var i = 0; i < headerRow.length; i++) {
    if (headerRow[i].id.indexOf('qa-status') != -1) {
      statusIndex = i;
    }

    if (headerRow[i].id.indexOf('project-version') != -1) {
      versionIndex = i;
    }
  }

  var buildsTableBody = buildsTable.querySelector('tbody');

  var rows = buildsTableBody.querySelectorAll('tr');
  var detachedRows = [];

  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].querySelectorAll('td');
    var status = cells[statusIndex];

    var projectVersion = cells[versionIndex].textContent.trim();
    var versionNumber = projectVersion.indexOf('6.2.10') != -1 ? '6210' : projectVersion.substring(projectVersion.lastIndexOf('-') + 1);

    rows[i].classList.add('version-' + versionNumber);

    if (status.textContent.indexOf('QA Analysis') != -1) {
      rows[i].classList.add('qa-analysis-needed');
    }
    else {
      rows[i].classList.add('qa-analysis-unneeded');
      rows[i].remove();
      detachedRows.push(rows[i])
    }
  }

  for (var i = 0; i < detachedRows.length; i++) {
    buildsTableBody.appendChild(detachedRows[i]);
  }
}

// Run all the changes we need to the page.

function applyPatcherCustomizations(A) {
  replaceJenkinsLinks();
  replacePopupWindowLinks();
  addBaselineToBuildTemplate();
  replaceHotfixLink('official');
  replaceHotfixLink('sourceZip');
  replaceBranchName();
  replaceFixes();
  replaceBuild();
  replaceAccountLink('accountEntryCode');
  replaceAccountLink('patcherBuildAccountEntryCode');
  replaceLesaLink('lesaTicket');
  replaceLesaLink('supportTicket');
  replaceDate('createDate');
  replaceDate('modifiedDate');
  addProductVersionFilter();
  highlightAnalysisNeededBuilds();

  setTimeout(updateFromQueryString, 500);
};

if (exportFunction) {
  applyPatcherCustomizations = exportFunction(applyPatcherCustomizations, unsafeWindow);
}

AUI().ready(applyPatcherCustomizations);