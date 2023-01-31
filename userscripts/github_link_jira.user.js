// ==UserScript==
// @name           GitHub Link to LPS Tickets
// @namespace      holatuwol
// @version        2.1
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/github_link_jira.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/github_link_jira.user.js
// @match          https://github.com/LiferayCloud/*
// @match          https://github.com/*/liferay-learn*
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

var projects = {
  'BPR': 'issues.liferay.com',
  'CLDSVCS': 'issues.liferay.com',
  'COMMERCE': 'issues.liferay.com',
  'LCP': 'services.liferay.com',
  'LPP': 'issues.liferay.com',
  'LPS': 'issues.liferay.com',
  'LRAC': 'issues.liferay.com',
  'LRCI': 'issues.liferay.com',
  'LRDOCS': 'issues.liferay.com',
  'LRQA': 'issues.liferay.com'
};

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
      var issueKey = match[0];
      var projectKey = issueKey.substring(0, issueKey.indexOf('-'));

      if (!(projectKey in projects)) {
        continue;
      }

      if (match.index != pos) {
        newElement.appendChild(createAnchorTag(text.substring(pos, match.index), href, classList));
      }

      var projectDomain = projects[projectKey];

      newElement.appendChild(createAnchorTag(issueKey, 'https://' + projectDomain + '/browse/' + issueKey, classList));

      pos = match.index + issueKey.length;

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

function addJiraLink(element, debug) {
  if (element.nodeType == Node.TEXT_NODE) {
    var newHTML = element.textContent;

    var projectKeys = Object.keys(projects);

    for (var i = 0; i < projectKeys.length; i++) {
      var projectKey = projectKeys[i];
      var projectDomain = projects[projectKey] || 'issues.liferay.com';

      newHTML = newHTML.replace(new RegExp("([^/])(" + projectKey + "-[0-9]+)", "g"), '$1<a href="https://' + projectDomain + '/browse/$2" target="_blank" data-link-replaced="true">$2</a>');
      newHTML = newHTML.replace(new RegExp("^(" + projectKey + "-[0-9]+)", "g"), '<a href="https://' + projectDomain + '/browse/$1" target="_blank" data-link-replaced="true">$1</a>');
      newHTML = newHTML.replace(new RegExp("([^\"])(https:\/\/" + projectDomain + "\/browse\/)(" + projectKey + "-[0-9]+)", "g"), '$1<a href="$2$3" target="_blank" data-link-replaced="true">$2$3</a>');
      newHTML = newHTML.replace(new RegExp("^(https:\/\/" + projectDomain + "\/browse\/)(" + projectKey + "-[0-9]+)", "g"), '<a href="$1$2" target="_blank" data-link-replaced="true">$1$2</a>');
    }

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

function checkCurrentURL() {
  var textSelectors = ['a[data-hovercard-type="commit"]'];
  var projectKeys = Array.from(Object.keys(projects));

  var projectSelectors = projectKeys.map(x => 'a[title^="' + x + '"],a[aria-label^="' + x + '"]')
  var selector = textSelectors.concat(projectSelectors);
  var selectorString = selector.map(x => x + ':not([data-link-replaced="true"])').join(',');

  replaceLinks(document.querySelectorAll(selectorString));

  selector = ['.js-issue-title','p.commit-title','.comment-body'];
  selectorString = selector.map(x => x + ':not([data-link-replaced="true"])').join(',');

  addJiraLinks(document.querySelectorAll(selectorString));
}

setInterval(checkCurrentURL, 1000);