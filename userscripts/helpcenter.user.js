// ==UserScript==
// @name           LESAfied Help Center
// @namespace      holatuwol
// @version        1.0
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/helpcenter.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/helpcenter.user.js
// @match          https://help.liferay.com/hc/en-us/requests/*
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');
var headerHeight = document.querySelector('.header').clientHeight;

styleElement.textContent = `
nav.pagination {
  display: none;
}

li.comment {
  scroll-margin: ${headerHeight}px;
}

.lesa-ui-event-highlighted {
  background-color: #eee;
}

.lesa-ui-permalink {
  margin-top: 0.5em;
  margin-bottom: 1em;
}

.lesa-ui-permalink > input {
  background-color: transparent;
  width: 100%;
  font-size: 0.9em;
  height: 1.2em;
  margin: 0em;
  padding: 0.2em;
}
`;

document.querySelector('head').appendChild(styleElement);

var availablePages = document.querySelectorAll('.pagination li');
var maxPageId = Math.max.apply(null, Array.from(availablePages).map(x => parseInt(x.textContent.trim())).filter(x => !Number.isNaN(x)));

var currentCommentList = document.querySelector('ul.comment-list');

/**
 * Load the comment list from the response XML, and then call the specified
 * callback once all pages have been loaded.
 */

function loadCommentList(pageId, callback) {
  var newCommentListItems = this.responseXML.querySelectorAll('ul.comment-list li');

  for (var j = 0; j < newCommentListItems.length; j++) {
    currentCommentList.appendChild(newCommentListItems[j]);
  };

  requestCommentList(pageId + 1, callback);
}

/**
 * Request a single page, and then call the specified callback once all pages
 * have been loaded.
 */

function requestCommentList(pageId, callback) {
  if (pageId > maxPageId) {
    return callback();
  }

  var xhr = new XMLHttpRequest();

  var href = 'https://' + document.location.host + document.location.pathname + '?page=' + pageId;

  xhr.onload = loadCommentList.bind(xhr, pageId, callback);
  xhr.open('GET', href, true);
  xhr.responseType = 'document';
  xhr.send();
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

function highlightComment(commentId, updateHistory) {
  if (commentId) {
    clearHighlightedComments();
  }
  else {
    if (document.location.hash && document.location.hash.indexOf('#request_comment_') == 0) {
      commentId = document.location.hash.substring(17);
    }
    else if (document.location.search && document.location.search.indexOf('?comment=') == 0) {
      commentId = document.location.search.substring(9);
    }

    if (!commentId) {
      clearHighlightedComments();

      return;
    }
  }

  if (!commentId || !integerRegex.test(commentId)) {
    return;
  }

  var comment = document.querySelector('#request_comment_' + commentId);

  if (!comment) {
    return;
  }

  if (updateHistory) {
    var commentURL = 'https://' + document.location.host + document.location.pathname + '#request_comment_' + commentId;

    history.pushState({path: commentURL}, '', commentURL);
  }

  if (comment.classList.contains('lesa-ui-event-highlighted')) {
    return;
  }

  comment.classList.add('lesa-ui-event-highlighted');
  comment.style.scrollMargin = headerHeight;
  comment.scrollIntoView();
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

function addPermaLinks() {
  if (currentCommentList.classList.contains('lesa-ui-permalink')) {
    return;
  }

  currentCommentList.classList.add('lesa-ui-permalink')

  var comments = currentCommentList.querySelectorAll('li.comment');

  for (var i = 0; i < comments.length; i++) {
    var commentId = comments[i].id.substring('request_comment_'.length);

    var permalinkContainer = document.createElement('div');
    permalinkContainer.classList.add('lesa-ui-permalink');

    var permalinkHREF = 'https://' + document.location.host + document.location.pathname + '#request_comment_' + commentId;
    var permalink = createPermaLinkInputField(permalinkHREF);

    permalinkContainer.appendChild(permalink);

    var commentHeader = comments[i].querySelector('.comment-meta');
    commentHeader.appendChild(permalinkContainer);
  }
}

function preparePermalinks() {
  addPermaLinks();
  highlightComment();
}

requestCommentList(2, preparePermalinks);
window.onhashchange = highlightComment.bind(null, null);