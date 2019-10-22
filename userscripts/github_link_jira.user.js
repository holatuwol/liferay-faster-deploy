// ==UserScript==
// @name           GitHub Link to LPS Tickets
// @namespace      holatuwol
// @version        0.2
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_link_lps.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_link_lps.user.js
// @match          https://github.com/*/liferay-portal*
// @grant          none
// ==/UserScript==

var lastPath = null;

function createAnchorTag(text, href, classList) {
  if (!href) {
    return document.createTextNode(text);
  }

  var link = document.createElement('a');
  link.href = href;
  link.textContent = text;

  copyClassList(classList, link.classList);

  return link;
}

function copyClassList(source, target) {
  for (var j = 0; j < source.length; j++) {
    target.add(source[j]);
  }
}

var projects = ['CLDSVCS', 'LPS', 'LRQA'];

function checkCurrentURL() {
  if (lastPath == document.location.pathname) {
    return;
  }

  lastPath = document.location.pathname;

  var links = document.querySelectorAll('p.commit-title,a[data-hovercard-type="commit"],' + projects.map(x => 'a[title^="' + x + '"],a[aria-label^="' + x + '"]').join(','));

  for (var i = 0; i < links.length; i++) {
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

setInterval(checkCurrentURL, 1000);