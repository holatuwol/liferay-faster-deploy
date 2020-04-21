// ==UserScript==
// @name           JIRA When javascript.enabled=false
// @namespace      holatuwol
// @version        0.1
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/jira_lite.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/jira_lite.user.js
// @match          https://issues.liferay.com/browse/*
// @match          https://services.liferay.com/browse/*
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
  html body {
    overflow-y: auto;
  }
`;

document.head.appendChild(styleElement);

var ticketId = document.location.pathname.substring(document.location.pathname.lastIndexOf('/') + 1);
var restURL = 'https://' + document.location.host + '/rest/api/2/issue/' + ticketId + '/comment';

var activityContentNode = document.querySelector('#activitymodule .mod-content')

function getActionHead(comment) {
  var actionHeadNode = document.createElement('div');
  actionHeadNode.classList.add('action-head');
  
  var actionDetailsNode = document.createElement('div');
  actionDetailsNode.classList.add('action-details');

  var avatarNode = document.createElement('a');
  avatarNode.setAttribute('id', 'commentauthor_' + comment.id + '_verbose');
  avatarNode.setAttribute('rel', comment.author.key);
  avatarNode.setAttribute('href', '/secure/ViewProfile.jspa?name=' + comment.author.key);
  avatarNode.classList.add('user-hover');
  avatarNode.classList.add('user-avatar');
  avatarNode.textContent = comment.author.displayName;

  var commentDate = new Date(comment.created);
  
  var commentDateContainer = document.createElement('span');
  commentDateContainer.classList.add('commentdate_' + comment.id + '_verbose');
  commentDateContainer.classList.add('subText');

  var commentDateNode = document.createElement('span');
  commentDateNode.setAttribute('title', commentDate.toString());
  commentDateNode.classList.add('date');
  commentDateNode.classList.add('user-tz');
  
  var commentTimeNode = document.createElement('time');
  commentTimeNode.setAttribute('datetime', commentDate.toJSON());
  commentTimeNode.classList.add('livestamp');
  commentTimeNode.textContent = commentDate.toString();

  commentDateNode.appendChild(commentTimeNode);
  commentDateContainer.appendChild(commentDateNode);

  actionDetailsNode.appendChild(avatarNode);
  actionDetailsNode.appendChild(document.createTextNode(' added a comment - '));
	actionDetailsNode.appendChild(commentDateContainer);  

  actionHeadNode.appendChild(actionDetailsNode);

  return actionHeadNode;
}

function getActionBody(comment) {
  var actionBodyNode = document.createElement('div');
  actionBodyNode.classList.add('action-body');
  actionBodyNode.classList.add('flooded');
  
  actionBodyNode.style.whiteSpace = 'pre-wrap';

  actionBodyNode.textContent = comment.body;

  return actionBodyNode;
}

function addComment(comment) {
  var activityCommentNode = document.createElement('div');
  activityCommentNode.setAttribute('id', 'comment-' + comment.id);
  activityCommentNode.classList.add('issue-data-block');
  activityCommentNode.classList.add('activity-comment');
  activityCommentNode.classList.add('twixi-block');
  activityCommentNode.classList.add('expanded');

  var actionContainerNode = document.createElement('div');
  actionContainerNode.classList.add('twixi-wrap');
  actionContainerNode.classList.add('verbose');
  actionContainerNode.classList.add('actionContainer');
  
  actionContainerNode.appendChild(getActionHead(comment));
  actionContainerNode.appendChild(getActionBody(comment));

  activityCommentNode.appendChild(actionContainerNode);
  activityContentNode.appendChild(activityCommentNode);
}

var xhr = new XMLHttpRequest();

xhr.addEventListener('load', function() {
  var comments = JSON.parse(this.responseText).comments;
  for (var i = 0; i < comments.length; i++) {
    addComment(comments[i]);
  }
});

xhr.open('GET', restURL);
xhr.send();