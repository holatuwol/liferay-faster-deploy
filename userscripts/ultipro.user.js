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
  if (document.cookie.indexOf('timeSheetCookie=timesheetCookie') != -1) {
    setTimeout(function() {
      document.cookie = 'timeSheetCookie=timesheetCookie; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.ultipro.com'
      document.location.href = 'https://wfm-time-web2.ultipro.com/#/timesheet';
    }, 2000);
  }
}