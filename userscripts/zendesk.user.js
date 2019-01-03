// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @match          https://liferay-support.zendesk.com/*
// ==/UserScript==

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

  var version = productVersionField.innerText.trim();

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

  if (version == '6.2') {
    return '101625503';
  }

  if (version == '6.1') {
    return '101625503';
  }

  return '';
}

/**
 * Function to generate an anchor tag.
 */

function createAnchorTag(text, href) {
  var link = document.createElement('a');

  link.innerText = text;
  link.href = href;
  link.target = '_blank';

  return link;
}

/**
 * Utility function to generate the div for a single attachment
 */

function createAttachmentRow(attachment) {
  var attachmentComment = attachment.closest('div[data-comment-id]');

  var attachmentInfo = document.createElement('div');
  attachmentInfo.style.display = 'flex';
  attachmentInfo.style.flexDirection = 'row';
  attachmentInfo.style.justifyContent = 'space-between';

  var attachmentLink = createAnchorTag(decodeURIComponent(attachment.href.substring(attachment.href.indexOf('?') + 6)), attachment.href);
  attachmentLink.style.paddingRight = '1em';

  attachmentInfo.appendChild(attachmentLink);

  var attachmentExtraInfo = document.createElement('div');
  attachmentInfo.style.align = 'right';

  var attachmentAuthor = attachmentComment.querySelector('div.actor .name').innerText;
  var attachmentTime = attachmentComment.querySelector('time').title;

  attachmentExtraInfo.appendChild(document.createTextNode(attachmentAuthor + ' on ' + attachmentTime));

  attachmentInfo.appendChild(attachmentExtraInfo);

  return attachmentInfo;
}

/**
 * Utility function to generate a single dummy field to add to the sidebar.
 */

function generateFormField(propertyBox, className, labelText, formElements) {
  var formField = document.createElement('div');
  formField.classList.add('ember-view');
  formField.classList.add('form_field');
  formField.classList.add('lesa-ui');
  formField.classList.add(className);

  formField.style.display = 'flex';
  formField.style.flexDirection = 'column';

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

  var added = false;
  var xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
    if (added || xhr.readyState != 4 || xhr.status != 200) {
      return;
    }

    added = true;

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
 * Update the conversation view with the attachments and the first comment.
 */

function recreateLesaUI(ticketId, conversation) {
  var header = conversation.querySelector('.pane_header');

  if (!header) {
    return;
  }

  var oldDescriptions = header.querySelectorAll('.lesa-ui');

  if ((header.getAttribute('data-ticket-id') == ticketId) && (oldDescriptions.length == 1)) {
    return;
  }

  header.setAttribute('data-ticket-id', ticketId);

  for (var i = 0; i < oldDescriptions.length; i++) {
    header.removeChild(oldDescriptions[i]);
  }

  var comments = conversation.querySelectorAll('.zd-comment');

  if (comments.length == 0) {
    return;
  }

  var attachments = conversation.querySelectorAll('.attachment');

  var lastComment = comments[comments.length - 1];

  var description = document.createElement('div');
  description.classList.add('lesa-ui');
  description.style.fontWeight = 100;
  description.innerHTML = lastComment.innerHTML;

  if (attachments.length > 0) {
    var attachmentsContainer = document.createElement('div');
    attachmentsContainer.style.display = 'flex';
    attachmentsContainer.style.flexDirection = 'row';
    attachmentsContainer.style.paddingTop = '1em';

    var attachmentsLabel = document.createElement('div');
    attachmentsLabel.innerHTML = 'Attachments:';
    attachmentsLabel.style.fontWeight = 600;
    attachmentsLabel.style.paddingRight = '1em';

    attachmentsContainer.appendChild(attachmentsLabel);

    var attachmentsWrapper = document.createElement('div');

    for (var i = 0; i < attachments.length; i++) {
      attachmentsWrapper.appendChild(createAttachmentRow(attachments[i]));
    }

    attachmentsContainer.appendChild(attachmentsWrapper);

    description.appendChild(attachmentsContainer);
  }

  header.appendChild(description);
}

/**
 * Regularly attempt to apply the updates.
 */

function checkForConversations() {
  var ticketPath = '/agent/tickets/';

  if (document.location.href.indexOf(ticketPath) != -1) {
    var ticketId = document.location.href.substring(document.location.href.indexOf(ticketPath) + ticketPath.length);

    updateSidebarBoxContainer(ticketId);

    var conversation = document.querySelector('div[data-side-conversations-anchor-id="' + ticketId + '"]');

    if (conversation) {
      recreateLesaUI(ticketId, conversation);
    }
  }
}

setInterval(checkForConversations, 1000);