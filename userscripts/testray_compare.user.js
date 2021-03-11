// ==UserScript==
// @name           Testray Compare Helper
// @namespace      holatuwol
// @version        1.2
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/testray_compare.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/testray_compare.user.js
// @match          https://testray.liferay.com/home/-/testray/runs/compare
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
.hide-no-failures .no-failures {
  display: none;
}
`;

document.head.appendChild(styleElement);

function checkForFailures(table) {
  var rows = table.querySelectorAll('tbody tr');

  var noFailures = true;

  for (var i = 0; i < rows.length && noFailures; i++) {
    var rowType = rows[i].cells[0].textContent.trim().toLowerCase();

    if (rowType != 'a failed') {
      continue;
    }

    for (var j = 1; j < rows[i].cells.length; j++) {
      if (rows[i].cells[j].textContent.trim().length > 0) {
        noFailures = false;

        break;
      }
    }
  }

  if (noFailures) {
    table.classList.add('no-failures');
  }
}

function updateComparisonResultsTable() {
  var container = document.querySelector('.comparison-results-container');

  if (container) {
    container.classList.add('hide-no-failures');

    var resultTables = container.querySelectorAll('.comparison-results');

    for (var i = 0; i < resultTables.length; i++) {
      checkForFailures(resultTables[i]);
    }
  }
}

updateComparisonResultsTable();