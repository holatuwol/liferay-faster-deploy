// ==UserScript==
// @name           Download from Liferay Files Mirror
// @namespace      holatuwol
// @match          https://*.liferay.com/*
// @grant          none
// ==/UserScript==

var links = document.querySelectorAll('a[href*="//files.liferay.com"]');

for (var i = 0; i < links.length; i++) {
  links[i].href = 'http://mirrors/' + links[i].href.substring(links[i].href.indexOf('files.liferay.com'));
}