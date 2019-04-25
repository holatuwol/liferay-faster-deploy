// ==UserScript==
// @name           LESAfied Help Center
// @namespace      holatuwol
// @version        1.8
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/helpcenter.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/helpcenter.user.js
// @include        /https:\/\/help\.liferay\.com\/hc\/.*\/requests\/.*/
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');
var headerHeight = document.querySelector('.header').clientHeight;

styleElement.textContent = `
dl.request-attachments {
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

.lesa-ui-attachments {
  display: flex;
  flex-direction: row;
  margin-bottom: 2em;
}

.lesa-ui-attachment-info {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.lesa-ui-attachment-info a {
  margin-right: 1em;
}

.lesa-ui-attachments-label {
  font-weight: 600;
  margin-right: 1em;
}
`;

// Also allow disabling of pagination for testing purposes.

var isPaginated = !document.location.search || document.location.search.indexOf('page=0') == -1;

if (!isPaginated) {
  styleElement.textContent = styleElement.textContent + `
nav.pagination {
  display: none;
}

ul.comment-list {
  display: flex;
  flex-direction: column-reverse;
}

.comment-list .comment:first-child {
  border: none;
}

.comment-list .comment:last-child {
  border-top: 1px solid #ced3de;
}
`
}

document.querySelector('head').appendChild(styleElement);

var availablePages = document.querySelectorAll('.pagination li');
var currentPageItem = document.querySelector('nav.pagination .pagination-current');

var currentPageId = currentPageItem ? parseInt(currentPageItem.textContent) : 1;
var maxPageId = Math.max.apply(null, Array.from(availablePages).map(function(x) { return parseInt(x.textContent.trim()) }).filter(function(x) { return !Number.isNaN(x) })) || 1;

var currentCommentList = document.querySelector('ul.comment-list');

var commentPageLookup = {};

var pageCommentLookup = {};
pageCommentLookup[currentPageId] = currentCommentList;

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

  return link;
}

/**
 * Generate a single object representing the metadata for the attachment.
 */

function extractAttachmentLinkMetadata(attachmentLink) {
  var comment = attachmentLink.closest('li.comment');

  // Since we're using the query string in order to determine the name (since the actual text
  // in the link has a truncated name), we need to decode the query string.

  var encodedFileName = attachmentLink.href.substring(attachmentLink.href.indexOf('?') + 6);
  encodedFileName = encodedFileName.replace(/\+/g, '%20');
  var attachmentFileName = decodeURIComponent(encodedFileName);

  return {
    text: attachmentFileName,
    href: attachmentLink.href,
    download: attachmentFileName,
    commentId: comment.id.substring(16),
    author: comment.querySelector('.comment-author').title,
    time: comment.querySelector('time').getAttribute('datetime'),
    timestamp: comment.querySelector('time').getAttribute('datetime')
  }
}

/**
 * Generate a single object representing the metadata for an external link.
 */

function extractExternalLinkMetadata(externalLink) {
  var comment = externalLink.closest('li.comment');

  // Since we're using the query string in order to determine the name (since the actual text
  // in the link has a truncated name), we need to decode the query string.

  return {
    text: externalLink.textContent,
    href: externalLink.href,
    download: externalLink.textContent,
    commentId: comment.id.substring(16),
    author: comment.querySelector('.comment-author').title,
    time: comment.querySelector('time').getAttribute('datetime'),
    timestamp: comment.querySelector('time').getAttribute('datetime')
  }
}

/**
 * Generate a single row in the attachment table based on the provided link.
 */

function createAttachmentRow(attachment) {
  var attachmentInfo = document.createElement('div');
  attachmentInfo.classList.add('lesa-ui-attachment-info')

  var attachmentLink = createAnchorTag(attachment.text, attachment.href, attachment.download);
  attachmentLink.classList.add('attachment');
  attachmentInfo.appendChild(attachmentLink);

  // Attach an author and a timestamp. We'll have the timestamp be a comment permalink, since
  // other parts in this script provide us with that functionality.

  var attachmentExtraInfo = document.createElement('div');

  attachmentExtraInfo.appendChild(document.createTextNode(attachment.author + ' on '));

  var commentId = attachment.commentId;
  var pageId = commentPageLookup[commentId];

  var commentURL = '#request_comment_' + commentId;

  if (isPaginated && (pageId != currentPageId)) {
    commentURL = 'https://' + document.location.host + document.location.pathname + '?page=' + pageId + '#request_comment_' + commentId;
  }

  var attachmentCommentLink = createAnchorTag(attachment.time, commentURL);
  attachmentCommentLink.classList.add('attachment-comment-link');

  attachmentExtraInfo.appendChild(attachmentCommentLink)
  attachmentInfo.appendChild(attachmentExtraInfo);

  return attachmentInfo;
}

/**
 * Create a container to hold all of the attachments in the ticket, and a convenience
 * link which allows the user to download all of the attachments at once.
 */

function createAttachmentsContainer() {
  var attachmentLinks = [];
  var externalLinks = [];

  for (key in pageCommentLookup) {
    var comments = pageCommentLookup[key];

    Array.prototype.push.apply(attachmentLinks, Array.from(comments.querySelectorAll('.attachment-item > a')));
    Array.prototype.push.apply(externalLinks, Array.from(comments.querySelectorAll('.zd-comment > a:not(.attachment)')));
  }

  if (attachmentLinks.length + externalLinks.length == 0) {
    return null;
  }

  var attachmentsContainer = document.createElement('div');
  attachmentsContainer.classList.add('lesa-ui-attachments')

  var attachmentsLabel = document.createElement('div');
  attachmentsLabel.classList.add('lesa-ui-attachments-label')
  attachmentsLabel.innerHTML = 'Attachments:';

  attachmentsContainer.appendChild(attachmentsLabel);

  var attachmentsWrapper = document.createElement('div');

  // Accumulate the attachments, and then sort them by date

  var attachments = [];

  for (var i = 0; i < attachmentLinks.length; i++) {
    attachments.push(extractAttachmentLinkMetadata(attachmentLinks[i]));
  }

  for (var i = 0; i < externalLinks.length; i++) {
    if (externalLinks[i].href.indexOf('ticketAttachmentId') != -1) {
      attachments.push(extractExternalLinkMetadata(externalLinks[i]));
    }
  }

  attachments.sort(function(a, b) {
    return a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 :
      a.text > b.text ? 1 : a.text < b.text ? -1 : 0;
  })

  // Generate the table and a 'download all' link for convenience

  for (var i = 0; i < attachments.length; i++) {
    attachmentsWrapper.appendChild(createAttachmentRow(attachments[i]));
  }

  attachmentsContainer.appendChild(attachmentsWrapper);

  return attachmentsContainer;
}

/**
 * Add a ticket description and a complete list of attachments to the top of the page.
 */

function addAttachments() {

  // Generate something to hold all of our attachments.

  var attachmentsContainer = createAttachmentsContainer();

  if (attachmentsContainer) {
    currentCommentList.parentNode.insertBefore(attachmentsContainer, currentCommentList);
  }
}

/**
 * Process any comments that we've loaded.
 */

function processCommentList(pageId, newCommentListItems) {
  for (var j = 0; j < newCommentListItems.length; j++) {
    var commentId = newCommentListItems[j].id.substring(16);

    commentPageLookup[commentId] = pageId;
  }
}

/**
 * Load the comment list from the response XML, and then call the specified
 * callback once all pages have been loaded.
 */

function loadCommentList(pageId, callback) {
  pageCommentLookup[pageId] = this.responseXML.querySelector('ul.comment-list');

  var newCommentListItems = this.responseXML.querySelectorAll('ul.comment-list > li');

  processCommentList(pageId, newCommentListItems);

  if (!isPaginated) {
    for (var j = 0; j < newCommentListItems.length; j++) {
      currentCommentList.appendChild(newCommentListItems[j]);
    }
  }

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

  if (pageId in pageCommentLookup) {
    requestCommentList(pageId + 1, callback);

    return;
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

function highlightComment(commentId, event) {
  if (!commentId && !document.location.search && !document.location.hash) {
    clearHighlightedComments();

    return;
  }

  if (!commentId && document.location.search && document.location.search.indexOf('?comment=') == 0) {
    commentId = document.location.search.substring(9);

    var pos = commentId.indexOf('&');

    if (pos != -1) {
      commentId = commentId.substring(0, pos);
    }
  }
  else if (!commentId && document.location.hash && document.location.hash.indexOf('#request_comment_') == 0) {
    commentId = document.location.hash.substring(17);
  }

  if (!commentId || !integerRegex.test(commentId)) {
    return;
  }

  var comment = document.querySelector('#request_comment_' + commentId);
  var pageId = commentPageLookup[commentId];

  if (!comment && !pageId) {
    return;
  }

  if (!pageId) {
    pageId = currentPageId;
  }

  var commentURL = 'https://' + document.location.host + document.location.pathname + '?page=' + pageId + '#request_comment_' + commentId;

  if (!comment) {
    document.location.href = commentURL;

    return;
  }

  history.pushState({path: commentURL}, '', commentURL);

  if (comment.classList.contains('lesa-ui-event-highlighted')) {
    return;
  }

  clearHighlightedComments();

  comment.classList.add('lesa-ui-event-highlighted');
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

function addPermaLinks(defaultPageId) {
  if (currentCommentList.classList.contains('lesa-ui-permalink')) {
    return;
  }

  currentCommentList.classList.add('lesa-ui-permalink')

  var comments = currentCommentList.querySelectorAll('li.comment');

  for (var i = 0; i < comments.length; i++) {
    var commentId = comments[i].id.substring('request_comment_'.length);

    var permalinkContainer = document.createElement('div');
    permalinkContainer.classList.add('lesa-ui-permalink');

    var pageId = commentPageLookup[commentId] || defaultPageId;

    var permalinkHREF = 'https://' + document.location.host + document.location.pathname + '?page=' + pageId + '#request_comment_' + commentId;
    var permalink = createPermaLinkInputField(permalinkHREF);

    permalinkContainer.appendChild(permalink);

    var commentHeader = comments[i].querySelector('.comment-meta');
    commentHeader.appendChild(permalinkContainer);
  }
}

/**
 * Moves the comment form to the top of the page.
 */

function moveRequestCommentForm() {
  var requestCommentForm = document.getElementById('requestCommentForm');

  requestCommentForm.parentNode.insertBefore(requestCommentForm, currentCommentList);
}

/**
 * Utility function to prepare paginated pages.
 */

function preparePaginatedPage() {
  addAttachments();
  highlightComment();
}

/**
 * Utility function to prepare unpaginated pages.
 */

function prepareUnpaginatedPage() {
  addAttachments();
  moveRequestCommentForm();
  addPermaLinks();
  highlightComment();
}

processCommentList(currentPageId, document.querySelectorAll('ul.comment-list > li'));

if (isPaginated) {
  addPermaLinks(currentPageId);
  highlightComment();

  requestCommentList(1, preparePaginatedPage);
}
else {
  requestCommentList(2, prepareUnpaginatedPage);
}

window.onhashchange = highlightComment.bind(null, null);