// ==UserScript==
// @name           Patcher Read-Only Views Links
// @namespace      holatuwol
// @version        1.0
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/patcher.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/patcher.user.js
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
    replaceNode(oldNode, oldNode.innerHTML.split(',').map(
      ticket => (ticket.toUpperCase() == ticket) ? '<a href="https://issues.liferay.com/browse/' + ticket + '" target="_blank">' + ticket + '</a>' : ticket
    ).join(', '));
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
    var ticketURL;

    if (oldNode.value.indexOf('https:') == 0) {
      ticketURL = oldNode.value;
    }
    else if (isNaN(oldNode.value)) {
      ticketURL = 'https://web.liferay.com/group/customer/support/-/support/ticket/' + oldNode.value;
    }
    else {
      ticketURL = 'https://liferay-support.zendesk.com/agent/tickets/' + oldNode.value;
    }

    replaceNode(oldNode, '<a href="' + ticketURL + '" target="_blank">' + ticketURL + '</a>');
  }
}

var buttons = document.querySelectorAll('button[onclick]');

for (var i = 0; i < buttons.length; i++) {
  var onclickAttribute = buttons[i].attributes['onclick'];
  var onclickValue = onclickAttribute.value;

  if (onclickValue.indexOf('javascript:') == 0) {
    onclickValue = onclickValue.substring('javascript:'.length);
  }

  onclickValue = onclickValue.replace(/Liferay.Patcher.openWindow\('([^']*)',[^\)]*/g, "window.open('$1','_blank'");
  onclickValue = onclickValue.replace('?p_p_state=pop_up', '');
  onclickValue = onclickValue.replace('&p_p_state=pop_up', '');

  onclickAttribute.value = onclickValue;
}

replaceFixes('patcherFixName');
replaceFixes('patcherBuildName');
replaceFixes('patcherBuildOriginalName');
replaceAccountLink('accountEntryCode');
replaceAccountLink('patcherBuildAccountEntryCode');
replaceLesaLink('lesaTicket');