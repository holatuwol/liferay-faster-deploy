// ==UserScript==
// @name           Slack User Style
// @namespace      holatuwol
// @version        0.1
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/slack.user.js
// @include        https://app.slack.com/*
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
div[aria-selected="false"] .p-channel_sidebar__channel--unread:not(.p-channel_sidebar__channel--muted,.p-channel_sidebar__channel--suggested) {
  background-color: palevioletred;
}

div[aria-selected="false"] .p-channel_sidebar__channel--unread:not(.p-channel_sidebar__channel--muted,.p-channel_sidebar__channel--suggested) .p-channel_sidebar__name span {
  color: seashell;
}
`

document.head.appendChild(styleElement);