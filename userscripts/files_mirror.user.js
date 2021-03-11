// ==UserScript==
// @name           Download from Liferay Files Mirror
// @namespace      holatuwol
// @version        1.2
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/files_mirror.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/files_mirror.user.js
// @match          https://*.liferay.com/*
// @grant          none
// ==/UserScript==

var links = document.querySelectorAll('a[href*="//files.liferay.com"]');

for (var i = 0; i < links.length; i++) {
  links[i].href = 'http://mirrors.lax.liferay.com/' + links[i].href.substring(links[i].href.indexOf('files.liferay.com'));
}