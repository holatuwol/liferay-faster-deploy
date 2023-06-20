// ==UserScript==
// @name           JIRA with Dumb Quick Search
// @namespace      holatuwol
// @version        1.2
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/jira_dumb_search.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/jira_dumb_search.user.js
// @match          https://liferay.atlassian.net/*
// @match          https://issues-uat.liferay.com/*
// @match          https://services.liferay.com/*
// @grant          none
// ==/UserScript==

function fixQuickSearchForm() {
  var inputField = document.querySelector('input[name="searchString"], input[name="jql"]');

  if (!inputField) {
    return true;
  }

  inputField.setAttribute('name', 'jql');

  var searchText = inputField.value;

  if (searchText.indexOf('=') != -1 ||
    searchText.indexOf('~') != -1 ||
    searchText.indexOf('"') != -1) {

    return true;
  }

  inputField.value = 'text ~ "' + searchText + '"';
  return true;
}

function pollQuickSearchForm() {
  var quickSearchForm = document.querySelector('form[action="/secure/QuickSearch.jspa"]');

  if (quickSearchForm) {
    quickSearchForm.setAttribute('action', '/issues/');
    quickSearchForm.addEventListener('submit', fixQuickSearchForm);
  }
}

setInterval(pollQuickSearchForm, 1000);