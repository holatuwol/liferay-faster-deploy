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

if (document.location.hostname == 'nw12.ultipro.com') {
  if (document.location.pathname == '/default.aspx') {
    setTimeout(function() {
      var scripts = document.getElementsByTagName('script');
      var url = null;

      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i].innerHTML;
        if (script.indexOf('"headerLinks"') != -1) {
          var start = script.lastIndexOf('{', script.indexOf('"Time"'));
          var end = script.indexOf('}', start);

          var timeInfo = JSON.parse(script.substring(start, end + 1));
          url = timeInfo.url;
        }
      }

      if (!url) {
        return;
      }

      var row = document.querySelector('#miscLinksInnerContainer table tr');

      var cell = row.insertCell(1);
      cell.className = 'miscLinkContainer';
      cell.innerHTML = '<span><a class="miscItem" href="https://nw12.ultipro.com/' + url + '" onclick="window.setTimesheetCookie();" target="_blank">Timesheet</a></span>';

      cell = row.insertCell(2);
      cell.className = 'miscLinkContainer';
      cell.innerHTML = '<span><a class="miscItem" href="https://wfm-toa-web2.ultipro.com/#/dashboard" target="_blank">PTO</a></span>';

    }, 2000);
  }
}
else {
  appendTimePeriodNavigator();
  window.onhashchange = appendTimePeriodNavigator;

  if (document.cookie.indexOf('timeSheetCookie=timesheetCookie') != -1) {
    setTimeout(function() {
      document.cookie = 'timeSheetCookie=timesheetCookie; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.ultipro.com'
      document.location.href = 'https://wfm-time-web2.ultipro.com/#/timesheet';
    }, 2000);
  }
}