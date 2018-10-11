// ==UserScript==
// @name           Liferay Ultipro Timesheet Link
// @namespace      holatuwol
// @match          https://wfm-time-web2.ultipro.com/?timesheet
// @match          https://nw12.ultipro.com/default.aspx
// @grant          none

if (document.location.hostname == 'nw12.ultipro.com') {
  if (document.location.pathname == '/default.aspx') {
    setTimeout(function() {
      var row = document.querySelector('#miscLinksInnerContainer table tr');

      var cell = row.insertCell(1);
      cell.className = 'miscLinkContainer';
      cell.innerHTML = '<span><a class="miscItem" href="https://wfm-time-web2.ultipro.com/?timesheet" target="_blank">Timesheet</a></span>';

      cell = row.insertCell(2);
      cell.className = 'miscLinkContainer';
      cell.innerHTML = '<span><a class="miscItem" href="https://wfm-toa-web2.ultipro.com/#/dashboard" target="_blank">PTO</a></span>';

    }, 2000);
  }
}
else if (document.location.hostname == 'wfm-time-web2.ultipro.com') {
  if (document.location.search == '?timesheet') {
    setTimeout(function() {
      document.location.href = 'https://wfm-time-web2.ultipro.com/#/timesheet';
    }, 2000);
  }
}