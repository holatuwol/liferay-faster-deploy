// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @version        7.8
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/zendesk.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/zendesk.user.js
// @include        /https:\/\/liferay-?support[0-9]*.zendesk.com\/agent\/.*/
// @include        /https:\/\/24475.apps.zdusercontent.com\/24475\/assets\/.*\/issue_creator.html/
// @grant          none
// @require        https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// @require        https://unpkg.com/stackedit-js@1.0.7/docs/lib/stackedit.min.js
// @require        https://unpkg.com/turndown@5.0.3/dist/turndown.js
// ==/UserScript==

var styleElement = document.createElement('style');

if (window.location.hostname == '24475.apps.zdusercontent.com') {
  styleElement.textContent = `
body {
  overflow-y: hidden;
}
`;
}
else {
  styleElement.textContent = `
a.downloading {
  color: #999;
}

a.downloading::after {
  content: ' (downloading...)';
  color: #999;
}

a.generating {
  color: #999;
}

a.generating::after {
  content: ' (generating...)';
  color: #999;
}

.lesa-ui-attachments,
.lesa-ui-knowledge-capture {
  display: flex;
  flex-direction: row;
  margin-bottom: 0.5em;
}

.lesa-ui-attachment-info {
  display: grid;
  grid-gap: 0em 1em;
  grid-template-columns: repeat(3, auto);
}

.lesa-ui-attachment-info .lesa-ui-attachment-extra-info {
  text-align: right;
}

.lesa-ui-attachment-info a {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lesa-ui-attachments-bulk-download {
  margin-top: 0.5em;
  text-align: right;
  text-decoration: underline;
}

.lesa-ui-attachments-label,
.lesa-ui-knowledge-capture-label {
  font-weight: 600;
  margin-right: 1em;
  white-space: nowrap;
}

.lesa-ui-knowledge-capture ul {
  margin-left: 0px;
}

.lesa-ui-description {
  font-weight: normal;
}

.lesa-ui-description .zd-comment {
  max-height: 25em;
  overflow-y: auto;
}

.lesa-ui-event-highlighted {
  background-color: #eee;
}

.lesa-ui-form-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5em;
}

.lesa-ui-permalink {
  margin-bottom: 1em;
}

.lesa-ui-permalink > input,
.lesa-ui-form-field.lesa-ui-helpcenter > input {
  background-color: transparent;
  border: 0px;
  font-size: 12px;
  margin: 0px;
  padding: 0px;
  width: 100%;
}

.lesa-ui-stackedit-icon {
  height: 16px;
  width: 16px;
  padding: 4px;
}

.mast .editable .lesa-ui-subject {
  background-color: #fff;
  font-size: 20px;
  font-weight: 600;
  resize: vertical;
  text-align: left;
  width: 100%;
}

.header.mast > .round-avatar {
  display: none;
}

.lesa-ui-priority span {
  color: #fff;
  border-radius: 2px;
  padding: 4px;
  text-align: center;
  text-transform: uppercase;
  width: 6em;
}

.lesa-ui-subpriority {
  border: 1px #eee dashed;
  font-size: 0.8em;
}

.lesa-ui-priority-minor,
.lesa-ui-subpriority-none,
.lesa-ui-subpriority-low {
  background-color: #0066cc;
}

.lesa-ui-priority-major,
.lesa-ui-subpriority-medium {
  background-color: #f2783b;
}

.lesa-ui-priority-critical,
.lesa-ui-subpriority-high {
  background-color: #bf1e2d;
}

.lesa-ui-priority .lesa-ui-subject-emojis {
  background-color: #f8f9f9;
}

.lesa-ui-subject-emojis a {
  font-size: 1.5em;
  font-weight: normal;
  margin-left: 2px;
  margin-right: 2px;
}

.rich_text .comment_input .lesa-ui-playbook-reminder {
  display: none;
}

.rich_text .comment_input.is-public .lesa-ui-playbook-reminder:not(:empty) {
  background-color: #eef2fa;
  border: 1px solid #d8dcde;
  border-radius: 0 3px 0 0 !important;
  color: #2e5aac;
  display: block;
  padding: 10px;
}

.rich_text .comment_input.is-public .lesa-ui-playbook-reminder a {
  text-decoration: underline;
}
`;
}

document.querySelector('head').appendChild(styleElement);

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

        var isLikelyInline = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.pdf'].some(function(substr) {
            return lowerCaseName.length > substr.length &&
                lowerCaseName.indexOf(substr) == lowerCaseName.length - substr.length;
        });

        if (isLikelyInline) {
            link.onclick = function() {
                downloadAttachment(link, downloadBlob);
                return false;
            };
        }

    }
    else if (href && href.charAt(0) != '#') {
        link.target = '_blank';
    }

    return link;
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
        var accountCodeField = propertyBox.parentNode.querySelector('.custom_field_360013377592 .ember-text-field');

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

    ticketInfoCache[ticketId] = 'PENDING';

    var ticketInfo = {};

    var forkFunctions = [checkTicketMetadata, checkEvents];
    var returnedFunctions = 0;

    var joinCallback = function(ticketId, newTicketInfo) {
        if (ticketInfo != null) {
            Object.assign(ticketInfo, newTicketInfo);
        }

        if (++returnedFunctions != forkFunctions.length) {
            return;
        }

        if (Object.keys(ticketInfo).length == 0) {
            ticketInfoCache[ticketId] = null;
        }
        else {
            ticketInfoCache[ticketId] = ticketInfo;
        }
    }

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

    xhr.onload = function() {
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

    xhr.onerror = function() {
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

    xhr.onload = function() {
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

    xhr.onerror = function() {
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
    xhr.send();
}

/**
 * Audit event information is incomplete unless we specifically
 * request it, so do that here.
 */

function checkEvents(ticketId, callback, ticketInfo, pageId) {
    ticketInfo = ticketInfo || { audits: [] };
    pageId = pageId || 1;

    var xhr = new XMLHttpRequest();

    xhr.onload = function() {
        var auditInfo = null;

        try {
            auditInfo = JSON.parse(xhr.responseText);
        }
        catch (e) {
        }

        Array.prototype.push.apply(ticketInfo.audits, auditInfo.audits);

        if (auditInfo.next_page) {
            checkEvents(ticketId, callback, ticketInfo, pageId + 1);
        }
        else {
            callback(ticketId, ticketInfo);
        }
    };

    xhr.onerror = function() {
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

    xhr.onload = function() {
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
    xhr.send();
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

    var queryString = Object.keys(params).map(function(key) { return (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + encodeURIComponent(params[key]) }).join('&');
    return 'https://customer.liferay.com/project-details?p_p_id=' + portletId + '&' + queryString;
}

/**
 * Add the Organization field to the sidebar, which will contain a link to Help Center
 * for the account details and the customer's SLA level.
 */

function addOrganizationField(propertyBox, ticketId, ticketInfo) {
    var accountCode = getAccountCode(ticketId, ticketInfo, propertyBox);

    var helpCenterLinkHREF = null;
    var serviceLevel = null;

    var organizationInfo = null;

    if (accountCode) {
        organizationInfo = organizationCache[accountCode];
    }

    if (organizationInfo) {
        var organizationFields = organizationInfo.organization_fields;

        serviceLevel = organizationFields.sla.toUpperCase();

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

        if (serviceLevel) {
            helpCenterLinkContainer.appendChild(document.createTextNode(' (' + serviceLevel + ')'));
        }

        helpCenterItems.push(helpCenterLinkContainer);
    }

    var permalinkHREF = 'https://help.liferay.com/hc/requests/' + ticketInfo.ticket.id;
    helpCenterItems.push(createPermaLinkInputField(permalinkHREF))

    generateFormField(propertyBox, 'lesa-ui-helpcenter', 'Help Center', helpCenterItems);
}

/**
 * Generate a URL to Patcher Portal's accounts view.
 */

function getPatcherPortalAccountsHREF(params) {
    var portletId = '1_WAR_osbpatcherportlet';
    var ns = '_' + portletId + '_';

    var queryString = Object.keys(params).map(function(key) { return (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + encodeURIComponent(params[key]) }).join('&');
    return 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?p_p_id=' + portletId + '&' + queryString;
}

/**
 * Retrieve the Liferay version from the sidebar.
 */

function getProductVersion(propertyBox) {
    var productVersionField = propertyBox.parentNode.querySelector('.custom_field_360006076471 .zd-selectmenu-base-content');

    if (!productVersionField) {
        return '';
    }

    var version = productVersionField.textContent.trim();

    if (version.indexOf('7.') == 0) {
        return version;
    }

    if (version.indexOf('6.') == 0) {
        return '6.x';
    }

    return '';
}

/**
 * Convert the Liferay version into the Patcher Portal product version.
 */

function getProductVersionId(version) {
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
        var allBuildsLinkHREF = getPatcherPortalAccountsHREF({
            'patcherBuildAccountEntryCode': accountCode
        });

        patcherPortalItems.push(createAnchorTag('All Builds', allBuildsLinkHREF));

        var version = getProductVersion(propertyBox);

        if (version) {
            var versionBuildsLinkHREF = getPatcherPortalAccountsHREF({
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
    var query = `
"Customer Ticket Permalink" = "https://${document.location.host}${document.location.pathname}" OR
"Zendesk Ticket IDs" ~ ${ticketId}
    `.trim();

    var encodedQuery = encodeURIComponent(query);

    var jiraSearchItems = [];

    var jiraSearchLinkHREF = 'https://issues.liferay.com/issues/?jql=' + encodedQuery;

    var jiraSearchLinkContainer = document.createElement('div');

    var jiraSearchLink = createAnchorTag("Linked Issues", jiraSearchLinkHREF);
    jiraSearchLinkContainer.appendChild(jiraSearchLink);

    jiraSearchItems.push(jiraSearchLinkContainer);

    generateFormField(propertyBox, 'lesa-ui-jirasearch', 'JIRA Search', jiraSearchItems);
}

/**
 * Make tags in the sidebar clickable, so we can easily find tickets
 * with similar tags.
 */

function checkSidebarTags() {
    var tags = document.querySelectorAll('.zd-tag-item a');

    for (var i = 0; i < tags.length; i++) {
        var anchor = tags[i];

        if (anchor.href) {
            continue;
        }

        anchor.title = 'tags:' + anchor.textContent;
        anchor.href = 'https://' + document.location.host + '/agent/search/1?q=' + encodeURIComponent('tags:' + anchor.textContent);
        anchor.target = '_blank';
    }
}

/**
 * Update the sidebar with any ticket details we can pull from the ZenDesk API.
 */

function updateSidebarBoxContainer(ticketId, ticketInfo) {
    var sidebars = document.querySelectorAll('.sidebar_box_container');

    if (sidebars.length == 0) {
        return;
    }

    var propertyBoxes = [];

    for (var i = 0; i < sidebars.length; i++) {
        var propertyBox = sidebars[i].querySelector('.property_box');

        if (!propertyBox) {
            continue;
        }

        var workspace = propertyBox.closest('.workspace');

        if (workspace.style.display == 'none') {
            continue;
        }

        if (propertyBox.getAttribute('data-ticket-id') != ticketId) {
            propertyBox.setAttribute('data-ticket-id', ticketId);
            propertyBoxes.push(propertyBox);
        }
    }

    if (propertyBoxes.length == 0) {
        return;
    }

    for (var i = 0; i < propertyBoxes.length; i++) {
        addOrganizationField(propertyBoxes[i], ticketId, ticketInfo);
        addJIRASearchField(propertyBoxes[i], ticketId);
        addPatcherPortalField(propertyBoxes[i], ticketId, ticketInfo);
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

    blobURLs = [];
}

/**
 * Download the attachment mentioned in the specified link, and then invoke a callback
 * once the download has completed.
 */

function downloadAttachment(checkbox, callback) {
    var href = checkbox.getAttribute('data-href');
    var link = document.querySelector('.lesa-ui-attachment-info a[href="' + href + '"]');

    link.classList.add('downloading');

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';

    xhr.onload = function() {
        callback(checkbox.getAttribute('data-download'), this.response);
        link.classList.remove('downloading');
    };

    xhr.onerror = function() {
        callback(checkbox.getAttribute('data-download'), null);
        link.classList.remove('downloading');
    }

    xhr.open('GET', href);
    xhr.send(null);
}

/**
 * Generate a single object representing the metadata for the attachment.
 */

function extractAttachmentLinkMetadata(attachmentLink) {
    var comment = attachmentLink.closest('div[data-comment-id]');

    // Since we're using the query string in order to determine the name (since the actual text
    // in the link has a truncated name), we need to decode the query string.

    var encodedFileName = attachmentLink.href.substring(attachmentLink.href.indexOf('?') + 6);
    encodedFileName = encodedFileName.replace(/\+/g, '%20');
    var attachmentFileName = decodeURIComponent(encodedFileName);

    return {
        text: attachmentFileName,
        href: attachmentLink.href,
        download: attachmentFileName,
        commentId: comment.getAttribute('data-comment-id'),
        author: comment.querySelector('div.actor .name').textContent,
        time: comment.querySelector('time').title,
        timestamp: comment.querySelector('time').getAttribute('datetime'),
        missingCorsHeader: false
    }
}

/**
 * Generate a single object representing the metadata for an external link.
 */

function extractExternalLinkMetadata(externalLink) {
    var comment = externalLink.closest('div[data-comment-id]');

    // Since we're using the query string in order to determine the name (since the actual text
    // in the link has a truncated name), we need to decode the query string.

    return {
        text: externalLink.textContent,
        href: externalLink.href,
        download: externalLink.textContent,
        commentId: comment.getAttribute('data-comment-id'),
        author: comment.querySelector('div.actor .name').textContent,
        time: comment.querySelector('time').title,
        timestamp: comment.querySelector('time').getAttribute('datetime'),
        missingCorsHeader: true
    }
}

/**
 * Generate a single row in the attachment table based on the provided link.
 */

function addAttachmentRow(container, attachment) {
    var attachmentLink = createAnchorTag(attachment.text, attachment.href, attachment.download);
    attachmentLink.classList.add('attachment');
    container.appendChild(attachmentLink);

    // Attach an author and a timestamp. We'll have the timestamp be a comment permalink, since
    // other parts in this script provide us with that functionality.

    var attachmentExtraInfo = document.createElement('div');
    attachmentExtraInfo.classList.add('lesa-ui-attachment-extra-info');

    attachmentExtraInfo.appendChild(document.createTextNode(attachment.author + ' on '));

    var attachmentCommentLink = createAnchorTag(attachment.time, null);
    attachmentCommentLink.classList.add('attachment-comment-link');
    attachmentCommentLink.onclick = highlightComment.bind(null, attachment.commentId);

    attachmentExtraInfo.appendChild(attachmentCommentLink)
    container.appendChild(attachmentExtraInfo);

    var attachmentCheckbox = document.createElement('input');
    attachmentCheckbox.setAttribute('type', 'checkbox');

    attachmentCheckbox.setAttribute('data-text', attachment.text);
    attachmentCheckbox.setAttribute('data-download', attachment.download);
    attachmentCheckbox.setAttribute('data-href', attachment.href);

    if (attachment.missingCorsHeader) {
        attachmentCheckbox.disabled = true;
        attachmentCheckbox.setAttribute('title', 'The domain where this attachment is hosted does not send proper CORS headers, so it is not eligible for bulk download.')
    }
    else {
        attachmentCheckbox.checked = true;
    }

    container.appendChild(attachmentCheckbox);
}

/**
 * Generate a zip file containing all attachments for the specified ticket.
 */

function createAttachmentZip(ticketId, ticketInfo) {
    var instance = this;

    var attachmentLinks = document.querySelectorAll('div[data-side-conversations-anchor-id="' + ticketId + '"] .lesa-ui-attachment-info input[type="checkbox"]');

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

        downloadAttachment(attachmentLinks[i], function(fileName, blob) {
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
            }).then(function(blob) {
                var accountCode = getAccountCode(ticketId, ticketInfo) || 'UNKNOWN';
                var zipFileName = accountCode + '.zendesk-' + ticketId + '.zip';

                var downloadLink = createAnchorTag('Download ' + zipFileName, URL.createObjectURL(blob), zipFileName);
                downloadLink.classList.add('.lesa-ui-attachments-download-blob');

                instance.parentNode.replaceChild(downloadLink, instance);
            });
        })
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
    var attachmentLinks = Array.from(conversation.querySelectorAll('.attachment'));
    var externalLinks = Array.from(conversation.querySelectorAll('.is-public .zd-comment > a:not(.attachment)')).filter(isLiferayLargeAttachment);

    if (attachmentLinks.length + externalLinks.length == 0) {
        return null;
    }

    var attachmentsContainer = document.createElement('div');
    attachmentsContainer.classList.add('lesa-ui-attachments');

    var attachmentsLabel = document.createElement('div');
    attachmentsLabel.classList.add('lesa-ui-attachments-label');
    attachmentsLabel.innerHTML = 'Attachments:';

    attachmentsContainer.appendChild(attachmentsLabel);

    var attachmentsWrapper = document.createElement('div');

    // Accumulate the attachments, and then sort them by date

    var attachments = [];

    for (var i = 0; i < attachmentLinks.length; i++) {
        attachments.push(extractAttachmentLinkMetadata(attachmentLinks[i]));
    }

    for (var i = 0; i < externalLinks.length; i++) {
        attachments.push(extractExternalLinkMetadata(externalLinks[i]));
    }

    attachments.sort(function(a, b) {
        return a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 :
            a.text > b.text ? 1 : a.text < b.text ? -1 : 0;
    })

    // Generate the table and a 'bulk download' link for convenience

    var attachmentInfo = document.createElement('div');
    attachmentInfo.classList.add('lesa-ui-attachment-info');

    for (var i = 0; i < attachments.length; i++) {
        addAttachmentRow(attachmentInfo, attachments[i]);
    }

    attachmentsWrapper.appendChild(attachmentInfo);

    if (JSZip) {
        var downloadAllContainer = document.createElement('div');
        downloadAllContainer.classList.add('lesa-ui-attachments-bulk-download');

        var attachmentsZipLink = createAnchorTag('Generate Bulk Download', null);
        attachmentsZipLink.onclick = createAttachmentZip.bind(attachmentsZipLink, ticketId, ticketInfo);

        downloadAllContainer.appendChild(attachmentsZipLink);

        attachmentsWrapper.appendChild(downloadAllContainer);
    }

    attachmentsContainer.appendChild(attachmentsWrapper);

    return attachmentsContainer;
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
    return tags.filter(isEmoji).map(function(x) { return emojiMap[x] }).join('');
}

/**
 * Generates an emoji for the given tag.
 */

function getEmojiAnchorTag(tag) {
    if (!isEmoji(tag)) {
        return null;
    }

    var anchor = document.createElement('a');
    anchor.title = 'tags:' + tag;
    anchor.textContent = emojiMap[tag];
    anchor.href = 'https://' + document.location.host + '/agent/search/1?q=' + encodeURIComponent('tags:' + tag);
    anchor.target = '_blank';
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
    var priorityElement = header.querySelector('.lesa-ui-priority');

    if (priorityElement) {
        if (priorityElement.getAttribute('data-ticket-id') == ticketId) {
            return;
        }

        priorityElement.parentNode.removeChild(priorityElement);
    }

    priorityElement = document.createElement('div');
    priorityElement.classList.add('lesa-ui-priority');
    priorityElement.setAttribute('data-ticket-id', ticketId);

    // Check to see if the ticket matches the rules for a regular
    // high priority ticket (production, severely impacted or worse)

    var subpriority = ticketInfo.ticket.priority || 'none';

    var tags = (ticketInfo && ticketInfo.ticket && ticketInfo.ticket.tags) || [];
    var tagSet = new Set(tags);

    if ((subpriority == 'high') || (subpriority == 'urgent')) {
        var criticalMarkers = ['production', 'production_completely_shutdown', 'production_severely_impacted_inoperable'].filter(Set.prototype.has.bind(tagSet));

        if (criticalMarkers.length >= 2) {
            var criticalElement = document.createElement('span');
            criticalElement.classList.add('lesa-ui-priority-critical');
            criticalElement.textContent = tagSet.has('platinum') ? 'platinum critical' : 'critical';
            priorityElement.appendChild(criticalElement);
        }
    }

    var emojiContainer = getEmojiAnchorTags(tags);

    if (emojiContainer != null) {
        priorityElement.appendChild(emojiContainer);
    }

    if (priorityElement.childNodes.length > 0) {
        header.insertBefore(priorityElement, header.querySelector('.round-avatar'));
    }
}

/**
 * Replaces the input field for the 'subject' with something with line wrapping
 * so that we can see the entire subject (untruncated).
 */

function addSubjectTextWrap(header, ticketId, ticketInfo) {
    var oldSubjectField = header.querySelector('input[name="subject"]');
    oldSubjectField.setAttribute('type', 'hidden');

    var newSubjectField = header.querySelector('.lesa-ui-subject');

    if (newSubjectField) {
        if (newSubjectField.getAttribute('data-ticket-id') == ticketId) {
            return;
        }

        newSubjectField.parentNode.removeChild(newSubjectField);
    }

    if (oldSubjectField.readOnly) {
        newSubjectField = document.createElement('div');
        newSubjectField.textContent = oldSubjectField.value;
    }
    else {
        newSubjectField = document.createElement('textarea');

        newSubjectField.setAttribute('maxlength', oldSubjectField.getAttribute('maxlength'));
        newSubjectField.setAttribute('name', oldSubjectField.getAttribute('name'));
        newSubjectField.value = oldSubjectField.value;

        newSubjectField.classList.add('ember-text-area');
    }

    newSubjectField.classList.add('lesa-ui-subject');
    newSubjectField.classList.add('ember-view');
    newSubjectField.setAttribute('data-ticket-id', ticketId);

    oldSubjectField.parentNode.insertBefore(newSubjectField, oldSubjectField);
}

/**
 * Generate a knowledge capture container.
 */

function createKnowledgeCaptureContainer(ticketId, ticketInfo, conversation) {
    if (!ticketInfo.audits) {
        return null;
    }

    var knowledgeCaptureEvents = ticketInfo.audits.map(function(x) {
        return x.events.filter(function(x) {
            return x.type == 'KnowledgeCaptured';
        });
    }).reduce(function(array, x) {
        return array.concat(x);
    }, []);

    if (knowledgeCaptureEvents.length == 0) {
        return null;
    }

    var knowledgeCaptureList = knowledgeCaptureEvents.reduce(function(list, x) {
        var item = document.createElement('li');
        item.appendChild(createAnchorTag(x.body.article.title, x.body.article.html_url));
        list.appendChild(item);
        return list;
    }, document.createElement('ul'));

    var knowledgeCaptureContainer = document.createElement('div');
    knowledgeCaptureContainer.classList.add('lesa-ui-knowledge-capture');

    var knowledgeCaptureLabel = document.createElement('div');
    knowledgeCaptureLabel.classList.add('lesa-ui-knowledge-capture-label');
    knowledgeCaptureLabel.innerHTML = (knowledgeCaptureEvents.length == 1) ? 'Fast Track Article:' : 'Fast Track Articles:';

    knowledgeCaptureContainer.appendChild(knowledgeCaptureLabel);
    knowledgeCaptureContainer.appendChild(knowledgeCaptureList);

    return knowledgeCaptureContainer;
}

/**
 * Add a ticket description and a complete list of attachments to the top of the page.
 */

function addTicketDescription(ticketId, ticketInfo, conversation) {
    var header = conversation.querySelector('.pane_header');

    if (!header) {
        return;
    }

    // Add a marker indicating the LESA priority based on critical workflow rules

    addPriorityMarker(header, conversation, ticketId, ticketInfo);
    addSubjectTextWrap(header, ticketId, ticketInfo);

    // Check to see if we have any descriptions that we need to remove.

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

    // Since comments are listed in reverse order, the last comment is the first
    // comment (from a time perspective), and can be used as a description.

    var comments = conversation.querySelectorAll('.event.is-public .zd-comment');

    if (comments.length == 0) {
        return;
    }

    var lastComment = comments[comments.length - 1];

    var description = document.createElement('div');

    description.classList.add('comment');
    description.classList.add('zd-comment');
    description.innerHTML = lastComment.innerHTML;

    // Create the element class hierarchy so that the text in the comment renders correctly.

    var descriptionAncestor0 = document.createElement('div');
    descriptionAncestor0.classList.add('event');
    descriptionAncestor0.classList.add('is-public');

    descriptionAncestor0.appendChild(description);

    var descriptionAncestor1 = document.createElement('div');
    descriptionAncestor1.classList.add('lesa-ui-description');
    descriptionAncestor1.classList.add('rich_text');
    descriptionAncestor1.setAttribute('data-ticket-id', ticketId);

    descriptionAncestor1.appendChild(descriptionAncestor0);

    // Generate something to hold all of our attachments.

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

/**
 * Recursively scan LPS tickets and LPE tickets, and replace any
 * plain text with HTML.
 */

var jiraTicketId = /([^/])(LP[EPS]-[0-9]+)/g;
var jiraTicketLink = /<a [^>]*href="https:\/\/issues.liferay.com\/browse\/(LP[EPS]-[0-9]+)"[^>]*>[^<]*<\/a>/g;

function addJiraLinksToElement(element) {
    var newHTML = element.innerHTML.replace(jiraTicketLink, '$1');

    if (element.contentEditable == 'true') {
        newHTML = newHTML.replace(jiraTicketId, '$1<a href="https://issues.liferay.com/browse/$2">$2</a>');
    }
    else {
        newHTML = newHTML.replace(jiraTicketId, '$1<a href="https://issues.liferay.com/browse/$2" target="_blank">$2</a>');
    }

    if (element.innerHTML != newHTML) {
        element.innerHTML = newHTML;
    }
}

/**
 * Adds a button which loads a window which allows you to compose a
 * post with Markdown.
 */

function addStackeditButton(element, callback) {
    var img = document.createElement('img');
    img.title = 'Compose with Stackedit';
    img.classList.add('lesa-ui-stackedit-icon');
    img.src = 'https://benweet.github.io/stackedit.js/icon.svg';

    var listItem = document.createElement('li');
    listItem.appendChild(img);
    listItem.onclick = composeWithStackedit.bind(null, element, callback);

    element.parentNode.parentNode.querySelector('.zendesk-editor--toolbar ul').appendChild(listItem);
}

/**
 * Adds an underline button to the regular formatter.
 */

function addUnderlineButton(element) {
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
    underlineButton.setAttribute('aria-pressed', false);
    underlineButton.setAttribute('aria-disabled', false);

    underlineButton.appendChild(underlineButtonIconContainer);

    var underlineButtonText = document.createElement('span');
    underlineButtonText.textContent = ('Underline')
    underlineButtonText.classList.add('zendesk-editor--accessible-hidden-text');
    underlineButton.appendChild(underlineButtonText);

    underlineButton.addEventListener('click', function(e) {
        document.execCommand('underline', false, null);
    });

    underlineButton.onmousedown = function(e) {
        e.stopPropagation();
        return false;
    };

    var underlineButtonListItem = document.createElement('li');
    underlineButtonListItem.appendChild(underlineButton);

    var formattingButtons = element.parentNode.parentNode.querySelector('.zendesk-editor--text-commands .zendesk-editor--group')
    formattingButtons.appendChild(underlineButtonListItem);
}

/**
 * Add buttons which load windows that allow you to compose a post
 * with Markdown.
 */

function addStackeditButtons(ticketId, ticketInfo, conversation) {
    if (conversation.classList.contains('lesa-ui-stackedit')) {
        return;
    }

    conversation.classList.add('lesa-ui-stackedit');

    var newComments = conversation.querySelectorAll('.zendesk-editor--rich-text-container .zendesk-editor--rich-text-comment');

    for (var i = 0; i < newComments.length; i++) {
        addUnderlineButton(newComments[i]);
        addStackeditButton(newComments[i], addJiraLinksToElement);
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

    var preElements = element.querySelectorAll('pre');

    for (var i = 0; i < preElements.length; i++) {
        preElements[i].style = '';
        preElements[i].innerHTML = preElements[i].innerHTML.replace(paragraphTag, '<$1code>');
    }

    stackedit.openFile({
        content: {
            text: turndownService.turndown(element.innerHTML)
        }
    });

    stackedit.on('fileChange', function(file) {
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

    var newComments = conversation.querySelectorAll('.zendesk-editor--rich-text-container .zendesk-editor--rich-text-comment');

    for (var i = 0; i < newComments.length; i++) {
        newComments[i].onblur = _.debounce(addJiraLinksToElement.bind(null, newComments[i]), 500);
    }

    var comments = conversation.querySelectorAll('div[data-comment-id]');

    for (var i = 0; i < comments.length; i++) {
        addJiraLinksToElement(comments[i]);
    }
}

/**
 * Add a playbook reminder to the given editor.
 */

function addPlaybookReminder(ticketId, ticketInfo, conversation) {
    var editor = conversation.querySelector('.editor');

    if (!editor) {
        return;
    }

    var playbookReminderElement = editor.parentElement.querySelector('.lesa-ui-playbook-reminder');

    if (playbookReminderElement) {
        return;
    }

    playbookReminderElement = document.createElement('div');
    playbookReminderElement.classList.add('lesa-ui-playbook-reminder');

    var reminders = [];

    var tags = (ticketInfo && ticketInfo.ticket && ticketInfo.ticket.tags) || [];
    var tagSet = new Set(tags);

    var subpriority = ticketInfo.ticket.priority || 'none';

    if (((subpriority == 'high') || (subpriority == 'urgent')) && tagSet.has('platinum')) {
        var criticalMarkers = ['production', 'production_completely_shutdown', 'production_severely_impacted_inoperable'].filter(Set.prototype.has.bind(tagSet));

        if (criticalMarkers.length >= 2) {
            reminders.push(['platinum critical', 'https://grow.liferay.com/people/How+To+Handle+Critical+Tickets', 'playbook']);
        }
    }

    playbookReminderElement.innerHTML = reminders.map(x => 'This is a <strong>' + x[0] + '</strong> ticket. Please remember to follow the <a href="' + x[1] + '">' + x[2] + '</a> !').join('<br/>');

    editor.parentElement.insertBefore(playbookReminderElement, editor);
}

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

var integerRegex = /^[0-9]*$/

function highlightComment(commentId, event) {
    if (!commentId && !document.location.search) {
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

    if (!commentId || !integerRegex.test(commentId)) {
        return;
    }

    var comment = document.querySelector('div[data-comment-id="' + commentId + '"]');

    if (!comment) {
        return;
    }

    var event = comment.closest('.event');

    if (event.classList.contains('lesa-ui-event-highlighted')) {
        return;
    }

    var commentURL = 'https://' + document.location.host + document.location.pathname + '?comment=' + commentId;

    history.pushState({path: commentURL}, '', commentURL);

    clearHighlightedComments();

    event.classList.add('lesa-ui-event-highlighted');
    event.scrollIntoView();
}

/**
 * Creates a self-highlighting input field.
 */

function createPermaLinkInputField(permalinkHREF) {
    var permalink = document.createElement('input');

    permalink.value = permalinkHREF;

    permalink.onclick = function() {
        this.setSelectionRange(0, this.value.length);
    };

    return permalink;
}

/**
 * Add the comment ID as a query string parameter to function as a
 * pseudo permalink (since this script scrolls to it).
 */

function addPermaLinks(ticketId, ticketInfo, conversation) {
    var permalinks = conversation.querySelectorAll('div[data-comment-id] div.lesa-ui-permalink');

    if (permalinks.length > 0) {
        return;
    }

    var comments = conversation.querySelectorAll('div[data-comment-id]');
    var isPublicTab = document.querySelector('.publicConversation.is-selected')

    for (var i = 0; i < comments.length; i++) {
        var commentId = comments[i].getAttribute('data-comment-id');

        var permalinkContainer = document.createElement('div');
        permalinkContainer.classList.add('lesa-ui-permalink');

        var permalinkHREF = 'https://' + document.location.host + document.location.pathname + '?comment=' + commentId;

        if (isPublicTab) {
            var pageId = Math.ceil((comments.length - i) / 30);
            permalinkHREF = 'https://help.liferay.com/hc/requests/' + ticketId + '?page=' + pageId + '#request_comment_' + commentId;
        }

        var permalink = createPermaLinkInputField(permalinkHREF);
        permalinkContainer.appendChild(permalink);

        var commentHeader = comments[i].querySelector('.content .header');
        commentHeader.appendChild(permalinkContainer);
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

function fixZenDeskLink(anchor, ticketId) {
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

        anchor.onclick = highlightComment.bind(null, commentId);
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

function fixHelpCenterLink(anchor, ticketId) {
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
        anchor.onclick = highlightComment.bind(null, commentId);
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
    var permalinks = conversation.querySelectorAll('div[data-comment-id] div.lesa-ui-permalink');

    if (permalinks.length > 0) {
        return;
    }

    var anchors = conversation.querySelectorAll('a');

    for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];

        fixZenDeskLink(anchor, ticketId);
        fixHelpCenterLink(anchor, ticketId);
    }
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
        mm = (mm < 10) ? '0' + mm : mm;
        var dd = value.getDate();
        dd = (dd < 10) ? '0' + dd : dd;
        var yyyy = value.getFullYear();

        value = mm + '/' + dd + '/' + yyyy;
    }

    // Make sure to call the right setter function so the underlying state is updated.

    var elementDescriptor = Object.getOwnPropertyDescriptor(element, 'value');
    var valueSetter = elementDescriptor && elementDescriptor.set;

    var prototype = Object.getPrototypeOf(element);
    var prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    var prototypeValueSetter = prototypeDescriptor && Object.getOwnPropertyDescriptor(prototype, 'value').set;

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
    var buttonField = document.querySelector('div[data-test-id=' + testId + ']');

    if (!buttonField.querySelector('div[aria-haspopup=true]')) {
        buttonField.querySelector('div[role=button]').click();
    }

    function clickSearchMenuOptions() {
        var searchMenu = document.querySelector('div[class*="ssc-scrollable"]');

        if (!searchMenu) {
            setTimeout(clickSearchMenuOptions, 100);
            return;
        }

        var options = searchMenu.querySelectorAll('div[class*="optionText"]');

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
    };

    setReactInputValue('input[data-test-id=' + testId + '-search]', value, clickSearchMenuOptions);
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

        var options = searchMenu.querySelectorAll('div[role=menuitem]');

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
    var nestedFunction = values.reverse().reduce(function(accumulator, x) { return addReactLabelValue.bind(null, testId, x, accumulator); }, callback);
    nestedFunction();
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
        var supportOffices = [];

        if ((assigneeGroup.indexOf('- AU') != -1) || (assigneeGroup.indexOf('- CN') != -1) || (assigneeGroup.indexOf('- JP') != -1)) {
            supportOffices.push('APAC');
        }

        if (assigneeGroup.indexOf('- AU') != -1) {
            supportOffices.push('AU/NZ');
        }

        if (assigneeGroup.indexOf('- BR') != -1) {
            supportOffices.push('Brazil');
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

        addReactLabelValues('customfield_11523', supportOffices, callback);
    }

    function setAffectsVersion(callback) {
        var value = (productVersion.indexOf('7_0') != -1) ? '7.0.10' :
            (productVersion.indexOf('7_1') != -1) ? '7.1.10' :
            (productVersion.indexOf('7_2') != -1) ? '7.2.10' : null;

        if (value) {
            addReactLabelValue('versions', value, callback);
        }
        else if (callback) {
            callback();
        }
    }

    function setDeliveryBaseFixPack(callback) {
        var conversations = ticket.conversations;
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

        setReactInputValue('input[data-test-id=customfield_22551]', Array.from(baselines).join(' '), callback)
    }

    function focusSummary() {
        document.querySelector('input[data-test-id=summary]').focus();
        document.getElementById('app').scrollIntoView();
    }

    var callOrder = [setProjectId, setSummary, setCustomerTicketCreationDate, setSupportOffice, setAffectsVersion, setDeliveryBaseFixPack, focusSummary];
    var nestedFunction = callOrder.reverse().reduce(function(accumulator, x) { return x.bind(null, accumulator); });
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
    if (!window.ZAFClient) {
        setTimeout(initZafClient, 1000);

        return;
    }

    var client = window.ZAFClient.init();
    client.on('app.registered', initZafParentClient.bind(null, client, callback));
}

/**
 * Shows the public conversation tab so that you can get help.liferay.com links to
 * share with customers.
 */

function enablePublicConversation(ticketId, ticketInfo, conversation) {
    var fullTab = conversation.querySelector('.event-nav.conversation .fullConversation');
    var publicTab = conversation.querySelector('.event-nav.conversation .publicConversation');

    if (parseInt(publicTab.getAttribute('data-count')) == 0) {
        publicTab.setAttribute('data-count', fullTab.getAttribute('data-count'));
    }
}

/**
 * Apply updates to the page based on the retrieved ticket information. Since the
 * ticket corresponds to a "conversation", find that conversation.
 */

function checkTicketConversation(ticketId, ticketInfo) {
    updateSidebarBoxContainer(ticketId, ticketInfo);

    var conversation = document.querySelector('div[data-side-conversations-anchor-id="' + ticketId + '"]');

    if (conversation) {
        var editor = conversation.querySelector('.editor');

        if (!editor) {
            return;
        }

        enablePublicConversation(ticketId, ticketInfo, conversation);
        addStackeditButtons(ticketId, ticketInfo, conversation);
        addJiraLinks(ticketId, ticketInfo, conversation);
        addPlaybookReminder(ticketId, ticketInfo, conversation);
        addTicketDescription(ticketId, ticketInfo, conversation);
        fixPermaLinkAnchors(ticketId, ticketInfo, conversation);
        addPermaLinks(ticketId, ticketInfo, conversation);
        updateWindowTitle(ticketId, ticketInfo);
    }

    highlightComment();
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

        var accountCode = getAccountCode(ticketId, ticketInfo, null);

        if (accountCode) {
            document.title = accountName + ' - ' + emojis + 'Agent Ticket - ' + accountCode + ' - ' + ticketInfo.ticket.raw_subject;
        }
        else {
            document.title = accountName + ' - ' + emojis + 'Agent Ticket - ' + ticketInfo.ticket.raw_subject;
        }

        return;
    }

    if (document.location.pathname.indexOf('/agent/filters/') == 0) {
        var filterElement = document.querySelector('.filter-title');

        if (filterElement) {
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

function updateSubtitle(tab, ticketId, ticketInfo) {
    var accountCode = getAccountCode(ticketId, ticketInfo, null);

    if (!accountCode) {
        return;
    }

    var oldSpan = tab.querySelector('.lesa-ui-subtitle');

    if (oldSpan && (oldSpan.textContent == accountCode)) {
        return;
    }

    var newSpan = document.createElement('span');
    newSpan.classList.add('lesa-ui-subtitle');

    var emojis = getEmojiText(ticketInfo.ticket.tags);

    if (emojis.length > 0) {
        newSpan.appendChild(document.createTextNode(emojis + ' '));
    }

    var accountCodeSpan = document.createElement('span');
    accountCodeSpan.classList.add('lesa-ui-account-code');
    accountCodeSpan.textContent = accountCode;

    newSpan.appendChild(accountCodeSpan);

    if (oldSpan) {
        oldSpan.replaceWith(newSpan);
    }
    else {
        tab.appendChild(newSpan);
    }
}

/**
 * Attempt to update the tab subtitles.
 */

function checkForSubtitles() {
    var subtitles = document.querySelectorAll('.subtitle');

    for (var i = 0; i < subtitles.length; i++) {
        var subtitle = subtitles[i];
        var tab = subtitle.parentNode;

        var textContent = subtitle.textContent.trim();

        if (textContent[0] != '#') {
            continue;
        }

        var ticketId = textContent.substring(1);

        checkTicket(ticketId, updateSubtitle.bind(null, tab));
    }
}

// Since there's an SPA framework in place that I don't fully understand,
// attempt to do everything once per second.

if (window.location.hostname == '24475.apps.zdusercontent.com') {
    setTimeout(initZafClient.bind(null, attachCopyFieldsLinkListener), 1000);
}
else {
    setInterval(checkForConversations, 1000);
    setInterval(checkForSubtitles, 1000);
    setInterval(checkSidebarTags, 1000);
}