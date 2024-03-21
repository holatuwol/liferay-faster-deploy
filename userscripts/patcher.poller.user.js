// ==UserScript==
// @name        Patcher Suspend Liferay Poller
// @match       https://patcher.liferay.com/*
// @grant       none
// @version     1.0
// ==/UserScript==

var pollerSuspendInterval = setInterval(function(x) {
  if (!Liferay.Poller) {
    return;
  }

  clearInterval(pollerSuspendInterval);

  Liferay.Poller.suspend();
}, 1000);