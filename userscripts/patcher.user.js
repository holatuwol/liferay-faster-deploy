// ==UserScript==
// @name           Patcher Read-Only Views Links
// @namespace      holatuwol
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/*
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/*
// @grant          none
// ==/UserScript==

var portletId = '1_WAR_osbpatcherportlet';
var ns = '_' + portletId + '_';

function getQueryString(params) {
  return Object.keys(params).map(key => (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + params[key]).join('&');
}

function querySelector(target) {
  return document.querySelector('#' + ns + target);
}

function replaceNode(oldNode, newHTML) {
  var newNode = document.createElement('span');
  newNode.innerHTML = newHTML;

  var newHiddenInputNode = document.createElement('input');
  newHiddenInputNode.type = 'hidden';
  newHiddenInputNode.name = oldNode.name;
  newHiddenInputNode.id = oldNode.id;

  if (oldNode.innerHTML) {
    newHiddenInputNode.value = oldNode.innerHTML
  }
  else {
    newHiddenInputNode.value = oldNode.value;
  }

  var parentNode = oldNode.parentNode;

  parentNode.replaceChild(newHiddenInputNode, oldNode);
  parentNode.insertBefore(newNode, newHiddenInputNode);
}

function replaceFixes(target) {
  var oldNode = querySelector(target);

  if (oldNode && oldNode.readOnly) {
    replaceNode(oldNode, oldNode.innerHTML.split(',').map(ticket => '<a href="https://issues.liferay.com/browse/' + ticket + '" target="_blank">' + ticket + '</a>').join(', '));
  }
}

function replaceAccountLink(target) {
  var oldNode = querySelector(target);

  if (oldNode && oldNode.readOnly) {
    var params = {
      'p_p_id': portletId,
      'patcherBuildAccountEntryCode': oldNode.value,
      'patcherProductVersionId': querySelector('patcherProductVersionId').value
    };

    replaceNode(oldNode, '<a href="https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?' + getQueryString(params) + '" target="_blank">' + oldNode.value + '</a>');
  }
}

function replaceLesaLink(target) {
  var oldNode = querySelector(target);

  if (oldNode && oldNode.readOnly) {
    replaceNode(oldNode, '<a href="https://web.liferay.com/group/customer/support/-/support/ticket/' + oldNode.value + '" target="_blank">' + oldNode.value + '</a>');
  }
}

replaceFixes('patcherFixName');
replaceFixes('patcherBuildName');
replaceAccountLink('accountEntryCode');
replaceAccountLink('patcherBuildAccountEntryCode');
replaceLesaLink('lesaTicket');