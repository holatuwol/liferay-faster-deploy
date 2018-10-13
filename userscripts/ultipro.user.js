// ==UserScript==
// @name           Liferay Ultipro Timesheet Link
// @namespace      holatuwol
// @match          https://wfm-time-web2.ultipro.com/*
// @match          https://nw12.ultipro.com/default.aspx
// @grant          none

window.setTimesheetCookie = function() {
  var expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + 12);
  document.cookie = 'timeSheetCookie=timesheetCookie; domain=.ultipro.com; expires=' + expirationDate;
}

function appendQuickLinks() {
  setTimeout(function() {
    var scripts = document.getElementsByTagName('script');

    var timesheetURL = null;
    var ptoURL = null;

    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i].innerHTML;
      if (script.indexOf('"headerLinks"') != -1) {
        var start = script.lastIndexOf('{', script.indexOf('"Time"'));
        var end = script.indexOf('}', start);
        var timeInfo = JSON.parse(script.substring(start, end + 1));
        timesheetURL = timeInfo.url;

        start = script.lastIndexOf('{', script.indexOf('"Time Off"'));
        end = script.indexOf('}', start);
        timeInfo = JSON.parse(script.substring(start, end + 1));
        ptoURL = timeInfo.url;
      }
    }

    var row = document.querySelector('#miscLinksInnerContainer table tr');
    var insertIndex = 1;

    if (timesheetURL) {
      var cell = row.insertCell(insertIndex++);
      cell.className = 'miscLinkContainer';
      cell.innerHTML = '<span><a class="miscItem" href="https://nw12.ultipro.com/' + timesheetURL + '" onclick="window.setTimesheetCookie();" target="_blank">Timesheet</a></span>';
    }

    if (ptoURL) {
      var cell = row.insertCell(insertIndex++);
      cell.className = 'miscLinkContainer';
      cell.innerHTML = '<span><a class="miscItem" href="https://nw12.ultipro.com/' + ptoURL + '" target="_blank">PTO</a></span>';
    }

  }, 2000);
}

function appendTimePeriodNavigator() {
  setTimeout(function() {
    if (!document.location.hash || document.location.hash.indexOf('#/timesheet/metrics-view') != 0) {
      return;
    }

    var metricsViewDate = new Date();

    if (document.location.hash.length > '#/timesheet/metrics-view?date='.length) {
      metricsViewDate = new Date(document.location.hash.substring('#/timesheet/metrics-view?date='.length));
    }

    var newHeader = document.createElement('div');
    newHeader.style.display = 'flex';
    newHeader.style.justifyContent = 'space-between';

    var metricsHeader = document.querySelector('h3[translate="page.employee.timesheet.metricsView"]')

    metricsHeader.parentElement.insertBefore(newHeader, metricsHeader);
    newHeader.appendChild(metricsHeader);

    var timePeriodText = document.querySelector('th[ng-bind="::$ctrl.getPeriod($ctrl.dates) | wskFormatPeriod"]').innerText;

    var weekTime = (1000*60*60*24*7);

    var previousDate = new Date(metricsViewDate.getTime() - weekTime);
    var previousURL = 'https://wfm-time-web2.ultipro.com/#/timesheet/metrics-view?date=' + previousDate.toISOString().substring(0, 10);

    var nextDate = new Date(metricsViewDate.getTime() + weekTime);
    var nextURL = 'https://wfm-time-web2.ultipro.com/#/timesheet/metrics-view?date=' + nextDate.toISOString().substring(0, 10);

    var timePeriodHTML = [
      '<div style="display: flex; align-items: center;">',
      '<button type="button" class="btn-circle btn btn-sm btn-default navigation-link" onclick="document.location.href=\'' + previousURL + '\'">',
      '<i class="fa fa-angle-left fa-2x"></i>',
      '</button>',
      '<div class="text-large week-text">' + timePeriodText + '</div>',
      '<button type="button" class="btn-circle btn btn-sm btn-default navigation-link" onclick="document.location.href=\'' + nextURL + '\'">',
      '<i class="fa fa-angle-right fa-2x"></i>',
      '</button>',
      '</div>',
    ];

    var timePeriod = document.createElement('div');
    timePeriod.className = 'inline-block pull-right padding-top wsk-period-navigator';
    timePeriod.innerHTML = timePeriodHTML.join('');

    newHeader.appendChild(timePeriod);
  }, 2000);
}

function checkEmptyProjects(timeout) {
  setTimeout(doCheckEmptyTimeouts, 1000);
}

function doCheckEmptyTimeouts() {
  if ((window.location.hash.indexOf('#/timesheet') != 0) || (window.location.hash.indexOf('#/timesheet/') == 0)) {
    return;
  }

  var rows = document.querySelectorAll('.entry-table tr');

  if (rows.length < 7) {
    setTimeout(doCheckEmptyTimeouts, 1000);
  }

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

  var buttons = document.querySelectorAll('.add-time-edit-btn');

  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].addedClick) {
      continue;
    }

    buttons[i].onclick = checkEmptyProjects;
    buttons[i].addedClick = true;
  }

  var searches = document.querySelectorAll('input[type="search"]');

  for (var i = 0; i < searches.length; i++) {
    if (searches[i].addedBlur) {
      continue;
    }

    searches[i].onblur = checkEmptyProjects;
    searches[i].addedBlur = true;
  }

  for (var i = 0; i < rows.length; i++) {
    var button = rows[i].querySelector('.add-time-edit-btn');

    if (!button) {
      continue;
    }

    var projectNodes = rows[i].querySelectorAll('labor-metric-input[labor-metric="::laborMetric"] div[name="PROJECT"]');

    for (var j = projectNodes.length; j < selectedProjects.length; j++) {
      button.click();
    }

    projectNodes = rows[i].querySelectorAll('labor-metric-input[labor-metric="::laborMetric"] div[name="PROJECT"]');

    for (var j = 0; j < selectedProjects.length; j++) {
      var includedProject = false;

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
          scope.$select.selected = selectedProjects[j];
          scope.$apply();
          break;
        }
      }
    }
  }
}

if (document.location.hostname == 'nw12.ultipro.com') {
  appendQuickLinks();
}
else {
  window.onhashchange = appendTimePeriodNavigator;
  window.onhashchange = checkEmptyProjects;

  if (document.cookie.indexOf('timeSheetCookie=timesheetCookie') != -1) {
    setTimeout(function() {
      document.cookie = 'timeSheetCookie=timesheetCookie; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.ultipro.com'
      document.location.href = 'https://wfm-time-web2.ultipro.com/#/timesheet';
    }, 2000);
  }
  else {
    window.addEventListener('load', function() {
      appendTimePeriodNavigator();
      checkEmptyProjects();
    });
  }
}