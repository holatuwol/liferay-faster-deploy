// ==UserScript==
// @name           Add MathJax to Grow
// @namespace      holatuwol
// @version        1.2
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/grow_mathjax.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/grow_mathjax.user.js
// @match          https://grow.liferay.com/*
// @grant          none
// ==/UserScript==

var scriptElement = document.createElement('script');
scriptElement.src = '//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML';
scriptElement.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(scriptElement);

scriptElement.onload = function() {
  MathJax.Hub.Config({
    tex2jax: {
      inlineMath: [['$','$'], ['\\(','\\)']],
      processEscapes: true
    }
  });
}