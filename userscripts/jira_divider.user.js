// ==UserScript==
// @name           Add JIRA Order By Dividers
// @namespace      holatuwol
// @match          https://issues.liferay.com/issues/*
// @grant          none
// ==/UserScript==

function addBreakpoints() {
  var navigatorContent = jQuery('.navigator-content');
  var orderBy = jQuery('th.active').attr('data-id');

  if (!orderBy) {
    var modelState = JSON.parse(jQuery('.navigator-content').attr('data-issue-table-model-state'));
    if (modelState) {
      orderBy = modelState.issueTable.sortBy.fieldId;
    }
  }

  var table = jQuery('table#issuetable');

  if (table.attr('breakpoints')) {
    return;
  }

  table.attr('breakpoints', true);

  var rows = table.find('tbody tr');
  var breakpoints = [];

  if ((orderBy == 'project') || (orderBy == 'issuekey')) {
    var issues = rows.toArray().map((x) => jQuery(x).find('td.issuekey').text().trim());
    breakpoints = issues.map((x) => x.substring(0, x.indexOf('-')));
  }
  else {
    breakpoints = rows.toArray().map((x) => jQuery(x).find('td.' + orderBy).text().trim());
  }

  var indices = breakpoints.map((x, i) => [i, x]).filter((x, i) => (i == 0) || (breakpoints[i-1] != breakpoints[i])).reverse();

  for (var i = 0; i < indices.length; i++) {
    var row = rows[indices[i][0]];

    var colspan = row.cells.length;
    var newRow = document.createElement('tr');

    var newCell = document.createElement('th');
    newCell.colSpan = colspan;
    newCell.innerText = indices[i][1];
    newCell.style.paddingTop = '2em';

    newRow.appendChild(newCell);

    row.parentNode.insertBefore(newRow, row);
  }
};

var span = jQuery('<button class="aui-button aui-button-subtle">Divide</button>');
span.on('click', addBreakpoints);
jQuery('.saved-search-operations').prepend(span);