// ==UserScript==
// @name           Hide Older Liferay Continuous Integration Test Results
// @namespace      holatuwol
// @version        0.2
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_hide_liferayci.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_hide_liferayci.user.js
// @match          https://github.com/*
// @grant          none
// ==/UserScript==

/**
 * Checks if the author of the specified item is the
 * liferay-continuous-integration user.
 */

function isAuthorLiferayContinuousIntegration(item) {
  var author = item.querySelector('a.author');

  return author && author.textContent.trim() == 'liferay-continuous-integration';
}

/**
 * Hides all but the last item matching the given
 * query selector, where the author is the
 * liferay-continuous-integration user.
 */

function hideAuthorLiferayContinuousIntegration() {
  var items = Array.from(document.querySelectorAll('.js-timeline-item')).filter(isAuthorLiferayContinuousIntegration);

  var commandItems = {};

  for (var i = 0; i < items.length; i++) {
    var commentH3 = items[i].querySelector('.comment-body h3');

    if (!commentH3) {
      continue;
    }

    var commandInfo = commentH3.childNodes[1].textContent.trim();
    var command = commandInfo.substring(0, commandInfo.indexOf(' '));

    if (command in commandItems) {
      commandItems[command].push(items[i]);
    }
    else {
      commandItems[command] = [items[i]];
    }
  }

  var keys = Object.keys(commandItems);

  for (var i = 0; i < keys.length; i++) {
    var values = commandItems[keys[i]];

    for (var j = 0; j < values.length - 1; j++) {
      values[j].style.display = 'none';
    }
  }
}

function hideLabelLiferayContinuousIntegration() {
  var items = Array.from(document.querySelectorAll('.discussion-item')).filter(isAuthorLiferayContinuousIntegration);

  for (var i = 0; i < items.length; i++) {
    items[i].style.display = 'none';
  }
}

/**
 * Checks if this is a comment requesting a continuous
 * integration command.
 */

function isCommentLiferayContinuousIntegrationCommand(item) {
  var bodyElement = item.querySelector('.timeline-comment .comment-body');

  var body = bodyElement && bodyElement.textContent.trim();

  return body && body.indexOf(' ') == -1 && body.indexOf('ci:') == 0;
}

/**
 * Hides all but the last item matching the given
 * query selector, where the comment is a ci command.
 */

function hideCommentLiferayContinuousIntegrationCommand() {
  var items = Array.from(document.querySelectorAll('.js-timeline-item')).filter(isCommentLiferayContinuousIntegrationCommand);

  for (var i = 0; i < items.length; i++) {
    items[i].style.display = 'none';
  }
}

/**
 * Since GitHub uses an SPA framework, we have to poll
 * for updates, and the current URL will be set even if
 * the page has not yet loaded.
 */

function checkCurrentURL() {
  var lastPath = document.body.getAttribute('data-lastpath');

  if (lastPath == document.location.pathname) {
    return;
  }

  lastPath = document.location.pathname;

  if (lastPath.indexOf('/pull/') == -1) {
    document.body.setAttribute('data-lastpath', lastPath);
    return;
  }

  if ((lastPath.indexOf('/com-liferay-') == -1) && (lastPath.indexOf('/liferay-portal') == -1)) {
    document.body.setAttribute('data-lastpath', lastPath);
    return;
  }

  var pullNumberElement = document.querySelector('.gh-header-title .gh-header-number');

  if (!pullNumberElement) {
    return;
  }

  var pagePullNumber = pullNumberElement.textContent.trim().substring(1);
  var urlPullNumber = lastPath.substring(lastPath.lastIndexOf('/') + 1);

  if (pagePullNumber != urlPullNumber) {
    return;
  }

  document.body.setAttribute('data-lastpath', lastPath);

  hideAuthorLiferayContinuousIntegration();
  hideLabelLiferayContinuousIntegration();
  hideCommentLiferayContinuousIntegrationCommand();
}

setInterval(checkCurrentURL, 1000);