// ==UserScript==
// @name           Add JIRA Order By Dividers
// @namespace      holatuwol
// @version        1.2
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/jira_divider.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/jira_divider.user.js
// @match          https://issues.liferay.com/issues/*
// @grant          none
// ==/UserScript==

function arrayEquals(x, y) {
  if (x.length != y.length) {
    return false;
  }

  for (var i = 0; i < x.length; i++) {
    if (x[i] != y[i]) {
      return false;
    }
  }

  return true;
}

function extractOrderBy(orderByCols, x) {
  var keys = [];

  for (var i = 0; i < orderByCols.length; i++) {
    var orderBy = orderByCols[i];

    if ((orderBy == 'project') || (orderBy == 'issuekey')) {
      var issue = jQuery(x).find('td.issuekey').text().trim();
      keys.push(issue.substring(0, issue.indexOf('-')));
    }
    else {
      keys.push(jQuery(x).find('td.' + orderBy).text().trim());
    }
  }

  return keys;
}

function addBreakpoints() {
  var navigatorContent = jQuery('.navigator-content');

  var modelState = JSON.parse(jQuery('.navigator-content').attr('data-issue-table-model-state'));
  var orderByCols = [modelState.issueTable.sortBy.fieldId];

  var search = jQuery('#advanced-search');

  if (search) {
    var jql = search.val();
    var pos = jql.toLowerCase().lastIndexOf('order by ');

    if (pos > -1) {
      orderByCols = jql.substring(pos + 9).toLowerCase()
        .split(',')
        .filter((x) => x.indexOf('\'') == -1)
        .map((x) => x.trim())
        .map((x) => x.indexOf(' ') == -1 ? x : x.substring(0, x.indexOf(' ')));
    }
  }

  var table = jQuery('table#issuetable');

  if (table.attr('breakpoints')) {
    return;
  }

  table.attr('breakpoints', true);

  var rows = table.find('tbody tr').toArray();
  var breakpoints = rows.map(extractOrderBy.bind(null, orderByCols));

  var indices = breakpoints.map((x, i) => [i, x]).filter((x, i) => (i == 0) || !(arrayEquals(breakpoints[i-1], breakpoints[i]))).reverse();

  for (var i = 0; i < indices.length; i++) {
    var ticketCount = (i == 0) ? rows.length - indices[i][0] : indices[i-1][0] - indices[i][0]

    var row = rows[indices[i][0]];

    var colspan = row.cells.length;
    var newRow = document.createElement('tr');

    var newCell = document.createElement('th');
    newCell.colSpan = colspan;
    newCell.innerText = indices[i][1].join(' - ') + ' (' + ticketCount + ')';
    newCell.style.paddingTop = '2em';

    newRow.appendChild(newCell);

    row.parentNode.insertBefore(newRow, row);
  }
};

var span = jQuery('<button class="aui-button aui-button-subtle">Divide</button>');
span.on('click', addBreakpoints);
jQuery('.saved-search-operations').prepend(span);