// ==UserScript==
// @name           GitHub Link to LPS Tickets
// @namespace      holatuwol
// @version        0.7
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
        newElement.appendChild(createAnchorTag(text.substring(pos, match.index), href, classList));
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

var jiraTicketId = /([^/])(LP[EPS]-[0-9]+)/g;
var jiraTicketURL = /([^"])(https:\/\/issues\.liferay\.com\/browse\/)(LP[EPS]-[0-9]+)/g;
var jiraTicketIdLink = /<a [^>]*href="https:\/\/issues\.liferay\.com\/browse\/(LP[EPS]-[0-9]+)"[^>]*>\1<\/a>/g;
var jiraTicketURLLink = /<a [^>]*href="(https:\/\/issues\.liferay\.com\/browse\/)(LP[EPS]-[0-9]+)"[^>]*>\1\2<\/a>/g;

function addJiraLinks(elements) {
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    
    element.setAttribute('data-link-replaced', 'true');

    var newHTML = element.innerHTML.replace(jiraTicketIdLink, '$1');
    newHTML = element.innerHTML.replace(jiraTicketURLLink, '$1$2');

    if (element.contentEditable == 'true') {
      newHTML = newHTML.replace(jiraTicketId, '$1<a href="https://issues.liferay.com/browse/$2" data-link-replaced="true">$2</a>');
      newHTML = newHTML.replace(jiraTicketURL, '$1<a href="$2$3" data-link-replaced="true">$2$3</a>');
    }
    else {
      newHTML = newHTML.replace(jiraTicketId, '$1<a href="https://issues.liferay.com/browse/$2" target="_blank" data-link-replaced="true">$2</a>');
      newHTML = newHTML.replace(jiraTicketURL, '$1<a href="$2$3" target="_blank" data-link-replaced="true">$2$3</a>');
    }

    if (element.innerHTML != newHTML) {
      element.innerHTML = newHTML;
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
  addJiraLinks(document.querySelectorAll('.comment-body:not([data-link-replaced="true"])'));
}

setInterval(checkCurrentURL, 1000);