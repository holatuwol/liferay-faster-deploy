// ==UserScript==
// @name           ZenDesk Compose with Stackedit
// @namespace      holatuwol
// @license        0BSD
// @version        1.0
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/zendesk_stackedit_html.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/zendesk_stackedit_html.user.js
// @match          https://*.zendesk.com/agent/*
// @grant          none
// @require        https://unpkg.com/stackedit-js@1.0.7/docs/lib/stackedit.min.js
// @require        https://unpkg.com/turndown@5.0.3/dist/turndown.js
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
.lesa-ui-stackedit-icon {
  height: 16px;
  width: 16px;
  padding: 4px;
}
`;

document.querySelector('head').appendChild(styleElement);

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

  stackedit.on('fileChange', (file) => {
    element.innerHTML = file.content.html;

    if (callback) {
      callback(element);
    }
  });
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
    addStackeditButton(newComments[i]);
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

    }
    else {
      var conversation = document.querySelector('div[data-side-conversations-anchor-id="' + ticketId + '"]');

      if (conversation) {
        addStackeditButtons(ticketId, null, conversation);
      }
    }
  }
  else {

  }
}

setInterval(checkForConversations, 1000);