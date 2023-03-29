// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @version        16.6
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/zendesk.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/zendesk.user.js
// @include        /https:\/\/liferay-?support[0-9]*.zendesk.com\/agent\/.*/
// @include        /https:\/\/liferay-?support[0-9]*.zendesk.com\/knowledge\/.*/
// @include        /https:\/\/24475.apps.zdusercontent.com\/24475\/assets\/.*\/issue_creator.html/
// @grant          unsafeWindow
// @require        https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// @require        https://unpkg.com/stackedit-js@1.0.7/docs/lib/stackedit.min.js
// @require        https://unpkg.com/turndown@5.0.3/dist/turndown.js
// ==/UserScript==
/**
 * Compiled from TypeScript
 * https://github.com/holatuwol/liferay-zendesk-userscript
 */ 
var styleElement = document.createElement('style');
if (window.location.hostname == '24475.apps.zdusercontent.com') {
    styleElement.textContent = "\nbody {\n  overflow-y: hidden;\n}\n";
}
else {
    styleElement.textContent = "\na.downloading {\n  color: #999;\n}\n\na.downloading::after {\n  content: ' (downloading...)';\n  color: #999;\n}\n\na.generating {\n  color: #999;\n}\n\na.generating::after {\n  content: ' (generating...)';\n  color: #999;\n}\n\narticle {\n  border-top: 1px solid #ebebeb;\n}\n\ndiv.lesa-ui-subtitle {\n  display: flex;\n  flex-direction: column;\n}\n\n.lesa-ui-attachments,\n.lesa-ui-knowledge-capture {\n  display: flex;\n  flex-direction: column;\n  margin-bottom: 0.5em;\n}\n\n#attachments-modal .lesa-ui-attachments,\n#description-modal .lesa-ui-description {\n  margin: 0.5em;\n}\n\n#description-modal .event {\n  border-top: 0px;\n}\n\n.lesa-ui-attachment-info {\n  display: grid;\n  grid-gap: 0em 1em;\n  grid-template-columns: 1em auto;\n  margin: 0.5em;\n}\n\n.lesa-ui-attachment-info input {\n  margin-left: 0.5em;\n}\n\n.lesa-ui-attachment-info .lesa-ui-attachment-extra-info {\n  grid-column: 1 / 2 span;\n  padding: 0.2em 0.5em;\n  text-align: right;\n  margin-bottom: 0.5em;\n}\n\n.lesa-ui-attachment-info .lesa-ui-attachment-extra-info:not(:first-child) {\n  margin-top: 1em;\n  border-top: 1px solid lightgray;\n  padding-top: 0.5em;\n}\n\n.lesa-ui-description .lesa-ui-attachment-info .lesa-ui-attachment-extra-info {\n  border-top: 1px solid #eee;\n}\n\n.lesa-ui-attachment-info a {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.lesa-ui-attachments-bulk-download {\n  margin-top: 0.5em;\n  text-align: right;\n  text-decoration: underline;\n}\n\n.lesa-ui-attachments-label,\n.lesa-ui-knowledge-capture-label {\n  font-weight: 600;\n  margin-right: 1em;\n  white-space: nowrap;\n}\n\n.lesa-ui-knowledge-capture-label:not(:first-child) {\n  margin-top: 1em;\n}\n\n.lesa-ui-knowledge-capture ul {\n  margin-left: 1em;\n}\n\n.lesa-ui-description {\n  font-weight: normal;\n}\n\n.lesa-ui-description > div {\n  margin-bottom: 2em;\n}\n\n.lesa-ui-description .zd-comment,\n.lesa-ui-description .lesa-ui-attachment-info {\n  max-height: 25em;\n  overflow-y: auto;\n}\n\n.lesa-ui-event-highlighted,\narticle.lesa-ui-event-highlighted {\n  background-color: #eee;\n  scroll-margin-top: 1em;\n}\n\n.lesa-ui-form-field {\n  display: flex;\n  flex-direction: column;\n  margin-bottom: 0.5em;\n}\n\n.lesa-ui-permalink {\n  margin-bottom: 1em;\n}\n\n.lesa-ui-permalink > input,\n.lesa-ui-form-field.lesa-ui-helpcenter > input {\n  background-color: transparent;\n  border: 0px;\n  font-size: 12px;\n  margin: 0px;\n  padding: 0px;\n  width: 100%;\n}\n\n.lesa-ui-stackedit-icon {\n  height: 16px;\n  width: 16px;\n  padding: 4px;\n}\n\n.mast .editable .lesa-ui-subject {\n  background-color: #fff;\n  font-size: 20px;\n  font-weight: 600;\n  resize: vertical;\n  text-align: left;\n  width: 100%;\n}\n\n.header.mast > .round-avatar {\n  display: none;\n}\n\n.lesa-ui-priority:not(:empty) {\n  margin-top: 6px;\n  margin-bottom: 8px;\n}\n\n.lesa-ui-priority span {\n  color: #fff;\n  border-radius: 2px;\n  font-size: 10px;\n  font-weight: 600;\n  line-height: 16px;\n  margin-right: 8px;\n  padding: 0.5em;\n  text-align: center;\n  text-transform: uppercase;\n  width: 6em;\n}\n\n.lesa-ui-priority a {\n  color: #fff;\n  text-decoration: none;\n}\n\n.lesa-ui-priority > *:last-child {\n  margin-right: 0;\n}\n\n.lesa-ui-priority .lesa-ui-subject-emojis a {\n  color: #000;\n}\n\n.lesa-ui-subpriority {\n  border: 1px #eee dashed;\n  font-size: 0.8em;\n}\n\n.lesa-ui-priority-minor,\n.lesa-ui-subpriority-none,\n.lesa-ui-subpriority-low {\n  background-color: #0066cc;\n}\n\n.lesa-ui-priority-major,\n.lesa-ui-subpriority-medium {\n  background-color: #f2783b;\n}\n\n.lesa-ui-priority-critical,\n.lesa-ui-subpriority-high {\n  background-color: #bf1e2d;\n}\n\n.lesa-ui-priority .lesa-ui-subject-emojis {\n  background-color: #f8f9f9;\n}\n\n.lesa-ui-subject-emojis a {\n  font-size: 1.5em;\n  font-weight: normal;\n  margin-left: 2px;\n  margin-right: 2px;\n}\n\n.rich_text .comment_input .lesa-ui-playbook-reminder,\n#editor-view .lesa-ui-playbook-reminder {\n  display: none;\n}\n\n.rich_text .comment_input.is-public .lesa-ui-playbook-reminder:not(:empty),\n#editor-view .lesa-ui-playbook-reminder:not(:empty) {\n  background-color: #eef2fa;\n  border: 1px solid #d8dcde;\n  border-radius: 0 3px 0 0 !important;\n  color: #2e5aac;\n  display: block;\n  margin-bottom: 1em;\n  padding: 10px;\n}\n\n.rich_text .comment_input.is-public .lesa-ui-playbook-reminder a,\n#editor-view .lesa-ui-playbook-reminder a {\n  text-decoration: underline;\n}\n\n#modals .modal-header,\n#attachments-modal .modal-header {\n  cursor: move;\n}\n\n.fNgWaW {\n  padding: 2px 0px;\n  height: 14px;\n  width: 1px;\n  background: rgb(194, 200, 204);\n  display: flex;\n  margin: 0px 8px;\n}\n\nbutton[data-test-id=\"omnilog-jump-button\"] {\n  display: none;\n}\n";
}
var head = document.querySelector('head');
head.appendChild(styleElement);
var isAgentWorkspace = false;
/**
 * Generate an anchor tag with the specified text, href, and download attributes.
 * If the download attribute has an extension that looks like it will probably be
 * served inline, use the downloadBlob function instead.
 */
function createAnchorTag(text, href, download) {
    var link = document.createElement('a');
    link.textContent = text;
    if (href) {
        link.href = href;
    }
    if (download) {
        link.download = download;
        var lowerCaseName = download.toLowerCase();
        var isLikelyInline = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.pdf'].some(function (substr) {
            return lowerCaseName.length > substr.length &&
                lowerCaseName.indexOf(substr) == lowerCaseName.length - substr.length;
        });
        if (isLikelyInline) {
            link.onclick = downloadFile.bind(null, href, download);
        }
    }
    else if (href && href.charAt(0) != '#') {
        link.target = '_blank';
    }
    return link;
}
/**
 * Download the specified HREF using the specified file name.
 */
function downloadFile(href, filename, callback) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function () {
        if (callback) {
            callback(this.response);
        }
        else {
            downloadBlob(filename, this.response);
        }
    };
    xhr.onerror = function () {
        if (callback) {
            callback(this.response);
        }
    };
    if (href.indexOf('https://help.liferay.com') == 0) {
        xhr.open('GET', href.substring('https://help.liferay.com'.length));
    }
    else {
        xhr.open('GET', href);
    }
    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.send(null);
}
/**
 * Download a generated Blob object by generating a dummy link and simulating a click.
 * Avoid doing this too much, because browsers may have security to block this.
 */
function downloadBlob(fileName, blob) {
    var blobURL = createObjectURL(blob);
    var downloadLink = createAnchorTag(fileName, blobURL);
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
/**
 * Retrieve the value for a cookie.
 */
function getCookieValue(name) {
    var nameEquals = name + '=';
    var matchingCookies = document.cookie.split('; ').filter(function (it) { return it.indexOf(nameEquals) == 0; });
    return (matchingCookies.length == 0) ? '' : matchingCookies[0].substring(nameEquals.length);
}
/**
 * Create a link to the JIRA linked issues.
 */
function getJiraSearchLink(text, ticketId) {
    var query = ("\n\"Customer Ticket Permalink\" = \"https://" + document.location.host + document.location.pathname + "\" OR\n\"Zendesk Ticket IDs\" ~ " + ticketId + " OR\n\"Customer Ticket\" = \"https://" + document.location.host + document.location.pathname + "\"\n  ").trim();
    var encodedQuery = encodeURIComponent(query);
    var jiraSearchLinkHREF = 'https://issues.liferay.com/issues/?jql=' + encodedQuery;
    return createAnchorTag(text, jiraSearchLinkHREF);
}
var accountCodeCache = {};
var organizationCache = {};
var ticketInfoCache = {};
var accountInfo = null;
/**
 * Retrieve the account code from the sidebar.
 */
function getAccountCode(ticketId, ticketInfo, propertyBox) {
    if (accountCodeCache.hasOwnProperty(ticketId)) {
        return accountCodeCache[ticketId];
    }
    var accountCode = null;
    if (ticketInfo.organizations && (ticketInfo.organizations.length == 1)) {
        var organizationInfo = ticketInfo.organizations[0];
        var organizationFields = organizationInfo.organization_fields;
        accountCode = organizationFields.account_code;
    }
    else if (propertyBox) {
        var parentElement = propertyBox.parentElement;
        var accountCodeField = parentElement.querySelector('.custom_field_360013377592 .ember-text-field');
        if (accountCodeField) {
            accountCode = accountCodeField.value;
        }
    }
    if (accountCode) {
        accountCodeCache[ticketId] = accountCode;
    }
    return accountCode;
}
/**
 * Retrieve information about a ticket, and then call a function
 * once that information is retrieved.
 */
function cacheOrganizations(organizations) {
    for (var i = 0; i < organizations.length; i++) {
        organizationCache[organizations[i].organization_fields.account_code] = organizations[i];
    }
}
/**
 * Retrieve information about a ticket, and then call a function
 * once that information is retrieved.
 */
function checkTicket(ticketId, callback) {
    if (ticketInfoCache.hasOwnProperty(ticketId)) {
        if (ticketInfoCache[ticketId] == 'PENDING') {
            return;
        }
        callback(ticketId, ticketInfoCache[ticketId]);
        return;
    }
    var ticketInfo;
    ticketInfoCache[ticketId] = 'PENDING';
    var forkFunctions = [checkTicketMetadata, checkEvents];
    var returnedFunctions = 0;
    var joinCallback = function (ticketId, newTicketInfo) {
        if (ticketInfo == null) {
            ticketInfo = newTicketInfo;
        }
        else {
            Object.assign(ticketInfo, newTicketInfo);
        }
        if (++returnedFunctions != forkFunctions.length) {
            return;
        }
        if (Object.keys(ticketInfo).length == 0) {
            delete ticketInfoCache[ticketId];
        }
        else {
            ticketInfoCache[ticketId] = ticketInfo;
        }
    };
    for (var i = 0; i < forkFunctions.length; i++) {
        forkFunctions[i](ticketId, joinCallback);
    }
}
/**
 * Retrieve information about a ticket, and then call a function
 * once that information is retrieved.
 */
function checkTicketMetadata(ticketId, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        if (xhr.status != 200) {
            console.error("URL: " + xhr.responseURL);
            console.error("Error: " + xhr.status + " - " + xhr.statusText);
            callback(ticketId, null);
            return;
        }
        var ticketInfo = null;
        try {
            ticketInfo = JSON.parse(xhr.responseText);
        }
        catch (e) {
        }
        checkUser(ticketId, ticketInfo, callback);
    };
    xhr.onerror = function () {
        callback(ticketId, null);
    };
    var ticketDetailsURL = [
        document.location.protocol,
        '//',
        document.location.host,
        '/api/v2/tickets/',
        ticketId,
        '?include=organizations'
    ].join('');
    xhr.open('GET', ticketDetailsURL);
    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.send();
}
/**
 * When the ticket doesn't contain enough information on the organization,
 * fetch the user and the user's organization and invoke the callback.
 */
function checkUser(ticketId, ticketInfo, callback) {
    if (ticketInfo.organizations.length != 0) {
        cacheOrganizations(ticketInfo.organizations);
        callback(ticketId, ticketInfo);
        return;
    }
    var userId = ticketInfo.ticket.requester_id;
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        var userInfo = null;
        try {
            userInfo = JSON.parse(xhr.responseText);
        }
        catch (e) {
        }
        cacheOrganizations(userInfo.organizations);
        ticketInfo.organizations = userInfo.organizations;
        callback(ticketId, ticketInfo);
    };
    xhr.onerror = function () {
        callback(ticketId, null);
    };
    var userDetailsURL = [
        document.location.protocol,
        '//',
        document.location.host,
        '/api/v2/users/',
        userId,
        '?include=organizations'
    ].join('');
    xhr.open('GET', userDetailsURL);
    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.send();
}
/**
 * Audit event information is incomplete unless we specifically
 * request it, so do that here.
 */
function checkEvents(ticketId, callback, audits, pageId) {
    if (audits === void 0) { audits = []; }
    if (pageId === void 0) { pageId = 1; }
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        var auditInfo = null;
        try {
            auditInfo = JSON.parse(xhr.responseText);
        }
        catch (e) {
        }
        Array.prototype.push.apply(audits, auditInfo.audits);
        if (auditInfo.next_page) {
            checkEvents(ticketId, callback, audits, pageId + 1);
        }
        else {
            callback(ticketId, { 'audits': audits });
        }
    };
    xhr.onerror = function () {
        callback(ticketId, null);
    };
    var auditEventsURL = [
        document.location.protocol,
        '//',
        document.location.host,
        '/api/v2/tickets/',
        ticketId,
        '/audits.json?page=',
        pageId
    ].join('');
    xhr.open('GET', auditEventsURL);
    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.send();
}
/**
 * Cache the account information for the current ZenDesk site.
 */
function setAccountInfo(callback) {
    if (accountInfo) {
        return;
    }
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        if (xhr.status != 200) {
            console.log("URL: " + xhr.responseURL);
            console.log("Error: " + xhr.status + " - " + xhr.statusText);
        }
        try {
            accountInfo = JSON.parse(xhr.responseText);
        }
        catch (e) {
        }
        callback();
    };
    var accountDetailsURL = [
        document.location.protocol,
        '//',
        document.location.host,
        '/api/v2/account.json'
    ].join('');
    xhr.open('GET', accountDetailsURL);
    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.send();
}
function addServiceLifeMarker(priorityElement, ticketId, tags) {
    var limitedSupport = false;
    var endOfSoftwareLife = false;
    var extendedPremiumSupport = false;
    for (var i = 0; i < tags.length; i++) {
        if (tags[i].indexOf('eps') != -1) {
            extendedPremiumSupport = true;
            break;
        }
    }
    var version = getProductVersion(tags);
    if ((version == '6.x') || (version == '7.0') || (version == '7.1')) {
        limitedSupport = true;
        endOfSoftwareLife = true;
    }
    var serviceLifeLink = null;
    var href = 'https://liferay.atlassian.net/wiki/spaces/SUPPORT/pages/1998783040/EOSL+Guide+For+Support';
    if (extendedPremiumSupport) {
        serviceLifeLink = createAnchorTag('Extended Premium Support', href);
    }
    else if (endOfSoftwareLife) {
        serviceLifeLink = createAnchorTag('End of Software Life', href);
    }
    else if (limitedSupport) {
        serviceLifeLink = createAnchorTag('Limited Support', href);
    }
    if (serviceLifeLink) {
        var serviceLifeElement = document.createElement('span');
        serviceLifeElement.classList.add('lesa-ui-priority-minor');
        serviceLifeElement.appendChild(serviceLifeLink);
        priorityElement.appendChild(serviceLifeElement);
    }
}
function addCriticalMarker(priorityElement, ticketInfo, tagSet) {
    var subpriority = ticketInfo.ticket.priority || 'none';
    if ((subpriority != 'high') && (subpriority != 'urgent')) {
        return;
    }
    var criticalMarkers = ['production', 'production_completely_shutdown', 'production_severely_impacted_inoperable'].filter(Set.prototype.has.bind(tagSet));
    if (criticalMarkers.length >= 2) {
        var criticalElement = document.createElement('span');
        criticalElement.classList.add('lesa-ui-priority-critical');
        criticalElement.textContent = tagSet.has('platinum') ? 'platinum critical' : 'critical';
        priorityElement.appendChild(criticalElement);
    }
}
function addCustomerTypeMarker(priorityElement, tagSet) {
    if (tagSet.has('service_solution')) {
        var solutionElement = document.createElement('span');
        solutionElement.classList.add('lesa-ui-priority-minor');
        var solutionLink = document.createElement('a');
        solutionLink.textContent = 'Service Portal Customer';
        var query = 'tags:service_solution';
        solutionLink.href = 'https://' + document.location.host + '/agent/search/1?type=organization&q=' + encodeURIComponent(query);
        solutionElement.appendChild(solutionLink);
        priorityElement.appendChild(solutionElement);
    }
    if (tagSet.has('commerce_solution')) {
        var solutionElement = document.createElement('span');
        solutionElement.classList.add('lesa-ui-priority-minor');
        var solutionLink = document.createElement('a');
        solutionLink.textContent = 'Commerce Portal Customer';
        var query = 'tags:commerce_solution';
        solutionLink.href = 'https://' + document.location.host + '/agent/search/1?type=organization&q=' + encodeURIComponent(query);
        solutionElement.appendChild(solutionLink);
        priorityElement.appendChild(solutionElement);
    }
}
/**
 * Checks whether the assignee text corresponds to the specified support region.
 */
function isSupportRegion(assigneeText, regionText) {
    if (assigneeText.indexOf('- ' + regionText) != -1) {
        return true;
    }
    if (assigneeText.indexOf('/' + regionText + '/') != -1) {
        return true;
    }
    return false;
}
/**
 * Retrieves the support region
 */
function getSupportRegions(assigneeText) {
    var supportRegions = [];
    if (isSupportRegion(assigneeText, 'AU')) {
        supportRegions.push('Australia');
    }
    if (isSupportRegion(assigneeText, 'BR')) {
        supportRegions.push('Brazil');
    }
    if (isSupportRegion(assigneeText, 'CN')) {
        supportRegions.push('China');
    }
    if (isSupportRegion(assigneeText, 'HU')) {
        supportRegions.push("Hungary");
    }
    if (isSupportRegion(assigneeText, 'IN')) {
        supportRegions.push('India');
    }
    if (isSupportRegion(assigneeText, 'JP')) {
        supportRegions.push('Japan');
    }
    if ((assigneeText.indexOf('Spain Pod') == 0) || (isSupportRegion(assigneeText, 'ES'))) {
        supportRegions.push('Spain');
    }
    if (isSupportRegion(assigneeText, 'US')) {
        supportRegions.push('US');
    }
    return new Set(supportRegions.map(function (x) { return x.toLowerCase(); }));
}
var middleEastCountries = new Set([
    'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrein', 'Oman', 'Jordan', 'Iraq', 'Lebanon'
]);
function addRegionMarker(priorityElement, ticketInfo, ticketContainer) {
    if (ticketInfo.organizations.length == 0) {
        return;
    }
    var organizationFields = ticketInfo.organizations[0].organization_fields;
    if (middleEastCountries.has(organizationFields.country)) {
        var customerCountryElement = document.createElement('span');
        customerCountryElement.classList.add('lesa-ui-priority-minor');
        var customerCountryLink = document.createElement('a');
        customerCountryLink.textContent = 'country: middle east';
        var query = Array.from(middleEastCountries).map(function (x) { return 'country:"' + x + '"'; }).join(' ');
        customerCountryLink.href = 'https://' + document.location.host + '/agent/search/1?type=organization&q=' + encodeURIComponent(query);
        customerCountryElement.appendChild(customerCountryLink);
        priorityElement.appendChild(customerCountryElement);
    }
    var assigneeElement = ticketContainer.querySelector(isAgentWorkspace ? 'div[data-test-id="assignee-field-selected-agent-tag"] > span, div[data-test-id="assignee-field-selected-group-tag"]' : '.js-zero-state-ticket-tutorial-assignee-field > div > div');
    if (assigneeElement && (ticketInfo.ticket.status != 'closed')) {
        var customerRegion = organizationFields.support_region;
        var assigneeText = (assigneeElement.textContent || '').trim();
        var assigneeRegions = getSupportRegions(assigneeText);
        if (!assigneeRegions.has(customerRegion)) {
            var customerRegionElement = document.createElement('span');
            customerRegionElement.classList.add('lesa-ui-priority-major');
            var customerRegionLink = document.createElement('a');
            customerRegionLink.textContent = 'customer region: ' + customerRegion;
            var query = 'support_region:' + customerRegion;
            customerRegionLink.href = 'https://' + document.location.host + '/agent/search/1?type=organization&q=' + encodeURIComponent(query);
            customerRegionElement.appendChild(customerRegionLink);
            priorityElement.appendChild(customerRegionElement);
        }
    }
}
/**
 * Generates a text string representing the emojis corresponding to the provided list of tags.
 */
var emojiMap = {
    'cas_fire': '⚠️',
    'cas_hot': '⚠️',
    'cas_priority': '⚠️'
};
var isEmoji = Set.prototype.has.bind(new Set(Object.keys(emojiMap)));
function getEmojiText(tags) {
    return tags.filter(isEmoji).map(function (x) { return emojiMap[x]; }).join('');
}
/**
 * Generates an emoji for the given tag.
 */
function getEmojiAnchorTag(tag) {
    var anchor = document.createElement('a');
    anchor.title = 'tags:' + tag;
    anchor.textContent = emojiMap[tag];
    anchor.href = 'https://' + document.location.host + '/agent/search/1?q=' + encodeURIComponent('tags:' + tag);
    return anchor;
}
/**
 * Converts a list of tags into a span holding a bunch of
 * emojis with 'title' attributes.
 */
function getEmojiAnchorTags(tags) {
    var matchingTags = tags.filter(isEmoji);
    if (matchingTags.length == 0) {
        return null;
    }
    var emojiContainer = document.createElement('span');
    emojiContainer.classList.add('lesa-ui-subject-emojis');
    var emojis = matchingTags.map(getEmojiAnchorTag);
    for (var i = 0; i < emojis.length; i++) {
        emojiContainer.appendChild(emojis[i]);
    }
    return emojiContainer;
}
/**
 * Add a marker to show the LESA priority on the ticket.
 */
function addPriorityMarker(header, conversation, ticketId, ticketInfo) {
    var ticketContainer = header.closest('.main_panes');
    var priorityElement = header.querySelector('.lesa-ui-priority');
    if (priorityElement) {
        if (priorityElement.getAttribute('data-ticket-id') == ticketId) {
            return;
        }
        var parentElement = priorityElement.parentElement;
        parentElement.removeChild(priorityElement);
    }
    priorityElement = document.createElement('div');
    priorityElement.classList.add('lesa-ui-priority');
    priorityElement.setAttribute('data-ticket-id', ticketId);
    // Check to see if the ticket matches the rules for a regular
    // high priority ticket (production, severely impacted or worse)
    var tags = (ticketInfo && ticketInfo.ticket && ticketInfo.ticket.tags) || [];
    var tagSet = new Set(tags);
    addServiceLifeMarker(priorityElement, ticketId, tags);
    addCriticalMarker(priorityElement, ticketInfo, tagSet);
    addCustomerTypeMarker(priorityElement, tagSet);
    addRegionMarker(priorityElement, ticketInfo, ticketContainer);
    var emojiContainer = getEmojiAnchorTags(tags);
    if (emojiContainer != null) {
        priorityElement.appendChild(emojiContainer);
    }
    if (isAgentWorkspace) {
        var viaLabel = conversation.querySelector('div[data-test-id="omni-header-via-label"]');
        var divider = document.createElement('div');
        divider.classList.add('Divider-sc-2k6bz0-9');
        if (priorityElement.childNodes.length > 0) {
            divider.classList.add('fNgWaW');
        }
        viaLabel.before(divider);
        divider.before(priorityElement);
    }
    else {
        header.insertBefore(priorityElement, header.querySelector('.round-avatar'));
    }
}
/**
 * Generate a single dummy field to add to the sidebar.
 */
function generateFormField(propertyBox, className, labelText, formElements) {
    var formField = document.createElement('div');
    formField.classList.add('ember-view');
    formField.classList.add('form_field');
    formField.classList.add('lesa-ui-form-field');
    formField.classList.add(className);
    var label = document.createElement('label');
    label.innerHTML = labelText;
    formField.appendChild(label);
    for (var i = 0; i < formElements.length; i++) {
        formField.appendChild(formElements[i]);
    }
    var oldFormFields = propertyBox.querySelectorAll('.' + className);
    for (var i = 0; i < oldFormFields.length; i++) {
        propertyBox.removeChild(oldFormFields[i]);
    }
    propertyBox.appendChild(formField);
}
/**
 * Generate a URL to Customer Portal's account details view.
 */
function getCustomerPortalAccountsHREF(params) {
    var portletId = 'com_liferay_osb_customer_account_entry_details_web_AccountEntryDetailsPortlet';
    var ns = '_' + portletId + '_';
    var queryString = Object.keys(params).map(function (key) { return (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + encodeURIComponent(params[key]); }).join('&');
    return 'https://customer.liferay.com/project-details?p_p_id=' + portletId + '&' + queryString;
}
/**
 * Add the Organization field to the sidebar, which will contain a link to Help Center
 * for the account details and the customer's SLA level.
 */
function addOrganizationField(propertyBox, ticketId, ticketInfo) {
    var accountCode = getAccountCode(ticketId, ticketInfo, propertyBox);
    var tags = (ticketInfo && ticketInfo.ticket && ticketInfo.ticket.tags) || [];
    var tagSet = new Set(tags);
    var helpCenterLinkHREF = null;
    var serviceLevel = [];
    if (tagSet.has('t1')) {
        serviceLevel.push('Account Tier 1');
    }
    else if (tagSet.has('t2')) {
        serviceLevel.push('Account Tier 2');
    }
    else if (tagSet.has('t3')) {
        serviceLevel.push('Account Tier 3');
    }
    else if (tagSet.has('t4')) {
        serviceLevel.push('Account Tier 4');
    }
    var organizationInfo = null;
    if (accountCode) {
        organizationInfo = organizationCache[accountCode];
    }
    if (organizationInfo) {
        var organizationFields = organizationInfo.organization_fields;
        serviceLevel.push(organizationFields.sla.toUpperCase());
        helpCenterLinkHREF = getCustomerPortalAccountsHREF({
            mvcRenderCommandName: '/view_account_entry',
            accountEntryId: organizationInfo.external_id
        });
    }
    else if (accountCode) {
        helpCenterLinkHREF = getCustomerPortalAccountsHREF({
            keywords: accountCode
        });
    }
    var helpCenterItems = [];
    if (accountCode && helpCenterLinkHREF) {
        var helpCenterLinkContainer = document.createElement('div');
        var helpCenterLink = createAnchorTag(accountCode, helpCenterLinkHREF);
        helpCenterLinkContainer.appendChild(helpCenterLink);
        helpCenterItems.push(helpCenterLinkContainer);
    }
    if (serviceLevel.length > 0) {
        var serviceLevelContainer = document.createElement('div');
        serviceLevelContainer.appendChild(document.createTextNode(serviceLevel.join(', ')));
        helpCenterItems.push(serviceLevelContainer);
    }
    var permalinkHREF = 'https://help.liferay.com/hc/requests/' + ticketInfo.ticket.id;
    helpCenterItems.push(createPermaLinkInputField(permalinkHREF));
    generateFormField(propertyBox, 'lesa-ui-helpcenter', 'Help Center', helpCenterItems);
}
/**
 * Generate a URL to Patcher Portal's accounts view.
 */
function getPatcherPortalAccountsHREF(path, params) {
    var portletId = '1_WAR_osbpatcherportlet';
    var ns = '_' + portletId + '_';
    var queryString = Object.keys(params).map(function (key) { return (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + encodeURIComponent(params[key]); }).join('&');
    return 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts' + path + '?p_p_id=' + portletId + '&' + queryString;
}
/**
 * Retrieve the Liferay version from the sidebar.
 */
function getProductVersion(tags) {
    var propertyBoxes = getPropertyBoxes();
    for (var i = 0; i < propertyBoxes.length; i++) {
        var propertyBox = propertyBoxes[i];
        var parentElement = propertyBox.parentElement;
        var productVersionField = parentElement.querySelector('.custom_field_360006076471 div[data-garden-id="dropdowns.select"]');
        if (productVersionField) {
            var version = (productVersionField.textContent || '').trim();
            if (version.indexOf('7.') == 0) {
                return version;
            }
            if (version.indexOf('6.') == 0) {
                return '6.x';
            }
        }
    }
    for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];
        var x = tag.indexOf('7_');
        if (x == 0) {
            return '7.' + tag.charAt(2);
        }
        x = tag.indexOf('_7_');
        if (x != -1) {
            return '7.' + tag.charAt(x + 3);
        }
    }
    return '';
}
/**
 * Convert the Liferay version into the Patcher Portal product version.
 */
function getProductVersionId(version) {
    if (version == '7.4') {
        return '206111201';
    }
    if (version == '7.3') {
        return '175004848';
    }
    if (version == '7.2') {
        return '130051253';
    }
    if (version == '7.1') {
        return '102311424';
    }
    if (version == '7.0') {
        return '101625504';
    }
    if (version == '6.x') {
        return '101625503';
    }
    return '';
}
/**
 * Add the Patcher Portal field to the sidebar, which will contain two links to
 * the customer's builds in Patcher Portal.
 */
function addPatcherPortalField(propertyBox, ticketId, ticketInfo) {
    var accountCode = getAccountCode(ticketId, ticketInfo, propertyBox);
    var patcherPortalItems = [];
    if (accountCode) {
        var allBuildsLinkHREF = getPatcherPortalAccountsHREF('', {
            'accountEntryCode': accountCode
        });
        patcherPortalItems.push(createAnchorTag('All Builds', allBuildsLinkHREF));
        var version = getProductVersion(ticketInfo.ticket && ticketInfo.ticket.tags ? ticketInfo.ticket.tags : []);
        if (version) {
            var versionBuildsLinkHREF = getPatcherPortalAccountsHREF('/view', {
                'patcherBuildAccountEntryCode': accountCode,
                'patcherProductVersionId': getProductVersionId(version)
            });
            patcherPortalItems.push(createAnchorTag(version + ' Builds', versionBuildsLinkHREF));
        }
    }
    else {
        patcherPortalItems.push(document.createTextNode('N/A'));
    }
    generateFormField(propertyBox, 'lesa-ui-patcher', 'Patcher Portal', patcherPortalItems);
}
/**
 * Add the Linked JIRA Issues field to the sidebar, which will contain a link to
 * the relevant JIRA tickets.
 */
function addJIRASearchField(propertyBox, ticketId) {
    var jiraSearchLinkContainer = document.createElement('div');
    jiraSearchLinkContainer.appendChild(getJiraSearchLink('Linked Issues', ticketId));
    var jiraSearchItems = [jiraSearchLinkContainer];
    generateFormField(propertyBox, 'lesa-ui-jirasearch', 'JIRA Search', jiraSearchItems);
}
function hideSidebarSelectOption(parentElement, hiddenMenuItemTexts) {
    var menu = parentElement.querySelector('ul[data-garden-id="dropdowns.menu"]');
    if (menu == null) {
        setTimeout(hideSidebarSelectOption.bind(null, parentElement, hiddenMenuItemTexts), 500);
        return;
    }
    var menuItems = Array.from(menu.querySelectorAll('li'));
    var menuItemCount = menuItems.length;
    for (var i = 0; i < menuItems.length; i++) {
        var menuItemText = (menuItems[i].textContent || '').trim();
        if (hiddenMenuItemTexts.has(menuItemText)) {
            menuItems[i].style.display = 'none';
            --menuItemCount;
        }
    }
    var menuParentElement = menu.parentElement;
    var spacerElement = menuParentElement.querySelector('div');
    spacerElement.style.height = (menuItemCount * 36) + 'px';
}
/**
 * Hide certain select options that we don't want users to select.
 */
function hideSidebarSelectOptions(propertyBox, ticketId, ticketInfo) {
    var workspaceElement = propertyBox.closest('.workspace');
    var longTermResolutionButton = workspaceElement.querySelector('.custom_field_360013378112');
    if (longTermResolutionButton) {
        longTermResolutionButton.onclick = hideSidebarSelectOption.bind(null, longTermResolutionButton, new Set(['Partner Audit']));
    }
}
/**
 * Make tags in the sidebar clickable, so we can easily find tickets
 * with similar tags.
 */
function checkSidebarTags() {
    var spans = Array.from(document.querySelectorAll('.tags span'));
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        if (span.querySelector('a') || !span.textContent) {
            continue;
        }
        var href = 'https://' + document.location.host + '/agent/search/1?q=' + encodeURIComponent('tags:' + span.textContent);
        span.innerHTML = '<a href="' + href + '" title="tags:' + span.textContent.replace(/"/, '&quot;') + '" target="_blank">' + span.textContent + '</a>';
    }
}
function getPropertyBoxes(ticketId) {
    var propertyBoxes = Array.from(document.querySelectorAll('.property_box'));
    var visiblePropertyBoxes = propertyBoxes.filter(function (it) {
        var workspaceElement = it.closest('.workspace');
        return workspaceElement && workspaceElement.style.display != 'none';
    });
    if (ticketId) {
        return visiblePropertyBoxes.filter(function (it) { return it.getAttribute('data-ticket-id') != ticketId; });
    }
    return visiblePropertyBoxes;
}
/**
 * Update the sidebar with any ticket details we can pull from the ZenDesk API.
 */
function updateSidebarBoxContainer(ticketId, ticketInfo) {
    var propertyBoxes = getPropertyBoxes(ticketId);
    if (propertyBoxes.length == 0) {
        return;
    }
    for (var i = 0; i < propertyBoxes.length; i++) {
        addOrganizationField(propertyBoxes[i], ticketId, ticketInfo);
        addJIRASearchField(propertyBoxes[i], ticketId);
        addPatcherPortalField(propertyBoxes[i], ticketId, ticketInfo);
        hideSidebarSelectOptions(propertyBoxes[i], ticketId, ticketInfo);
    }
}
/**
 * Generate a Blob URL, and remember it so that we can unload it if we
 * navigate away from the page.
 */
var blobURLs = [];
function createObjectURL(blob) {
    var blobURL = URL.createObjectURL(blob);
    blobURLs.push(blobURL);
    return blobURL;
}
/**
 * Unload any generated Blob URLs that we remember.
 */
function revokeObjectURLs() {
    for (var i = 0; i < blobURLs.length; i++) {
        URL.revokeObjectURL(blobURLs[i]);
    }
    blobURLs.splice(0, blobURLs.length);
}
/**
 * Download the attachment mentioned in the specified link, and then invoke a callback
 * once the download has completed.
 */
function downloadAttachment(checkbox, callback) {
    var href = checkbox.getAttribute('data-href');
    var download = checkbox.getAttribute('data-download');
    var link = document.querySelector('.lesa-ui-attachment-info a[data-href="' + href + '"]');
    link.classList.add('downloading');
    downloadFile(href, download, function (blob) {
        link.classList.remove('downloading');
        callback(download, blob);
    });
}
/**
 * Generate a single object representing the metadata for the attachment.
 */
function extractAttachmentLinkMetadata(attachmentLink) {
    var comment = attachmentLink.closest(isAgentWorkspace ? 'article' : 'div[data-comment-id]');
    // Since we're using the query string in order to determine the name (since the actual text
    // in the link has a truncated name), we need to decode the query string.
    var encodedFileName = attachmentLink.href.substring(attachmentLink.href.indexOf('?') + 6);
    encodedFileName = encodedFileName.replace(/\+/g, '%20');
    var attachmentFileName = decodeURIComponent(encodedFileName);
    var authorElement = comment.querySelector(isAgentWorkspace ? 'span[data-test-id="omni-log-item-sender"]' : 'div.actor .name');
    var timeElement = comment.querySelector('time');
    return {
        element: attachmentLink,
        text: attachmentFileName,
        href: attachmentLink.href,
        download: attachmentFileName,
        commentId: comment.getAttribute('data-comment-id'),
        author: authorElement.textContent,
        time: timeElement.title,
        timestamp: timeElement.getAttribute('datetime'),
        missingCorsHeader: false
    };
}
/**
 * Generate a single object representing the metadata for an external link.
 */
function extractExternalLinkMetadata(externalLink) {
    var comment = externalLink.closest(isAgentWorkspace ? 'article' : 'div[data-comment-id]');
    var authorElement = comment.querySelector(isAgentWorkspace ? 'span[data-test-id="omni-log-item-sender"]' : 'div.actor .name');
    var timeElement = comment.querySelector('time');
    // Since we're using the query string in order to determine the name (since the actual text
    // in the link has a truncated name), we need to decode the query string.
    return {
        element: externalLink,
        text: externalLink.textContent,
        href: externalLink.href,
        download: externalLink.textContent,
        commentId: comment.getAttribute('data-comment-id'),
        author: authorElement.textContent,
        time: timeElement.title,
        timestamp: timeElement.getAttribute('datetime'),
        missingCorsHeader: true
    };
}
function addAttachmentDate(container, attachment, oldDate) {
    var newDate = attachment.time;
    if (oldDate == newDate) {
        return newDate;
    }
    // Attach an author and a timestamp. We'll have the timestamp be a comment permalink, since
    // other parts in this script provide us with that functionality.
    var attachmentExtraInfo = document.createElement('div');
    attachmentExtraInfo.classList.add('lesa-ui-attachment-extra-info');
    attachmentExtraInfo.appendChild(document.createTextNode(attachment.author + ' on '));
    var attachmentCommentLink = createAnchorTag(newDate, null);
    attachmentCommentLink.classList.add('attachment-comment-link');
    attachmentCommentLink.onclick = highlightComment.bind(null, attachment.timestamp);
    attachmentExtraInfo.appendChild(attachmentCommentLink);
    container.appendChild(attachmentExtraInfo);
    return newDate;
}
/**
 * Generate a single row in the attachment table based on the provided link.
 */
function addAttachmentRow(container, attachment) {
    var attachmentCheckbox = document.createElement('input');
    attachmentCheckbox.setAttribute('type', 'checkbox');
    attachmentCheckbox.setAttribute('data-text', attachment.text);
    attachmentCheckbox.setAttribute('data-download', attachment.download);
    attachmentCheckbox.setAttribute('data-href', attachment.href);
    if (attachment.missingCorsHeader) {
        attachmentCheckbox.disabled = true;
        attachmentCheckbox.setAttribute('title', 'The domain where this attachment is hosted does not send proper CORS headers, so it is not eligible for bulk download.');
    }
    else {
        attachmentCheckbox.checked = true;
    }
    container.appendChild(attachmentCheckbox);
    var attachmentLink = createAnchorTag(attachment.text, null);
    attachmentLink.setAttribute('data-href', attachment.href);
    attachmentLink.classList.add('attachment');
    attachmentLink.onclick = function (e) {
        attachment.element.click();
    };
    var attachmentWrapper = document.createElement('span');
    attachmentWrapper.appendChild(attachmentLink);
    container.appendChild(attachmentWrapper);
}
/**
 * Generate a zip file containing all attachments for the specified ticket.
 */
function createAttachmentZip(ticketId, ticketInfo) {
    var instance = this;
    var attachmentLinks = Array.from(document.querySelectorAll('div[data-side-conversations-anchor-id="' + ticketId + '"] .lesa-ui-attachment-info input[type="checkbox"]'));
    var attachmentCount = 0;
    for (var i = 0; i < attachmentLinks.length; i++) {
        attachmentLinks[i].disabled = true;
        if (attachmentLinks[i].checked) {
            ++attachmentCount;
        }
    }
    if (attachmentCount == 0) {
        return;
    }
    instance.classList.add('downloading');
    var downloadCount = 0;
    var zip = new JSZip();
    for (var i = 0; i < attachmentLinks.length; i++) {
        if (!attachmentLinks[i].checked) {
            continue;
        }
        downloadAttachment(attachmentLinks[i], function (fileName, blob) {
            if (blob) {
                zip.file(fileName, blob);
            }
            if (++downloadCount < attachmentCount) {
                return;
            }
            instance.classList.remove('downloading');
            instance.classList.add('generating');
            zip.generateAsync({
                type: 'blob'
            }).then(function (blob) {
                var accountCode = getAccountCode(ticketId, ticketInfo) || 'UNKNOWN';
                var zipFileName = accountCode + '.zendesk-' + ticketId + '.zip';
                var downloadLink = createAnchorTag('Download ' + zipFileName, URL.createObjectURL(blob), zipFileName);
                downloadLink.classList.add('.lesa-ui-attachments-download-blob');
                var parentElement = instance.parentElement;
                parentElement.replaceChild(downloadLink, instance);
            });
        });
    }
}
/**
 * Function to check if this is a large attachment, since those cannot be automatically
 * included in attachment .zip files due to CORS policies.
 */
function isLiferayLargeAttachment(anchor) {
    return anchor.href.indexOf('ticketAttachmentId') != -1;
}
/**
 * Create a container to hold all of the attachments in the ticket, and a convenience
 * link which allows the user to download all of the selected attachments at once.
 */
function createAttachmentsContainer(ticketId, ticketInfo, conversation) {
    var attachmentLinks = Array.from(conversation.querySelectorAll('a.attachment'));
    var attachmentThumbnails = Array.from(conversation.querySelectorAll('a[data-test-id="attachment-thumbnail"]'));
    var externalLinks = Array.from(conversation.querySelectorAll((isAgentWorkspace ? '' : '.is-public ') + '.zd-comment > a:not(.attachment)'));
    externalLinks = externalLinks.filter(isLiferayLargeAttachment);
    if (attachmentLinks.length + attachmentThumbnails.length + externalLinks.length == 0) {
        return null;
    }
    var attachmentsContainer = document.createElement('div');
    attachmentsContainer.classList.add('lesa-ui-attachments');
    if (!isAgentWorkspace) {
        var attachmentsLabel = document.createElement('div');
        attachmentsLabel.classList.add('lesa-ui-attachments-label');
        attachmentsLabel.innerHTML = 'Attachments:';
        attachmentsContainer.appendChild(attachmentsLabel);
    }
    // Accumulate the attachments, and then sort them by date
    var attachments = attachmentLinks.map(extractAttachmentLinkMetadata).
        concat(attachmentThumbnails.map(extractAttachmentLinkMetadata)).
        concat(externalLinks.map(extractExternalLinkMetadata));
    attachments.sort(function (a, b) {
        return a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 :
            a.text > b.text ? 1 : a.text < b.text ? -1 : 0;
    });
    // Generate the table and a 'bulk download' link for convenience
    var attachmentInfo = document.createElement('div');
    attachmentInfo.classList.add('lesa-ui-attachment-info');
    var oldDate = null;
    for (var i = 0; i < attachments.length; i++) {
        oldDate = addAttachmentDate(attachmentInfo, attachments[i], oldDate);
        addAttachmentRow(attachmentInfo, attachments[i]);
    }
    attachmentsContainer.appendChild(attachmentInfo);
    if (JSZip) {
        var downloadAllContainer = document.createElement('div');
        downloadAllContainer.classList.add('lesa-ui-attachments-bulk-download');
        var attachmentsZipLink = createAnchorTag('Generate Bulk Download', null);
        attachmentsZipLink.onclick = createAttachmentZip.bind(attachmentsZipLink, ticketId, ticketInfo);
        downloadAllContainer.appendChild(attachmentsZipLink);
        attachmentsContainer.appendChild(downloadAllContainer);
    }
    return attachmentsContainer;
}
var CUSTOM_FIELD_CHILD_OF = 360013377052;
/**
 * Add a sort button.
 */
function addSortButton(conversation, header) {
    var button = document.createElement('button');
    button.setAttribute('data-test-id', 'comment-sort');
    var sort = getCookieValue('_lesa-ui-comment-sort') || 'asc';
    button.textContent = sort;
    var conversationLog = conversation.querySelector('div[data-test-id="omni-log-container"]');
    var buttons = header.children[1];
    button.onclick = function () {
        if (conversationLog.style.flexDirection == 'column') {
            conversationLog.style.flexDirection = 'column-reverse';
            button.textContent = 'desc';
            document.cookie = '_lesa-ui-comment-sort=desc';
        }
        else {
            conversationLog.style.flexDirection = 'column';
            button.textContent = 'asc';
            document.cookie = '_lesa-ui-comment-sort=asc';
        }
    };
    buttons.prepend(button);
}
/**
 * Replaces the input field for the 'subject' with something with line wrapping
 * so that we can see the entire subject (untruncated).
 */
function addSubjectTextWrap(header, ticketId, ticketInfo) {
    var oldSubjectField = header.querySelector('input[data-test-id=ticket-pane-subject]');
    if (!oldSubjectField) {
        return;
    }
    oldSubjectField.setAttribute('type', 'hidden');
    var newSubjectField = header.querySelector('.lesa-ui-subject');
    if (newSubjectField) {
        if (newSubjectField.getAttribute('data-ticket-id') == ticketId) {
            return;
        }
        var parentElement = newSubjectField.parentElement;
        parentElement.removeChild(newSubjectField);
    }
    newSubjectField = document.createElement('div');
    var oldClassList = Array.from(oldSubjectField.classList);
    for (var i = 0; i < oldClassList.length; i++) {
        newSubjectField.classList.add(oldClassList[i]);
    }
    newSubjectField.textContent = oldSubjectField.value;
    if (!oldSubjectField.readOnly) {
        newSubjectField.setAttribute('contenteditable', 'true');
        newSubjectField.addEventListener('blur', function () {
            oldSubjectField.value = this.textContent || '';
            var event = document.createEvent('HTMLEvents');
            event.initEvent('blur', false, true);
            oldSubjectField.dispatchEvent(event);
        });
    }
    newSubjectField.classList.add('lesa-ui-subject');
    newSubjectField.setAttribute('data-ticket-id', ticketId);
    var parentElement = oldSubjectField.parentElement;
    parentElement.insertBefore(newSubjectField, oldSubjectField);
}
/**
 * Generate a knowledge capture container.
 */
function createKnowledgeCaptureContainer(ticketId, ticketInfo, conversation) {
    var fastTrackList = document.createElement('ul');
    if (ticketInfo.audits) {
        var knowledgeCaptureEvents = ticketInfo.audits.map(function (x) {
            return x.events.filter(function (x) {
                return x.type == 'KnowledgeCaptured';
            });
        }).reduce(function (array, x) {
            return array.concat(x);
        }, []);
        fastTrackList = knowledgeCaptureEvents.reduce(function (list, x) {
            var item = document.createElement('li');
            item.appendChild(createAnchorTag(x.body.article.title, x.body.article.html_url));
            list.appendChild(item);
            return list;
        }, fastTrackList);
    }
    var otherArticleList = document.createElement('ul');
    Array.from(conversation.querySelectorAll('a[href*="/hc/"]')).reduce(function (list, x) {
        var item = document.createElement('li');
        if (x.textContent != x.getAttribute('href')) {
            item.appendChild(document.createTextNode(x.textContent + ' - '));
        }
        var link = x.cloneNode(true);
        link.textContent = link.href;
        item.appendChild(link);
        list.appendChild(item);
        return list;
    }, otherArticleList);
    if ((otherArticleList.childNodes.length == 0) && (fastTrackList.childNodes.length == 0)) {
        return null;
    }
    var knowledgeCaptureContainer = document.createElement('div');
    knowledgeCaptureContainer.classList.add('lesa-ui-knowledge-capture');
    var fastTrackLabel = document.createElement('div');
    fastTrackLabel.classList.add('lesa-ui-knowledge-capture-label');
    fastTrackLabel.innerHTML = (fastTrackList.childNodes.length == 1) ? 'Fast Track Article:' : 'Fast Track Articles:';
    knowledgeCaptureContainer.appendChild(fastTrackLabel);
    if (fastTrackList.childNodes.length == 0) {
        var item = document.createElement('li');
        item.textContent = 'No matching articles.';
        fastTrackList.appendChild(item);
    }
    knowledgeCaptureContainer.appendChild(fastTrackList);
    if (otherArticleList.childNodes.length > 0) {
        var otherArticleLabel = document.createElement('div');
        otherArticleLabel.classList.add('lesa-ui-knowledge-capture-label');
        otherArticleLabel.innerHTML = (otherArticleList.childNodes.length == 1) ? 'Other Linked Article:' : 'Other Linked Articles:';
        knowledgeCaptureContainer.appendChild(otherArticleLabel);
        knowledgeCaptureContainer.appendChild(otherArticleList);
    }
    return knowledgeCaptureContainer;
}
/**
 * Sometimes CSEs post a dummy comment, which basically says "see comment above this one"
 * in order to preserve formatting when creating child tickets.
 */
function isDummyComment(ticketInfo, comment) {
    var childOf = getCustomFieldValue(ticketInfo, CUSTOM_FIELD_CHILD_OF);
    if (childOf == null || childOf.indexOf('child_of:') == -1) {
        return false;
    }
    var innerHTML = comment.innerHTML;
    if (innerHTML != comment.textContent) {
        return false;
    }
    if ((innerHTML.indexOf('(to maintain formatting)') != -1) ||
        (innerHTML.indexOf('(to retain formatting)') != -1) ||
        (innerHTML.indexOf('formatted comment'))) {
        return true;
    }
    return false;
}
/**
 * Returns the custom field value
 */
function getCustomFieldValue(ticketInfo, fieldId) {
    var matchingFields = ticketInfo.ticket.custom_fields.filter(function (it) { return it.id == fieldId; });
    return matchingFields.length == 0 ? null : matchingFields[0].value;
}
/**
 * Add a ticket description and a complete list of attachments to the top of the page.
 */
function addTicketDescription(ticketId, ticketInfo, conversation) {
    var header = null;
    if (isAgentWorkspace) {
        header = conversation.querySelector('div.omni-conversation-pane > div > div');
    }
    else {
        header = conversation.querySelector('.pane_header');
    }
    if (!header) {
        return;
    }
    // Check to see if we have any descriptions that we need to remove.
    if (isAgentWorkspace) {
        var oldLinks = conversation.querySelectorAll('.lesa-ui-modal-header-link');
        if (oldLinks.length > 0) {
            return;
        }
    }
    else {
        var oldDescriptions = conversation.querySelectorAll('.lesa-ui-description');
        var hasNewDescription = false;
        for (var i = 0; i < oldDescriptions.length; i++) {
            if (oldDescriptions[i].getAttribute('data-ticket-id') == ticketId) {
                hasNewDescription = true;
            }
            else {
                revokeObjectURLs();
                header.removeChild(oldDescriptions[i]);
            }
        }
        if (hasNewDescription) {
            return;
        }
    }
    // Add a marker indicating the LESA priority based on critical workflow rules
    addPriorityMarker(header, conversation, ticketId, ticketInfo);
    addSubjectTextWrap(header, ticketId, ticketInfo);
    // Generate something to hold all of our attachments.
    if (isAgentWorkspace) {
        addHeaderLinkModal('description-modal', 'Description', header, conversation, createDescriptionContainer.bind(null, ticketId, ticketInfo, conversation));
        addHeaderLinkModal('description-modal', 'Fast Track', header, conversation, createKnowledgeCaptureContainer.bind(null, ticketId, ticketInfo, conversation));
        addHeaderLinkModal('attachments-modal', 'Attachments', header, conversation, createAttachmentsContainer.bind(null, ticketId, ticketInfo, conversation));
        addSortButton(conversation, header);
    }
    else {
        var descriptionAncestor1 = document.createElement('div');
        descriptionAncestor1.classList.add('lesa-ui-description');
        descriptionAncestor1.classList.add('rich_text');
        descriptionAncestor1.setAttribute('data-ticket-id', ticketId);
        var descriptionContainer = createDescriptionContainer(ticketId, ticketInfo, conversation);
        if (descriptionContainer) {
            descriptionAncestor1.appendChild(descriptionContainer);
        }
        var knowledgeCaptureContainer = createKnowledgeCaptureContainer(ticketId, ticketInfo, conversation);
        if (knowledgeCaptureContainer) {
            descriptionAncestor1.appendChild(knowledgeCaptureContainer);
        }
        var attachmentsContainer = createAttachmentsContainer(ticketId, ticketInfo, conversation);
        if (attachmentsContainer) {
            descriptionAncestor1.appendChild(attachmentsContainer);
        }
        header.appendChild(descriptionAncestor1);
    }
}
function createDescriptionContainer(ticketId, ticketInfo, conversation) {
    var comments = conversation.querySelectorAll(isAgentWorkspace ? 'article' : '.event .zd-comment');
    if (comments.length == 0) {
        return null;
    }
    var descriptionContainer = document.createElement('div');
    descriptionContainer.classList.add('is-public');
    if (!isAgentWorkspace) {
        descriptionContainer.classList.add('event');
    }
    var tags = (ticketInfo && ticketInfo.ticket && ticketInfo.ticket.tags) || [];
    var tagSet = new Set(tags);
    if (tagSet.has('partner_first_line_support')) {
        var flsContainer = document.createElement('div');
        flsContainer.classList.add('event');
        var flsReminder = document.createElement('div');
        flsReminder.classList.add('comment');
        flsReminder.appendChild(document.createTextNode('REMINDER: '));
        flsReminder.appendChild(document.createTextNode('Additional description, error logs, etc. collected by the partner are available in '));
        flsReminder.appendChild(getJiraSearchLink('the linked FLS ticket', ticketId));
        flsReminder.appendChild(document.createTextNode('.'));
        flsContainer.appendChild(flsReminder);
        descriptionContainer.appendChild(flsContainer);
    }
    var firstComment = comments[isAgentWorkspace ? 0 : comments.length - 1];
    if (isDummyComment(ticketInfo, firstComment)) {
        firstComment = comments[isAgentWorkspace ? 1 : comments.length - 2];
    }
    var description = document.createElement('div');
    description.classList.add('comment');
    description.classList.add('zd-comment');
    description.innerHTML = firstComment.innerHTML;
    descriptionContainer.appendChild(description);
    return descriptionContainer;
}
/**
 * Recursively scan LPS tickets and LPE tickets, and replace any
 * plain text with HTML.
 */
var jiraTicketId = /([^/])(LP[EPS]-[0-9]+)/g;
var jiraTicketURL = /([^"])(https:\/\/issues\.liferay\.com\/browse\/)(LP[EPS]-[0-9]+)/g;
var jiraTicketIdLink = /<a [^>]*href="https:\/\/issues\.liferay\.com\/browse\/(LP[EPS]-[0-9]+)"[^>]*>\1<\/a>/g;
var jiraTicketURLLink = /<a [^>]*href="(https:\/\/issues\.liferay\.com\/browse\/)(LP[EPS]-[0-9]+)"[^>]*>\1\2<\/a>/g;
function addJiraLinksToElement(element) {
    var newHTML = element.innerHTML.replace(jiraTicketIdLink, '$1');
    newHTML = element.innerHTML.replace(jiraTicketURLLink, '$1$2');
    if (element.contentEditable == 'true') {
        newHTML = newHTML.replace(jiraTicketId, '$1<a href="https://issues.liferay.com/browse/$2">$2</a>');
        newHTML = newHTML.replace(jiraTicketURL, '$1<a href="$2$3">$2$3</a>');
    }
    else {
        newHTML = newHTML.replace(jiraTicketId, '$1<a href="https://issues.liferay.com/browse/$2" target="_blank">$2</a>');
        newHTML = newHTML.replace(jiraTicketURL, '$1<a href="$2$3" target="_blank">$2$3</a>');
    }
    if (element.innerHTML != newHTML) {
        element.innerHTML = newHTML;
    }
}
/**
 * Adds a button which loads a window which allows you to compose a
 * post with Markdown.
 */
function addReplyStackeditButton(element, callback) {
    var parentElement = element.parentElement;
    var grandparentElement = parentElement.parentElement;
    var list = grandparentElement.querySelector('.zendesk-editor--toolbar ul');
    if (list.querySelector('.lesa-ui-stackedit-icon')) {
        return;
    }
    var img = document.createElement('img');
    img.title = 'Compose with Stackedit';
    img.classList.add('lesa-ui-stackedit-icon');
    img.src = 'https://benweet.github.io/stackedit.js/icon.svg';
    var listItem = document.createElement('li');
    listItem.appendChild(img);
    listItem.onclick = composeWithStackedit.bind(null, element, callback);
    list.appendChild(listItem);
}
/**
 * Adds an underline button to the regular formatter.
 */
function addReplyUnderlineButton(element) {
    var parentElement = element.parentElement;
    var grandparentElement = parentElement.parentElement;
    var formattingButtons = grandparentElement.querySelector('.zendesk-editor--text-commands .zendesk-editor--group');
    if (formattingButtons.querySelector('.underline')) {
        return;
    }
    var underlineSVGPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    underlineSVGPath.setAttribute('fill', 'currentColor');
    underlineSVGPath.setAttribute('d', 'M11 7.5c0 2.5-1.4 3.8-3.9 3.8-2.6 0-4.1-1.2-4.1-3.8V1.2h1.3v6.3c0 1.8 1 2.7 2.7 2.7 1.7 0 2.6-.9 2.6-2.7V1.2H11v6.3zm-9 5.3v-.7h10v.7H2z');
    var underlineButtonIconContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    underlineButtonIconContainer.setAttribute('viewBox', '0 0 14 14');
    underlineButtonIconContainer.appendChild(underlineSVGPath);
    var underlineButton = document.createElement('button');
    underlineButton.setAttribute('type', 'button');
    underlineButton.classList.add('zendesk-editor--item', 'underline');
    underlineButton.setAttribute('data-command-name', 'underline');
    underlineButton.setAttribute('aria-label', 'Underline');
    underlineButton.setAttribute('data-editor-tooltip', 'Underline (ctrl u)');
    underlineButton.setAttribute('aria-pressed', 'false');
    underlineButton.setAttribute('aria-disabled', 'false');
    underlineButton.appendChild(underlineButtonIconContainer);
    var underlineButtonText = document.createElement('span');
    underlineButtonText.textContent = ('Underline');
    underlineButtonText.classList.add('zendesk-editor--accessible-hidden-text');
    underlineButton.appendChild(underlineButtonText);
    underlineButton.addEventListener('click', function (e) {
        document.execCommand('underline', false, undefined);
    });
    underlineButton.onmousedown = function (e) {
        e.stopPropagation();
        return false;
    };
    var underlineButtonListItem = document.createElement('li');
    underlineButtonListItem.appendChild(underlineButton);
    formattingButtons.appendChild(underlineButtonListItem);
}
/**
 * Add buttons which load windows that allow you to compose a post
 * with Markdown.
 */
function addReplyFormattingButtons(ticketId, ticketInfo, conversation) {
    if (conversation.classList.contains('lesa-ui-stackedit')) {
        return;
    }
    conversation.classList.add('lesa-ui-stackedit');
    var legacyComments = Array.from(conversation.querySelectorAll('.zendesk-editor--rich-text-container .zendesk-editor--rich-text-comment'));
    for (var i = 0; i < legacyComments.length; i++) {
        addReplyUnderlineButton(legacyComments[i]);
        addReplyStackeditButton(legacyComments[i], addJiraLinksToElement);
    }
    var workspaceComments = Array.from(conversation.querySelectorAll('div[data-test-id="editor-view"]'));
    for (var i = 0; i < workspaceComments.length; i++) {
        shrinkReplyEditor(conversation, workspaceComments[i]);
    }
}
/**
 * Allows you to compose a post with Markdown, even if we are still
 * configured to use Zendesk's WYSIWYG editor.
 */
var paragraphTag = /<(\/)?p>/g;
var turndownService = new TurndownService({
    codeBlockStyle: 'fenced'
});
function composeWithStackedit(element, callback) {
    var stackedit = new Stackedit();
    var preElements = Array.from(element.querySelectorAll('pre'));
    for (var i = 0; i < preElements.length; i++) {
        preElements[i].setAttribute('style', '');
        preElements[i].innerHTML = preElements[i].innerHTML.replace(paragraphTag, '<$1code>');
    }
    stackedit.openFile({
        content: {
            text: turndownService.turndown(element.innerHTML)
        }
    });
    stackedit.on('fileChange', function (file) {
        element.innerHTML = file.content.html;
        if (callback) {
            callback(element);
        }
    });
}
/**
 * Scan the ticket for LPS tickets and LPE tickets, and replace any
 * plain text with HTML.
 */
function addJiraLinks(ticketId, ticketInfo, conversation) {
    if (conversation.classList.contains('lesa-ui-jiralink')) {
        return;
    }
    conversation.classList.add('lesa-ui-jiralink');
    var comments = Array.from(conversation.querySelectorAll(isAgentWorkspace ? 'article' : 'div[data-comment-id]'));
    for (var i = 0; i < comments.length; i++) {
        var comment = comments[i].querySelector('div[data-test-id="omni-log-message-content"]');
        if (comment) {
            addJiraLinksToElement(comment);
        }
    }
}
/**
 * Add a playbook reminder to the given editor.
 */
function addPlaybookReminder(ticketId, ticketInfo, conversation) {
    var editor = conversation.querySelector(isAgentWorkspace ? 'div[data-test-id="omnicomposer-rich-text-ckeditor"]' : '.editor');
    if (!editor) {
        return;
    }
    var parentElement = editor.parentElement;
    var playbookReminderElement = parentElement.querySelector('.lesa-ui-playbook-reminder');
    if (playbookReminderElement) {
        if (ticketId == playbookReminderElement.getAttribute('data-ticket-id')) {
            return;
        }
    }
    else {
        playbookReminderElement = document.createElement('div');
        playbookReminderElement.setAttribute('data-ticket-id', ticketId);
        playbookReminderElement.classList.add('lesa-ui-playbook-reminder');
    }
    var reminders = [];
    var tags = (ticketInfo && ticketInfo.ticket && ticketInfo.ticket.tags) || [];
    var tagSet = new Set(tags);
    var subpriority = ticketInfo.ticket.priority || 'none';
    if (((subpriority == 'high') || (subpriority == 'urgent')) && tagSet.has('platinum')) {
        var criticalMarkers = ['production', 'production_completely_shutdown', 'production_severely_impacted_inoperable'].filter(Set.prototype.has.bind(tagSet));
        if (criticalMarkers.length >= 2) {
            reminders.push(['platinum critical', 'https://liferay.atlassian.net/wiki/spaces/SUPPORT/pages/2093908830/How+To+Handle+Critical+Tickets', 'playbook']);
        }
    }
    playbookReminderElement.innerHTML = reminders.map(function (x) { return 'This is a <strong>' + x[0] + '</strong> ticket. Please remember to follow the <a href="' + x[1] + '">' + x[2] + '</a> !'; }).join('<br/>');
    parentElement.insertBefore(playbookReminderElement, editor);
}
/**
 * Shrinks the reply editor.
 */
function shrinkReplyEditor(conversation, element) {
    var interval = setInterval(function () {
        if (!element.style.flexBasis) {
            return;
        }
        var editor = element.querySelector('div[data-test-id="ticket-rich-text-editor"]');
        if (!editor) {
            return;
        }
        if (!editor.textContent) {
            element.style.flexBasis = '10%';
        }
        clearInterval(interval);
    }, 1000);
}
;
/**
 * Removes the highlight class from all comments.
 */
function clearHighlightedComments() {
    var highlightedComments = document.querySelectorAll('.lesa-ui-event-highlighted');
    for (var i = 0; i < highlightedComments.length; i++) {
        highlightedComments[i].classList.remove('lesa-ui-event-highlighted');
    }
}
/**
 * Scroll to a specific comment if its comment ID is included in a
 * query string parameter.
 */
function highlightComment(conversation, ticketId, commentId) {
    if (!commentId && !document.location.search) {
        var logContainer = conversation.querySelector('div[data-test-id="omni-log-container"]');
        if (logContainer && logContainer.getAttribute('data-sort-ticket-id') != ticketId) {
            var sortedComments = document.querySelectorAll('div[data-sort-ticket-id]');
            for (var i = 0; i < sortedComments.length; i++) {
                sortedComments[i].removeAttribute('data-sort-ticket-id');
            }
            var sort = getCookieValue('_lesa-ui-comment-sort') || 'asc';
            logContainer.style.flexDirection = (sort == 'asc') ? 'column' : 'column-reverse';
            var event = conversation.querySelector('div[id^="convo_log_sentinel_"]');
            event.scrollIntoView();
            logContainer.setAttribute('data-sort-ticket-id', ticketId);
        }
        clearHighlightedComments();
        return;
    }
    if (!commentId && document.location.search && document.location.search.indexOf('?comment=') == 0) {
        commentId = document.location.search.substring('?comment='.length);
        var pos = commentId.indexOf('&');
        if (pos != -1) {
            commentId = commentId.substring(0, pos);
        }
    }
    if (!commentId || (commentId.indexOf('"') != -1)) {
        return;
    }
    var comment = document.querySelector('time[datetime="' + commentId + '"], div[data-comment-id="' + commentId + '"]');
    if (!comment) {
        var showMoreButton = document.querySelector('button[data-test-id="convolog-show-more-button"]');
        if (showMoreButton) {
            showMoreButton.click();
        }
        return;
    }
    var event = comment.closest(isAgentWorkspace ? 'article' : '.event');
    if (event.classList.contains('lesa-ui-event-highlighted')) {
        return;
    }
    var commentURL = 'https://' + document.location.host + document.location.pathname + '?comment=' + commentId;
    history.pushState({ path: commentURL }, '', commentURL);
    clearHighlightedComments();
    event.classList.add('lesa-ui-event-highlighted');
    setTimeout(function () {
        event.scrollIntoView();
    }, 1000);
}
/**
 * Creates a self-highlighting input field.
 */
function createPermaLinkInputField(permalinkHREF) {
    var permalink = document.createElement('input');
    permalink.value = permalinkHREF;
    permalink.onclick = function () {
        permalink.setSelectionRange(0, permalink.value.length);
    };
    return permalink;
}
/**
 * Add the comment ID as a query string parameter to function as a
 * pseudo permalink (since this script scrolls to it).
 */
function addPermaLinks(ticketId, ticketInfo, conversation) {
    var comments = conversation.querySelectorAll(isAgentWorkspace ? 'article' : 'div[data-comment-id]');
    var isPublicTab = !isAgentWorkspace && document.querySelector('.publicConversation.is-selected');
    for (var i = 0; i < comments.length; i++) {
        var timeElement = comments[i].querySelector('time');
        if (!timeElement) {
            continue;
        }
        var commentHeader = null;
        if (isAgentWorkspace) {
            var actionsElement = comments[i].querySelector('.omnilog-header-actions');
            commentHeader = actionsElement.parentElement;
        }
        else {
            commentHeader = comments[i].querySelector('.content .header');
        }
        if (!commentHeader) {
            continue;
        }
        if (isAgentWorkspace) {
            var parentElement = commentHeader.parentElement;
            if (parentElement.querySelector('.lesa-ui-permalink')) {
                continue;
            }
        }
        else {
            if (commentHeader.querySelector('.lesa-ui-permalink')) {
                continue;
            }
        }
        var commentId = timeElement.getAttribute('datetime');
        var permalinkContainer = document.createElement('div');
        permalinkContainer.classList.add('lesa-ui-permalink');
        var permalinkHREF = 'https://' + document.location.host + document.location.pathname + '?comment=' + commentId;
        if (isPublicTab) {
            var pageId = Math.ceil((comments.length - i) / 30);
            permalinkHREF = 'https://help.liferay.com/hc/requests/' + ticketId + '?page=' + pageId + '#request_comment_' + commentId;
        }
        var permalink = createPermaLinkInputField(permalinkHREF);
        permalinkContainer.appendChild(permalink);
        if (isAgentWorkspace) {
            commentHeader.after(permalinkContainer);
        }
        else {
            commentHeader.appendChild(permalinkContainer);
        }
    }
}
/**
 * Attempt to bypass the single page application framework used by
 * ZenDesk and force a page reload.
 */
function skipSinglePageApplication(href) {
    document.location.href = href;
    return false;
}
/**
 * If it's a regular ZenDesk link, fix it by making the anchor's onclick
 * event scroll to the comment (if applicable).
 */
function fixZenDeskLink(conversation, anchor, ticketId) {
    var href = anchor.href;
    var x = href.indexOf('/tickets/');
    if (x == -1) {
        return;
    }
    var y = href.indexOf('?comment=');
    if (y == -1) {
        return;
    }
    anchor.removeAttribute('href');
    if (href.substring(x + '?comment='.length, y) == ticketId) {
        var commentId = href.substring(y + '?comment='.length);
        anchor.onclick = highlightComment.bind(null, conversation, ticketId, commentId);
    }
    else {
        var commentURL = 'https://' + document.location.host + '/agent' + href.substring(x);
        anchor.onclick = skipSinglePageApplication.bind(null, commentURL);
    }
}
/**
 * If it's a Liferay HelpCenter link, fix it by massaging it so that it
 * behaves like we want a ZenDesk link to behave.
 */
function fixHelpCenterLink(conversation, anchor, ticketId) {
    var href = anchor.href;
    var x = href.indexOf('https://help.liferay.com/hc/');
    if (x != 0) {
        return;
    }
    var y = href.indexOf('/requests/');
    if (y == -1) {
        return;
    }
    var z = href.indexOf('?comment=');
    var commentId = null;
    if (z != -1) {
        commentId = href.substring(z + '?comment='.length);
    }
    else {
        z = href.indexOf('#request_comment_');
        if (z != -1) {
            commentId = href.substring(z + '#request_comment_'.length);
        }
    }
    if (!commentId) {
        return;
    }
    var commentURL = 'https://' + document.location.host + '/agent/tickets/' + ticketId + '?commentId=' + commentId;
    anchor.removeAttribute('href');
    var linkTicketId = href.substring(y + '/requests/'.length, Math.min(href.indexOf('?'), z));
    if (linkTicketId == ticketId) {
        anchor.onclick = highlightComment.bind(null, conversation, ticketId, commentId);
    }
    else {
        anchor.onclick = skipSinglePageApplication.bind(null, commentURL);
    }
}
/**
 * Detect any existing permalinks on the page, and make them open in
 * a new tab (if they are an existing ticket) or auto-scroll.
 */
function fixPermaLinkAnchors(ticketId, ticketInfo, conversation) {
    var permalinks = conversation.querySelectorAll(isAgentWorkspace ? 'article div.lesa-ui-permalink' : 'div[data-comment-id] div.lesa-ui-permalink');
    if (permalinks.length > 0) {
        return;
    }
    var anchors = conversation.querySelectorAll('a');
    for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];
        fixZenDeskLink(conversation, anchor, ticketId);
        fixHelpCenterLink(conversation, anchor, ticketId);
    }
}
function initializeModal(conversation, contentWrapper, callback) {
    var content = callback();
    var loadingElement = contentWrapper.querySelector('.loading');
    if (content == null) {
        var showMoreButton = document.querySelector('button[data-test-id="convolog-show-more-button"]');
        if (showMoreButton) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.classList.add('loading');
                contentWrapper.appendChild(loadingElement);
            }
            var commentCount = conversation.querySelectorAll('article').length;
            loadingElement.innerHTML = 'Loading older comments (' + commentCount + ' loaded so far)...';
            contentWrapper.appendChild(loadingElement);
            showMoreButton.click();
            setTimeout(initializeModal.bind(null, conversation, contentWrapper, callback), 500);
            return;
        }
        if (document.querySelector('[role="progressbar"]')) {
            setTimeout(initializeModal.bind(null, conversation, contentWrapper, callback), 500);
            return;
        }
        content = document.createElement('div');
        content.appendChild(document.createTextNode('No data found.'));
    }
    content.classList.add('app_view', 'apps_modal');
    if (loadingElement) {
        loadingElement.remove();
    }
    contentWrapper.appendChild(content);
}
function createModal(modalId, linkText, header, conversation, callback) {
    var modal = document.createElement('div');
    modal.setAttribute('id', modalId);
    modal.classList.add('modal', 'modal-resizable', 'in');
    var iframe = document.createElement('div');
    iframe.classList.add('iframe_app_view_wrapper');
    var modalHeader = document.createElement('header');
    modalHeader.classList.add('modal-header');
    var closeLink = document.createElement('a');
    closeLink.classList.add('close');
    closeLink.textContent = '\u00d7';
    closeLink.onclick = function () {
        modal.remove();
    };
    modalHeader.appendChild(closeLink);
    var headerText = document.createElement('h3');
    headerText.textContent = linkText;
    modalHeader.appendChild(headerText);
    iframe.appendChild(modalHeader);
    modal.appendChild(iframe);
    header.after(modal);
    var contentWrapper = document.createElement('div');
    contentWrapper.classList.add('modal-body', 'app_view_wrapper');
    iframe.appendChild(contentWrapper);
    initializeModal(conversation, contentWrapper, callback);
}
function addHeaderLinkModal(modalId, linkText, header, conversation, callback) {
    var openLink = document.createElement('a');
    openLink.textContent = linkText;
    openLink.onclick = createModal.bind(null, modalId, linkText, header, conversation, callback);
    var viaLabel = conversation.querySelector('div[data-test-id="omni-header-via-label"]');
    var divider = document.createElement('div');
    divider.classList.add('Divider-sc-2k6bz0-9', 'fNgWaW', 'lesa-ui-modal-header-link');
    viaLabel.before(divider);
    divider.before(openLink);
}
function makeDraggableModals() {
    var headers = document.querySelectorAll(".modal-header");
    for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        var element = header.closest('.modal');
        if (element.getAttribute('draggable')) {
            continue;
        }
        makeDraggableModal(header, element);
    }
}
function moveModal(element, dragEvent, dropEvent) {
    var rect = element.getBoundingClientRect();
    var elementX = rect.left + (unsafeWindow.pageXOffset || document.documentElement.scrollLeft);
    var elementY = rect.top + (unsafeWindow.pageYOffset || document.documentElement.scrollTop);
    element.style.transform = 'translate(0px, 0px)';
    element.style.left = (dropEvent.clientX - dragEvent.clientX + elementX) + 'px';
    element.style.top = (dropEvent.clientY - dragEvent.clientY + elementY) + 'px';
}
function makeDraggableModal(header, element) {
    element.setAttribute('draggable', 'true');
    var dragEvent = null;
    element.addEventListener('dragstart', function (e) {
        dragEvent = e;
    });
    element.addEventListener('dragend', function (e) {
        moveModal(element, dragEvent, e);
    });
}
/**
 * Workaround for interacting with input fields built by react.js
 * https://github.com/facebook/react/issues/10135#issuecomment-314441175
 */
function setReactInputValue(selector, value, callback) {
    var element = document.querySelector(selector);
    if (!element) {
        setTimeout(setReactInputValue.bind(null, selector, value, callback), 100);
        return;
    }
    // Format dates like React datepickers expect.
    if (value instanceof Date) {
        var mm = value.getMonth() + 1;
        var mmString = (mm < 10) ? '0' + mm : mm;
        var dd = value.getDate();
        var ddString = (dd < 10) ? '0' + dd : dd;
        var yyyy = value.getFullYear();
        value = mmString + '/' + ddString + '/' + yyyy;
    }
    // Make sure to call the right setter function so the underlying state is updated.
    var elementDescriptor = Object.getOwnPropertyDescriptor(element, 'value');
    var valueSetter = elementDescriptor && elementDescriptor.set;
    var prototype = Object.getPrototypeOf(element);
    var prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    var prototypeValueSetter = null;
    if (prototypeDescriptor) {
        var valueDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        prototypeValueSetter = valueDescriptor.set;
    }
    if (prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
    }
    else if (valueSetter) {
        valueSetter.call(element, value);
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    if (callback) {
        callback();
    }
}
/**
 * Utility method to simulate clicking on a drop-down select, entering
 * text into a search field, waiting for the results to populate, and
 * then selecting everything that matches.
 */
function setReactSearchSelectValue(testId, value, callback) {
    function requestPopup(callback) {
        var buttonField = document.querySelector('div[data-test-id=' + testId + ']');
        if (!buttonField) {
            setTimeout(requestPopup.bind(null, callback), 100);
            return;
        }
        if (!buttonField.querySelector('div[aria-haspopup=true]')) {
            var button = buttonField.querySelector('div[role=button]');
            button.click();
        }
        if (callback) {
            callback();
        }
    }
    function waitForPopup(callback) {
        var searchMenu = document.querySelector('div[data-test-id=' + testId + '-list]');
        if (!searchMenu) {
            setTimeout(waitForPopup.bind(null, callback), 100);
            return;
        }
        var options = Array.from(searchMenu.querySelectorAll('div[class*="optionText"]'));
        if (options.length == 0) {
            setTimeout(waitForPopup.bind(null, callback), 100);
            return;
        }
        if (callback) {
            callback();
        }
    }
    function setPopupValue(callback) {
        function clickSearchMenuOptions() {
            var searchMenu = document.querySelector('div[data-test-id=' + testId + '-list]');
            if (!searchMenu) {
                setTimeout(clickSearchMenuOptions, 100);
                return;
            }
            var options = Array.from(searchMenu.querySelectorAll('div[class*="optionText"]'));
            if (options.length != 1) {
                setTimeout(clickSearchMenuOptions, 100);
                return;
            }
            for (var i = 0; i < options.length; i++) {
                options[i].click();
            }
            if (callback) {
                callback();
            }
        }
        ;
        setReactInputValue('input[data-test-id=' + testId + '-search]', value, clickSearchMenuOptions);
    }
    var callOrder = [requestPopup, waitForPopup, setPopupValue];
    var nestedFunction = callOrder.reverse().reduce(function (accumulator, x) { return x.bind(null, accumulator); }, callback);
    nestedFunction();
}
/**
 * Utility method to add a new value to a list of tag-like values. Similar to the
 * search select value, except the search fields are less elaborate.
 */
function addReactLabelValue(testId, value, callback) {
    var buttonField = document.querySelector('div[data-test-id=' + testId + ']');
    var button = buttonField.querySelector('input');
    button.focus();
    function clickSearchMenuOptions() {
        var searchMenu = document.querySelector('div[class*="ssc-scrollable"]');
        if (!searchMenu) {
            setTimeout(clickSearchMenuOptions, 100);
            return;
        }
        var options = Array.from(searchMenu.querySelectorAll('div[role=menuitem]'));
        if (options.length == 0) {
            setTimeout(clickSearchMenuOptions, 100);
            return;
        }
        for (var i = 0; i < options.length; i++) {
            options[i].click();
        }
        if (callback) {
            callback();
        }
    }
    setReactInputValue('div[data-test-id=' + testId + '] input', value, clickSearchMenuOptions);
}
/**
 * Utility function which adds all the listed labels, and then invokes
 * the listed callback.
 */
function addReactLabelValues(testId, values, callback) {
    var nestedFunction = values.reverse().reduce(function (accumulator, x) { return addReactLabelValue.bind(null, testId, x, accumulator); }, callback);
    nestedFunction();
}
/**
 * Retrieve the support offices based on the JIRA ticket.
 */
function getSupportOffices(assigneeGroup) {
    var supportOffices = [];
    if (assigneeGroup.indexOf('- AU') != -1) {
        supportOffices.push('APAC');
        supportOffices.push('AU/NZ');
    }
    if (assigneeGroup.indexOf('- BR') != -1) {
        supportOffices.push('Brazil');
    }
    if (assigneeGroup.indexOf('- CN') != -1) {
        supportOffices.push('APAC');
    }
    if (assigneeGroup.indexOf('- HU') != -1) {
        supportOffices.push('EU');
    }
    if (assigneeGroup.indexOf('- IN') != -1) {
        supportOffices.push('India');
    }
    if (assigneeGroup.indexOf('- JP') != -1) {
        supportOffices.push('Japan');
    }
    if ((assigneeGroup.indexOf('Spain Pod') == 0) || (assigneeGroup.indexOf(' - ES') != -1)) {
        supportOffices.push('Spain');
    }
    if (assigneeGroup.indexOf(' - US') != -1) {
        supportOffices.push('US');
    }
    return new Set(supportOffices);
}
/**
 * Set the initial values for the "Create Issue" modal dialog window
 * after the fields have initialized.
 */
function initJiraTicketValues(data) {
    var ticket = data['ticket'];
    var productVersion = data['ticket.customField:custom_field_360006076471'];
    function setProjectId(callback) {
        setReactSearchSelectValue('projectId', 'LPP', callback);
    }
    function setSummary(callback) {
        setReactInputValue('input[data-test-id=summary]', ticket.subject, callback);
    }
    function setCustomerTicketCreationDate(callback) {
        setReactInputValue('span[data-test-id=customfield_11126] input', new Date(ticket.createdAt), callback);
    }
    function setSupportOffice(callback) {
        var assigneeGroup = ticket.assignee.group.name;
        var supportOffices = Array.from(getSupportOffices(assigneeGroup));
        addReactLabelValues('customfield_11523', supportOffices, callback);
    }
    function setAffectsVersion(callback) {
        var value = (productVersion.indexOf('7_0') != -1) ? '7.0.10' :
            (productVersion.indexOf('7_1') != -1) ? '7.1.10' :
                (productVersion.indexOf('7_2') != -1) ? '7.2.10' :
                    (productVersion.indexOf('7_3') != -1) ? '7.3.10' :
                        (productVersion.indexOf('7_4') != -1) ? '7.4.13' :
                            null;
        if (value) {
            addReactLabelValue('versions', value, callback);
        }
        else if (callback) {
            callback();
        }
    }
    function setDeliveryBaseFixPack(callback) {
        var conversations = ticket.conversation;
        var baselines = new Set();
        for (var i = 0; i < conversations.length; i++) {
            var conversationText = conversations[i].value;
            var baselineRegExp = /(de|dxp)-[0-9][0-9]*/gi;
            var matcher = null;
            while (matcher = baselineRegExp.exec(conversationText)) {
                baselines.add(matcher[0].toUpperCase());
            }
        }
        var versionNumber = (productVersion.indexOf('7_0') != -1) ? '7010' :
            (productVersion.indexOf('7_1') != -1) ? '7110' :
                (productVersion.indexOf('7_2') != -1) ? '7210' : null;
        setReactInputValue('input[data-test-id=customfield_22551]', Array.from(baselines).join(' '), callback);
    }
    function focusSummary(callback) {
        var summary = document.querySelector('input[data-test-id=summary]');
        summary.focus();
        var app = document.getElementById('app');
        app.scrollIntoView();
        if (callback) {
            callback();
        }
    }
    var callOrder = [setProjectId, setSummary, setCustomerTicketCreationDate, setSupportOffice, setAffectsVersion, setDeliveryBaseFixPack, focusSummary];
    var nestedFunction = callOrder.reverse().reduce(function (accumulator, x) { return x.bind(null, accumulator); });
    nestedFunction();
}
/**
 * Attach a click listener to the copyFieldsLink element to populate
 * the JIRA ticket fields.
 */
function attachCopyFieldsLinkListener(client, parentClient) {
    var copyFieldsLink = document.querySelector('div[class*="copyFieldsLink"]');
    if (copyFieldsLink) {
        parentClient.get(['currentUser', 'ticket', 'ticket.customField:custom_field_360006076471']).then(initJiraTicketValues);
    }
    else {
        setTimeout(attachCopyFieldsLinkListener.bind(null, client, parentClient), 1000);
    }
}
/**
 * Attempt to initialize the ZAF parent client instance using a
 * registered ZAF client instance.
 */
function initZafParentClient(client, callback) {
    var parentGuid = document.location.hash.substring('#parentGuid='.length);
    var parentClient = client.instance(parentGuid);
    callback(client, parentClient);
}
/**
 * Attempt to initialize the ZAF client instance, then initialize the
 * ZAF parent client instance so we can retrieve ticket metadata.
 */
function initZafClient(callback) {
    if (!unsafeWindow.ZAFClient) {
        setTimeout(initZafClient.bind(null, callback), 1000);
        return;
    }
    var client = unsafeWindow.ZAFClient.init();
    client.on('app.registered', initZafParentClient.bind(null, client, callback));
}
function detachModalWindowHandler() {
    var backdrop = document.querySelector('.modal-backdrop.in');
    if (!backdrop) {
        return;
    }
    jQuery(backdrop).unbind('click');
}
if (unsafeWindow.location.hostname == '24475.apps.zdusercontent.com') {
    setTimeout(initZafClient.bind(null, attachCopyFieldsLinkListener), 3000);
}
else {
    setInterval(detachModalWindowHandler, 1000);
}
function addArticleCodeButton(toolbar, tinymce) {
    // Creates the code format container button
    var codeFormatButton = document.createElement('div');
    codeFormatButton.classList.add('ssc-view-3d4f1d68', 'src-components-EditorToolbar-ToolbarButton---button---2IfvR');
    codeFormatButton.setAttribute('tabindex', '0');
    codeFormatButton.setAttribute('role', 'button');
    codeFormatButton.setAttribute('id', 'custom-code-format-button');
    codeFormatButton.setAttribute('data-test-id', 'toolbarCodeFormatButton');
    // Creates the code format label
    var codeFormatLabel = document.createElement('div');
    codeFormatLabel.classList.add('src-components-EditorToolbar-ToolbarButton---label---PACxZ');
    codeFormatLabel.setAttribute('title', 'Code Format');
    // Creates the code format icon
    var codeFormatIcon = document.createElement('img');
    codeFormatIcon.setAttribute('src', 'https://www.tiny.cloud/docs/images/icons/code-sample.svg'); // Icon taken from https://www.tiny.cloud/docs/advanced/editor-icon-identifiers/
    codeFormatIcon.setAttribute('alt', "code format");
    // Adds icon to the label
    codeFormatLabel.appendChild(codeFormatIcon);
    // Adds the label to the button
    codeFormatButton.appendChild(codeFormatLabel);
    // Adds the button to the toolbar
    var toolbarPreButton = toolbar.querySelector('div[data-test-id="toolbarPreButton"]');
    toolbar.insertBefore(codeFormatButton, toolbarPreButton);
    // Registers the button functionality
    // API: https://www.tiny.cloud/docs/api/tinymce/tinymce.formatter/
    var registerArguments = {
        inline: 'code'
    };
    if (cloneInto) {
        registerArguments = cloneInto(registerArguments, unsafeWindow);
    }
    tinymce.activeEditor.formatter.register('codeformat', registerArguments);
    // Adds function to the button
    codeFormatButton.addEventListener('click', function (e) {
        var target = e.currentTarget;
        tinymce.activeEditor.focus();
        tinymce.activeEditor.formatter.toggle('codeformat');
        tinymce.DOM.toggleClass(target, 'src-components-EditorToolbar-ToolbarButton---active---3qTSV');
    });
    // Adds event listener to check <code> markup everywhere on the active editor
    var checkIfInCodeTag = function (e) {
        if (e.element.nodeName == 'CODE') {
            codeFormatButton.classList.add('src-components-EditorToolbar-ToolbarButton---active---3qTSV');
        }
        else {
            codeFormatButton.classList.remove('src-components-EditorToolbar-ToolbarButton---active---3qTSV');
        }
    };
    if (exportFunction) {
        checkIfInCodeTag = exportFunction(checkIfInCodeTag, unsafeWindow);
    }
    tinymce.activeEditor.on('NodeChange', checkIfInCodeTag);
}
function wrapLiferayGatedContent(tinymce) {
    // Only runs if on a KCS
    var isFastTrack = Array.from(document.querySelectorAll([
        'div[data-test-id="sectionSelector-section"]',
        'div[data-test-id="section-name"]' // Visible when sidebar is closed
    ].join(','))).filter(function (x) { return x.textContent == 'Fast Track'; }).length > 0;
    if (!isFastTrack) {
        return;
    }
    var allEditorH2 = tinymce.activeEditor.contentDocument.getElementsByTagName('h2');
    for (var i = 0; i < allEditorH2.length; i++) {
        if ((allEditorH2[i].textContent == 'Resolution' || allEditorH2[i].textContent == 'Additional Information') &&
            allEditorH2[i].nextSibling.tagName != 'DIV') {
            tinymce.dom.DomQuery(allEditorH2[i]).nextUntil().wrapAll('<div>');
        }
    }
}
function addArticleSubmissionListeners(tinymce) {
    var validationButtons = document.querySelectorAll([
        'div[data-test-id="createButton-menu-button"]',
        'div[data-test-id="updateButton-menu-button"]' // appears when updating an existing one
    ].join(','));
    for (var i = 0; i < validationButtons.length; i++) {
        var button = validationButtons[i];
        if (button.classList.contains('lesa-ui-button-listen')) {
            continue;
        }
        button.classList.add('lesa-ui-button-listen');
        button.addEventListener('click', wrapLiferayGatedContent.bind(null, tinymce));
    }
}
function addArticleFormattingButtons(tinymce) {
    var preButtons = Array.from(document.querySelectorAll('div[data-test-id="toolbarPreButton"]'));
    for (var i = 0; i < preButtons.length; i++) {
        var toolbar = preButtons[i].parentElement;
        if (toolbar == null || toolbar.classList.contains('lesa-ui-stackedit')) {
            continue;
        }
        toolbar.classList.add('lesa-ui-stackedit');
        addArticleCodeButton(toolbar, tinymce);
    }
}
function updateKnowledgeCenterEditor() {
    var tinymce = unsafeWindow.tinymce;
    if (!tinymce) {
        return;
    }
    addArticleFormattingButtons(tinymce);
    addArticleSubmissionListeners(tinymce);
}
if ((unsafeWindow.location.hostname.indexOf('zendesk.com') != -1) &&
    (unsafeWindow.location.pathname.indexOf('/knowledge/') == 0)) {
    setInterval(updateKnowledgeCenterEditor, 1000);
}
function viewsGoToPage(target) {
    if (target <= 0) {
        return;
    }
    var pageIndicator = document.querySelector('[data-test-id="views_views-header-page-amount"]');
    if (pageIndicator == null) {
        setTimeout(viewsGoToPage.bind(null, target), 100);
        return;
    }
    var pageMatcher = (pageIndicator.textContent || '').match(/\d+/g);
    if (pageMatcher == null) {
        setTimeout(viewsGoToPage.bind(null, target), 100);
        return;
    }
    var _a = pageMatcher.map(function (it) { return parseInt(it); }).sort(function (a, b) { return a - b; }), current = _a[0], total = _a[1];
    if (current == target) {
        return;
    }
    var direction = current > target ? 'previous' : 'next';
    var button = document.querySelector('button[data-test-id="generic-table-pagination-' + direction + '"]');
    if (button == null) {
        setTimeout(viewsGoToPage.bind(null, target), 100);
        return;
    }
    button.click();
    viewsGoToPage(target);
}
function addViewsGoToPageButton() {
    var cursorPaginator = document.querySelector('#views_views-ticket-table nav[data-garden-id="cursor_pagination"]');
    if (!cursorPaginator) {
        return;
    }
    var goToPageButton = cursorPaginator.querySelector('button.lesa-ui-go-to-page');
    if (goToPageButton) {
        return;
    }
    var nextButton = cursorPaginator.querySelector('button[data-test-id="generic-table-pagination-next"]');
    if (!nextButton) {
        return;
    }
    goToPageButton = document.createElement('button');
    goToPageButton.classList.add('lesa-ui-go-to-page');
    goToPageButton.textContent = '...';
    goToPageButton.addEventListener('click', function () {
        viewsGoToPage(parseInt(prompt('Which page?') || '0'));
    });
    var buttonContainer = nextButton.parentElement;
    buttonContainer.insertBefore(goToPageButton, nextButton);
}
/**
 * Updates all help.liferay.com/attachments links to point to the current domain.
 */
function fixAttachmentLinks() {
    fixAttachmentLinksHelper('a', 'href');
    fixAttachmentLinksHelper('img', 'src');
}
function fixAttachmentLinksHelper(tagName, attributeName) {
    Array.from(document.querySelectorAll(tagName + '[' + attributeName + '^="https://help.liferay.com/attachments/')).forEach(function (it) {
        var value = it.getAttribute(attributeName);
        it.setAttribute(attributeName, value.substring('https://help.liferay.com'.length));
    });
}
/**
 * Shows the public conversation tab so that you can get help.liferay.com links to
 * share with customers.
 */
function enablePublicConversation(ticketId, ticketInfo, conversation) {
    var fullTab = conversation.querySelector('.event-nav.conversation .fullConversation');
    var publicTab = conversation.querySelector('.event-nav.conversation .publicConversation');
    if (publicTab && parseInt(publicTab.getAttribute('data-count') || '0') == 0) {
        publicTab.setAttribute('data-count', fullTab.getAttribute('data-count') || '0');
    }
}
/**
 * Apply updates to the page based on the retrieved ticket information. Since the
 * ticket corresponds to a "conversation", find that conversation.
 */
function checkTicketConversation(ticketId, ticketInfo) {
    updateSidebarBoxContainer(ticketId, ticketInfo);
    var conversation = document.querySelector('div[data-side-conversations-anchor-id="' + ticketId + '"]');
    if (!conversation) {
        clearHighlightedComments();
        return;
    }
    var hasHeader = conversation.querySelectorAll('div[data-test-id="ticket-call-controls-action-bar"], .pane_header').length > 0;
    if (!hasHeader) {
        return;
    }
    var hasAgentWorkspaceComments = conversation.querySelectorAll('article').length > 0;
    var hasLegacyWorkspaceComments = conversation.querySelectorAll('.event .zd-comment').length > 0;
    if (!hasAgentWorkspaceComments && !hasLegacyWorkspaceComments) {
        return;
    }
    isAgentWorkspace = hasAgentWorkspaceComments;
    if (!isAgentWorkspace && document.querySelectorAll('.editor').length == 0) {
        return;
    }
    if (!isAgentWorkspace) {
        enablePublicConversation(ticketId, ticketInfo, conversation);
    }
    addReplyFormattingButtons(ticketId, ticketInfo, conversation);
    addJiraLinks(ticketId, ticketInfo, conversation);
    addPlaybookReminder(ticketId, ticketInfo, conversation);
    addTicketDescription(ticketId, ticketInfo, conversation);
    fixPermaLinkAnchors(ticketId, ticketInfo, conversation);
    addPermaLinks(ticketId, ticketInfo, conversation);
    updateWindowTitle(ticketId, ticketInfo);
    highlightComment(conversation, ticketId, '');
}
/**
 * Set the window title based on which URL you are currently visiting, so that if you
 * use browser history, you have useful information.
 */
function updateWindowTitle(ticketId, ticketInfo) {
    if (!accountInfo) {
        setAccountInfo(updateWindowTitle.bind(null, ticketId, ticketInfo));
        return;
    }
    var accountName = accountInfo.account.name;
    if (document.location.pathname.indexOf('/agent/dashboard') == 0) {
        document.title = accountName + ' - Agent Dashboard';
        return;
    }
    if (document.location.pathname.indexOf('/agent/admin/') == 0) {
        document.title = accountName + ' - Agent Admin';
        return;
    }
    if (ticketId && ticketInfo) {
        var emojis = '';
        if (ticketInfo.ticket && ticketInfo.ticket.tags) {
            emojis = getEmojiText(ticketInfo.ticket.tags);
            if (emojis.length > 0) {
                emojis += ' - ';
            }
        }
        var accountCode = getAccountCode(ticketId, ticketInfo);
        if (accountCode) {
            document.title = accountName + ' - ' + emojis + 'Agent Ticket #' + ticketInfo.ticket.id + ' - ' + accountCode + ' - ' + ticketInfo.ticket.raw_subject;
        }
        else {
            document.title = accountName + ' - ' + emojis + 'Agent Ticket #' + ticketInfo.ticket.id + ' - ' + ticketInfo.ticket.raw_subject;
        }
        return;
    }
    if (document.location.pathname.indexOf('/agent/filters/') == 0) {
        var filterElement = document.querySelector('.filter-title');
        if (filterElement && filterElement.textContent) {
            document.title = accountName + ' - Agent Filter - ' + filterElement.textContent;
        }
        return;
    }
}
/**
 * Since there's an SPA framework in place that I don't fully understand, attempt to
 * apply updates once per second, once we have the ticket information.
 */
function checkForConversations() {
    var ticketPath = '/agent/tickets/';
    if (document.location.pathname.indexOf(ticketPath) == 0) {
        var ticketId = document.location.pathname.substring(ticketPath.length);
        var pos = ticketId.indexOf('/');
        if (pos != -1) {
            revokeObjectURLs();
        }
        else {
            checkTicket(ticketId, checkTicketConversation);
        }
    }
    else {
        updateWindowTitle();
        revokeObjectURLs();
    }
}
/**
 * Update the selected tab with the account code.
 */
function updateSubtitle(title, subtitle, ticketId, ticketInfo) {
    title.textContent = ticketInfo.ticket.raw_subject;
    title.setAttribute('title', ticketInfo.ticket.raw_subject);
    var accountCode = getAccountCode(ticketId, ticketInfo);
    if (!accountCode) {
        return;
    }
    var oldSpan = subtitle.querySelector('.lesa-ui-account-code');
    if (oldSpan && (oldSpan.textContent == accountCode)) {
        return;
    }
    if (!subtitle.classList.contains('lesa-ui-subtitle')) {
        subtitle.classList.add('lesa-ui-subtitle');
    }
    var newSpan = document.createElement('span');
    var emojis = getEmojiText(ticketInfo.ticket.tags || []);
    if (emojis.length > 0) {
        newSpan.appendChild(document.createTextNode(emojis + ' '));
    }
    newSpan.classList.add('lesa-ui-account-code');
    newSpan.textContent = accountCode;
    if (oldSpan) {
        oldSpan.replaceWith(newSpan);
    }
    else {
        subtitle.appendChild(newSpan);
    }
}
/**
 * Attempt to update the tab subtitles.
 */
function checkForSubtitles() {
    var tabs = Array.from(document.querySelectorAll('div[data-test-id="header-tab"]'));
    var subtitles = Array.from(document.querySelectorAll('div[data-test-id="header-tab-subtitle"]'));
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var subtitle = tab.querySelector('div[data-test-id="header-tab-subtitle"]');
        var textContent = ((subtitle.children.length > 0 && subtitle.children[0].textContent) || '').trim();
        if (textContent[0] != '#') {
            continue;
        }
        var title = tab.querySelector('div[data-test-id="header-tab-title"]');
        var ticketId = textContent.substring(1);
        checkTicket(ticketId, updateSubtitle.bind(null, title, subtitle));
    }
}
/**
 * Set the old compact ticket status column style and change "Open-Pending" color to differenciate it from the "Open" one
 * For more information, see https://liferay.slack.com/archives/CL8DNJYB0/p1675440794494529
 */
function fixOldTicketStatusColumnStyle() {
    var viewPage = ((unsafeWindow.location.pathname.indexOf('/agent/filters') == 0) || (unsafeWindow.location.pathname.indexOf('/agent/dashboard') == 0));
    /* update status column */
    var badges = Array.from(document.querySelectorAll('div[data-cy-test-id="status-badge-state"]'));
    for (var _i = 0, badges_1 = badges; _i < badges_1.length; _i++) {
        var badge = badges_1[_i];
        updateBadge(badge);
        /* Change the status text to the abreviate form only if we are in a view page and we are not in a popup */
        if (viewPage && badge.textContent && (badge.textContent.length > 2) && (badge.textContent[0] != ' ') && !isBadgeInPopup(badge)) {
            if (badge.textContent === 'On-hold') {
                badge.textContent = '\u00A0H\u00A0';
            }
            else if (badge.textContent === 'Open-Pending') {
                badge.textContent = 'OP';
            }
            else {
                badge.textContent = '\u00A0' + badge.textContent[0] + '\u00A0';
            }
        }
    }
    /* Update Open-Pending badge color inside the ticket */
    var ticketBadges = Array.from(document.querySelectorAll('span.ticket_status_label'));
    for (var _a = 0, ticketBadges_1 = ticketBadges; _a < ticketBadges_1.length; _a++) {
        var badge = ticketBadges_1[_a];
        updateBadge(badge);
    }
    if (!viewPage) {
        return;
    }
    /* remove "Ticket status" text from headers */
    var headers = Array.from(document.querySelectorAll('th[data-garden-id="tables.header_cell"]:not([processed="true"]'));
    for (var _b = 0, headers_1 = headers; _b < headers_1.length; _b++) {
        var header = headers_1[_b];
        header.setAttribute('processed', 'true');
    }
    if (headers[3] !== undefined) {
        headers[3].textContent = '';
    }
    /* remove the padding of second column */
    var secondColumn = Array.from(document.querySelectorAll('td.sc-15v8wy4-1:not([processed="true"]'));
    for (var _c = 0, secondColumn_1 = secondColumn; _c < secondColumn_1.length; _c++) {
        var cell = secondColumn_1[_c];
        cell.style.paddingLeft = '0px';
        cell.style.paddingRight = '2px';
        cell.setAttribute('processed', 'true');
    }
    if (headers[1] !== undefined) {
        headers[1].style.paddingLeft = '0px';
        headers[1].style.paddingRight = '2px';
    }
    /* remove empty third column */
    var thirdColumn = Array.from(document.querySelectorAll('td.oeot8n-0'));
    for (var _d = 0, thirdColumn_1 = thirdColumn; _d < thirdColumn_1.length; _d++) {
        var cell = thirdColumn_1[_d];
        cell.remove();
    }
    if (headers[2] !== undefined) {
        headers[2].remove();
    }
}
function updateBadge(badge) {
    /* Change badge colors for Open-Pending to purple */
    if ((badge.textContent === 'Open-Pending' || badge.textContent === 'OP')) {
        if (!badge.getAttribute('updated-open-color')) {
            badge.style.setProperty("background-color", "#c782fc", "important");
            badge.setAttribute('updated-open-color', "true");
        }
    }
    /* Restore badge color if changing from Open-Pending to any other status */
    else if (badge.getAttribute('updated-open-color')) {
        badge.style.removeProperty("background-color");
        badge.removeAttribute('updated-open-color');
    }
    /* Closed status was lost now is shown as Resolved, we can get it again from badge attributes */
    else if (!badge.getAttribute('updated-closed-color') && ((badge.getAttribute('data-test-id') === 'status-badge-closed') || badge.classList.contains('closed'))) {
        badge.style.setProperty("background-color", "#dcdee0", "important");
        badge.style.setProperty("color", "#04363d", "important");
        badge.textContent = 'Closed';
        badge.setAttribute('updated-closed-color', "true");
    }
}
function isBadgeInPopup(badge) {
    if (!badge.parentElement) {
        return false;
    }
    var grandParent = badge.parentElement.parentElement;
    if (!grandParent) {
        return false;
    }
    if (grandParent.getAttribute('data-test-id') === "ticket_table_tooltip-header-ticket-info") {
        return true;
    }
    if (!grandParent.parentElement) {
        return false;
    }
    if (grandParent.parentElement.getAttribute('data-test-id') === "header-tab-tooltip") {
        return true;
    }
    if (grandParent.parentElement.getAttribute('data-cy-test-id') === "submit_button-menu") {
        return true;
    }
    return false;
}
// Since there's an SPA framework in place that I don't fully understand,
// attempt to do everything once per second.
if (unsafeWindow.location.hostname.indexOf('zendesk.com') != -1) {
    if (unsafeWindow.location.pathname.indexOf('/agent/') == 0) {
        setInterval(checkForConversations, 1000);
        setInterval(checkForSubtitles, 1000);
        setInterval(checkSidebarTags, 1000);
        setInterval(fixAttachmentLinks, 1000);
        setInterval(makeDraggableModals, 1000);
        setInterval(fixOldTicketStatusColumnStyle, 1000);
        setInterval(addViewsGoToPageButton, 1000);
    }
}
