// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @match          https://liferay-support.zendesk.com/*
// @grant          none
// @require        https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
// ==/UserScript==

var styleElement = document.createElement('style');

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

.lesa-ui-attachments {
  display: flex;
  flex-direction: row;
  margin-top: 1em;
}

.lesa-ui-attachment-info {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.lesa-ui-attachment-info a {
  margin-right: 1em;
}

.lesa-ui-attachments-download-all {
  margin-top: 0.5em;
  text-align: right;
  text-decoration: underline;
}

.lesa-ui-attachments-label {
  font-weight: 600;
  margin-right: 1em;
}

.lesa-ui-description {
  font-weight: 100;
}

.lesa-ui-event-highlighted {
  background-color: #eee;
}

.lesa-ui-form-field {
  display: flex;
  flex-direction: column;
}

.lesa-ui-permalink {
  margin-bottom: 1em;
}

.lesa-ui-permalink input {
  background-color: transparent;
  width: 100%;
}
`;

document.querySelector('head').appendChild(styleElement);

/**
 * Utility function to generate a URL to patcher portal's accounts view.
 */

function getPatcherPortalAccountsHREF(params) {
  var portletId = '1_WAR_osbpatcherportlet';
  var ns = '_' + portletId + '_';

  var queryString = Object.keys(params).map(key => (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + params[key]).join('&');
  return 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?p_p_id=' + portletId + '&' + queryString;
}

/**
 * Utility function to retrieve the Liferay version from the sidebar.
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
 * Utility function to indicate which patcher portal product version ID to use.
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
 * Utility function to download the attachment mentioned in the
 * specified link, and then invoke a callback once the download
 * has completed.
 */

function downloadAttachment(link, callback) {
  link.classList.add('downloading');

  var xhr = new XMLHttpRequest();
  xhr.responseType = 'blob';

  xhr.onload = function() {
    callback(link.download, this.response);
    link.classList.remove('downloading');
  };

  xhr.open('GET', link.href);
  xhr.send(null);
}

/**
 * Utility function to download a generated Blob object.
 */

function downloadBlob(fileName, blob) {
  var blobURL = URL.createObjectURL(blob);

  var downloadLink = createAnchorTag(fileName, blobURL);
  downloadLink.download = fileName;

  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(function() {
    URL.revokeObjectURL(blobURL);
  }, 1000);
}

/**
 * Function to generate an anchor tag.
 */

function createAnchorTag(text, href, download) {
  var link = document.createElement('a');

  link.textContent = text;

  if (href) {
    link.href = href;
  }

  if (download) {
    link.download = download;
  }
  else {
    link.target = '_blank';
  }

  var isDownloadImage = download && ((download.indexOf('.png') != -1) || (download.indexOf('.jpg') != -1) || (download.indexOf('.jpeg') != -1) || (download.indexOf('.gif') != -1));

  if (isDownloadImage) {
    link.onclick = function() {
      downloadAttachment(link, downloadBlob);
      return false;
    };
  }

  return link;
}

/**
 * Utility function to generate the div for a single attachment
 */

function createAttachmentRow(attachment) {
  var attachmentComment = attachment.closest('div[data-comment-id]');

  var attachmentInfo = document.createElement('div');
  attachmentInfo.classList.add('lesa-ui-attachment-info')

  var encodedFileName = attachment.href.substring(attachment.href.indexOf('?') + 6);
  encodedFileName = encodedFileName.replace(/\+/g, '%20');
  var attachmentFileName = decodeURIComponent(encodedFileName);

  var attachmentLink = createAnchorTag(attachmentFileName, attachment.href, attachmentFileName);
  attachmentInfo.appendChild(attachmentLink);

  var attachmentExtraInfo = document.createElement('div');
  var attachmentAuthor = attachmentComment.querySelector('div.actor .name').textContent;
  var attachmentTime = attachmentComment.querySelector('time').title;

  attachmentExtraInfo.appendChild(document.createTextNode(attachmentAuthor + ' on ' + attachmentTime));

  attachmentInfo.appendChild(attachmentExtraInfo);

  return attachmentInfo;
}

/**
 * Utility function to generate a zip file containing all items.
 */

function createAttachmentZip(ticketId) {
  var instance = this;

  instance.classList.add('downloading');

  var downloadCount = 0;

  var zip = new JSZip();

  var attachmentLinks = document.querySelectorAll('div[data-side-conversations-anchor-id="' + ticketId + '"] .lesa-ui-attachment-info a');

  for (var i = 0; i < attachmentLinks.length; i++) {
    downloadAttachment(attachmentLinks[i], function(fileName, blob) {
      zip.file(fileName, blob);

      if (++downloadCount < attachmentLinks.length) {
        return;
      }

      instance.classList.remove('downloading');
      instance.classList.add('generating');

      zip.generateAsync({
        type: 'blob'
      }).then(function(blob) {
        var downloadLink = createAnchorTag('Download ' + ticketId + '.zip', URL.createObjectURL(blob), ticketId + '.zip');
        downloadLink.classList.add('.lesa-ui-attachments-download-blob');

        instance.parentNode.replaceChild(downloadLink, instance);
      });
    })
  }
}

/**
 * Utility function to generate a single dummy field to add to the sidebar.
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
 * Utility function to add the "Organization" field to the sidebar.
 */

function addOrganizationField(propertyBox, ticketInfo) {
  if (!ticketInfo.organizations || (ticketInfo.organizations.length != 1)) {
    return;
  }

  var organizationInfo = ticketInfo.organizations[0];
  var organizationFields = organizationInfo.organization_fields;

  var helpCenterLinkHREF = [
    'https://customer.liferay.com/project-details',
    '?p_p_id=com_liferay_osb_customer_account_entry_details_web_AccountEntryDetailsPortlet',
    '&_com_liferay_osb_customer_account_entry_details_web_AccountEntryDetailsPortlet_mvcRenderCommandName=%2Fview_account_entry',
    '&_com_liferay_osb_customer_account_entry_details_web_AccountEntryDetailsPortlet_accountEntryId=',
    organizationInfo.external_id
  ].join('');

  var helpCenterLink = createAnchorTag(organizationFields.account_code, helpCenterLinkHREF);

  var container = document.createElement('div');

  container.appendChild(helpCenterLink);
  container.appendChild(document.createTextNode(' '));
  container.appendChild(document.createTextNode('(' + organizationFields.sla.toUpperCase() + ')'));

  generateFormField(propertyBox, 'organization_id', 'Organization', [container]);
}

/**
 * Utility function to add Patcher Portal fields to the sidebar.
 */

function addPatcherPortalField(propertyBox, ticketInfo) {
  if (!ticketInfo.organizations || (ticketInfo.organizations.length != 1)) {
    return;
  }

  var organizationInfo = ticketInfo.organizations[0];
  var organizationFields = organizationInfo.organization_fields;

  var links = [];

  var allBuildsLinkHREF = getPatcherPortalAccountsHREF({
    'patcherBuildAccountEntryCode': organizationFields.account_code
  });

  links.push(createAnchorTag('All Builds', allBuildsLinkHREF));

  var version = getProductVersion(propertyBox);

  if (version) {
    var versionBuildsLinkHREF = getPatcherPortalAccountsHREF({
      'patcherBuildAccountEntryCode': organizationFields.account_code,
      'patcherProductVersionId': getProductVersionId(version)
    });

    links.push(createAnchorTag(version + ' Builds', versionBuildsLinkHREF));
  }

  generateFormField(propertyBox, 'patcher_portal', 'Patcher Portal', links);
}

/**
 * Update the sidebar with any ticket details we can pull from the ZenDesk API.
 */

function updateSidebarBoxContainer(ticketId) {
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

    if (propertyBox.getAttribute('data-ticket-id') != ticketId) {
      propertyBox.setAttribute('data-ticket-id', ticketId);
      propertyBoxes.push(propertyBox);
    }
  }

  if (propertyBoxes.length == 0) {
    return;
  }

  var xhr = new XMLHttpRequest();

  xhr.onload = function() {
    var ticketInfo;

    try {
      ticketInfo = JSON.parse(xhr.responseText);
    }
    catch (e) {
      return;
    }

    for (var i = 0; i < propertyBoxes.length; i++) {
      addOrganizationField(propertyBoxes[i], ticketInfo);
      addPatcherPortalField(propertyBoxes[i], ticketInfo);
    }
  };

  var ticketDetailsURL = [
    'https://liferay-support.zendesk.com/api/v2/tickets/',
    ticketId,
    '?include=organizations'
  ].join('');

  xhr.open('GET', ticketDetailsURL);
  xhr.send();
}

/**
 * Function to add the description and attachments to the top of the page.
 */

function addTicketDescription(ticketId, conversation) {
  var header = conversation.querySelector('.pane_header');

  if (!header) {
    return;
  }

  var oldDescriptions = conversation.querySelectorAll('.lesa-ui-description');

  var hasNewDescription = false;

  for (var i = 0; i < oldDescriptions.length; i++) {
    if (oldDescriptions[i].getAttribute('data-ticket-id') == ticketId) {
      hasNewDescription = true;
    }
    else {
      var oldDownloadURLs = oldDescriptions[i].querySelectorAll('.lesa-ui-attachments-download-blob');

      for (var j = 0; j < oldDownloadURLs.length; j++) {
        URL.revokeObjectURL(oldDownloadURLs[j].href);
      }

      header.removeChild(oldDescriptions[i]);
    }
  }

  if (hasNewDescription) {
    return;
  }

  var comments = conversation.querySelectorAll('.event.is-public .zd-comment');

  if (comments.length == 0) {
    return;
  }

  var attachments = conversation.querySelectorAll('.attachment');

  var lastComment = comments[comments.length - 1];

  var description = document.createElement('div');

  description.classList.add('comment');

  description.innerHTML = lastComment.innerHTML;

  if (attachments.length > 0) {
    var attachmentsContainer = document.createElement('div');
    attachmentsContainer.classList.add('lesa-ui-attachments')

    var attachmentsLabel = document.createElement('div');
    attachmentsLabel.classList.add('lesa-ui-attachments-label')
    attachmentsLabel.innerHTML = 'Attachments:';

    attachmentsContainer.appendChild(attachmentsLabel);

    var attachmentsWrapper = document.createElement('div');

    for (var i = 0; i < attachments.length; i++) {
      attachmentsWrapper.appendChild(createAttachmentRow(attachments[i]));
    }

    if (JSZip) {
      var downloadAllContainer = document.createElement('div');
      downloadAllContainer.classList.add('lesa-ui-attachments-download-all');

      var attachmentsZipLink = createAnchorTag('Generate Download All', null);
      attachmentsZipLink.onclick = createAttachmentZip.bind(attachmentsZipLink, ticketId);

      downloadAllContainer.appendChild(attachmentsZipLink);

      attachmentsWrapper.appendChild(downloadAllContainer);
    }

    attachmentsContainer.appendChild(attachmentsWrapper);

    description.appendChild(attachmentsContainer);
  }

  var descriptionAncestor1 = document.createElement('div');
  descriptionAncestor1.classList.add('lesa-ui-description');
  descriptionAncestor1.setAttribute('data-ticket-id', ticketId);
  descriptionAncestor1.classList.add('rich_text');

  var descriptionAncestor0 = document.createElement('div');
  descriptionAncestor0.classList.add('event');
  descriptionAncestor0.classList.add('is-public');

  descriptionAncestor1.appendChild(descriptionAncestor0);
  descriptionAncestor0.appendChild(description);

  header.appendChild(descriptionAncestor1);
}

/**
 * Scroll to a specific comment if its comment ID is included in a
 * query string parameter.
 */

function highlightComment() {
  var commentString = '?comment=';

  if (!document.location.search || (document.location.search.indexOf(commentString) != 0)) {
    return;
  }

  var commentId = document.location.search.substring(commentString.length);

  var comment = document.querySelector('div[data-comment-id="' + commentId + '"]');

  if (!comment) {
    return;
  }

  var event = comment.closest('.event');

  if (event.classList.contains('lesa-ui-event-highlighted')) {
    return;
  }

  event.classList.add('lesa-ui-event-highlighted');
  event.scrollIntoView();
}

/**
 * Add the comment ID as a query string parameter to function as a
 * pseudo permalink (since this script scrolls to it).
 */

function addPermaLinks(ticketId, conversation) {
  var permalinks = conversation.querySelectorAll('div[data-comment-id] div.lesa-ui-permalink');

  if (permalinks.length > 0) {
    return;
  }

  var comments = conversation.querySelectorAll('div[data-comment-id]');

  for (var i = 0; i < comments.length; i++) {
    var commentId = comments[i].getAttribute('data-comment-id');

    var permalinkContainer = document.createElement('div');
    permalinkContainer.classList.add('lesa-ui-permalink');

    var permalinkHREF = 'https://liferay-support.zendesk.com' + document.location.pathname + '?comment=' + commentId;
    var permalink = document.createElement('input');

    permalink.value = permalinkHREF;

    permalink.onclick = function() {
      this.setSelectionRange(0, this.value.length);
    };

    permalinkContainer.appendChild(permalink);

    var commentHeader = comments[i].querySelector('.content .header');
    commentHeader.appendChild(permalinkContainer);
  }
}

/**
 * Regularly attempt to apply the updates.
 */

function checkForConversations() {
  var ticketPath = '/agent/tickets/';

  if (document.location.pathname.indexOf(ticketPath) == 0) {
    var ticketId = document.location.pathname.substring(ticketPath.length);

    updateSidebarBoxContainer(ticketId);

    var conversation = document.querySelector('div[data-side-conversations-anchor-id="' + ticketId + '"]');

    if (conversation) {
      addTicketDescription(ticketId, conversation);
      addPermaLinks(ticketId, conversation);
    }

    highlightComment();
  }
}

setInterval(checkForConversations, 1000);