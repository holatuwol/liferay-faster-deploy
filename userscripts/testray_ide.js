// ==UserScript==
// @name           Liferay Functional Test IDE
// @namespace      holatuwol
// @match          https://testray.liferay.com/home/-/testray/case_results/*
// @match          https://github.com/liferay/liferay-portal/blob/*.testcase*
// @match          https://github.com/liferay/liferay-portal/blob/*.macro*
// @match          https://github.com/liferay/liferay-portal-ee/blob/*.testcase*
// @match          https://github.com/liferay/liferay-portal-ee/blob/*.macro*
// @grant          GM_xmlhttpRequest
// @grant          GM.xmlHttpRequest
// ==/UserScript==

if (!GM_xmlhttpRequest && GM) {
  GM_xmlhttpRequest = GM.xmlHttpRequest;
}

// Function for generating a link to GitHub

function getGitHubLink(ref_name, items, title) {
  var hashIndex = title.indexOf('#');
  var fileName = title.substring(0, hashIndex);
  var commandName = title.substring(hashIndex + 1);

  var item = items[fileName];

  if (!item) {
    return null;
  }

  var commandLineNumber = item.commands[commandName];

  if (!commandLineNumber) {
    return null;
  }

  var repoName = ref_name.indexOf('-ee') != -1 ? 'liferay-portal-ee' :
    ref_name.indexOf('-private') == -1 ? 'liferay-portal' : 'liferay-portal-ee';

  return '<a href="https://github.com/liferay/' + repoName + '/blob/' +
    ref_name + '/' + item.path + '#L' + commandLineNumber +
      '" target="_blank">' + title + '</a>';
}

// Functions for processing Testray pages

function getTestrayRelease(x) {
  var releases = JSON.parse(x.responseText);

  var project = jQuery('.breadcrumb-project')[0].innerText;
  var routine = jQuery('.breadcrumb-routine')[0].innerText;

  for (var i = 0; i < releases.length; i++) {
    var routines = releases[i].routines;

    // If there is an exact match on the routine, prefer that routine.

    for (var j = 0; j < routines.length; j++) {
      if (routines[j].project != project) {
        continue;
      }

      if (!routines[j].routine || routines[j].routine != routine) {
        continue;
      }

      return releases[i];
    }

    // If there is an exact match on the project, and it is not restricted
    // to a specific routine, prefer that routine.

    for (var j = 0; j < routines.length; j++) {
      if (routines[j].project != project) {
        continue;
      }

      if (routines[j].routine) {
        continue;
      }

      return releases[i];
    }
  }

  return null;
}

function processTestrayResponse(x) {
  var release = getTestrayRelease(x);

  if (!release) {
    return null;
  }

  // If we're on Testray, convert the case result title:
  // LocalFile.<FILE_NAME>#<COMMAND_NAME>

  var testCaseTitle = jQuery('.breadcrumb-case-result')[0].title;

  if (testCaseTitle.indexOf('LocalFile.') != 0) {
    return null;
  }

  var testCaseLink = getGitHubLink(release.ref_name, release.testcases, testCaseTitle.substring(10));

  if (testCaseLink) {
    jQuery('.breadcrumb-case-result').html(testCaseLink);
  }

  return;
}

// Functions for processing GitHub pages

function getGitHubRelease(x) {
  var releases = JSON.parse(x.responseText);

  var gitHubPath = document.location.pathname;
  var blobIndex = gitHubPath.indexOf('/blob/');

  if (blobIndex == -1) {
    return null;
  }

  var branchName = gitHubPath.substring(blobIndex + 6, gitHubPath.indexOf('/', blobIndex + 6));

  for (var i = 0; i < releases.length; i++) {
    if (releases[i].ref_name == branchName) {
      return releases[i];
    }
  }

  return null;
}

function processGitHubLine(release, cell) {
  var line = cell.innerHTML;

  // Replace anything that says <execute macro=""> with a link
  // to the macro definition.

  var macroIndex = line.indexOf('macro="');

  if (macroIndex == -1) {
    return;
  }

  var quoteIndex = line.indexOf('"', macroIndex + 7);
  var macroTitle = line.substring(macroIndex + 7, quoteIndex);

  var testCaseLink = getGitHubLink(release.ref_name, release.macros, macroTitle);

  if (testCaseLink) {
    cell.innerHTML = line.substring(0, macroIndex + 7) + testCaseLink + line.substring(quoteIndex);
  }
}

function processGitHubResponse(x) {
  var release = getGitHubRelease(x);

  if (!release) {
    return;
  }

  // If we're on GitHub, scan all the commands and macros to give you
  // IDE-like click navigation.

  var cells = document.getElementsByTagName('td');

  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i];
    if (!cell.id || cell.id.indexOf('LC') != 0) {
      continue;
    }

    processGitHubLine(release, cell);
  }
}

// Main function

GM_xmlhttpRequest({
  'method': 'GET',
  'url': 'https://s3-us-west-2.amazonaws.com/mdang.grow/testinfo.json',
  'onload': function(x) {
    if (document.location.hostname == 'testray.liferay.com') {
      processTestrayResponse(x);
    }
    else {
      processGitHubResponse(x);
    }
  }
});