// ==UserScript==
// @name           GitHub Link to LPS Tickets
// @namespace      holatuwol
// @version        0.1
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_link_lps.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/github_link_lps.user.js
// @match          https://github.com/*/liferay-portal*
// @grant          none
// ==/UserScript==

var lastPath = null;

function createAnchorTag(text, href) {
  var link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  return link;
}

var projects = ['CLDSVCS', 'LPS', 'LRQA'];

function checkCurrentURL() {
  if (lastPath == document.location.pathname) {
    return;
  }

  lastPath = document.location.pathname;

  var links = document.querySelectorAll(projects.map(x => 'a[title^="' + x + '"]').join(','));

  for (var i = 0; i < links.length; i++) {
    var text = links[i].textContent;
    var href = links[i].href;

    var pos = 0;
    var re = /[A-Z]*-[1-9][0-9]*/g;
    var match = null;
    var newElement = document.createElement('span');

    while ((match = re.exec(text)) !== null) {
      if (match.index != pos) {
        newElement.appendChild(createAnchorTag(text.substring(pos, match.index), href));
      }

      newElement.appendChild(createAnchorTag(match[0], 'https://issues.liferay.com/browse/' + match[0]));

      pos = match.index + match[0].length;
    }

    if (pos != text.length) {
      newElement.appendChild(createAnchorTag(text.substring(pos), href));
    }

    links[i].parentElement.replaceChild(newElement, links[i]);
  }
}

setInterval(checkCurrentURL, 1000);