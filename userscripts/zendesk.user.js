// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @match          https://liferay-support.zendesk.com/*
// ==/UserScript==

/**
 * Utility function to generate the div for a single attachment
 */

function createAttachmentRow(attachment) {
  var attachmentComment = attachment.closest('div[data-comment-id]');

  var attachmentInfo = document.createElement('div');
  attachmentInfo.style.display = 'flex';
  attachmentInfo.style.flexDirection = 'row';
  attachmentInfo.style.justifyContent = 'space-between';

  var attachmentLink = document.createElement('a');

  attachmentLink.innerText = attachment.href.substring(attachment.href.indexOf('?') + 6);
  attachmentLink.href = attachment.href;
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

  var label = document.createElement('label');
  label.innerHTML = labelText;

  formField.appendChild(label);

  for (var i = 0; i < formElements.length; i++) {
    formField.appendChild(formElements[i]);
  }

  var oldFormField = propertyBox.querySelector('.' + className);

  if (oldFormField) {
    propertyBox.replaceChild(formField, oldFormField);
  }
  else {
    propertyBox.appendChild(formField);
  }
}

/**
 * Utility function to add the "Organization" field to the sidebar.
 */

function addOrganizationField(propertyBox, ticketInfo) {
  console.log(ticketInfo);

  if (!ticketInfo.organizations || (ticketInfo.organizations.length != 1)) {
    return;
  }

  var organizationInfo = ticketInfo.organizations[0];
  var organizationFields = organizationInfo.organization_fields;

  var helpCenterLink = document.createElement('a');

  helpCenterLink.target = '_blank';

  helpCenterLink.href = [
    'https://customer.liferay.com/project-details',
    '?p_p_id=com_liferay_osb_customer_account_entry_details_web_AccountEntryDetailsPortlet',
    '&_com_liferay_osb_customer_account_entry_details_web_AccountEntryDetailsPortlet_mvcRenderCommandName=%2Fview_account_entry',
    '&_com_liferay_osb_customer_account_entry_details_web_AccountEntryDetailsPortlet_accountEntryId=',
    organizationInfo.external_id
  ].join('');

  helpCenterLink.innerHTML = organizationFields.account_code

  var slaText = document.createTextNode(' (' + organizationFields.sla.toUpperCase() + ')');

  generateFormField(propertyBox, 'organization_id', 'Organization', [helpCenterLink, slaText])
}

/**
 * Update the sidebar with any ticket details we can pull from the ZenDesk API.
 */

function updateSidebarBoxContainer() {
  var ticketPath = '/agent/tickets/';

  if (document.location.href.indexOf(ticketPath) == -1) {
    return;
  }

  var ticketId = document.location.href.substring(document.location.href.indexOf(ticketPath) + ticketPath.length);

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
      propertyBoxes[i].setAttribute('data-ticket-id', ticketId);
      addOrganizationField(propertyBoxes[i], ticketInfo);
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

function recreateLesaUI(conversation) {
  var header = conversation.querySelector('.pane_header');

  if (!header) {
    return;
  }

  if (header.classList.contains('lesa-ui')) {
    return;
  }

  header.classList.add('lesa-ui');

  var comments = conversation.querySelectorAll('.zd-comment');

  if (comments.length == 0) {
    return;
  }

  var attachments = conversation.querySelectorAll('.attachment');

  var lastComment = comments[comments.length - 1];

  var description = document.createElement('div');
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
  updateSidebarBoxContainer();

  var conversations = document.querySelectorAll('div[data-side-conversations-anchor-id]');

  for (var i = 0; i < conversations.length; i++) {
    recreateLesaUI(conversations[i]);
  }
}

setInterval(checkForConversations, 1000)