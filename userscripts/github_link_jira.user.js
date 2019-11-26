// ==UserScript==
// @name           GitHub Link to LPS Tickets
// @namespace      holatuwol
// @version        0.5
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_link_lps.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_link_lps.user.js
// @match          https://github.com/*/liferay-portal*
// @grant          none
// ==/UserScript==

function createAnchorTag(text, href, classList) {
  if (!href) {
    return document.createTextNode(text);
  }

  var link = document.createElement('a');
  link.setAttribute('target', '_blank');
  link.href = href;
  link.textContent = text;

  link.setAttribute('data-link-replaced', 'true');

  if (classList) {
    copyClassList(classList, link.classList);
  }

  return link;
}

function copyClassList(source, target) {
  for (var j = 0; j < source.length; j++) {
    target.add(source[j]);
  }
}

function replaceLinks(links) {
  for (var i = 0; i < links.length; i++) {
    var dataLinkReplaced = links[i].getAttribute('data-link-replaced');

    if (dataLinkReplaced) {
      continue;
    }

    links[i].setAttribute('data-link-replaced', 'true');

    var text = links[i].textContent;
    var href = links[i].href;
    var classList = null;

    var pos = 0;
    var re = /[A-Z]*-[1-9][0-9]*/g;
    var match = null;

    var newElement = null;

    if (links[i].tagName.toLowerCase() == 'a') {
      newElement = document.createElement('span');
      classList = links[i].classList;
    }
    else {
      newElement = document.createElement(links[i].tagName);
      copyClassList(links[i].classList, newElement.classList);
      newElement.setAttribute('data-link-replaced', 'true');
    }

    while ((match = re.exec(text)) !== null) {
      if (match.index != pos) {
        newElement.appendChild(document.createTextNode(' '));
        newElement.appendChild(createAnchorTag(text.substring(pos, match.index).trim(), href, classList));
      }

      newElement.appendChild(createAnchorTag(match[0], 'https://issues.liferay.com/browse/' + match[0], classList));

      pos = match.index + match[0].length;
    }

    if (pos != 0) {
      if (pos != text.length) {
        newElement.appendChild(document.createTextNode(' '));
        newElement.appendChild(createAnchorTag(text.substring(pos), href, classList));
      }

      links[i].parentElement.replaceChild(newElement, links[i]);
    }
  }
}

var projects = ['CLDSVCS', 'LPP', 'LPS', 'LRQA'];

function checkCurrentURL() {
  var textSelectors = ['span.js-issue-title','p.commit-title','a[data-hovercard-type="commit"]'];
  var projectSelectors = projects.map(x => 'a[title^="' + x + '"],a[aria-label^="' + x + '"]')

  var selector = textSelectors.concat(projectSelectors);
  var selectorString = selector.map(x => x + ':not([data-link-replaced="true"])').join(',');

  replaceLinks(document.querySelectorAll(selectorString));
}

setInterval(checkCurrentURL, 1000);