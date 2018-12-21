// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @match          https://liferay-support.zendesk.com/*
// ==/UserScript==

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

function recreateLesaUI(conversation) {
  if (conversation.classList.contains('lesa-ui')) {
    return;
  }

  var header = conversation.querySelector('.pane_header');

  if (!header) {
    return;
  }

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

  conversation.classList.add('lesa-ui');
}

function checkForConversations() {
  var conversations = document.querySelectorAll('div[data-side-conversations-anchor-id]');

  for (var i = 0; i < conversations.length; i++) {
    recreateLesaUI(conversations[i]);
  }
}

setInterval(checkForConversations, 1000)