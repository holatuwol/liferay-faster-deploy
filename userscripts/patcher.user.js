// ==UserScript==
// @name           Patcher Read-Only Views Links
// @namespace      holatuwol
// @version        10.6
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/patcher.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/patcher.user.js
// @match          https://patcher.liferay.com/group/guest/patching
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher*
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/*
// @grant          unsafeWindow
// ==/UserScript==
/**
 * Compiled from TypeScript
 * https://github.com/holatuwol/liferay-patcher-userscript
 */ 
var styleElement = document.createElement('style');
styleElement.textContent = `
a.included-in-baseline,
a.included-in-baseline:hover {
  color: #ddd;
  text-decoration: line-through;
}

.nowrap {
  white-space: nowrap;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId,
#_1_WAR_osbpatcherportlet_patcherProjectVersionId {
  width: auto;
}

textarea[inputcssclass="osb-patcher-input-wide"] {
  height: 3em;
  width: 60em;
}

p[inputcssclass="osb-patcher-input-wide"] {
  display: inline-block;
  padding: 4px 6px;
  margin-right: 5px;
  width: 60em;
}

#_1_WAR_osbpatcherportlet_patcherBuildName {
  height: 5em;
}

.control-group.field-wrapper .table,
.control-group.input-select-wrapper .table,
.control-group.input-String-wrapper .table,
.control-group.input-text-wrapper .table {
  margin-bottom: 0.5em;
}

#security-fixes .show-details,
#ticket-suggestions .show-details {
  background-color: #fff;
  font-size: x-small;
  line-height: 0.5em;
  text-align: right;
}

.compact .verbose,
.verbose .compact {
  display: none !important;
}

th.branch-type,
th.branch-type a {
  font-weight: bold;
  width: 5em;
}

.control-group.field-wrapper,
.control-group.input-select-wrapper,
.control-group.input-String-wrapper,
.control-group.input-text-wrapper {
  display: flex;
  margin-bottom: 0.1em;
}

.control-group .control-group.field-wrapper,
.control-group .control-group.input-select-wrapper,
.control-group .control-group.input-String-wrapper,
.control-group .control-group.input-text-wrapper,
.popover .control-group.field-wrapper,
.popover .control-group.input-select-wrapper,
.popover .control-group.input-String-wrapper,
.popover .control-group.input-text-wrapper {
  display: block;
}

#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.field-wrapper,
#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.input-select-wrapper,
#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.input-String-wrapper,
#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.input-text-wrapper {
  display: block;
}

a[href*="https://grow.liferay.com/"] {
  padding-left: 0.5em;
}

a[href*="https://test-5-2.liferay.com/"] {
  padding-right: 0.5em;
}

a[href*="http://files.liferay.com/"],
a[href*="https://files.liferay.com/"] {
  font-size: x-large;
}

.control-group.field-wrapper .control-label,
.control-group.input-select-wrapper .control-label,
.control-group.input-String-wrapper .control-label,
.control-group.input-text-wrapper .control-label {
  font-weight: bold;
  min-width: 20em;
  width: 20em;
}

#security-fixes dl {
  margin-block-start: 0em;
  margin-block-end: 0em;
  margin-bottom: 0px;
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

.shortened-content {
  margin: 0.5em !important;
}

.shortened-content .fix-item::before {
  content: ', ';
}

.shortened-content .fix-item a {
  white-space: nowrap;
}
`;
document.head.appendChild(styleElement);
if (document.location.pathname.indexOf('/create') != -1) {
    var createStyleElement = document.createElement('style');
    createStyleElement.textContent = `
#_1_WAR_osbpatcherportlet_patcherProductVersionId option {
  display: none;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="6.x"] option[data-liferay-version="6.x"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.0"] option[data-liferay-version="7.0"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.1"] option[data-liferay-version="7.1"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.2"] option[data-liferay-version="7.2"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.3"] option[data-liferay-version="7.3"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.4"] option[data-liferay-version="7.4"] {
  display: block;
}
`;
    document.head.appendChild(createStyleElement);
}
var AUI = unsafeWindow.AUI;
var Liferay = unsafeWindow.Liferay;
var _1_WAR_osbpatcherportlet_productVersionOnChange = unsafeWindow._1_WAR_osbpatcherportlet_productVersionOnChange;
var portletId = '1_WAR_osbpatcherportlet';
var ns = '_' + portletId + '_';
/**
 * Standard implementation of debounce.
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(function () {
            func.apply(this, args);
        }, delay);
    };
}
/**
 * Utility function to wait for the given parent to have the given selector available.
 */
async function waitForElement(selector) {
    return new Promise(function (resolve) {
        var observerCallback = debounce(function () {
            const result = selector.indexOf(ns) != -1 ? document.querySelector(selector) : querySelector(selector);
            if (result) {
                observer.disconnect();
                resolve(result);
            }
        }, 500);
        const observer = new MutationObserver(observerCallback);
        observerCallback([], observer);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
}
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
 * Replaces a GMT date with a date in the user's current time zone, according to
 * their web browser.
 */
function replaceDate(target) {
    var labelNode = document.querySelector('label[for="' + ns + target + '"]');
    if (!labelNode) {
        return;
    }
    var containerNode = labelNode.parentElement;
    if (!containerNode) {
        return;
    }
    var dateNode = containerNode.childNodes[2];
    var oldDateText = dateNode.textContent;
    if (!oldDateText) {
        return;
    }
    var dateString = new Date(oldDateText.trim() + ' UTC').toString();
    if (dateString.indexOf(':') != -1) {
        dateNode.textContent = dateString;
    }
}
/**
 * Utility function replace the specified input element with the given HTML
 * view, creating a hidden input so that forms still submit properly.
 */
function replaceNode(oldNode, newHTML) {
    var newNode = document.createElement('span');
    newNode.innerHTML = newHTML;
    var newHiddenInputNode = document.createElement('input');
    newHiddenInputNode.setAttribute('type', 'hidden');
    newHiddenInputNode.setAttribute('name', oldNode.getAttribute('name') || '');
    newHiddenInputNode.setAttribute('id', oldNode.getAttribute('id') || '');
    if (oldNode.tagName.toLowerCase() == 'select') {
        var oldSelectNode = oldNode;
        newHiddenInputNode.value = oldSelectNode.options[oldSelectNode.selectedIndex].value;
    }
    else if (oldNode.innerHTML) {
        newHiddenInputNode.value = oldNode.innerHTML;
    }
    else {
        newHiddenInputNode.setAttribute('value', oldNode.getAttribute('value') || '');
    }
    var parentElement = oldNode.parentElement;
    parentElement.replaceChild(newHiddenInputNode, oldNode);
    parentElement.insertBefore(newNode, newHiddenInputNode);
}
/**
 * Returns a link to the build.
 */
function getBuildLink(buildId) {
    return '<a class="nowrap" href="https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/' +
        buildId + '" target="_blank">' + buildId + '</a>';
}
/**
 * Returns a link to the ticket.
 */
function getTicketLink(className, ticket, title) {
    if (ticket.toUpperCase() != ticket) {
        return ticket;
    }
    var ticketURL = 'https://liferay.atlassian.net/browse/' + ticket;
    if (className) {
        var productVersionElement = querySelector('patcherProductVersionId');
        var productVersionId = productVersionElement.value;
        var projectVersionElement = querySelector('patcherProjectVersionId');
        var projectVersionId = projectVersionElement.value;
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
    if (!title) {
        title = ticket;
    }
    return '<a class="nowrap ' + className + '" href="' + ticketURL + '" title="' + title + '" target="_blank">' + ticket + '</a>';
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
var spinnerMax = 0;
var spinnerCurrent = 0;
/**
 * Adds a spinner
 */
function addSpinner(max) {
    var spinnerOverlay = document.createElement('div');
    spinnerOverlay.setAttribute('id', 'spinner-overlay');
    spinnerOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(255, 255, 255, 0.7); /* Semi-transparent background */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999; /* Ensures it sits above other content */
        transition: opacity 0.2s ease-in-out;
      `;
    var spinnerContainer = document.createElement('div');
    spinnerContainer.style.cssText = `
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    var spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 80px;
        height: 80px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db; /* Color of spinning arc */
        border-radius: 50%;
        animation: spin 1s linear infinite;
      `;
    spinnerContainer.appendChild(spinner);
    if (max !== undefined && max !== null) {
        spinnerMax = max;
        spinnerCurrent = 0;
        var spinnerProgress = document.createElement('div');
        spinnerProgress.setAttribute('id', 'spinner-progress');
        spinnerProgress.style.cssText = `
            position: absolute;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            color: #333;
        `;
        spinnerProgress.textContent = `0/${max}`;
        spinnerContainer.appendChild(spinnerProgress);
    }
    spinnerOverlay.appendChild(spinnerContainer);
    document.body.appendChild(spinnerOverlay);
}
/**
 * Updates the spinner progress
 */
function updateSpinner(step = 1) {
    spinnerCurrent += step;
    var spinnerProgress = document.getElementById('spinner-progress');
    if (spinnerProgress) {
        spinnerProgress.textContent = `${spinnerCurrent}/${spinnerMax}`;
    }
}
/**
 * Updates the spinner progress (alias of updateSpinner)
 */
function updateSpinnerProgress(step = 1) {
    updateSpinner(step);
}
/**
 * Adds a spinner
 */
function removeSpinner() {
    var spinnerOverlay = document.getElementById('spinner-overlay');
    if (!spinnerOverlay) {
        return;
    }
    spinnerOverlay.remove();
}
/**
 * Replaces any links that would have opened in a modal dialog / popup
 * window with one that opens in a regular new window.
 */
function replacePopupWindowLinks() {
    var buttons = document.querySelectorAll('button[onclick]');
    for (var i = 0; i < buttons.length; i++) {
        var attributes = buttons[i].attributes;
        var onclickAttribute = attributes['onclick'];
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
 * Replaces any links to a jenkins fix pack builder result with a link that
 * ends with '/consoleText' to take you directly to the build log.
 */
function replaceJenkinsLinks() {
    var consolePath = 'consoleText';
    var statusLabel = document.querySelector('label[for="_1_WAR_osbpatcherportlet_status"]');
    if (statusLabel) {
        var statusLabelSibling = statusLabel.nextSibling;
        if (statusLabelSibling) {
            if ('Compiling' == (statusLabelSibling.textContent || '').trim()) {
                consolePath = 'console';
            }
        }
    }
    var links = document.querySelectorAll('a[href*="/job/fixpack-builder"]:not([href*="' + consolePath + '"])');
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href');
        if (href.charAt(href.length - 1) != '/') {
            href += '/';
        }
        links[i].setAttribute('href', href + consolePath);
    }
    links = document.querySelectorAll('a[href*="/job/build-hotfix"]:not([href*="/artifact/"])');
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href');
        if (href.charAt(href.length - 1) != '/') {
            href += '/';
        }
        links[i].setAttribute('href', href + 'artifact/release/release-data/build/');
    }
    links = document.querySelectorAll('a[href*="//test-5-2/"]');
    for (var i = 0; i < links.length; i++) {
        var oldHREF = links[i].getAttribute('href');
        var newHREF = oldHREF.replace(/\/\/test-5-2\//gi, '//test-5-2.liferay.com/');
        links[i].setAttribute('href', newHREF);
    }
}
/**
 * Looks up the 6.2 fix pack.
 */
var fixPackMetadata = null;
function getFixPack() {
    var projectNode = querySelector('patcherProjectVersionId');
    var versionId = '';
    var baseTag = '';
    if (projectNode.tagName.toLowerCase() == 'input') {
        var projectInputElement = projectNode;
        versionId = projectInputElement.value;
        var container = projectNode.parentElement;
        var versionNode = container.querySelector('a');
        baseTag = versionNode.textContent || '';
    }
    else {
        var projectSelectNode = projectNode;
        if (projectSelectNode.selectedIndex == -1) {
            return null;
        }
        var versionElement = projectSelectNode.options[projectSelectNode.selectedIndex];
        versionId = versionElement.value;
        baseTag = (versionElement.textContent || '').trim();
    }
    if (fixPackMetadata && fixPackMetadata.versionId == versionId) {
        return fixPackMetadata;
    }
    if (baseTag.indexOf('6.2') == 0) {
        fixPackMetadata = get62FixPack(versionId);
    }
    else {
        fixPackMetadata = {
            'tag': baseTag,
            'name': baseTag,
            'versionId': versionId
        };
    }
    return fixPackMetadata;
}
function get62FixPack(versionId) {
    var fixPackListURL = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fix_packs?' + getQueryString({ delta: 200 });
    var oldNode = querySelector('patcherFixName');
    if (!oldNode) {
        oldNode = querySelector('patcherBuildName');
    }
    var baseTag = '';
    var value = oldNode ? oldNode.value : '';
    var fixPackName = value.split(',').filter(x => x.indexOf('portal-') == 0)[0];
    if (fixPackName) {
        var xhr1 = new XMLHttpRequest();
        xhr1.open('GET', fixPackListURL, false);
        xhr1.onload = function () {
            // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
            var container1 = document.implementation.createHTMLDocument().documentElement;
            container1.innerHTML = xhr1.responseText;
            var fixPackURL = Array.from(container1.querySelectorAll('table tbody tr td a'))
                .filter(x => (x.textContent || '').trim() == fixPackName)
                .map(x => x.getAttribute('href'))[0];
            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', fixPackURL, false);
            xhr2.onload = function () {
                // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
                var container2 = document.implementation.createHTMLDocument().documentElement;
                container2.innerHTML = xhr2.responseText;
                var gitHashLabelNode = container2.querySelector('label[for="' + ns + 'git-hash"]');
                if (!gitHashLabelNode) {
                    return;
                }
                var gitHashLabelParentElement = gitHashLabelNode.parentElement;
                var gitHubNode = gitHashLabelParentElement.querySelector('a');
                if (gitHubNode) {
                    var gitHubURL = gitHubNode.getAttribute('href');
                    baseTag = gitHubURL.substring(gitHubURL.indexOf('...') + 3);
                }
            };
            xhr2.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
            xhr2.setRequestHeader('Pragma', 'no-cache');
            xhr2.send(null);
        };
        xhr1.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
        xhr1.setRequestHeader('Pragma', 'no-cache');
        xhr1.send(null);
    }
    if (!baseTag) {
        var versionLabel = document.querySelector('label[for="' + ns + 'patcherProjectVersionId"]');
        var versionHolder = versionLabel.parentElement;
        var versionNode = versionHolder.querySelector('a');
        var fixPackName = '';
        if (versionNode) {
            fixPackName = versionNode.textContent || '';
        }
        else {
            var versionOption = versionHolder.querySelector('option[selected]');
            if (versionOption == null) {
                var versionSelect = versionHolder.querySelector('select');
                versionOption = versionSelect.querySelector('option[value="' + versionSelect.value + '"]');
            }
            fixPackName = (versionOption.textContent || '').trim();
        }
        baseTag = (fixPackName.indexOf(' ') == -1) ? 'fix-pack-base-6210' : 'fix-pack-base-6210-' + fixPackName.toLowerCase().substring(fixPackName.indexOf(' ') + 1);
    }
    return {
        'tag': baseTag,
        'name': fixPackName,
        'versionId': versionId
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
    var fixPack = getFixPack();
    if (!fixPack) {
        return;
    }
    var baseTag = fixPack.tag;
    var branchName = branchNode.value;
    var gitRemoteURL = gitRemoteNode.value;
    var gitRemotePath = gitRemoteURL.substring(gitRemoteURL.indexOf(':') + 1, gitRemoteURL.lastIndexOf('.git'));
    var gitRemoteUser = gitRemotePath.substring(0, gitRemotePath.indexOf('/'));
    var gitHubPath = 'https://github.com/' + gitRemotePath;
    replaceNode(branchNode, '<a href="https://github.com/liferay/liferay-portal-ee/compare/' + baseTag + '...' + gitRemoteUser + ':' + branchName + '">' + branchName + '</a>');
    replaceNode(gitRemoteNode, '<a href="' + gitHubPath + '">' + gitRemoteURL + '</a>');
}
function replaceReadOnlySelect(name, text, link) {
    var select = querySelector(name);
    if (!select || !select.disabled) {
        return;
    }
    if (link) {
        replaceNode(select, '<a href="' + link + '">' + text + '</a>');
    }
    else {
        replaceNode(select, select.options[select.selectedIndex].textContent || 'unknown');
    }
}
var liferayVersions = ['', '6.x', '7.0', '7.1', '7.2', '7.3', '7.4'];
/**
 * Determines the broad Liferay version (e.g. '7.4') that a product
 * version select option's text belongs to, based on the same text
 * patterns used to tag the options in addProductVersionFilter.
 */
function getProductVersionLiferayVersion(optionText) {
    if (optionText.trim() == 'Quarterly Releases') {
        return '7.4';
    }
    for (var i = 1; i < liferayVersions.length; i++) {
        if ((optionText.indexOf('DXP ' + liferayVersions[i]) != -1) || (optionText.indexOf('Portal ' + liferayVersions[i]) != -1)) {
            return liferayVersions[i];
        }
    }
    return null;
}
/**
 * Removes the options from a project version select whose text doesn't
 * belong to the given broad Liferay version, so that the create fix
 * page's project version select only shows versions relevant to the
 * selected product version.
 */
function pruneProjectVersionOptions(select, liferayVersion) {
    if (liferayVersion == '7.4') {
        for (var i = select.options.length - 1; i >= 0; i--) {
            var version = (select.options[i].textContent || '').trim();
            if ((version != '') && (version.indexOf('7.4.13-') == -1) && (version.indexOf('.q') == -1)) {
                select.options[i].remove();
            }
        }
    }
    else {
        var versionString = '-' + liferayVersion.replace('.', '') + '10';
        for (var i = select.options.length - 1; i >= 0; i--) {
            var version = (select.options[i].textContent || '').trim();
            if ((version != '') && (version.indexOf(versionString) == -1)) {
                select.options[i].remove();
            }
        }
    }
}
/**
 * Adds a new element to the page to allow you to select from a list of
 * Liferay versions before choosing a product version. Only applies on
 * the create fix page, since on other pages (e.g. viewing an existing
 * build or fix) this select is either disabled or not meant to have its
 * defaults second-guessed.
 */
function addProductVersionFilter() {
    var productVersionSelect = querySelector('patcherProductVersionId');
    if (!productVersionSelect) {
        return;
    }
    if (productVersionSelect.disabled) {
        var metadata = getFixPack();
        var patcherTagName = metadata.tag;
        var branchName = metadata.name;
        replaceReadOnlySelect('patcherProductVersionId', null, null);
        replaceReadOnlySelect('patcherProjectVersionId', branchName, 'https://github.com/liferay/liferay-portal-ee/tree/' + patcherTagName);
        return;
    }
    if (document.location.pathname.indexOf('/create') == -1) {
        return;
    }
    var selectedVersion = null;
    for (var i = 0; i < productVersionSelect.options.length; i++) {
        var option = productVersionSelect.options[i];
        var liferayVersion = getProductVersionLiferayVersion(option.textContent || '');
        if (liferayVersion) {
            option.setAttribute('data-liferay-version', liferayVersion);
        }
        if (option.selected) {
            selectedVersion = option.getAttribute('data-liferay-version');
        }
    }
    var hadSelectedVersion = !!selectedVersion;
    if (!selectedVersion) {
        selectedVersion = '7.4';
    }
    var liferayVersionSelect = document.createElement('select');
    liferayVersionSelect.id = ns + 'liferayVersion';
    for (var i = 0; i < liferayVersions.length; i++) {
        var option = document.createElement('option');
        option.value = liferayVersions[i];
        option.selected = (selectedVersion == liferayVersions[i]);
        option.textContent = liferayVersions[i];
        liferayVersionSelect.appendChild(option);
    }
    ;
    liferayVersionSelect.addEventListener('change', updateProductVersionSelect);
    productVersionSelect.addEventListener('change', setTimeout.bind(null, updateProjectVersionOrder, 500));
    var productVersionSelectParentElement = productVersionSelect.parentElement;
    productVersionSelectParentElement.insertBefore(liferayVersionSelect, productVersionSelect);
    if (hadSelectedVersion && selectedVersion) {
        productVersionSelect.setAttribute('data-liferay-version', selectedVersion);
        addProjectVersionFilter(productVersionSelect, selectedVersion);
    }
    else {
        updateProductVersionSelect();
    }
    waitForElement('patcherProjectVersionId').then(function (element) {
        addProjectVersionFilterInput(element);
    });
}
/**
 * Adds a text input that filters the options of the project version
 * select as you type. Called immediately after the project version
 * select is synthesized (when a product version was already selected on
 * page load), later once the portlet's own AJAX call populates the
 * project version select after the user picks a product version
 * manually (since selectedVersion is null on a fresh "create fix" form
 * and addProjectVersionFilter never runs in that case), and also for
 * any other page's project version filter select (see
 * sortProjectVersionIdFilterSelects). A given select is only marked up
 * with a filter input once, tracked on the select itself rather than by
 * a fixed input id, since there can be more than one such select on the
 * same page.
 */
function addProjectVersionFilterInput(projectVersionSelect) {
    if (projectVersionSelect.getAttribute('data-has-filter-input') == 'true') {
        return;
    }
    projectVersionSelect.setAttribute('data-has-filter-input', 'true');
    var projectVersionFilterInput = document.createElement('input');
    projectVersionFilterInput.type = 'text';
    projectVersionFilterInput.placeholder = 'Filter project versions';
    projectVersionFilterInput.addEventListener('input', function () {
        filterProjectVersionSelect(projectVersionSelect, projectVersionFilterInput.value);
    });
    var projectSelectedValue = projectVersionSelect.selectedIndex > -1 ? projectVersionSelect.options[projectVersionSelect.selectedIndex].value : null;
    var projectVersionSelectParentElement = projectVersionSelect.parentElement;
    projectVersionSelectParentElement.insertBefore(projectVersionFilterInput, projectVersionSelect);
    filterProjectVersionSelect(projectVersionSelect, '');
    if (projectSelectedValue) {
        var projectSelectedOption = projectVersionSelect.querySelector('option[value="' + projectSelectedValue + '"]');
        if (projectSelectedOption) {
            projectSelectedOption.selected = true;
        }
    }
    Liferay.fire('projectVersionIdReady');
}
function addProjectVersionFilter(productVersionSelect, selectedVersion) {
    var projectVersionSelect = querySelector('patcherProjectVersionId');
    if (projectVersionSelect) {
        return;
    }
    var projectVersionSelectFilter = querySelector('patcherProjectVersionIdFilter');
    if (!projectVersionSelectFilter) {
        return;
    }
    projectVersionSelect = projectVersionSelectFilter.cloneNode(true);
    pruneProjectVersionOptions(projectVersionSelect, selectedVersion);
    groupAndSortOptions(projectVersionSelect);
    var versionContainer = productVersionSelect.parentElement;
    versionContainer.appendChild(projectVersionSelect);
    addProjectVersionFilterInput(projectVersionSelect);
    var advancedSearchElement = document.getElementById('toggle_id_patcher_fix_searchadvancedSearch');
    var re = new RegExp(ns + 'patcherProjectVersionIdFilter=(\\d+)');
    var match = re.exec(document.location.search);
    if (match) {
        var patcherProjectVersionId = match[1];
        var option = projectVersionSelect.querySelector('option[value="' + patcherProjectVersionId + '"]');
        if (option) {
            option.selected = true;
            advancedSearchElement.value = 'true';
        }
        else {
            var parameterString = ns + 'patcherProjectVersionIdFilter=' + patcherProjectVersionId + '&';
            document.location.search = document.location.search.replace(parameterString, '');
        }
    }
    var keywordsElement = document.getElementById('toggle_id_patcher_fix_searchkeywords');
    re = new RegExp(ns + 'patcherFixName=([^&]+)');
    match = re.exec(document.location.search);
    if (match) {
        keywordsElement.value = match[1];
    }
    projectVersionSelect.addEventListener('change', function () {
        document.location.href = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher?' +
            getQueryString({
                'advancedSearch': 'true',
                'andOperator': 'true',
                'hideOldFixVersions': 'true',
                'hideOldFixVersionsCheckbox': 'true',
                'statusFilter': '100',
                'patcherFixName': '',
                'patcherProductVersionId': productVersionSelect.options[productVersionSelect.selectedIndex].value,
                'patcherProjectVersionIdFilter': projectVersionSelect.options[projectVersionSelect.selectedIndex].value
            });
    });
}
/**
 * Converts the tag name into a seven digit version number that can be
 * used for sorting. First four digits are the base version (7010, 7110),
 * and the remander are the fix pack level.
 */
function getLiferayVersion(version) {
    if (version.trim() == '') {
        return 0;
    }
    else if (version.indexOf('marketplace-') != -1) {
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
        return parseInt(shortVersion) * 100 * 1000 + parseInt(shortVersionMatcher[3]);
    }
    else if (version.indexOf('-u') != -1) {
        var shortVersionMatcher = /[0-9]*\.[0-9]\.[0-9]+/.exec(version);
        var shortVersion = shortVersionMatcher[0].replace(/\./g, '');
        var updateVersionMatcher = /-u([0-9]*)/.exec(version);
        var updateVersion = updateVersionMatcher[1];
        return parseInt(shortVersion) * 1000 + parseInt(updateVersion);
    }
    else if (version.indexOf('.q') != -1) {
        var shortVersionMatcher = /([0-9][0-9][0-9][0-9])\.q([0-9])\.([0-9]*)/.exec(version);
        var shortVersion = shortVersionMatcher[1] + shortVersionMatcher[2];
        var updateVersion = shortVersionMatcher[3];
        return 8000000 + parseInt(shortVersion) * 100 + parseInt(updateVersion);
    }
    else {
        console.log('unrecognized version pattern', version);
        return 0;
    }
}
/**
 * Comparison function that uses getLiferayVersion to compute versions,
 * and then sorts in alphabetical order for equivalent versions (thus,
 * we get private branches sorted after the equivalent public branch).
 */
function compareLiferayVersions(a, b) {
    var aValue = getLiferayVersion((a.textContent || '').trim());
    var bValue = getLiferayVersion((b.textContent || '').trim());
    if (aValue != bValue) {
        return aValue - bValue;
    }
    return a > b ? 1 : a < b ? -1 : 0;
}
/**
 * Formats a 4-digit version suffix (e.g. "7010") to its semantic version
 * counterpart (e.g. "7.0.10").
 */
function formatSuffixVersion(suffix) {
    var first = parseInt(suffix.charAt(0));
    var second = parseInt(suffix.charAt(1));
    var lastTwo = parseInt(suffix.substring(2));
    if ((first == 7) && (second <= 3)) {
        return first + '.' + second + '.10';
    }
    return first + '.' + second + '.' + lastTwo;
}
/**
 * Returns the corresponding option group label for a given version string.
 * Supports quarterly releases, 6.1, 6.2, 7.4.13, suffix-based fix packs,
 * and suffix-based marketplace releases.
 */
function getOptionGroup(optionText) {
    if (optionText === '') {
        return null;
    }
    // Quarterly Release
    var qMatcher = /([0-9]{4})\.q([0-9]+)/.exec(optionText);
    if (qMatcher) {
        return qMatcher[0];
    }
    // Marketplace
    if (optionText.indexOf('marketplace-') === 0) {
        var suffixMatcher = /-([0-9]{4})(?:-private)?$/.exec(optionText);
        if (suffixMatcher) {
            return formatSuffixVersion(suffixMatcher[1]) + ' Marketplace';
        }
        return 'Marketplace';
    }
    // Fix Pack
    if (optionText.indexOf('fix-pack-') === 0) {
        var suffixMatcher = /-([0-9]{4})(?:-private)?$/.exec(optionText);
        if (suffixMatcher) {
            return formatSuffixVersion(suffixMatcher[1]);
        }
        return 'Fix Pack';
    }
    // 6.x
    if (optionText.indexOf('6.1') === 0) {
        return '6.1';
    }
    if (optionText.indexOf('6.2') === 0) {
        return '6.2';
    }
    // 7.4
    if (optionText.indexOf('7.4') !== -1) {
        return '7.4.13';
    }
    return null;
}
/**
 * Groups and sorts select options under <optgroup> elements, sorting all
 * options/optgroups appropriately, and updating the select's DOM structure.
 */
function groupAndSortOptions(select) {
    var options = Array.from(select.options);
    options.sort(compareLiferayVersions);
    select.innerHTML = '';
    var optgroupsMap = {};
    for (var i = 0; i < options.length; i++) {
        var option = options[i];
        var optionText = (option.textContent || '').trim();
        var optionGroup = getOptionGroup(optionText);
        if (optionGroup) {
            var optgroup = optgroupsMap[optionGroup];
            if (!optgroup) {
                optgroup = document.createElement('optgroup');
                optgroup.setAttribute('label', optionGroup);
                optgroupsMap[optionGroup] = optgroup;
                select.appendChild(optgroup);
            }
            optgroup.appendChild(option);
        }
        else {
            select.appendChild(option);
        }
    }
}
/**
 * Returns whether every character of the pattern appears in the text in
 * the same order, though not necessarily contiguously (e.g. 'q413'
 * fuzzy-matches '7.4.13-q4'), the same style of matching used by fuzzy
 * finders like fzf or the VS Code quick open.
 */
function fuzzyMatch(text, pattern) {
    if (pattern === '') {
        return true;
    }
    var textIndex = 0;
    for (var patternIndex = 0; patternIndex < pattern.length; patternIndex++) {
        textIndex = text.indexOf(pattern[patternIndex], textIndex);
        if (textIndex == -1) {
            return false;
        }
        textIndex++;
    }
    return true;
}
/**
 * Hides options in the project version select whose text doesn't match
 * the given filter text, so that a long list of project versions can be
 * narrowed down by typing instead of scrolling through the full list.
 * Since options are kept in ascending numeric order (see
 * updateProjectVersionOrder), the first matching option is the earliest
 * matching version, so it's automatically selected, whether that's the
 * first option overall (filter text is empty) or the first option that
 * matches what was typed. Options prefixed with 'test-' are skipped in
 * favor of a non-'test-' match, since they're not meant to be used by
 * default, but if 'test-' options are the only matches, one of them is
 * selected anyway rather than leaving nothing selected.
 * Updates are applied to optgroups first, falling back to option-level
 * matching only if no optgroups match.
 */
function filterProjectVersionSelect(projectVersionSelect, filterText) {
    var normalizedFilterText = filterText.trim().toLowerCase();
    var optgroups = Array.from(projectVersionSelect.querySelectorAll('optgroup'));
    var matchingOptgroups = optgroups.filter(function (optgroup) {
        var label = (optgroup.getAttribute('label') || '').toLowerCase();
        return fuzzyMatch(label, normalizedFilterText);
    });
    var optgroupMatchMode = normalizedFilterText !== '' && matchingOptgroups.length > 0;
    var firstMatchingOption = null;
    var firstMatchingTestOption = null;
    if (optgroupMatchMode) {
        for (var i = 0; i < optgroups.length; i++) {
            var optgroup = optgroups[i];
            var matches = matchingOptgroups.indexOf(optgroup) != -1;
            optgroup.style.display = matches ? '' : 'none';
        }
        for (var i = 0; i < projectVersionSelect.options.length; i++) {
            var option = projectVersionSelect.options[i];
            var parentElement = option.parentElement;
            var isInMatchingOptgroup = parentElement && parentElement.tagName.toLowerCase() === 'optgroup' && matchingOptgroups.indexOf(parentElement) != -1;
            if (isInMatchingOptgroup) {
                option.style.display = '';
                var optionText = (option.textContent || '').toLowerCase();
                if (!firstMatchingOption) {
                    if (optionText.trim().indexOf('test-') != 0) {
                        firstMatchingOption = option;
                    }
                    else if (!firstMatchingTestOption) {
                        firstMatchingTestOption = option;
                    }
                }
            }
            else {
                option.style.display = 'none';
            }
        }
    }
    else {
        for (var i = 0; i < projectVersionSelect.options.length; i++) {
            var option = projectVersionSelect.options[i];
            var optionText = (option.textContent || '').toLowerCase();
            var matches = fuzzyMatch(optionText, normalizedFilterText);
            option.style.display = matches ? '' : 'none';
            if (matches && !firstMatchingOption) {
                if (optionText.trim().indexOf('test-') != 0) {
                    firstMatchingOption = option;
                }
                else if (!firstMatchingTestOption) {
                    firstMatchingTestOption = option;
                }
            }
        }
        for (var i = 0; i < optgroups.length; i++) {
            var optgroup = optgroups[i];
            var hasVisibleOption = false;
            var childOptions = optgroup.getElementsByTagName('option');
            for (var j = 0; j < childOptions.length; j++) {
                if (childOptions[j].style.display !== 'none') {
                    hasVisibleOption = true;
                    break;
                }
            }
            optgroup.style.display = hasVisibleOption ? '' : 'none';
        }
    }
    var selectedOption = firstMatchingOption || firstMatchingTestOption;
    if (selectedOption) {
        selectedOption.selected = true;
    }
    else {
        projectVersionSelect.selectedIndex = -1;
    }
}
/**
 * Places the project versions in numeric order rather than alphabetical
 * order, to make it easier to find the latest baseline.
 */
function updateProjectVersionOrder() {
    var projectVersionSelect = querySelector('patcherProjectVersionId');
    if (!projectVersionSelect) {
        return;
    }
    groupAndSortOptions(projectVersionSelect);
    var event = document.createEvent('HTMLEvents');
    event.initEvent('change', false, true);
    projectVersionSelect.dispatchEvent(event);
}
/**
 * Some pages have their own project version filter select (used to
 * filter the list of fixes/builds via advanced search) that isn't
 * created by addProjectVersionFilter, so it never gets sorted by
 * updateProjectVersionOrder, or given a text filter input. There can be
 * more than one element sharing this name, since addProjectVersionFilter
 * clones it without renaming the clone, so every matching select is
 * sorted and given a filter input here.
 */
function sortProjectVersionIdFilterSelects() {
    var elements = document.getElementsByName(ns + 'patcherProjectVersionIdFilter');
    for (var i = 0; i < elements.length; i++) {
        var select = elements[i];
        groupAndSortOptions(select);
        addProjectVersionFilterInput(select);
    }
}
/**
 * Returns the option that should be auto-selected in the product version
 * select for the given Liferay version. Version 7.4 prefers the
 * 'Quarterly Releases' option over the first option tagged with
 * data-liferay-version="7.4" (typically 'DXP 7.4'), since fix packs for
 * 7.4 are now delivered as quarterly releases.
 */
function getDefaultProductVersionOption(productVersionSelect, liferayVersion) {
    if (liferayVersion == '7.4') {
        var quarterlyReleasesOptions = Array.from(productVersionSelect.options).filter(function (option) {
            return (option.textContent || '').trim() == 'Quarterly Releases';
        });
        if (quarterlyReleasesOptions.length > 0) {
            return quarterlyReleasesOptions[0];
        }
    }
    return productVersionSelect.querySelector('option[data-liferay-version="' + liferayVersion + '"]');
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
        var selectedOptionText = selectedOption.textContent || '';
        if (selectedOption.getAttribute('data-liferay-version') == liferayVersion) {
            var isDefaultOptionText = (liferayVersion == '7.4') ?
                (selectedOptionText.trim() == 'Quarterly Releases') :
                (selectedOptionText.trim() == 'DXP ' + liferayVersion);
            if (isDefaultOptionText) {
                setTimeout(updateProjectVersionOrder, 500);
            }
            return;
        }
    }
    var option = getDefaultProductVersionOption(productVersionSelect, liferayVersion);
    if (option) {
        option.selected = true;
        _1_WAR_osbpatcherportlet_productVersionOnChange(option.value);
        setTimeout(updateProjectVersionOrder, 500);
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
    if (productVersionSelect) {
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
    }
    var projectVersionSelect = querySelector('patcherProjectVersionId');
    if (projectVersionSelect) {
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
    var autoFixCheckbox = querySelector('autoFixCheckbox');
    for (var inputName of ['committish', 'gitRemoteURL']) {
        var input = querySelector(inputName);
        if (!input) {
            continue;
        }
        re = new RegExp(ns + inputName + '=([^&]+)');
        match = re.exec(document.location.search);
        if (!match) {
            continue;
        }
        if (autoFixCheckbox && autoFixCheckbox.checked) {
            autoFixCheckbox.click();
        }
        input.value = match[1];
    }
}
function getBuildFix(accumulator, row) {
    var cells = row.cells;
    var fixName = cells[2].innerText.trim();
    var fixVersion = cells[3].innerText.trim();
    accumulator.set(fixName, fixVersion);
    return accumulator;
}
function processBuildFixes(xhr) {
    // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
    var container = document.implementation.createHTMLDocument().documentElement;
    container.innerHTML = xhr.responseText;
    var prefixFixRows = Array.from(container.querySelectorAll('table tbody tr')).filter(row => !row.classList.contains('lfr-template'));
    var previousFixes = prefixFixRows.reduce(getBuildFix, new Map());
    var headerRow = document.querySelector('table thead tr');
    var headerCell = document.createElement('th');
    headerCell.textContent = 'Previous';
    headerRow.cells[3].innerText = 'Current';
    headerRow.cells[3].after(headerCell);
    var tbody = document.querySelector('table tbody');
    var currentFixRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.classList.contains('lfr-template'));
    for (var i = 0; i < currentFixRows.length; i++) {
        var row = currentFixRows[i];
        var fixName = row.cells[2].innerText.trim();
        var currentFixVersion = row.cells[3].innerText.trim();
        var previousFixVersion = previousFixes.get(fixName) || '';
        previousFixes.delete(fixName);
        var dataCell = document.createElement('td');
        dataCell.innerText = previousFixVersion;
        row.cells[3].after(dataCell);
        if (currentFixVersion == previousFixVersion) {
            row.cells[3].style.color = '#ccc';
            row.cells[4].style.color = '#ccc';
        }
    }
    previousFixes.forEach(function (value, key, map) {
        var newRow = document.createElement('tr');
        newRow.appendChild(document.createElement('td'));
        newRow.appendChild(document.createElement('td'));
        var fixNameCell = document.createElement('td');
        fixNameCell.innerHTML = key.split(',').map(getTicketLink.bind(null, '')).join(', ');
        newRow.appendChild(fixNameCell);
        newRow.appendChild(document.createElement('td'));
        var fixVersionCell = document.createElement('td');
        fixVersionCell.innerText = value;
        newRow.appendChild(fixVersionCell);
        newRow.appendChild(document.createElement('td'));
        newRow.appendChild(document.createElement('td'));
        newRow.appendChild(document.createElement('td'));
        newRow.appendChild(document.createElement('td'));
        newRow.appendChild(document.createElement('td'));
        tbody.appendChild(newRow);
    });
}
function compareBuildFixes() {
    if (document.location.pathname.indexOf('/builds/') == -1) {
        return;
    }
    var queryString = document.location.search || '';
    if (document.location.pathname.indexOf('/fixes') != -1) {
        if (queryString.indexOf('?compareTo=') == 0) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/group/guest/patching/-/osb_patcher/builds/' + queryString.substring(11) + '/fixes');
            xhr.onload = processBuildFixes.bind(null, xhr);
            xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
            xhr.setRequestHeader('Pragma', 'no-cache');
            xhr.send(null);
        }
    }
    else {
        var currentBuildRow = document.querySelector('#_1_WAR_osbpatcherportlet_patcherBuildsSearchContainer tr.selected');
        if (!currentBuildRow) {
            return;
        }
        var previousBuildRow = currentBuildRow.nextElementSibling;
        if (!previousBuildRow.classList.contains('lfr-template')) {
            var previousBuildId = (previousBuildRow.cells[0].textContent || '').trim();
            var buttons = document.querySelectorAll('button');
            for (var i = 0; i < buttons.length; i++) {
                var button = buttons[i];
                if ((button.textContent || '').trim() == 'View Fixes') {
                    button.onclick = window.open.bind(null, document.location.pathname + '/fixes?compareTo=' + previousBuildId, '_blank');
                }
            }
        }
    }
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
        var fixPack = getFixPack();
        baseTag = fixPack.tag;
    }
    var compareLink = 'https://github.com/liferay/liferay-portal-ee/compare/' + baseTag + '...fix-pack-fix-' + build.patcherFixId;
    var extraHTML = (compareLink == mergeCompareLink) ? ' (build tag)' : '';
    return '<tr><th class="branch-type">' + getBuildLinkHTML(build) + '</th><td><a href="' + compareLink + '" target="_blank">fix-pack-fix-' + build.patcherFixId + '</a>' + extraHTML + '</td></tr>';
}
/**
 * Processes a single child build and generates the HTML for its fixes.
 */
function replaceGitHashes(childBuildsMetadata) {
    var gitHashLabel = document.querySelector('label[for="' + ns + 'git-hash"]');
    if (!gitHashLabel) {
        return;
    }
    var gitHashLabelParentElement = gitHashLabel.parentElement;
    var oldNode = gitHashLabelParentElement.querySelector('a');
    var mergeCompareLink = oldNode.href;
    var patcherFixIds = {};
    var patcherFixIdCount = 0;
    var joinFunction = function (build, obj) {
        build.patcherFixId = obj.data.patcherFixId;
        if (++patcherFixIdCount != childBuildsMetadata.length) {
            return;
        }
        var tableRows = childBuildsMetadata.map(getChildBuildHash.bind(null, mergeCompareLink));
        replaceNode(oldNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + tableRows.join('') + '</tbody></table>');
    };
    for (var i = 0; i < childBuildsMetadata.length; i++) {
        var childBuildFunction = joinFunction.bind(null, childBuildsMetadata[i]);
        if (exportFunction) {
            childBuildFunction = exportFunction(childBuildFunction, unsafeWindow);
        }
        var childBuildArguments = { id: childBuildsMetadata[i].buildId };
        if (cloneInto) {
            childBuildArguments = cloneInto(childBuildArguments, unsafeWindow);
        }
        Liferay.Service('/osb-patcher-portlet.builds/view', childBuildArguments, childBuildFunction);
    }
}
/**
 * Parses the row for any build metadata
 */
function getBuildMetadata(row) {
    var buildId = (row.cells[0].textContent || '').trim();
    var buildLink = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/' + buildId;
    var branchName = (row.cells[3].textContent || '').trim();
    var branchType = branchName.indexOf('-private') != -1 ? 'private' : 'public';
    var fixesText = row.cells[2].textContent || '';
    return {
        buildId: buildId,
        buildLink: buildLink,
        branchName: branchName,
        branchType: branchType,
        fixes: fixesText.split(',').map(x => x.trim()).sort(compareTicket),
        fixesHTML: getTicketLinks(fixesText, ''),
        patcherFixId: null
    };
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
    var childBuildFixesHTML = childBuildsMetadata.map(build => '<tr><th class="branch-type">' + getBuildLinkHTML(build) + '</th><td>' + build.fixesHTML + '</td><td></td></tr>');
    replaceNode(oldFixesNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + childBuildFixesHTML.join('') + '</tbody></table>');
    replaceGitHashes(childBuildsMetadata);
}
function replaceBuild() {
    if (document.location.pathname.indexOf('/builds/') == -1) {
        return;
    }
    var buildNode = querySelector('patcherBuildName');
    if (!buildNode || !buildNode.readOnly) {
        return;
    }
    var fixes = new Set(buildNode.innerHTML.split(',').map(x => x.trim()));
    var childBuildsButton = Array.from(document.querySelectorAll('button')).filter(x => (x.textContent || '').trim() == 'View Child Builds');
    var buildId = document.location.pathname.substring(document.location.pathname.lastIndexOf('/') + 1);
    var buildLink = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/' + buildId;
    var projectVersionSelect = querySelector('patcherProjectVersionId');
    var branchName = (projectVersionSelect.options[projectVersionSelect.selectedIndex].textContent || '').trim();
    var branchType = branchName.indexOf('-private') != -1 ? 'private' : 'public';
    var fixesText = buildNode.innerHTML;
    var build = {
        buildId: buildId,
        buildLink: buildLink,
        branchName: branchName,
        branchType: branchType,
        fixes: fixesText.split(',').map(x => x.trim()).sort(compareTicket),
        fixesHTML: getTicketLinks(fixesText, ''),
        patcherFixId: null
    };
    var childBuildFixesHTML = '<tr><th class="branch-type">' + getBuildLinkHTML(build) + '</th><td>' + build.fixesHTML + "</td></tr>";
    var fixedInLaterVersionsHTML = '';
    if (branchName.indexOf(".q") != -1) {
        var jql = "key in (" + build.fixes.join(",") + ") and cf[10886] ~ \"" + branchName.substring(0, branchName.lastIndexOf(".")) + ".*\"";
        fixedInLaterVersionsHTML = "<tr><td colspan=\"2\"><a href=\"https://issues.liferay.com/issues/?jql=" + encodeURIComponent(jql) + "\" target=\"_blank\">check if fixed in newer patch level of this quarterly release</a></td></tr>";
    }
    if (childBuildsButton.length == 0) {
        replaceNode(buildNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + childBuildFixesHTML + fixedInLaterVersionsHTML + '</tbody></table>');
        replaceGitHashes([build]);
    }
    else {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', document.location.pathname + '/childBuilds');
        xhr.onload = processChildBuilds.bind(null, xhr, buildNode);
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.send(null);
    }
    var originalBuildNode = querySelector('patcherBuildOriginalName');
    if (originalBuildNode) {
        var excludedFixes = originalBuildNode.innerHTML.split(',').map(x => x.trim()).filter(x => !fixes.has(x));
        var excludedHTML = excludedFixes.sort(compareTicket).map(getTicketLink.bind(null, 'included-in-baseline')).join(', ');
        var excludedFixesHTML = '<tr><th class="branch-type">excluded</th><td>' + excludedHTML + '</td></tr>';
        replaceNode(originalBuildNode, '<table class="table table-bordered table-hover"><tbody class="table-data">' + childBuildFixesHTML + excludedFixesHTML + fixedInLaterVersionsHTML + '</tbody></table>');
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
function updateCompactContainer(compactContainer, controlGroup) {
    var labelElement = controlGroup.querySelector('label');
    var label = (labelElement.textContent || '').trim();
    var textarea = controlGroup.querySelector('textarea');
    var ticketCount = 0;
    if (textarea && textarea.value) {
        ticketCount = textarea.value.split(',').length;
    }
    var text = label.substring(0, label.indexOf(' Ticket Suggestions'));
    var tableRow = document.createElement('tr');
    tableRow.setAttribute('data-suggestion-type', text);
    compactContainer.appendChild(tableRow);
    var tableHeader = document.createElement('th');
    tableHeader.textContent = text;
    tableRow.appendChild(tableHeader);
    var tableCell = document.createElement('td');
    tableCell.textContent = ticketCount + ((ticketCount == 1) ? ' ticket' : ' tickets');
    tableRow.appendChild(tableCell);
}
function rearrangeColumns() {
    if (document.location.pathname.indexOf('/-/osb_patcher/builds/') == -1) {
        return;
    }
    var accountElement = querySelector('patcherBuildAccountEntryCode');
    if (!accountElement) {
        var labelElement = document.querySelector('label[for="' + ns + 'account-code"]');
        accountElement = labelElement.nextSibling;
    }
    if (!accountElement) {
        return;
    }
    var accountParentElement = accountElement.parentElement;
    var accountGrandParentElement = accountParentElement.parentElement;
    var columns = document.querySelectorAll('.column');
    if (columns.length < 2) {
        return;
    }
    var controlGroups = columns[1].querySelectorAll('.control-group');
    for (var j = 0; j < controlGroups.length; j++) {
        accountGrandParentElement.insertBefore(controlGroups[j], accountParentElement);
    }
    var tableContainer = document.createElement('span');
    tableContainer.setAttribute('id', 'ticket-suggestions');
    tableContainer.classList.add('compact');
    var compactContainer = document.createElement('table');
    compactContainer.classList.add('compact', 'table', 'table-bordered', 'table-hover');
    tableContainer.appendChild(compactContainer);
    var controlGroup = getFixesFromPreviousBuilds();
    tableContainer.appendChild(controlGroup);
    updateCompactContainer(compactContainer, controlGroup);
    for (var i = 2; i < columns.length; i++) {
        controlGroups = columns[i].querySelectorAll('.control-group');
        for (var j = 0; j < controlGroups.length; j++) {
            controlGroup = controlGroups[j];
            controlGroup.classList.add('verbose');
            tableContainer.appendChild(controlGroup);
            updateCompactContainer(compactContainer, controlGroup);
        }
    }
    for (var i = 2; i < columns.length; i++) {
        columns[i].remove();
    }
    var container = document.createElement('div');
    container.classList.add('control-group', 'input-text-wrapper');
    var labelElement = document.createElement('label');
    labelElement.classList.add('control-label');
    labelElement.textContent = 'Ticket Suggestions';
    container.appendChild(labelElement);
    container.appendChild(tableContainer);
    var showDetails = document.createElement('div');
    showDetails.classList.add('show-details');
    tableContainer.appendChild(showDetails);
    var showLink = document.createElement('a');
    showLink.textContent = '(show details)';
    showLink.classList.add('compact');
    showLink.onclick = function () {
        var cl = tableContainer.classList;
        cl.remove('compact');
        cl.add('verbose');
        return false;
    };
    showDetails.appendChild(showLink);
    var hideLink = document.createElement('a');
    hideLink.textContent = '(hide details)';
    hideLink.classList.add('verbose');
    hideLink.onclick = function () {
        var cl = tableContainer.classList;
        cl.add('compact');
        cl.remove('verbose');
        return false;
    };
    showDetails.appendChild(hideLink);
    accountGrandParentElement.insertBefore(container, accountParentElement);
}
/**
 * Replaces the "Download" link with the name of the hotfix you're downloading
 */
function replaceHotfixLink(target) {
    var labelNode = document.querySelector('label[for="' + ns + target + '"]');
    if (!labelNode) {
        return;
    }
    var containerNode = labelNode.parentElement;
    if (!containerNode) {
        return;
    }
    var anchor = containerNode.querySelector('a');
    if (!anchor || !anchor.textContent) {
        return;
    }
    var href = anchor.getAttribute('href');
    anchor.textContent = href.substring(href.lastIndexOf('/') + 1);
}
/**
 * Replaces a ticket name with a link to LESA or Help Center.
 */
function replaceLesaLink(target) {
    var oldNode = querySelector(target);
    if (!oldNode) {
        return;
    }
    if (oldNode.readOnly) {
        var ticketHREF;
        var ticketId;
        var jiraSearchLinkHREF = null;
        if (oldNode.value.indexOf('https:') == 0) {
            ticketHREF = oldNode.value;
            ticketId = ticketHREF.substring(ticketHREF.lastIndexOf('/') + 1);
        }
        else if (isNaN(parseInt(oldNode.value))) {
            ticketHREF = 'https://liferay.atlassian.net/browse/' + oldNode.value;
            ticketId = oldNode.value;
            jiraSearchLinkHREF = ticketHREF;
        }
        else {
            ticketHREF = 'https://liferay-support.zendesk.com/agent/tickets/' + oldNode.value;
            ticketId = oldNode.value;
        }
        if (jiraSearchLinkHREF == null) {
            var query = `"Customer Ticket Permalink" = "${ticketHREF}" OR "Zendesk Ticket IDs" ~ ${ticketId} OR "Customer Ticket" = "${ticketId}" OR "Customer Ticket" = "${ticketHREF}"`;
            var encodedQuery = encodeURIComponent(query);
            jiraSearchLinkHREF = 'https://liferay.atlassian.net/issues/?jql=' + encodedQuery;
        }
        var newNode;
        if (ticketHREF == jiraSearchLinkHREF) {
            newNode = `${ticketId} | <a href="${jiraSearchLinkHREF}" target="_blank">JIRA ticket</a>`;
        }
        else if (ticketHREF.indexOf('https://web.liferay.com/') == 0) {
            newNode = `${ticketId} | <a href="${ticketHREF}" target="_blank">LESA ticket</a> | <a href="${jiraSearchLinkHREF}" target="_blank">JIRA tickets</a>`;
        }
        else {
            newNode = `${ticketId} | <a href="${ticketHREF}" target="_blank">zendesk ticket</a> | <a href="${jiraSearchLinkHREF}" target="_blank">JIRA tickets</a>`;
        }
        replaceNode(oldNode, newNode);
    }
}
function highlightAnalysisNeededBuilds() {
    var activeTab = document.querySelector('.tab.active');
    if (!activeTab) {
        return;
    }
    var tabs = Array.from(document.querySelectorAll('.tab > a'));
    for (var i = 0; i < tabs.length; i++) {
        if ('QA Builds' == (tabs[i].textContent || '').trim()) {
            tabs[i].href += '&_1_WAR_osbpatcherportlet_delta=200';
        }
    }
    if ('QA Builds' != (activeTab.textContent || '').trim()) {
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
        var projectVersion = (cells[versionIndex].textContent || '').trim();
        var versionNumber = projectVersion.indexOf('6.2.10') != -1 ? '6210' : projectVersion.substring(projectVersion.lastIndexOf('-') + 1);
        rows[i].classList.add('version-' + versionNumber);
        if (status.textContent && status.textContent.indexOf('QA Analysis') != -1) {
            rows[i].classList.add('qa-analysis-needed');
        }
        else {
            rows[i].classList.add('qa-analysis-unneeded');
            rows[i].remove();
            detachedRows.push(rows[i]);
        }
    }
    for (var i = 0; i < detachedRows.length; i++) {
        buildsTableBody.appendChild(detachedRows[i]);
    }
}
function addEngineerComments() {
    var buildsRegEx = /\/-\/osb_patcher\/builds\/[0-9]+[^\/]*$/;
    if (!buildsRegEx.test(document.location.pathname)) {
        return;
    }
    var commentsURL = document.location.pathname + '/editCommentsField';
    var xhr1 = new XMLHttpRequest();
    xhr1.open('GET', commentsURL, false);
    xhr1.onload = function () {
        // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
        var container1 = document.implementation.createHTMLDocument().documentElement;
        container1.innerHTML = xhr1.responseText;
        var newCommentsElement = document.createElement('div');
        newCommentsElement.classList.add('control-group', 'field-wrapper');
        var newLabelElement = document.createElement('label');
        newLabelElement.classList.add('control-label');
        newLabelElement.textContent = 'Engineer Comments';
        newCommentsElement.appendChild(newLabelElement);
        var commentsElement = container1.querySelector('#_1_WAR_osbpatcherportlet_comments');
        newCommentsElement.appendChild(document.createTextNode(commentsElement.value || '(none)'));
        var statusLabelElement = document.querySelector('label[for="_1_WAR_osbpatcherportlet_status"]');
        var statusElement = statusLabelElement.parentElement;
        statusElement.after(newCommentsElement);
    };
    xhr1.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
    xhr1.setRequestHeader('Pragma', 'no-cache');
    xhr1.send(null);
}
var pastTicketsCache = {};
function getHotfixShortNames(hotfixes) {
    debugger;
    return hotfixes.map(it => {
        return (it.indexOf('.q') != -1) ?
            it.substring(it.indexOf('-hotfix') + 1, it.length - 4) :
            it.indexOf('build-') == 0 ? it : it.substring(it.indexOf('-') + 1, it.lastIndexOf('-'));
    });
}
function getTicketBuildCountSummary(ticketId, hotfixes) {
    var summaryElement = document.createElement('span');
    summaryElement.classList.add('nowrap', 'osb-ticket-builds-summary');
    summaryElement.setAttribute('title', getHotfixShortNames(hotfixes).join(', '));
    summaryElement.innerHTML = getTicketLink('', ticketId, ticketId) + ' (' + getHotfixShortNames(hotfixes).join(', ') + ')';
    return summaryElement;
}
function checkFixesFromPreviousBuilds(accountNode, buildNameNode, projectNode, previousBuildsInput) {
    var queryString = getQueryString({
        advancedSearch: true,
        andOperator: true,
        delta: 200,
        patcherBuildAccountEntryCode: accountNode.value,
        patcherProjectVersionIdFilter: projectNode.value
    });
    var accountBuildsURL = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?' + queryString;
    var pastTickets = pastTicketsCache[accountBuildsURL] || {};
    var currentTickets = new Set((buildNameNode.value || '').split(/\s*,\s*/g));
    var missingTickets = Array.from(Object.keys(pastTickets)).
        filter(it => !currentTickets.has(it)).
        sort((a, b) => {
        var splitA = a.split('-');
        var splitB = b.split('-');
        return splitA[0] != splitB[0] ? splitA[0] > splitB[0] ? 1 : -1 :
            parseInt(splitA[1]) - parseInt(splitB[1]);
    });
    previousBuildsInput.innerHTML = '';
    var buildsListLink = document.createElement('a');
    buildsListLink.setAttribute('href', accountBuildsURL);
    buildsListLink.setAttribute('target', '_blank');
    buildsListLink.textContent = 'see builds list';
    var buildsListParagraph = document.createElement('p');
    buildsListParagraph.appendChild(buildsListLink);
    previousBuildsInput.appendChild(buildsListParagraph);
    if (missingTickets.length > 0) {
        var ticketsListParagraph = missingTickets.reduce((acc, next, i) => {
            if (i > 0) {
                acc.appendChild(document.createTextNode(', '));
            }
            acc.appendChild(getTicketBuildCountSummary(next, pastTickets[next]));
            return acc;
        }, document.createElement('p'));
        ticketsListParagraph.setAttribute('inputcssclass', 'osb-patcher-input-wide');
        previousBuildsInput.appendChild(ticketsListParagraph);
        var buttonHolderRow = document.createElement('div');
        buttonHolderRow.classList.add('button-holder', 'osb-patcher-button-row');
        var button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.classList.add('btn', 'osb-patcher-button');
        button.onclick = function () {
            buildNameNode.value += ',' + missingTickets.join(',');
            checkFixesFromPreviousBuilds(accountNode, buildNameNode, projectNode, previousBuildsInput);
            return false;
        };
        var buttonContent = document.createElement('i');
        buttonContent.classList.add('icon-plus-sign');
        button.appendChild(buttonContent);
        buttonHolderRow.appendChild(button);
        previousBuildsInput.appendChild(buttonHolderRow);
    }
    var compactCell = document.querySelector('tr[data-suggestion-type="Previous Builds"] td');
    var ticketCount = missingTickets.length;
    compactCell.innerHTML = '';
    var countSpan = document.createElement('span');
    countSpan.id = 'osb-patcher-missing-ticket-count';
    countSpan.textContent = '' + ticketCount;
    compactCell.appendChild(countSpan);
    compactCell.appendChild(document.createTextNode((ticketCount == 1) ? ' ticket' : ' tickets'));
    return ticketCount;
}
function updateFixesFromPreviousBuilds(accountNode, buildNameNode, projectNode, previousBuildsInput) {
    var queryString = getQueryString({
        advancedSearch: true,
        andOperator: true,
        delta: 200,
        patcherBuildAccountEntryCode: accountNode.value,
        patcherProjectVersionIdFilter: projectNode.value
    });
    var accountBuildsURL = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?' + queryString;
    var pastTickets = pastTicketsCache[accountBuildsURL] || {};
    if (Object.keys(pastTickets).length > 0) {
        checkFixesFromPreviousBuilds(accountNode, buildNameNode, projectNode, previousBuildsInput);
        return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', accountBuildsURL);
    xhr.onload = function () {
        // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
        var container = document.implementation.createHTMLDocument().documentElement;
        container.innerHTML = xhr.responseText;
        pastTicketsCache[accountBuildsURL] = Array.from(container.querySelectorAll('td > a[title]')).
            reduce((acc, next) => {
            var row = next.closest('tr');
            if ((row.cells[2].textContent || '').trim().toLowerCase() == 'ignore') {
                return acc;
            }
            if ((row.cells[7].textContent || '').trim().toLowerCase().indexOf('conflict') != -1) {
                return acc;
            }
            if ((row.cells[7].textContent || '').trim().toLowerCase().indexOf('failed') != -1) {
                return acc;
            }
            if ((row.cells[9].textContent || '').trim().toLowerCase().indexOf('ignore') != -1) {
                return acc;
            }
            var hotfixId = (row.cells[12].textContent || '').trim();
            if (hotfixId == '') {
                hotfixId = 'build-' + (row.cells[1].textContent || '').trim();
            }
            var newTickets = (next.getAttribute('title') || '').split(/\s*,\s*/g);
            for (var i = 0; i < newTickets.length; i++) {
                var newTicket = newTickets[i];
                if (!acc[newTicket]) {
                    acc[newTicket] = [hotfixId];
                }
                else {
                    acc[newTicket].push(hotfixId);
                }
            }
            return acc;
        }, {});
        checkFixesFromPreviousBuilds(accountNode, buildNameNode, projectNode, previousBuildsInput);
    };
    xhr.send(null);
}
;
function getFixesFromPreviousBuilds() {
    var previousBuildsContainer = document.createElement('div');
    previousBuildsContainer.classList.add('control-group', 'field-wrapper', 'verbose');
    if (document.location.pathname.indexOf('/builds/create') == -1) {
        return previousBuildsContainer;
    }
    var previousBuildsLabel = document.createElement('label');
    previousBuildsLabel.classList.add('control-label');
    previousBuildsLabel.setAttribute('for', '_1_WAR_osbpatcherportlet_previousBuildsTicketList');
    previousBuildsLabel.textContent = 'Previous Builds Ticket Suggestions';
    previousBuildsContainer.appendChild(previousBuildsLabel);
    var previousBuildsInput = document.createElement('div');
    previousBuildsInput.classList.add('input');
    previousBuildsInput.setAttribute('id', '_1_WAR_osbpatcherportlet_previousBuildsTicketList');
    previousBuildsInput.setAttribute('name', '_1_WAR_osbpatcherportlet_previousBuildsTicketList');
    previousBuildsInput.setAttribute('inputcssclass', 'osb-patcher-input-wide');
    previousBuildsContainer.appendChild(previousBuildsInput);
    var accountNode = querySelector('patcherBuildAccountEntryCode');
    var buildNameNode = querySelector('patcherBuildName');
    var projectNode = querySelector('patcherProjectVersionId');
    if (accountNode != null && buildNameNode != null && projectNode != null) {
        updateFixesFromPreviousBuilds(accountNode, buildNameNode, projectNode, previousBuildsInput);
        var refreshPreviousBuilds = updateFixesFromPreviousBuilds.bind(null, accountNode, buildNameNode, projectNode, previousBuildsInput);
        accountNode.addEventListener('blur', refreshPreviousBuilds);
        buildNameNode.addEventListener('blur', refreshPreviousBuilds);
        projectNode.addEventListener('change', refreshPreviousBuilds);
    }
    var addButton = document.querySelector('button.btn-primary');
    if (addButton) {
        addButton.onclick = function () {
            var ticketCountElement = document.getElementById('osb-patcher-missing-ticket-count');
            if (!ticketCountElement) {
                return true;
            }
            if (ticketCountElement.textContent != '0') {
                return confirm('You are missing ' + ticketCountElement.textContent + " tickets from previous builds.\n\nWould you like to proceed anyway?");
            }
            return true;
        };
    }
    return previousBuildsContainer;
}
function getBuildLabel(row) {
    return (row.cells[12].textContent || '').trim() ||
        (row.cells[7].textContent || '').toLowerCase() + ' build ' + (row.cells[1].textContent || '').trim();
}
function getClosestBuildParentIndices(fixes, projectVersions) {
    return fixes.map((element, index, array) => {
        for (var i = index + 1; i < array.length; i++) {
            if (projectVersions[index] != projectVersions[i]) {
                continue;
            }
            if (Array.from(array[i]).filter(it => !element.has(it)).length == 0) {
                return i;
            }
        }
        return -1;
    });
}
function createFixItemElement(ticket, includedInBaseline) {
    var fixSpan = document.createElement('span');
    fixSpan.classList.add('fix-item');
    var fixLink = document.createElement('a');
    fixLink.textContent = ticket;
    fixLink.href = 'https://liferay.atlassian.net/browse/' + ticket;
    fixLink.target = '_blank';
    if (includedInBaseline) {
        fixLink.classList.add('included-in-baseline');
    }
    fixSpan.appendChild(fixLink);
    return fixSpan;
}
function renderBuildComparisons(contentRows, contentCells, fixes, projectVersions, baselineValue) {
    contentCells.forEach((element) => {
        var existingSummary = element.querySelector('.shortened-content');
        if (existingSummary) {
            existingSummary.remove();
        }
    });
    var baselineIndex = (baselineValue == 'closest') ? -1 : parseInt(baselineValue);
    var parentIndices = (baselineIndex == -1) ?
        getClosestBuildParentIndices(fixes, projectVersions) :
        fixes.map((_element, index) => (index == baselineIndex) ? -1 : baselineIndex);
    contentCells.forEach((element, index) => {
        var parent = parentIndices[index];
        if (parent == -1) {
            return;
        }
        var shortContentElement = document.createElement('p');
        shortContentElement.classList.add('shortened-content');
        if (projectVersions[index] != projectVersions[parent]) {
            shortContentElement.appendChild(document.createTextNode('comparison not possible (project version differs from ' + getBuildLabel(contentRows[parent]) + ')'));
            element.append(shortContentElement);
            return;
        }
        shortContentElement.appendChild(document.createTextNode(getBuildLabel(contentRows[parent])));
        Array.from(fixes[index]).filter(it => !fixes[parent].has(it)).forEach(it => {
            shortContentElement.appendChild(createFixItemElement(it, false));
        });
        if (baselineIndex != -1) {
            Array.from(fixes[parent]).filter(it => !fixes[index].has(it)).forEach(it => {
                shortContentElement.appendChild(createFixItemElement(it, true));
            });
        }
        element.append(shortContentElement);
    });
}
async function updatePreviousBuildsContent() {
    if (document.location.pathname.indexOf('/accounts/view') == -1) {
        return;
    }
    var buildsContainer = await waitForElement('patcherBuildsSearchContainer');
    var contentHeader = await waitForElement('patcherBuildsSearchContainer_col-content');
    var contentRows = Array.from(buildsContainer.querySelectorAll('tbody tr'));
    var contentCells = contentRows.map((element) => element.cells[6]);
    var fixes = contentCells.map((element) => {
        var fixesLink = element.querySelector('a');
        var fixesList = fixesLink ? fixesLink.getAttribute('title') || '' : '';
        return new Set(fixesList.split(/\s*,\s*/gi));
    });
    var projectVersions = contentRows.map((row) => (row.cells[5].textContent || '').trim());
    var baselineLabel = document.createElement('label');
    baselineLabel.setAttribute('for', ns + 'patcherBuildsBaselineSelect');
    baselineLabel.textContent = 'Content (comparison)';
    var baselineSelect = document.createElement('select');
    baselineSelect.id = ns + 'patcherBuildsBaselineSelect';
    var closestBuildOption = document.createElement('option');
    closestBuildOption.value = 'closest';
    closestBuildOption.textContent = 'most similar build';
    baselineSelect.appendChild(closestBuildOption);
    contentRows.forEach((row, index) => {
        var buildOption = document.createElement('option');
        buildOption.value = '' + index;
        buildOption.textContent = getBuildLabel(row);
        baselineSelect.appendChild(buildOption);
    });
    baselineSelect.addEventListener('change', function () {
        renderBuildComparisons(contentRows, contentCells, fixes, projectVersions, baselineSelect.value);
    });
    contentHeader.appendChild(baselineSelect);
    renderBuildComparisons(contentRows, contentCells, fixes, projectVersions, baselineSelect.value);
}
// Extract project version text directly from the select options
function getProjectVersionsFromDOM() {
    var projectVersionIdFilter = document.getElementById('_1_WAR_osbpatcherportlet_patcherProjectVersionIdFilter');
    if (!projectVersionIdFilter) {
        return {};
    }
    return Array.from(projectVersionIdFilter.options)
        .filter(opt => opt.text && opt.text.indexOf('.q') != -1)
        .reduce((acc, next) => {
        acc[next.text] = next.value;
        return acc;
    }, {});
}
async function getPatcherFixVersions(token, tokensSet) {
    var params = new URLSearchParams();
    params.append('p_p_id', portletId);
    params.append('p_p_state', 'exclusive');
    params.append(ns + 'advancedSearch', 'true');
    params.append(ns + 'andOperator', 'true');
    params.append(ns + 'patcherFixName', token);
    params.append(ns + 'statusFilter', '100');
    params.append(ns + 'delta', '200');
    var parser = new DOMParser();
    var hasMorePages = true;
    var foundVersions = [];
    for (var page = 1; hasMorePages; page++) {
        params.set(ns + 'cur', String(page));
        var response = await fetch('/group/guest/patching?' + params.toString());
        var responseDocument = parser.parseFromString(await response.text(), 'text/html');
        var newFoundVersions = Array.from(responseDocument.querySelectorAll('#' + ns + 'patcherFixsSearchContainerSearchContainer table tbody tr'))
            // .filter(row => {
            //     var contentCell = row.querySelector('td:nth-child(3)');
            //     if (!contentCell || !contentCell.textContent) {
            //         return false;
            //     }
            //     var tokenList = contentCell.textContent.split(',').filter(it => it).map(it => it.trim());
            //     return tokenList.length > 0 && tokenList.every(it => tokensSet.has(it));
            // })
            .map(row => {
            var versionCell = row.querySelector('td:nth-child(6)');
            if (!versionCell || !versionCell.textContent) {
                return null;
            }
            return versionCell.textContent.trim();
        })
            .filter(it => it);
        Array.prototype.push.apply(foundVersions, newFoundVersions);
        hasMorePages = !!responseDocument.querySelector('#' + ns + 'patcherFixsSearchContainerPageIteratorBottom ul.lfr-pagination-buttons li.last:not(.disabled)');
    }
    updateSpinner(1);
    return {
        token,
        foundVersions: new Set(foundVersions),
    };
}
// Helper: Modular fetch API call with URL-encoded body
async function getAllPatcherFixVersions(tokensList, tokensSet) {
    var fixVersionsList = await Promise.all(tokensList.map(token => getPatcherFixVersions(token, tokensSet)));
    return fixVersionsList.reduce((acc, next) => {
        acc[next.token] = next.foundVersions;
        return acc;
    }, {});
}
function getTargetVersions(selectedVersion, allVersions) {
    if (!selectedVersion)
        return [];
    var match = selectedVersion.match(/^([0-9]+\.q[1-4]\.)(\d+)$/);
    if (!match)
        return [selectedVersion];
    var [, prefix, startNumStr] = match;
    var startNum = parseInt(startNumStr);
    return Object.keys(allVersions)
        .filter(x => x.indexOf(prefix) == 0)
        .map(v => {
        var patchVersion = parseInt(v.substring(prefix.length + 1));
        return { full: v, patch: patchVersion };
    })
        .filter(v => v.patch >= startNum)
        .sort((a, b) => a.patch - b.patch)
        .map(v => v.full);
}
function generateBulkSearchContentArea() {
    var projectVersions = getProjectVersionsFromDOM();
    var contentArea = document.createElement('div');
    contentArea.id = 'bulk-search-content';
    contentArea.style.display = 'none';
    contentArea.style.padding = '20px';
    contentArea.style.border = '1px solid #ddd';
    contentArea.style.borderRadius = '4px';
    contentArea.style.marginTop = '15px';
    contentArea.innerHTML = `
    <h3>Bulk Search</h3>
    <p>This feature was added to make it easier to see if fixes exist on patcher for various tickets (LPD, LPE, CVEs), and which baselines they exist for. However, it's naive; the fix might have been added with other tokens and so even though the fix <em>exists</em>, it might require additional tokens for the build to go through, or you might fight with patcher's greedy merge algorithm all along the way.</p>
    <div style="margin-bottom: 15px;">
      <label for="bulk-tokens-input" style="font-weight: bold; display: block; margin-bottom: 5px;">
        Tickets (comma or newline separated):
      </label>
      <textarea id="bulk-tokens-input" rows="8" style="width: 100%; max-width: 600px; font-family: monospace;" placeholder="List any Jira tickets or any CVEs (experimental) you wish to check"></textarea>
    </div>
    <button id="bulk-search-button" class="btn btn-primary">Submit Bulk Search</button>
    <div id="bulk-search-results" style="margin-top: 15px;">
    </div>
  `;
    var tokenListInput = contentArea.querySelector('#bulk-tokens-input');
    var bulkSearchButton = contentArea.querySelector('#bulk-search-button');
    var bulkSearchResults = contentArea.querySelector('#bulk-search-results');
    bulkSearchButton.addEventListener('click', async (e) => {
        var rawText = tokenListInput.value;
        var tokensSet = new Set(rawText.split(/[\n,]+/).map(t => t.trim()).filter(Boolean));
        var tokensList = Array.from(tokensSet);
        var cveTokensList = tokensList.filter(it => it.indexOf('CVE-') == 0 || it.indexOf('PRISMA-') == 0);
        var cveFixTokensSet = new Set();
        var cveToLPELookup = {};
        var nonCVETokensList = tokensList.filter(it => it.indexOf('CVE-') == -1 && it.indexOf('PRISMA-') == -1);
        if (cveTokensList.length > 0) {
            var cveResponse = await fetch('https://s3-us-west-2.amazonaws.com/mdang.grow/security_issue_cve_lpe.json');
            cveToLPELookup = await cveResponse.json();
            cveFixTokensSet = new Set(cveTokensList.map(it => cveToLPELookup[it]).reduce((acc, next) => acc.concat(next), []));
            tokensSet = new Set([...nonCVETokensList, ...cveFixTokensSet]);
            tokensList = Array.from(tokensSet);
        }
        addSpinner(tokensList.length);
        var availableFixVersions = await getAllPatcherFixVersions(tokensList, tokensSet);
        var cveRows = cveTokensList.map(cve => {
            var cveFixes = cveToLPELookup[cve] || [];
            var cveFixVersions = new Set(cveFixes.map(ticket => Array.from(availableFixVersions[ticket]) || []).reduce((acc, next) => acc.concat(next), []));
            return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; white-space: nowrap;">${cve}${cveFixes.length == 0 ? "" : ("<br/>(" + cveFixes.join(', ') + ")")}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${Array.from(cveFixVersions).sort((a, b) => getLiferayVersion(a) - getLiferayVersion(b)).join(', ')}</td>
        </tr>
      `;
        });
        var nonCVERows = nonCVETokensList.map(ticket => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${ticket}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${Array.from(availableFixVersions[ticket]).sort((a, b) => getLiferayVersion(a) - getLiferayVersion(b)).join(', ')}</td>
      </tr>
    `);
        bulkSearchResults.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f2f2f2; text-align: left;">
            <th style="padding: 8px; border: 1px solid #ddd;">Ticket</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Available on Baselines</th>
          </tr>
        </thead>
        <tbody>
          ${cveRows.concat(nonCVERows).join('')}
        </tbody>
      </table>
    `;
        removeSpinner();
    });
    contentArea.style.display = 'block';
    return contentArea;
}
function addBulkSearchTab() {
    var navTabs = document.querySelector('ul.nav.nav-tabs');
    if (!navTabs.parentElement) {
        return;
    }
    var navTabsParent = navTabs.parentElement;
    var bulkTab = document.createElement('li');
    bulkTab.id = 'bulk-search-tab';
    bulkTab.innerHTML = `<a href="#bulk-search">Bulk Search</a>`;
    navTabs.appendChild(bulkTab);
    bulkTab.addEventListener('click', (e) => {
        e.preventDefault();
        var contentArea = generateBulkSearchContentArea();
        Array.from(navTabs.children).forEach(li => li.classList.remove('active'));
        bulkTab.classList.add('active');
        Array.from(navTabsParent.children).forEach(child => {
            if (child !== navTabs) {
                navTabsParent.removeChild(child);
            }
        });
        navTabsParent.appendChild(contentArea);
    });
}
// Run all the changes we need to the page.
var applyPatcherCustomizations = function () {
    highlightAnalysisNeededBuilds();
    if ((document.location.pathname.indexOf('/-/osb_patcher/fixes/create') != -1) ||
        (document.location.pathname.indexOf('/-/osb_patcher/builds/create') != -1)) {
        Liferay.on('projectVersionIdReady', updateFromQueryString);
    }
    var activeTab = document.querySelector('.tab.active');
    var activeTabName = activeTab ? (activeTab.textContent || '').trim() : '';
    if (activeTabName && (activeTabName != 'QA Builds')) {
        rearrangeColumns();
        replaceJenkinsLinks();
        replacePopupWindowLinks();
        replaceHotfixLink('debug');
        replaceHotfixLink('hotfix');
        replaceHotfixLink('ignore');
        replaceHotfixLink('official');
        replaceHotfixLink('sourceZip');
        replaceReadOnlySelect('type', null, null);
        replaceBranchName();
        replaceFixes();
        replaceBuild();
        replaceLesaLink('lesaTicket');
        replaceLesaLink('supportTicket');
        replaceDate('createDate');
        replaceDate('modifiedDate');
        replaceDate('statusDate');
        addProductVersionFilter();
        addEngineerComments();
        updatePreviousBuildsContent();
        if (activeTabName == 'Fixes') {
            addBulkSearchTab();
        }
    }
    // Runs after addProductVersionFilter, since on the create fix page
    // that function clones the same patcherProjectVersionIdFilter
    // template this sorts; sorting/filtering the template first would
    // leak its data-has-filter-input marker onto the clone via
    // cloneNode(true) and cause the visible clone to end up without a
    // filter input of its own.
    sortProjectVersionIdFilterSelects();
    compareBuildFixes();
};
if (exportFunction) {
    applyPatcherCustomizations = exportFunction(applyPatcherCustomizations, window);
}
AUI().ready(applyPatcherCustomizations);
