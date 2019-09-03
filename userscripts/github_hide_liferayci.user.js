// ==UserScript==
// @name           Hide Older Liferay Continuous Integration Test Results
// @namespace      holatuwol
// @version        0.1
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_hide_liferayci.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_hide_liferayci.user.js
// @include        /https:\/\/github.com\/[^\/]*/liferay-portal(-ee)?\/.*$/
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');
styleElement.textContent = `
.hidden {
  display: none;
}
`;

document.querySelector('head').appendChild(styleElement);

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
    console.log(keys[i]);

    var values = commandItems[keys[i]];

    for (var j = 0; j < values.length - 1; j++) {
      values[j].classList.add('hidden');
    }
  }
}

function hideLabelLiferayContinuousIntegration() {
  var items = Array.from(document.querySelectorAll('.discussion-item')).filter(isAuthorLiferayContinuousIntegration);

  for (var i = 0; i < items.length; i++) {
    items[i].classList.add('hidden');
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
    items[i].classList.add('hidden');
  }
}

hideAuthorLiferayContinuousIntegration();
hideLabelLiferayContinuousIntegration();
hideCommentLiferayContinuousIntegrationCommand();