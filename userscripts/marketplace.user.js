// ==UserScript==
// @name           Marketplace Version Selector
// @namespace      holatuwol
// @version        0.2
// @match          https://web.liferay.com/marketplace/-/mp/application/*
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/marketplace.user.js
// @grant          none
// ==/UserScript==

function filterVersionHistory() {
  var versionHistory = document.querySelector('.version-history');
  
  if (!versionHistory || versionHistory.classList.contains('versions-filtered')) {
    return;
  }
  
  versionHistory.classList.add('versions-filtered');

  var downloads = Array.from(versionHistory.querySelectorAll('.body > ul > li'));
  var versions = downloads.map(x => x.querySelector('.supported-framework-versions').textContent.trim());

  var optionTexts = Array.from(new Set(Array.from(document.querySelectorAll('.supported-framework-versions > .app-package')).map(x => x.textContent.trim()))).sort();

  var versionSelect = optionTexts.reduce(function(select, x) {
    var option = document.createElement('option');
    option.textContent = x;
    select.appendChild(option);
    return select;
  }, document.createElement('select'));
  
  var filterVersions = function() {
    var selectedValue = versionSelect.options[versionSelect.selectedIndex].value;
    
    for (var i = 0; i < versions.length; i++) {
      downloads[i].style.display = ((selectedValue == '') || (versions[i].indexOf(selectedValue) != -1)) ? '' : 'none';
    }
  }

  versionSelect.selectedIndex = optionTexts.length - 1;
  versionSelect.onchange = filterVersions;
  filterVersions();
  
  var versionHeader = document.querySelector('.heading > .supported-framework-versions');
  versionHeader.appendChild(document.createElement('br'));
  versionHeader.appendChild(versionSelect);
}

setInterval(filterVersionHistory, 500);