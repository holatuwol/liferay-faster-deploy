// ==UserScript==
// @name           Patcher Read-Only Views Links
// @namespace      holatuwol
// @version        6.9
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
styleElement.textContent = "\na.included-in-baseline,\na.included-in-baseline:hover {\n  color: #ddd;\n  text-decoration: line-through;\n}\n\n.nowrap {\n  white-space: nowrap;\n}\n\n#_1_WAR_osbpatcherportlet_patcherProductVersionId,\n#_1_WAR_osbpatcherportlet_patcherProjectVersionId {\n  width: auto;\n}\n\n#_1_WAR_osbpatcherportlet_patcherProductVersionId option {\n  display: none;\n}\n\n#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version=\"6.x\"] option[data-liferay-version=\"6.x\"],\n#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version=\"7.0\"] option[data-liferay-version=\"7.0\"],\n#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version=\"7.1\"] option[data-liferay-version=\"7.1\"],\n#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version=\"7.2\"] option[data-liferay-version=\"7.2\"],\n#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version=\"7.3\"] option[data-liferay-version=\"7.3\"] {\n  display: block;\n}\n\ntextarea[inputcssclass=\"osb-patcher-input-wide\"] {\n  height: 3em;\n  width: 60em;\n}\n\n#_1_WAR_osbpatcherportlet_patcherBuildName {\n  height: 5em;\n}\n\n.control-group.field-wrapper .table,\n.control-group.input-select-wrapper .table,\n.control-group.input-String-wrapper .table,\n.control-group.input-text-wrapper .table {\n  margin-bottom: 0.5em;\n}\n\n#security-fixes .show-details,\n#ticket-suggestions .show-details {\n  background-color: #fff;\n  font-size: x-small;\n  line-height: 0.5em;\n  text-align: right;\n}\n\n.compact .verbose,\n.verbose .compact {\n  display: none !important;\n}\n\nth.branch-type,\nth.branch-type a {\n  font-weight: bold;\n  width: 5em;\n}\n\n.control-group.field-wrapper,\n.control-group.input-select-wrapper,\n.control-group.input-String-wrapper,\n.control-group.input-text-wrapper {\n  display: flex;\n  margin-bottom: 0.1em;\n}\n\n.control-group .control-group.field-wrapper,\n.control-group .control-group.input-select-wrapper,\n.control-group .control-group.input-String-wrapper,\n.control-group .control-group.input-text-wrapper {\n  display: block;\n}\n\n#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.field-wrapper,\n#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.input-select-wrapper,\n#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.input-String-wrapper,\n#toggle_id_patcher_fix_searchadvancedBodyNode .control-group.input-text-wrapper {\n  display: block;\n}\n\na[href*=\"https://grow.liferay.com/\"] {\n  padding-left: 0.5em;\n}\n\na[href*=\"https://test-5-2.liferay.com/\"] {\n  padding-right: 0.5em;\n}\n\na[href*=\"http://files.liferay.com/\"],\na[href*=\"https://files.liferay.com/\"] {\n  font-size: x-large;\n}\n\n.control-group.field-wrapper .control-label,\n.control-group.input-select-wrapper .control-label,\n.control-group.input-String-wrapper .control-label,\n.control-group.input-text-wrapper .control-label {\n  font-weight: bold;\n  min-width: 20em;\n  width: 20em;\n}\n\n#security-fixes dl {\n  margin-block-start: 0em;\n  margin-block-end: 0em;\n  margin-bottom: 0px;\n}\n\n/**\n * http://vrl.cs.brown.edu/color\n * 4 colors, lightness between 25 and 85, add alpha of 0.3\n */\n\ntr.qa-analysis-needed.version-6210 td {\n  background-color: rgba(79,140,157,0.3) !important;\n}\n\ntr.qa-analysis-needed.version-7010 td {\n  background-color: rgba(75,214,253,0.3) !important;\n}\n\ntr.qa-analysis-needed.version-7110 td {\n  background-color: rgba(101,52,102,0.3) !important;\n}\n\ntr.qa-analysis-needed.version-7210 td {\n  background-color: rgba(131,236,102,0.3) !important;\n}\n\ntr.qa-analysis-unneeded {\n  opacity: 0.3;\n}\n";
document.head.appendChild(styleElement);
var AUI = unsafeWindow.AUI;
var Liferay = unsafeWindow.Liferay;
var _1_WAR_osbpatcherportlet_productVersionOnChange = unsafeWindow._1_WAR_osbpatcherportlet_productVersionOnChange;
var portletId = '1_WAR_osbpatcherportlet';
var ns = '_' + portletId + '_';
/**
 * Utility function to convert an object into a query string with namespaced
 * parameter names.
 */
function getQueryString(params) {
    return Object.keys(params).map(function (key) { return (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + params[key]; }).join('&');
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
    var dateString = new Date(oldDateText.trim() + ' GMT-0000').toString();
    dateNode.textContent = dateString;
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
 * Returns a link to the ticket.
 */
function getTicketLink(className, ticket, title) {
    if (ticket.toUpperCase() != ticket) {
        return ticket;
    }
    var ticketURL = 'https://issues.liferay.com/browse/' + ticket;
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
    return text.split(',').map(function (x) { return x.trim(); }).sort(compareTicket).map(getTicketLink.bind(null, className)).join(', ');
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
 * Update the link to "Use as Build Template" to include additional
 * parameters so that they can be auto-selected.
 */
function addBaselineToBuildTemplate() {
    var baselineLinks = Array.from(document.querySelectorAll('.taglib-text-icon'))
        .filter(function (x) { return (x.textContent || '').toLowerCase() == 'use as build template'; });
    if (baselineLinks.length != 1) {
        return;
    }
    var buildTemplateAnchor = baselineLinks[0].parentElement;
    buildTemplateAnchor.href += '&' + getQueryString({
        'patcherProductVersionId': getSelectedValue('patcherProductVersionId'),
        'patcherProjectVersionId': getSelectedValue('patcherProjectVersionId')
    });
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
    var fixPackName = value.split(',').filter(function (x) { return x.indexOf('portal-') == 0; })[0];
    if (fixPackName) {
        var xhr1 = new XMLHttpRequest();
        xhr1.open('GET', fixPackListURL, false);
        xhr1.onload = function () {
            // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
            var container1 = document.implementation.createHTMLDocument().documentElement;
            container1.innerHTML = xhr1.responseText;
            var fixPackURL = Array.from(container1.querySelectorAll('table tbody tr td a'))
                .filter(function (x) { return (x.textContent || '').trim() == fixPackName; })
                .map(function (x) { return x.getAttribute('href'); })[0];
            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', fixPackURL, false);
            xhr2.onload = function () {
                // https://stackoverflow.com/questions/20583396/queryselectorall-to-html-from-another-page
                var container2 = document.implementation.createHTMLDocument().documentElement;
                container2.innerHTML = xhr2.responseText;
                var gitHashLabelNode = container2.querySelector('label[for="' + ns + 'git-hash"]');
                var gitHashLabelparentElement = gitHashLabelNode.parentElement;
                var gitHubNode = gitHashLabelparentElement.querySelector('a');
                if (gitHubNode) {
                    var gitHubURL = gitHubNode.getAttribute('href');
                    baseTag = gitHubURL.substring(gitHubURL.indexOf('...') + 3);
                }
            };
            xhr2.send(null);
        };
        xhr1.send(null);
    }
    else {
        var versionLabel = document.querySelector('label[for="' + ns + 'patcherProjectVersionId"]');
        var versionHolder = versionLabel.parentElement;
        var versionNode = versionHolder.querySelector('a');
        var fixPackName = '';
        if (versionNode) {
            fixPackName = versionNode.textContent || '';
        }
        else {
            var versionOption = versionHolder.querySelector('option[selected]');
            fixPackName = (versionOption.textContent || '').trim();
        }
        baseTag = 'fix-pack-base-6210-' + fixPackName.toLowerCase().substring(fixPackName.indexOf(' ') + 1);
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
/**
 * Adds a new element to the page to allow you to select from a list of
 * Liferay versions before choosing a product version.
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
    var versions = ['', '6.x', '7.0', '7.1', '7.2', '7.3'];
    for (var i = 0; i < productVersionSelect.options.length; i++) {
        var option = productVersionSelect.options[i];
        var optionText = option.textContent || '';
        for (var j = 1; j < versions.length; j++) {
            if ((optionText.indexOf('DXP ' + versions[j]) != -1) || (optionText.indexOf('Portal ' + versions[j]) != -1)) {
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
    }
    ;
    liferayVersionSelect.onchange = updateProductVersionSelect;
    var productVersionSelectParentElement = productVersionSelect.parentElement;
    productVersionSelectParentElement.insertBefore(liferayVersionSelect, productVersionSelect);
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
        var matcher = /[0-9]*\.[0-9]/.exec(version);
        if (matcher) {
            var shortVersion = matcher[0].replace('.', '');
            return parseInt(shortVersion) * 100 * 1000;
        }
        else {
            return 0;
        }
    }
}
/**
 * Comparison function that uses getLiferayVersion to compute versions,
 * and then sorts in alphabetical order for equivalent versions (thus,
 * we get private branches sorted after the equivalent public branch).
 */
function compareLiferayVersions(a, b) {
    var aValue = getLiferayVersion(a.textContent || '');
    var bValue = getLiferayVersion(b.textContent || '');
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
    if (!projectVersionSelect) {
        return;
    }
    var sortedOptions = Array.from(projectVersionSelect.options).sort(compareLiferayVersions);
    for (var i = 0; i < sortedOptions.length; i++) {
        projectVersionSelect.appendChild(sortedOptions[i]);
    }
    var event = document.createEvent('HTMLEvents');
    event.initEvent('change', false, true);
    projectVersionSelect.dispatchEvent(event);
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
            if (selectedOptionText.trim() == 'DXP ' + liferayVersion) {
                setTimeout(updateProjectVersionOrder, 500);
            }
            return;
        }
    }
    var option = productVersionSelect.querySelector('option[data-liferay-version="' + liferayVersion + '"]');
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
    if (!productVersionSelect) {
        return;
    }
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
    if (!projectVersionSelect) {
        return;
    }
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
    var prefixFixRows = Array.from(container.querySelectorAll('table tbody tr')).filter(function (row) { return !row.classList.contains('lfr-template'); });
    var previousFixes = prefixFixRows.reduce(getBuildFix, new Map());
    var headerRow = document.querySelector('table thead tr');
    var headerCell = document.createElement('th');
    headerCell.textContent = 'Previous';
    headerRow.cells[3].innerText = 'Current';
    headerRow.cells[3].after(headerCell);
    var tbody = document.querySelector('table tbody');
    var currentFixRows = Array.from(tbody.querySelectorAll('tr')).filter(function (row) { return !row.classList.contains('lfr-template'); });
    for (var i = 0; i < currentFixRows.length; i++) {
        var row = currentFixRows[i];
        var fixName = row.cells[2].innerText.trim();
        var currentFixVersion = row.cells[3].innerText.trim();
        var previousFixVersion = previousFixes.get(fixName) || '';
        previousFixes["delete"](fixName);
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
    return {
        buildId: buildId,
        buildLink: buildLink,
        branchName: branchName,
        branchType: branchType,
        fixes: getTicketLinks(row.cells[2].textContent || '', ''),
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
    var rows = Array.from(container.querySelectorAll('table tbody tr')).filter(function (row) { return !row.classList.contains('lfr-template'); });
    var childBuildsMetadata = rows.map(getBuildMetadata);
    var childBuildFixesHTML = childBuildsMetadata.map(function (build) { return '<tr><th class="branch-type">' + getBuildLinkHTML(build) + '</th><td>' + build.fixes + '</td></tr>'; });
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
    var fixes = new Set(buildNode.innerHTML.split(',').map(function (x) { return x.trim(); }));
    var childBuildsButton = Array.from(document.querySelectorAll('button')).filter(function (x) { return (x.textContent || '').trim() == 'View Child Builds'; });
    var buildId = document.location.pathname.substring(document.location.pathname.lastIndexOf('/') + 1);
    var buildLink = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/' + buildId;
    var projectVersionSelect = querySelector('patcherProjectVersionId');
    var branchName = (projectVersionSelect.options[projectVersionSelect.selectedIndex].textContent || '').trim();
    var branchType = branchName.indexOf('-private') != -1 ? 'private' : 'public';
    var build = {
        buildId: buildId,
        buildLink: buildLink,
        branchName: branchName,
        branchType: branchType,
        fixes: getTicketLinks(buildNode.innerHTML, ''),
        patcherFixId: null
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
        var excludedFixes = originalBuildNode.innerHTML.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return !fixes.has(x); });
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
    for (var i = 2; i < columns.length; i++) {
        controlGroups = columns[i].querySelectorAll('.control-group');
        for (var j = 0; j < controlGroups.length; j++) {
            var controlGroup = controlGroups[j];
            controlGroup.classList.add('verbose');
            tableContainer.appendChild(controlGroup);
            var labelElement = controlGroup.querySelector('label');
            var label = (labelElement.textContent || '').trim();
            var textarea = controlGroup.querySelector('textarea');
            var ticketCount = 0;
            if (textarea.value) {
                ticketCount = textarea.value.split(',').length;
            }
            var tableRow = document.createElement('tr');
            compactContainer.appendChild(tableRow);
            var tableHeader = document.createElement('th');
            tableHeader.textContent = label.substring(0, label.indexOf(' Ticket Suggestions'));
            tableRow.appendChild(tableHeader);
            var tableCell = document.createElement('td');
            tableCell.textContent = ticketCount + ((ticketCount == 1) ? ' ticket' : ' tickets');
            tableRow.appendChild(tableCell);
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
            if ((oldNode.value.indexOf('LPP-') == 0) || (oldNode.value.indexOf('GROW-') == 0) || (oldNode.value.indexOf('LRP-') == 0)) {
                ticketHREF = 'https://issues.liferay.com/browse/' + oldNode.value;
                ticketId = oldNode.value;
                jiraSearchLinkHREF = ticketHREF;
            }
            else {
                ticketHREF = 'https://web.liferay.com/group/customer/support/-/support/ticket/' + oldNode.value;
                ticketId = oldNode.value;
            }
        }
        else {
            ticketHREF = 'https://liferay-support.zendesk.com/agent/tickets/' + oldNode.value;
            ticketId = oldNode.value;
        }
        if (jiraSearchLinkHREF == null) {
            var query = "\"Customer Ticket Permalink\" = \"" + ticketHREF + "\" OR \"Zendesk Ticket IDs\" ~ " + ticketId + " OR \"Customer Ticket\" = \"" + ticketId + "\" OR \"Customer Ticket\" = \"" + ticketHREF + "\"";
            var encodedQuery = encodeURIComponent(query);
            jiraSearchLinkHREF = 'https://issues.liferay.com/issues/?jql=' + encodedQuery;
        }
        var newNode;
        if (ticketHREF == jiraSearchLinkHREF) {
            newNode = ticketId + " | <a href=\"" + jiraSearchLinkHREF + "\" target=\"_blank\">JIRA ticket</a>";
        }
        else if (ticketHREF.indexOf('https://web.liferay.com/') == 0) {
            newNode = ticketId + " | <a href=\"" + ticketHREF + "\" target=\"_blank\">LESA ticket</a> | <a href=\"" + jiraSearchLinkHREF + "\" target=\"_blank\">JIRA tickets</a>";
        }
        else {
            newNode = ticketId + " | <a href=\"" + ticketHREF + "\" target=\"_blank\">zendesk ticket</a> | <a href=\"" + jiraSearchLinkHREF + "\" target=\"_blank\">JIRA tickets</a>";
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
function getMissingTicketList(lsvTickets) {
    var fixPack = getFixPack();
    if (!fixPack) {
        return [[], [], [], []];
    }
    var tagName = (fixPack.name.indexOf('portal-') == 0) ? fixPack.name : fixPack.tag;
    var liferayVersion = getLiferayVersion(tagName);
    var buildNumber = '';
    if (tagName.indexOf('portal-') == 0) {
        buildNumber = '6210';
    }
    else {
        buildNumber = '' + Math.floor(liferayVersion / 1000);
    }
    var buildNameNode = querySelector('patcherBuildName');
    buildNameNode.removeAttribute('style');
    var buildName = [];
    if (buildNameNode.tagName.toLowerCase() == 'select') {
        buildName = buildNameNode.value.split(',');
    }
    else {
        buildName = buildNameNode.value.split(',');
    }
    var ticketList = new Set(buildName.map(function (x) { return x.trim(); }));
    var missingTicketList = [[], [], [], []];
    var fixPackNumber = 0;
    if (buildNumber == '6210') {
        fixPackNumber = parseInt(tagName.substring('portal-'.length));
    }
    else {
        fixPackNumber = liferayVersion % 1000;
    }
    for (var ticketName in lsvTickets) {
        if (!ticketList.has(ticketName) && lsvTickets[ticketName][buildNumber] && lsvTickets[ticketName][buildNumber] > fixPackNumber) {
            var severity = lsvTickets[ticketName]['sev'] || 3;
            missingTicketList[severity].push(ticketName);
        }
    }
    return missingTicketList;
}
function getMissingTicketTableRow(lsvTickets, missingTickets, severity) {
    if (severity == 0) {
        return '';
    }
    var lsvList = [
        '<tr><th class="nowrap">SEV-', severity, '</th><td>'
    ];
    if ((severity == 1) || (severity == 2)) {
        if (missingTickets.length == 0) {
            return '';
        }
        lsvList.push('<span class="compact">');
        lsvList.push(missingTickets.map(function (x) { return getTicketLink('', x, x); }).join(', '));
        lsvList.push('</span>');
        lsvList.push('<div class="verbose" contenteditable onfocus="', 'var selection = window.getSelection();', 'var range = document.createRange();', 'range.selectNodeContents(this);', 'selection.removeAllRanges();', 'selection.addRange(range);', '"><dl>');
        for (var i = 0; i < missingTickets.length; i++) {
            var ticketName = missingTickets[i];
            if (!('hc' in lsvTickets[ticketName])) {
                continue;
            }
            var lsvNumber = lsvTickets[ticketName]['lsv'];
            var helpCenterNumber = lsvTickets[ticketName]['hc'];
            lsvList.push('<dt>', 'LSV-', lsvNumber, ' / ', ticketName, '</dt><dd>', '<a href="https://help.liferay.com/hc/articles/', helpCenterNumber, '">https://help.liferay.com/hc/articles/', helpCenterNumber, '</a>', '</dd>');
        }
        lsvList.push('</dl></div>');
    }
    else {
        lsvList.push('<span class="compact">', missingTickets.length, missingTickets.length == 1 ? ' ticket' : ' tickets', '</span><span class="verbose">', missingTickets.length == 0 ? 'none' : missingTickets.map(function (x) { return getTicketLink('', x, x); }).join(', '), '</span>');
    }
    lsvList.push('</td></tr>');
    return lsvList.join('');
}
function updateMissingTicketTable(lsvTickets) {
    var tableContainer = document.getElementById('security-fixes');
    var missingTicketList = getMissingTicketList(lsvTickets);
    var tableRows = missingTicketList.map(getMissingTicketTableRow.bind(null, lsvTickets));
    var tableRowsHTML = tableRows.join('');
    tableContainer.innerHTML = [
        '<table class="table table-bordered table-hover">',
        '<tbody class="table-data">', tableRowsHTML, '</tbody>',
        '<tfoot><tr><td class="show-details" colspan=2>',
        '<a class="compact" href="#" onclick="var cl=this.closest(\'#security-fixes\').classList;',
        'cl.remove(\'compact\');cl.add(\'verbose\');return false;">(show details)</a>',
        '<a class="verbose" href="#" onclick="var cl=this.closest(\'#security-fixes\').classList;',
        'cl.add(\'compact\');cl.remove(\'verbose\');return false;">(hide details)</a>',
        '</td></tr></tfoot></table>'
    ].join('');
}
function renderSecurityFixesSection() {
    var buildNameNode = querySelector('patcherBuildName');
    var xhr = new XMLHttpRequest();
    var lsvFixedInURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/lsv_fixedin.json';
    xhr.open('GET', lsvFixedInURL);
    xhr.onload = function () {
        var lsvTickets = JSON.parse(this.responseText);
        var updateMissingTicketTableListener = updateMissingTicketTable.bind(null, lsvTickets);
        buildNameNode.addEventListener('blur', updateMissingTicketTableListener);
        var projectVersionNode = querySelector('patcherProjectVersionId');
        projectVersionNode.addEventListener('change', updateMissingTicketTableListener);
        updateMissingTicketTableListener();
    };
    xhr.send(null);
}
function addSecurityFixesSection() {
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
    var container = document.createElement('div');
    container.classList.add('control-group', 'input-text-wrapper');
    var labelElement = document.createElement('label');
    labelElement.classList.add('control-label');
    labelElement.textContent = 'Missing Security Fixes';
    container.appendChild(labelElement);
    var tableContainer = document.createElement('span');
    tableContainer.setAttribute('id', 'security-fixes');
    tableContainer.classList.add('compact');
    container.appendChild(tableContainer);
    var accountParentElement = accountElement.parentElement;
    var accountGrandParentElement = accountParentElement.parentElement;
    accountGrandParentElement.insertBefore(container, accountParentElement);
    renderSecurityFixesSection();
}
// Run all the changes we need to the page.
var applyPatcherCustomizations = function () {
    highlightAnalysisNeededBuilds();
    var activeTab = document.querySelector('.tab.active');
    if (activeTab && ((activeTab.textContent || '').trim() != 'QA Builds')) {
        rearrangeColumns();
        replaceJenkinsLinks();
        replacePopupWindowLinks();
        addBaselineToBuildTemplate();
        replaceHotfixLink('debug');
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
        addSecurityFixesSection();
    }
    compareBuildFixes();
    setTimeout(updateFromQueryString, 500);
};
if (exportFunction) {
    applyPatcherCustomizations = exportFunction(applyPatcherCustomizations, window);
}
AUI().ready(applyPatcherCustomizations);
