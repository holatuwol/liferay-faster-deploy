// ==UserScript==
// @name           ZenDesk Comment Permalinks
// @namespace      holatuwol
// @match          https://*.zendesk.com/*
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
.lesa-ui-event-highlighted {
  background-color: #eee;
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
 * Scroll to a specific comment if its comment ID is included in a
 * query string parameter.
 */

function highlightComment(commentId) {
  if (commentId) {
    var highlightedComments = document.querySelectorAll('.lesa-ui-event-highlighted');

    for (var i = 0; i < highlightedComments.length; i++) {
      highlightedComments[i].classList.remove('lesa-ui-event-highlighted');
    }
  }
  else {
    var commentString = '?comment=';

    if (!document.location.search || (document.location.search.indexOf(commentString) != 0)) {
      return;
    }

    commentId = document.location.search.substring(commentString.length);
  }

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

    var permalinkHREF = 'https://' + document.location.host + document.location.pathname + '?comment=' + commentId;
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
 * Since there's an SPA framework in place that I don't fully understand, attempt to
 * apply updates once per second, once we have the ticket information.
 */

function checkForConversations() {
  var ticketPath = '/agent/tickets/';

  if (document.location.pathname.indexOf(ticketPath) == 0) {
    var ticketId = document.location.pathname.substring(ticketPath.length);

    var conversation = document.querySelector('div[data-side-conversations-anchor-id="' + ticketId + '"]');

    if (conversation) {
      addPermaLinks(ticketId, conversation);
    }

    highlightComment();
  }
}

setInterval(checkForConversations, 1000);