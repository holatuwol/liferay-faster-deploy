// ==UserScript==
// @name           Add JIRA Order By Dividers
// @namespace      holatuwol
// @version        1.4
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
      var issue = x.querySelector('td.issuekey').textContent.trim();
      keys.push(issue.substring(0, issue.indexOf('-')));
    }
    else {
      var orderByHeader = x.querySelector('td.' + orderBy);

      if (orderByHeader) {
        var text = orderByHeader.textContent.trim();

        if (!text) {
          var orderByImage = orderByHeader.querySelector('img');

          if (orderByImage) {
            text = orderByImage.getAttribute('alt').trim();
          }
        }

        if (text) {
          keys.push(text);
        }
      }
    }
  }

  return keys;
}

function addBreakpoints() {
  var navigatorContent = document.querySelector('.navigator-content');

  var modelState = JSON.parse(navigatorContent.getAttribute('data-issue-table-model-state'));
  var orderByCols = [modelState.issueTable.sortBy.fieldId];

  var search = document.querySelector('#advanced-search');

  if (search) {
    var jql = search.value;
    var pos = jql.toLowerCase().lastIndexOf('order by ');

    if (pos > -1) {
      orderByCols = jql.substring(pos + 9)
        .split(',')
        .filter((x) => x.indexOf('\'') == -1)
        .map((x) => x.trim().toLowerCase())
        .map((x) => x.indexOf(' desc') == -1 ? x : x.substring(0, x.indexOf(' desc')))
        .map((x) => x.indexOf(' asc') == -1 ? x : x.substring(0, x.indexOf(' asc')))
        .map((x) => x.indexOf('"') == 0 ? x.substring(1, x.length - 1) : x)
        .map((x) => document.querySelector(x == 'project' ? 'th span[title="Sort By Key"]' : 'th span[title="Sort By ' + x + '" i]'))
        .filter((x) => x)
        .map((x) => x.parentNode.getAttribute('data-id'))
        .slice(0, 2);
    }
  }

  var table = document.querySelector('table#issuetable');

  if (table.getAttribute('breakpoints')) {
    return;
  }

  table.setAttribute('breakpoints', true);

  var rows = Array.from(table.querySelectorAll('tbody tr'));
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

var span = document.createElement('button');
span.classList.add('aui-button');
span.classList.add('aui-button-subtle');
span.textContent = 'Divide';
span.onclick = addBreakpoints;

var savedSearchOperations = document.querySelector('.saved-search-operations');
savedSearchOperations.insertBefore(span, savedSearchOperations.childNodes[0]);