// ==UserScript==
// @name           Hide Older Liferay Continuous Integration Test Results
// @namespace      holatuwol
// @version        0.3
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_hide_liferayci.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_hide_liferayci.user.js
// @match          https://github.com/*
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
.extra-timeline-item {
  display: none;
}
`;

document.querySelector('head').appendChild(styleElement);

/**
 * Hides the given timeline item.
 */

function hideTimelineItem(item) {
  item.classList.add('extra-timeline-item');

  var details = item.closest('details');

  if (!details) {
    return;
  }

  var visibleCommentCount = details.querySelectorAll('.js-timeline-item').length - details.querySelectorAll('.extra-timeline-item').length;
  var similarCommentElement = details.querySelector('summary span');

  similarCommentElement.textContent = visibleCommentCount + ' similar comment' + (visibleCommentCount == 1 ? '' : 's');

  if (visibleCommentCount == 0) {
    details.classList.add('extra-timeline-item');
  }
}

/**
 * Hides the given list of timeline items.
 */

function hideTimelineItems(items, count) {
  count = count || items.length;

  for (var i = 0; i < count; i++) {
    hideTimelineItem(items[i]);
  }
}

/**
 * Checks if the author of the specified item is the
 * liferay-continuous-integration user.
 */

function isAuthorLiferayContinuousIntegration(item) {
  var author = item.querySelector('a.author');
  var authorText = '';

  if (author) {
    authorText = author.textContent.trim();
  }

  return authorText == 'liferay-continuous-integration' || authorText == 'liferay-continuous-integration-hu';
}

/**
 * Hides all but the last item matching the given
 * query selector, where the author is the
 * liferay-continuous-integration user.
 */

function hideAuthorLiferayContinuousIntegration() {
  var items = Array.from(document.querySelectorAll('.js-timeline-item')).filter(isAuthorLiferayContinuousIntegration);

  var commandItems = {};
  var detailsItems = [];
  var notRunNotice = null;

  for (var i = 0; i < items.length; i++) {
    var commentBody = items[i].querySelector('.comment-body');

    if (!commentBody) {
      continue;
    }

    var commentH3 = commentBody.querySelector('h3');
    var commentDetails = commentBody.querySelector('details');

    if (commentH3) {
      var commandInfo = commentH3.childNodes[1].textContent.trim();
      var command = commandInfo.substring(0, commandInfo.indexOf(' '));

      if (command in commandItems) {
        commandItems[command].push(items[i]);
      }
      else {
        commandItems[command] = [items[i]];
      }
    }
    else if (commentDetails) {
      detailsItems.push(items[i]);
    }
    else {
      var bodyContent = commentBody.textContent.trim();

      if (bodyContent.indexOf('To conserve resources, the PR Tester does not automatically run for every pull') != -1) {
        notRunNotice = items[i];
      }
      if (bodyContent.indexOf('The test will run without rebasing') != -1) {
        hideTimelineItem(items[i]);
      }
    }
  }

  var keys = Object.keys(commandItems);

  if (keys.length > 0) {
    hideTimelineItem(notRunNotice);

    for (var i = 0; i < keys.length; i++) {
      var values = commandItems[keys[i]];
      hideTimelineItems(values, values.length - 1);
    }
  }

  hideTimelineItems(detailsItems, detailsItems.length - 1);
}

function hideLabelLiferayContinuousIntegration() {
  var items = Array.from(document.querySelectorAll('div[id*="event-"]')).filter(isAuthorLiferayContinuousIntegration);

  hideTimelineItems(items);
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

  hideTimelineItems(items);
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