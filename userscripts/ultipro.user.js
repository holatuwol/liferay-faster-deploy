// ==UserScript==
// @name           Liferay Ultipro Timesheet Link
// @namespace      holatuwol
// @version        1.6
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/ultipro.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/ultipro.user.js
// @match          https://wfm-toa-web2.ultipro.com/*
// @match          https://nw12.ultipro.com/Default.aspx
// @match          https://nw12.ultipro.com/default.aspx
// @grant          none
// ==/UserScript==

/**
 * Wrapper function to set value against cookies.
 */

function getValue(name, value) {
  if (!document.cookie) {
    return value;
  }

  var needle = name + '=';
  var cookies = decodeURIComponent(document.cookie).split(';');

  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();;
    if (cookie.indexOf(needle) == 0) {
      return cookie.substring(needle.length);
    }
  };

  return value;
};


/**
 * Wrapper function to set value against cookies.
 */

function setValue(name, value) {
  if (value) {
    var expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 12);
    document.cookie = name + '=' + encodeURIComponent(value) + '; domain=.ultipro.com; expires=' + expirationDate;
  }
  else {
    document.cookie = name + '=' + value + '; domain=.ultipro.com; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }
}


/**
 * Utility function to append a single quick link to the dashboard page
 */

function appendQuickLink(script, key, row, label, cookieName, cookieValue) {
  if (document.querySelector('a[data-label="' + label + '"]')) {
    return true;
  }

  var end = 0;
  var timeInfo;

  do {
    var start = script.lastIndexOf('{', script.indexOf('"' + key + '"', end));

    if (start == -1) {
      console.log(script);
      return false;
    }

    end = script.indexOf('}', start);
    var jsonString = script.substring(start, end + 1);
    timeInfo = JSON.parse(jsonString);
  }
  while (!timeInfo.url);

  var path = timeInfo.url;

  if (!path) {
    console.log('no path');
    return false;
  }

  var cell = row.insertCell(0);
  cell.classList.add('miscLinkContainer');

  var span = document.createElement('span');
  cell.appendChild(span);

  var link = document.createElement('a');
  span.appendChild(link);

  link.classList.add('miscItem', cookieName);
  link.setAttribute('href', 'https://nw12.ultipro.com/' + path);
  link.setAttribute('target', '_blank');
  link.setAttribute('data-label', label);
  link.textContent = label;

  if (cookieName) {
    cell.onclick = function() {
      setValue(cookieName, cookieValue);
    };
  }
}

/**
 * Append quick links to Timesheet and PTO to dashboard page
 */

function appendQuickLinks() {
  var successCount = 0;

  var appendLinkInterval = setInterval(function() {
    var searchContainer = document.querySelector('div[id$=searchContainer]');

    if (!searchContainer || (searchContainer.parentNode.id != 'navBarRightContainer')) {
      return;
    }

    var row = document.querySelector('#miscLinksInnerContainer table tr');

    var insertIndex = 0;

    var scripts = document.getElementsByTagName('script');

    var success = true;

    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i].innerHTML;
      if (script.indexOf('"headerLinks"') != -1) {
        success &= appendQuickLink(script, 'Time Off', row, 'EVP', 'timeOffAllowance', 'EVP');
        success &= appendQuickLink(script, 'Time Off', row, 'PTO', 'timeOffAllowance', 'PTO');
        success &= appendQuickLink(script, 'Time Classic', row, 'Timesheet', 'timeSheetCookie', 'timeSheetCookie');
      }
    }

    if (success) {
      clearInterval(appendLinkInterval);
    }
  }, 1000);
}

/**
 * Attaches a cookie so that we remember to navigate to the Timesheet after SSO completes.
 */

function navigateToTimesheet() {
  if (getValue('timeSheetCookie')) {
    setValue('timeSheetCookie', null);
    document.location.href = 'https://wfm-time-web2.ultipro.com/#/timesheet';
  }
}

/**
 * Attaches a cookie so that we remember to navigate to the PTO create page after SSO completes.
 */

function navigateToTimeOffRequest() {
  if ((window.location.hash.indexOf('#/request/create') == 0) && (window.location.hash.indexOf('#/request/create/') != 0)) {
    return;
  }

  if (getValue('timeOffAllowance')) {
    document.location.href = 'https://wfm-toa-web2.ultipro.com/#/request/create';
  }
}

/**
 * Switches the selected policy to be PTO for new PTO requests and EVP for new EVP requests.
 */

function fixSelectedPolicy() {
  if ((window.location.hash.indexOf('#/request/create') != 0) || (window.location.hash.indexOf('#/request/create/') == 0)) {
    setTimeout(fixSelectedPolicy, 1000);

    return;
  }

  var policyNode = document.querySelector('#policy');

  if (!policyNode) {
    setTimeout(fixSelectedPolicy, 1000);

    return;
  }

  var angular = window.angular;

  var selectedPolicyName = getValue('timeOffAllowance');

  setValue('timeOffAllowance', null);

  var scope = angular.element(policyNode).scope();

  var fixPolicyInterval = setInterval(function() {
    if (scope.$ctrl.requestForm.$dirty) {
      clearInterval(fixPolicyInterval);

      return;
    }

    var policyList = scope.$ctrl.policyControl.policyList;

    for (var i = 0; i < policyList.length; i++) {
      if (policyList[i].name.indexOf(selectedPolicyName) != -1) {
        scope.$ctrl.policyControl.currentPolicy = policyList[i];
        scope.$ctrl.onPolicyChange(policyList[i]);

        scope.$apply();
      }
    }

  }, 1000);
}


if (document.location.hostname == 'nw12.ultipro.com') {
  appendQuickLinks();
}
else if (document.location.hostname == 'wfm-toa-web2.ultipro.com') {
  window.onhashchange = fixSelectedPolicy;
  setTimeout(navigateToTimeOffRequest, 2000);
  fixSelectedPolicy();
}