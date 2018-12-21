// ==UserScript==
// @name           ZenDesk for TSEs
// @namespace      holatuwol
// @match          https://liferay-support.zendesk.com/*
// ==/UserScript==

function recreateLesaUI() {
  var header = document.querySelector('.pane_header');

  var attachments = document.querySelectorAll('.attachment');

  var comments = document.querySelectorAll('.zd-comment');
  var lastComment = comments[comments.length - 1];

  var description = document.createElement('div');
  description.style.fontWeight = 100;
  description.innerHTML = lastComment.innerHTML;

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
  header.appendChild(description);
}

setTimeout(recreateLesaUI, 5000);