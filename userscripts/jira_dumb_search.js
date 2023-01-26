// ==UserScript==
// @name           JIRA with Dumb Quick Search
// @namespace      holatuwol
// @version        1.0
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/jira_dumb_search.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/jira_dumb_search.user.js
// @match          https://issues.liferay.com/*
// @match          https://issues-uat.liferay.com/*
// @match          https://services.liferay.com/*
// @grant          none
// ==/UserScript==

var quickSearchForm = document.querySelector('form[action="/secure/QuickSearch.jspa"]');

if (quickSearchForm) {
  quickSearchForm.onsubmit = function() {
    quickSearchForm.action = '/issues/';

    var inputField = quickSearchForm.querySelector('input[name="searchString"], input[name="jql"]');

    if (inputField) {
      inputField.name = 'jql';

      if (inputField.value.indexOf('=') == -1 &&
      	inputField.value.indexOf('~') == -1 &&
      	inputField.value.indexOf('"') == -1) {

        inputField.value = 'text ~ "' + inputField.value + '"';
        return true;
      }
    }
  }
}