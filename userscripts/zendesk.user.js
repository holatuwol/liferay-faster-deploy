// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @match          https://liferay-support.zendesk.com/*
// ==/UserScript==

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
    var attachmentUL = document.createElement('ul');
    attachmentUL.style.listStyle = 'disc';

    for (var i = 0; i < attachments.length; i++) {
      var attachmentLI = document.createElement('li');

      var attachmentLink = document.createElement('a');

      attachmentLink.innerText = attachments[i].href.substring(attachments[i].href.indexOf('?') + 6);
      attachmentLink.href = attachments[i].href;

      attachmentLI.appendChild(attachmentLink);
      attachmentUL.appendChild(attachmentLI);
    }

    description.appendChild(attachmentUL);
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