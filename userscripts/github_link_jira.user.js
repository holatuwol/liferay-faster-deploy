// ==UserScript==
// @name           GitHub Link to LPS Tickets
// @namespace      holatuwol
// @version        1.1
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

    var pos = 0;
    var re = /[A-Z]*-[1-9][0-9]*/g;
    var match = null;

    var newElement = document.createElement('span');
    var classList = links[i].classList;

    while ((match = re.exec(text)) !== null) {
      if (match.index != pos) {
        newElement.appendChild(createAnchorTag(text.substring(pos, match.index), href, classList));
      }
      
      newElement.appendChild(createAnchorTag(match[0], 'https://issues.liferay.com/browse/' + match[0], classList));

      pos = match.index + match[0].length;

      var spaceCount = 0;

      while (text[pos + spaceCount] == ' ') {
        ++spaceCount;
      }

      if (spaceCount > 0) {
        newElement.appendChild(document.createTextNode(text.substring(pos, pos + spaceCount)));

        pos += spaceCount;
      }
    }

    if (pos != 0) {
      if (pos != text.length) {
        newElement.appendChild(createAnchorTag(text.substring(pos), href, classList));
      }

      links[i].parentElement.replaceChild(newElement, links[i]);
    }
  }
}

var jiraTicketId1 = /([^/])(LP[EPS]-[0-9]+)/g;
var jiraTicketId2 = /^(LP[EPS]-[0-9]+)/g;
var jiraTicketURL1 = /([^"])(https:\/\/issues\.liferay\.com\/browse\/)(LP[EPS]-[0-9]+)/g;
var jiraTicketURL2 = /^(https:\/\/issues\.liferay\.com\/browse\/)(LP[EPS]-[0-9]+)/g;

function addJiraLink(element, debug) {
  if (element.nodeType == Node.TEXT_NODE) {
    var newHTML = element.textContent;

    newHTML = newHTML.replace(jiraTicketId1, '$1<a href="https://issues.liferay.com/browse/$2" target="_blank" data-link-replaced="true">$2</a>');
    newHTML = newHTML.replace(jiraTicketId2, '<a href="https://issues.liferay.com/browse/$1" target="_blank" data-link-replaced="true">$1</a>');
    newHTML = newHTML.replace(jiraTicketURL1, '$1<a href="$2$3" target="_blank" data-link-replaced="true">$2$3</a>');
    newHTML = newHTML.replace(jiraTicketURL2, '<a href="$1$2" target="_blank" data-link-replaced="true">$1$2</a>');

    if (element.textContent != newHTML) {
      var newElement = document.createElement('span');
      newElement.setAttribute('data-link-replaced', 'true');
      newElement.innerHTML = newHTML;
      element.parentNode.replaceChild(newElement, element);
    }
  }
  else if (element.tagName != 'A') {
    for (var i = 0; i < element.childNodes.length; i++) {
      addJiraLink(element.childNodes[i]);
    }
  }
}

function addJiraLinks(elements) {
  for (var i = 0; i < elements.length; i++) {
    elements[i].setAttribute('data-link-replaced', 'true');

    if (elements[i].contentEditable != 'true') {
      addJiraLink(elements[i]);
    }
  }
}

var projects = ['CLDSVCS', 'LPP', 'LPS', 'LRCI', 'LRQA'];

function checkCurrentURL() {
  var textSelectors = ['a[data-hovercard-type="commit"]'];
  var projectSelectors = projects.map(x => 'a[title^="' + x + '"],a[aria-label^="' + x + '"]')

  var selector = textSelectors.concat(projectSelectors);
  var selectorString = selector.map(x => x + ':not([data-link-replaced="true"])').join(',');

  replaceLinks(document.querySelectorAll(selectorString));

  selector = ['span.js-issue-title','p.commit-title','.comment-body'];
  selectorString = selector.map(x => x + ':not([data-link-replaced="true"])').join(',');

  addJiraLinks(document.querySelectorAll(selectorString));
}

setInterval(checkCurrentURL, 1000);