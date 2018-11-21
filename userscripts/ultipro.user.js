// ==UserScript==
// @name           Liferay Ultipro Timesheet Link
// @namespace      holatuwol
// @match          https://wfm-time-web2.ultipro.com/
// @match          https://wfm-time-web2.ultipro.com/
// @match          https://wfm-toa-web2.ultipro.com/*
// @match          https://wfm-toa-web2.ultipro.com/*
// @match          https://nw12.ultipro.com/default.aspx
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_deleteValue
// @grant          GM.getValue
// @grant          GM.setValue
// @grant          GM.deleteValue
// @require        https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js

/**
 * Wrapper function to set value against GM.getValue
 * If neither function is available, use cookies.
 */

async function getValue(name, value) {
  if (GM.getValue) {
    return await GM.getValue(name, value);
  }

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
 * Wrapper function to set value against GM.setValue / GM.getValue
 * If neither function is available, use cookies.
 */

async function setValue(name, value) {
  if (value) {
    if (GM.setValue) {
      return await GM.setValue(name, value);
    }

    var expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 12);
    document.cookie = name + '=' + encodeURIComponent(value) + '; domain=.ultipro.com; expires=' + expirationDate;
  }
  else {
    if (GM.deleteValue) {
      return await GM.deleteValue(name);
    }

    document.cookie = name + '=' + value + '; domain=.ultipro.com; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }
}


/**
 * Utility function to append a single quick link to the dashboard page
 */

function appendQuickLink(script, key, row, insertIndex, label, cookieName, cookieValue) {
  var end = 0;
  var timeInfo;

  do {
    var start = script.lastIndexOf('{', script.indexOf('"' + key + '"', end));

    if (start == -1) {
      return;
    }

    end = script.indexOf('}', start);
    jsonString = script.substring(start, end + 1);
    timeInfo = JSON.parse(jsonString);
  }
  while (!timeInfo.url);

  var path = timeInfo.url;

  if (!path) {
    return insertIndex;
  }

  var cell = row.insertCell(insertIndex);
  cell.className = 'miscLinkContainer';
  cell.innerHTML = '<span><a class="miscItem" href="https://nw12.ultipro.com/' + path + '" target="_blank">' + label + '</a></span>';

  if (cookieName) {
    cell.onclick = function() {
      setValue(cookieName, cookieValue);
    };
  }

  return insertIndex + 1;
}

/**
 * Append quick links to Timesheet and PTO to dashboard page
 */

function appendQuickLinks() {
  setInterval(function() {
    var row = document.querySelector('#miscLinksInnerContainer table tr');

    if (row.innerText.indexOf('Timesheet') != -1) {
      return;
    }

    var insertIndex = 1;

    var scripts = document.getElementsByTagName('script');

    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i].innerHTML;
      if (script.indexOf('"headerLinks"') != -1) {
        insertIndex = appendQuickLink(script, 'Time', row, insertIndex, 'Timesheet', 'timeSheetCookie', 'timeSheetCookie');
        insertIndex = appendQuickLink(script, 'Time Off', row, insertIndex, 'PTO', 'timeOffAllowance', 'PTO');
        insertIndex = appendQuickLink(script, 'Time Off', row, insertIndex, 'EVP', 'timeOffAllowance', 'EVP');
      }
    }
  }, 1000);
}

/**
 * Attaches a cookie so that we remember to navigate to the Timesheet after SSO completes.
 */

async function navigateToTimesheet() {
  if (await getValue('timeSheetCookie')) {
    await setValue('timeSheetCookie', null);
    document.location.href = 'https://wfm-time-web2.ultipro.com/#/timesheet';
  }
}

/**
 * Utility function which waits until the Timesheet page has rows, and then calls the appropriate utility functions to setup the page.
 */

function checkEmptyProjects() {
  if ((window.location.hash.indexOf('#/timesheet') != 0) || (window.location.hash.indexOf('#/timesheet/') == 0)) {
    setTimeout(checkEmptyProjects, 1000);

    return;
  }

  var rows = document.querySelectorAll('.entry-table tr');

  if (rows.length < 7) {
    setTimeout(checkEmptyProjects, 1000);

    return;
  }

  getSelectedProjects(doCheckEmptyProjects);

  addBlurListener(document.querySelectorAll('input[type="search"]'));
  addBlurListener(document.querySelectorAll('input[ng-model="$ctrl.hours"]'));
  addBlurListener(document.querySelectorAll('input[ng-model="$ctrl.minutes"]'));

  addClickListener(document.querySelectorAll('.add-time-edit-btn'));
  addClickListener(document.querySelectorAll('button[ng-if="$ctrl.onSave"]'));
}

/**
 * Utility function to retrieve the projects to auto-populate with on the Timesheet page.
 * The "resolve" function is the callback, and it will be given the list of those projects.
 */

async function getSelectedProjects(resolve) {
  var angular = unsafeWindow.angular;

  var selectedProjects = [];

  var allProjectNodes = document.querySelectorAll('labor-metric-input[labor-metric="::laborMetric"] div[name="PROJECT"]');

  for (var i = 0; i < allProjectNodes.length; i++) {
    var scope = angular.element(allProjectNodes[i]).scope();
    var selectedItem = scope.$select.selected;

    if (selectedItem && (selectedItem.id != -1)) {
      var hasSelectedItem = false;
      for (var j = 0; j < selectedProjects.length; j++) {
        hasSelectedItem |= (selectedItem.id == selectedProjects[j].id);
      }

      if (!hasSelectedItem) {
        selectedProjects.push(selectedItem);
      }
    }
  }

  if (selectedProjects.length > 0) {
    resolve(selectedProjects);
  }

  var selectedProjectsJSON = await getValue('selectedProjects', '[]');

  try {
    selectedProjects = JSON.parse(selectedProjectsJSON);
  }
  catch (e) {
    console.log(selectedProjectsJSON);
  }

  if (typeof cloneInto !== 'undefined') {
    selectedProjects = cloneInto(selectedProjects, unsafeWindow);
  }

  resolve(selectedProjects);
}

/**
 * Utility function which saves the currently selected projects, and then restarts the
 * auto-populating of drop-downs in two seconds.
 */

function setSelectedProjects() {
  getSelectedProjects(function(selectedProjects) {
    if (selectedProjects.length == 0) {
      return;
    }

    setValue('selectedProjects', JSON.stringify(selectedProjects));
  });

  setTimeout(checkEmptyProjects, 2000);
}

/**
 * Utility function which adds a blur listener to call checkEmptyProjects on all listed input fields.
 */

function addBlurListener(inputs) {
  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].addedBlur) {
      continue;
    }

    inputs[i].onblur = checkEmptyProjects;
    inputs[i].addedBlur = true;
  }
}


/**
 * Utility function which adds a blur listener to call setSelectedProjects on all listed buttons.
 */

function addClickListener(buttons) {
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].addedClick) {
      continue;
    }

    buttons[i].onclick = setSelectedProjects;
    buttons[i].addedClick = true;
  }
}

/**
 * Auto-populates all workdays of the week with the given projects.
 * If you enter hours into a weekend, the weekend is also auto-populated with the given projects.
 */

function doCheckEmptyProjects(selectedProjects) {
  if (selectedProjects.length == 0) {
    return;
  }

  var rows = document.querySelectorAll('.entry-table tr');

  var daysChecked = 0;

  var angular = unsafeWindow.angular;

  for (var i = 0; i < rows.length; i++) {
    var button = rows[i].querySelector('.add-time-edit-btn');

    if (!button) {
      continue;
    }

    daysChecked++;

    var timeCodeNodes = rows[i].querySelectorAll('labor-metric-input[labor-metric="::$ctrl.timeCode"]');

    for (var j = timeCodeNodes.length; j < selectedProjects.length; j++) {
      button.click();
    }

    var projectNodes = rows[i].querySelectorAll('labor-metric-input[labor-metric="::laborMetric"] div[name="PROJECT"]');

    for (var j = 0; j < selectedProjects.length; j++) {
      var includedProject = false;

      if (daysChecked > 5) {
        var includedTimeInput = false;

        var hourInput = rows[i].querySelector('input[ng-model="$ctrl.hours"]');
        var minuteInput = rows[i].querySelector('input[ng-model="$ctrl.minutes"]');

        if (parseInt(hourInput.value) == 0 && parseInt(minuteInput.value) == 0) {
            continue;
        }
      }

      for (var k = 0; k < projectNodes.length; k++) {
        var scope = angular.element(projectNodes[k]).scope();

        includedProject |= (scope.$select.selected && (scope.$select.selected.id == selectedProjects[j].id));
      }

      if (includedProject) {
        continue;
      }

      for (var k = 0; k < projectNodes.length; k++) {
        var scope = angular.element(projectNodes[k]).scope();

        if (!scope.$select.selected || (scope.$select.selected.id == -1)) {
          scope.$select.select(selectedProjects[j]);
          break;
        }
      }
    }
  }
}

/**
 * Attaches a cookie so that we remember to navigate to the PTO create page after SSO completes.
 */

async function navigateToTimeOffRequest() {
  if ((window.location.hash.indexOf('#/request/create') == 0) && (window.location.hash.indexOf('#/request/create/') != 0)) {
    return;
  }

  if (await getValue('timeOffAllowance')) {
    document.location.href = 'https://wfm-toa-web2.ultipro.com/#/request/create';
  }
}

/**
 * Switches the selected policy to be PTO for new PTO requests and EVP for new EVP requests.
 */

async function fixSelectedPolicy() {
  if ((window.location.hash.indexOf('#/request/create') != 0) || (window.location.hash.indexOf('#/request/create/') == 0)) {
    setTimeout(fixSelectedPolicy, 1000);

    return;
  }

  var policyNode = document.querySelector('#policy');

  if (!policyNode) {
    setTimeout(fixSelectedPolicy, 1000);

    return;
  }

  var angular = unsafeWindow.angular;

  var selectedPolicyName = await getValue('timeOffAllowance');

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


/**
 * if __name__ == "__main__":
 */

if (document.location.hostname == 'nw12.ultipro.com') {
  appendQuickLinks();
}
else if (document.location.hostname == 'wfm-time-web2.ultipro.com') {
  window.onhashchange = checkEmptyProjects;
  setTimeout(navigateToTimesheet, 2000);
  checkEmptyProjects();
}
else if (document.location.hostname == 'wfm-toa-web2.ultipro.com') {
  window.onhashchange = fixSelectedPolicy;
  setTimeout(navigateToTimeOffRequest, 2000);
  fixSelectedPolicy();
}