// ==UserScript==
// @name           Add MathJax to Grow
// @namespace      holatuwol
// @match          https://grow.liferay.com/*
// @grant          none
// ==/UserScript==

var scriptElement = document.createElement('script');
scriptElement.src = '//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML';
scriptElement.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(scriptElement);