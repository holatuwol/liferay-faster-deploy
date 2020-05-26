// ==UserScript==
// @name           JIRA When javascript.enabled=false
// @namespace      holatuwol
// @version        2.1
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/jira_lite.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/jira_lite.user.js
// @match          https://issues.redhat.com/*
// @match          https://issues.liferay.com/*
// @match          https://services.liferay.com/*
// @grant          none
// @require        https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// ==/UserScript==
/**
 * Compiled from TypeScript
 * https://github.com/holatuwol/liferay-issues-userscript
 */ 
var styleElement = document.createElement('style');
styleElement.textContent = "\nhtml body {\n  overflow-y: auto;\n}\n\n.aui-header-primary .aui-nav {\n  width: auto;\n}\n\n.ajs-multi-select-placeholder,\n.wiki-button-bar {\n  display: none;\n}\n\n#assign-to-me-trigger,\n#show-more-links {\n  visibility: hidden;\n}\n";
document.head.appendChild(styleElement);
function getTicketId() {
    var ticketName = document.location.pathname.substring(document.location.pathname.lastIndexOf('/') + 1);
    var ticketElement = document.querySelector('a[data-issue-key="' + ticketName + '"]');
    return ticketElement.getAttribute('rel');
}
function getCurrentUser() {
    var fullNameElement = document.querySelector('#header-details-user-fullname');
    return fullNameElement ? fullNameElement.getAttribute('data-username') : null;
}
function toggleTab(e) {
    var tabElements = document.querySelectorAll('.tabs-menu li');
    var tabContentElements = document.querySelectorAll('.tabs-pane');
    for (var i = 0; i < tabElements.length; i++) {
        tabElements[i].classList.remove('active-tab');
    }
    var targetElement = e.currentTarget;
    targetElement.classList.add('active-tab');
    for (var i = 0; i < tabContentElements.length; i++) {
        tabContentElements[i].classList.remove('active-pane');
    }
    var linkElement = targetElement.querySelector('a');
    var href = linkElement.getAttribute('href');
    if (href && href.charAt(0) == '#') {
        var newActivePane = document.querySelector(href);
        newActivePane.classList.add('active-pane');
    }
    e.stopPropagation();
    e.preventDefault();
}
function enableToggleTabs() {
    var tabElements = document.querySelectorAll('.tabs-menu li');
    for (var i = 0; i < tabElements.length; i++) {
        tabElements[i].addEventListener('click', toggleTab);
    }
}
/**
 * Generate an anchor tag with the specified text, href, and download attributes.
 * If the download attribute has an extension that looks like it will probably be
 * served inline, use the downloadBlob function instead.
 */
function createAnchorTag(text, href) {
    var link = document.createElement('a');
    link.textContent = text;
    if (href.indexOf('https://') != 0) {
        href = 'https://' + document.location.host + href;
    }
    link.href = href;
    return link;
}
function getActionLinks(comment) {
    var actionLinksNode = document.createElement('div');
    actionLinksNode.classList.add('action-links');
    if (comment.author.key == getCurrentUser()) {
        var editCommentNode = document.createElement('a');
        editCommentNode.setAttribute('id', 'edit_comment_' + comment.id);
        editCommentNode.setAttribute('href', '/secure/EditComment!default.jspa?id=' + getTicketId() + '&commentId=' + comment.id);
        editCommentNode.setAttribute('title', 'Edit');
        editCommentNode.classList.add('edit-comment', 'issue-comment-action');
        var editCommentIcon = document.createElement('span');
        editCommentIcon.classList.add('icon-default', 'aui-icon', 'aui-icon-small', 'aui-iconfont-edit');
        editCommentIcon.textContent = 'Edit';
        editCommentNode.appendChild(editCommentIcon);
        actionLinksNode.appendChild(editCommentNode);
    }
    return actionLinksNode;
}
function getActionDetails(comment) {
    var actionDetailsNode = document.createElement('div');
    actionDetailsNode.classList.add('action-details');
    var avatarNode = document.createElement('a');
    avatarNode.setAttribute('id', 'commentauthor_' + comment.id + '_verbose');
    avatarNode.setAttribute('rel', comment.author.key);
    avatarNode.setAttribute('href', '/secure/ViewProfile.jspa?name=' + comment.author.name);
    avatarNode.classList.add('user-hover', 'user-avatar');
    var avatarOuterContainerNode = document.createElement('span');
    avatarOuterContainerNode.classList.add('aui-avatar', 'aui-avatar-xsmall');
    var avatarInnerContainerNode = document.createElement('span');
    avatarInnerContainerNode.classList.add('aui-avatar-inner');
    var avatarImageNode = document.createElement('img');
    avatarImageNode.setAttribute('src', comment.author.avatarUrls['16x16']);
    avatarImageNode.setAttribute('alt', comment.author.name);
    avatarInnerContainerNode.appendChild(avatarImageNode);
    avatarOuterContainerNode.appendChild(avatarInnerContainerNode);
    avatarNode.appendChild(avatarOuterContainerNode);
    avatarNode.appendChild(document.createTextNode(comment.author.displayName));
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
    return actionDetailsNode;
}
function getActionHead(comment) {
    var actionHeadNode = document.createElement('div');
    actionHeadNode.classList.add('action-head');
    actionHeadNode.appendChild(getActionLinks(comment));
    actionHeadNode.appendChild(getActionDetails(comment));
    return actionHeadNode;
}
function getActionBody(comment) {
    var actionBodyNode = document.createElement('div');
    actionBodyNode.classList.add('action-body');
    actionBodyNode.classList.add('flooded');
    actionBodyNode.innerHTML = comment.renderedBody;
    return actionBodyNode;
}
function addComment(comment) {
    var activityContentNode = document.querySelector('#activitymodule .mod-content');
    var activityCommentNode = document.createElement('div');
    activityCommentNode.setAttribute('id', 'comment-' + comment.id);
    activityCommentNode.classList.add('issue-data-block', 'activity-comment', 'twixi-block', 'expanded');
    var actionContainerNode = document.createElement('div');
    actionContainerNode.classList.add('twixi-wrap', 'verbose', 'actionContainer');
    actionContainerNode.appendChild(getActionHead(comment));
    actionContainerNode.appendChild(getActionBody(comment));
    activityCommentNode.appendChild(actionContainerNode);
    activityContentNode.appendChild(activityCommentNode);
}
function addComments() {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function () {
        var comments = JSON.parse(this.responseText).comments;
        for (var i = 0; i < comments.length; i++) {
            addComment(comments[i]);
        }
    });
    var restURL = 'https://' + document.location.host + '/rest/api/2/issue/' + getTicketId() + '/comment?expand=renderedBody';
    xhr.open('GET', restURL);
    xhr.send();
}
function hideMenus() {
    var visibleMenuElements = document.querySelectorAll('div[resolved][aria-hidden="false"]');
    for (var i = 0; i < visibleMenuElements.length; i++) {
        visibleMenuElements[i].setAttribute('aria-hidden', 'true');
    }
}
function setMenuActions(e) {
    var target = e.currentTarget;
    if (!target) {
        return;
    }
    hideMenus();
    var menuId = target.getAttribute('id');
    var menuContainerElement = document.getElementById(menuId + '-content');
    if (menuContainerElement.getAttribute('resolved')) {
        if (menuContainerElement.getAttribute('aria-hidden')) {
            menuContainerElement.setAttribute('aria-hidden', 'false');
            e.stopPropagation();
            e.preventDefault();
        }
        return;
    }
    var menuURL = 'https://issues.liferay.com/rest/api/1.0/menus/' + menuId + '?inAdminMode=false';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', menuURL);
    xhr.addEventListener('load', function () {
        var xml = this.responseXML;
        var sections = xml.querySelectorAll('sections');
        for (var i = 0; i < sections.length; i++) {
            var section = sections[i];
            var id = section.querySelector('id');
            var sectionContainer = document.createElement('div');
            sectionContainer.classList.add('aui-dropdown2-section');
            var label = section.querySelector('label');
            if (label) {
                var labelElement = document.createElement('strong');
                labelElement.textContent = label.textContent;
                sectionContainer.appendChild(labelElement);
            }
            var sectionItemsElement = document.createElement('ul');
            sectionItemsElement.classList.add('aui-list-truncate');
            var items = section.querySelectorAll('items');
            for (var j = 0; j < items.length; j++) {
                var item = items[j];
                var itemTitle = (item.querySelector('title') || item.querySelector('label')).textContent || '';
                var itemURL = item.querySelector('url').textContent || '';
                var itemElement = document.createElement('li');
                itemElement.appendChild(createAnchorTag(itemTitle, itemURL));
                sectionItemsElement.appendChild(itemElement);
            }
            sectionContainer.appendChild(sectionItemsElement);
            menuContainerElement.appendChild(sectionContainer);
        }
        menuContainerElement.setAttribute('resolved', 'true');
        menuContainerElement.setAttribute('aria-hidden', 'false');
        menuContainerElement.style.zIndex = '3000';
    });
    xhr.send(null);
    e.stopPropagation();
    e.preventDefault();
}
function enableMenuActions() {
    var navigationMenuItems = document.querySelectorAll('ul.aui-nav > li > a');
    for (var i = 0; i < navigationMenuItems.length; i++) {
        navigationMenuItems[i].addEventListener('click', setMenuActions);
    }
    document.body.addEventListener('click', hideMenus);
}
function updateTicketActions() {
    var operationsContainer = document.getElementById('opsbar-opsbar-operations');
    var attachNode = document.createElement('a');
    attachNode.setAttribute('href', '/secure/AttachFile!default.jspa?id=' + getTicketId());
    attachNode.classList.add('aui-button', 'toolbar-trigger');
    attachNode.textContent = 'Attach Files';
    var linkTicketNode = document.createElement('a');
    linkTicketNode.setAttribute('href', '/secure/LinkJiraIssue!default.jspa?id=' + getTicketId());
    linkTicketNode.classList.add('aui-button', 'toolbar-trigger');
    linkTicketNode.textContent = 'Link Issue';
    operationsContainer.appendChild(attachNode);
    operationsContainer.appendChild(linkTicketNode);
    var moreOperationsElement = document.getElementById('opsbar-operations_more');
    if (moreOperationsElement) {
        moreOperationsElement.remove();
    }
    var transitionsContainer = document.getElementById('opsbar-opsbar-transitions');
    var hiddenTransitionNodes = document.querySelectorAll('aui-item-link.issueaction-workflow-transition');
    for (var i = 0; i < hiddenTransitionNodes.length; i++) {
        var hiddenTransitionNode = hiddenTransitionNodes[i];
        var transitionNode = document.createElement('a');
        transitionNode.setAttribute('href', hiddenTransitionNode.getAttribute('href') || '');
        transitionNode.classList.add('aui-button', 'toolbar-trigger', 'issueaction-workflow-transition');
        transitionNode.innerHTML = hiddenTransitionNode.innerHTML;
        transitionsContainer.appendChild(transitionNode);
    }
    var moreTransitionsElement = document.getElementById('opsbar-transitions_more');
    if (moreTransitionsElement) {
        moreTransitionsElement.remove();
    }
}
function enableShowMoreLinks() {
    var showMoreLinks = document.getElementById('show-more-links');
    if (!showMoreLinks) {
        return;
    }
    var collapsedLinksLists = document.querySelectorAll('.collapsed-links-list');
    for (var i = 0; i < collapsedLinksLists.length; i++) {
        collapsedLinksLists[i].classList.remove('collapsed-links-list');
    }
    var collapsedLinks = document.querySelectorAll('.collapsed-link');
    for (var i = 0; i < collapsedLinks.length; i++) {
        collapsedLinks[i].classList.remove('collapsed-link');
    }
}
function getProductVersionName(version) {
    if (!version) {
        return '';
    }
    if (version.indexOf('7.2') == 0) {
        return '7.2';
    }
    if (version.indexOf('7.1') == 0) {
        return '7.1';
    }
    if (version.indexOf('7.0') == 0) {
        return '7.0';
    }
    if (version.indexOf('6.2') == 0) {
        return '6.2';
    }
    if (version.indexOf('6.1') == 0) {
        return '6.1';
    }
    return '';
}
function getProductVersionId(version) {
    if (version == '7.2') {
        return '130051253';
    }
    if (version == '7.1') {
        return '102311424';
    }
    if (version == '7.0') {
        return '101625504';
    }
    if (version == '6.x') {
        return '101625503';
    }
    return '';
}
function getPatcherPortalAccountsHREF(path, params) {
    var portletId = '1_WAR_osbpatcherportlet';
    var ns = '_' + portletId + '_';
    var queryString = Object.keys(params).map(function (key) { return (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + encodeURIComponent(params[key]); }).join('&');
    return 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts' + path + '?p_p_id=' + portletId + '&' + queryString;
}
function addPatcherPortalLinks() {
    var customFieldElement = document.getElementById('rowForcustomfield_14827');
    if (!customFieldElement) {
        return;
    }
    var valueElement = customFieldElement.querySelector('.value');
    var accountCode = (valueElement.textContent || '').trim();
    var allBuildsLinkHREF = getPatcherPortalAccountsHREF('', {
        'accountEntryCode': accountCode
    });
    https: //patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?_1_WAR_osbpatcherportlet_patcherBuildAccountEntryCode=OTIS
     valueElement.appendChild(document.createTextNode(' | '));
    valueElement.appendChild(createAnchorTag('All Builds', allBuildsLinkHREF));
    var versionsField = document.getElementById('versions-field');
    if (versionsField) {
        var version = getProductVersionName(versionsField.querySelectorAll('span')[0].textContent);
        if (version) {
            var versionBuildsLinkHREF = getPatcherPortalAccountsHREF('/view', {
                'patcherBuildAccountEntryCode': accountCode,
                'patcherProductVersionId': getProductVersionId(version)
            });
            valueElement.appendChild(document.createTextNode(' | '));
            valueElement.appendChild(createAnchorTag(version + ' Builds', versionBuildsLinkHREF));
        }
    }
}
function addIssueKeySelect() {
    if (document.getElementById('jira-issue-keys-textarea')) {
        return;
    }
    var issueKeysLabel = document.querySelector('label[for="jira-issue-keys"]');
    var parentElement = issueKeysLabel.parentElement;
    var siblingElements = parentElement.children;
    for (var i = siblingElements.length - 1; i >= 1; i--) {
        siblingElements[i].remove();
    }
    var issueKeysInput = document.createElement('input');
    issueKeysInput.setAttribute('name', 'issueKeys');
    issueKeysInput.classList.add('text', 'long-field');
    parentElement.appendChild(issueKeysInput);
}
function addAssigneeInput() {
    if (document.getElementById('assignee-field')) {
        return;
    }
    var oldAssigneeElement = document.getElementById('assignee');
    var oldAssignee = oldAssigneeElement.options[oldAssigneeElement.selectedIndex].value;
    var newAssigneeElement = document.createElement('input');
    newAssigneeElement.setAttribute('id', 'assignee');
    newAssigneeElement.setAttribute('name', 'assignee');
    newAssigneeElement.classList.add('text', 'long-field');
    newAssigneeElement.value = getCurrentUser() || oldAssignee;
    var parentElement = oldAssigneeElement.parentElement;
    parentElement.replaceChild(newAssigneeElement, oldAssigneeElement);
}
function addAdvancedSearch() {
    if (document.getElementById('advanced-search')) {
        return;
    }
    var navigatorSearchElement = document.querySelector('.aui.navigator-search');
    navigatorSearchElement.classList.add('query-component', 'generic-styled');
    var groupElement = document.createElement('div');
    groupElement.classList.add('aui-group');
    var itemElement = document.createElement('div');
    itemElement.classList.add('aui-item', 'search-wrap');
    var searchContainerElement = document.createElement('div');
    searchContainerElement.classList.add('search-container');
    searchContainerElement.setAttribute('data-mode', 'advanced');
    var searchFieldContainerElement = document.createElement('div');
    searchFieldContainerElement.classList.add('search-field-container');
    var atlassianAutoCompleteElement = document.createElement('div');
    atlassianAutoCompleteElement.classList.add('atlassian-autocomplete');
    var labelElement = document.createElement('label');
    labelElement.setAttribute('for', 'advanced-search');
    var jqlErrorMsgElement = document.createElement('span');
    jqlErrorMsgElement.setAttribute('id', 'jqlerrormsg');
    jqlErrorMsgElement.classList.add('icon', 'jqlgood');
    labelElement.appendChild(jqlErrorMsgElement);
    var advancedSearchElement = document.createElement('textarea');
    advancedSearchElement.setAttribute('name', 'jql');
    advancedSearchElement.setAttribute('id', 'advanced-search');
    advancedSearchElement.classList.add('textarea', 'search-entry', 'advanced-search', 'ajs-dirty-warning-exempt');
    advancedSearchElement.style.height = '50px';
    if (document.location.search && (document.location.search.length > 1)) {
        var navigatorContentElement = document.querySelector('.navigator-content');
        var modelState = navigatorContentElement.getAttribute('data-issue-table-model-state') || '{}';
        var issueTableModelState = JSON.parse(modelState);
        var issueTable = issueTableModelState.issueTable;
        var activeSortElement = document.querySelector('#issuetable th.active');
        var column = activeSortElement ? (activeSortElement.getAttribute('data-id') || 'issuekey') : 'issuekey';
        var sortJQL = issueTable['columnSortJql'][column];
        var sortColumn = (column == 'issuekey') ? 'key' : column;
        var sortColumnAsc = sortColumn + ' ASC';
        var sortColumnDesc = sortColumn + ' DESC';
        var sortAsc = sortJQL.indexOf(sortColumnAsc);
        var sortDesc = sortJQL.indexOf(sortColumnDesc);
        if (activeSortElement) {
            if (sortAsc != -1) {
                advancedSearchElement.textContent = sortJQL.substring(0, sortAsc) + sortColumnDesc + sortJQL.substring(sortAsc + sortColumnAsc.length);
            }
            else if (sortDesc != -1) {
                advancedSearchElement.textContent = sortJQL.substring(0, sortDesc) + sortColumnAsc + sortJQL.substring(sortDesc + sortColumnDesc.length);
            }
        }
        else {
            if (sortAsc != -1) {
                sortJQL = sortJQL.substring(0, sortAsc) + sortJQL.substring(sortAsc + sortColumnAsc.length + 1);
            }
            else if (sortDesc != -1) {
                sortJQL = sortJQL.substring(0, sortDesc) + sortJQL.substring(sortDesc + sortColumnDesc.length + 1);
            }
            sortJQL = sortJQL.trim();
            if (sortJQL.toLowerCase().lastIndexOf('order by') == sortJQL.length - 8) {
                sortJQL = sortJQL.substring(0, sortJQL.length - 8).trim();
            }
            advancedSearchElement.textContent = sortJQL;
        }
    }
    advancedSearchElement.addEventListener('keypress', function (e) {
        if (e && e.keyCode == 13) {
            e.preventDefault();
            e.stopPropagation();
            navigatorSearchElement.submit();
        }
    });
    atlassianAutoCompleteElement.appendChild(labelElement);
    atlassianAutoCompleteElement.appendChild(advancedSearchElement);
    searchFieldContainerElement.appendChild(atlassianAutoCompleteElement);
    searchContainerElement.appendChild(searchFieldContainerElement);
    var searchOptionsContainerElement = document.createElement('div');
    searchOptionsContainerElement.classList.add('search-options-container');
    var buttonElement = document.createElement('input');
    buttonElement.setAttribute('type', 'submit');
    buttonElement.setAttribute('value', 'Search');
    buttonElement.classList.add('aui-button', 'aui-button-primary', 'search-button');
    searchOptionsContainerElement.appendChild(buttonElement);
    searchContainerElement.appendChild(searchOptionsContainerElement);
    itemElement.appendChild(searchContainerElement);
    groupElement.appendChild(itemElement);
    navigatorSearchElement.appendChild(groupElement);
}
var projectCache = {};
function updateProjectCache(projects) {
    for (var i = 0; i < projects.length; i++) {
        projectCache[projects[i].key] = projects[i];
    }
}
function setProject(projectElement, issueTypeElement, project) {
    if (!project) {
        return;
    }
    projectElement.value = project.id;
    var issuetypes = project.issuetypes;
    for (var i = 0; i < issuetypes.length; i++) {
        var optionElement = document.createElement('option');
        optionElement.setAttribute('value', issuetypes[i].id);
        optionElement.textContent = issuetypes[i].name;
        issueTypeElement.appendChild(optionElement);
    }
}
function updateProjectKey(projectElement, projectKeyElement, issueTypeElement) {
    var oldProjectKey = issueTypeElement.getAttribute('data-project-key');
    var newProjectKey = projectKeyElement.value;
    if (oldProjectKey == newProjectKey) {
        return;
    }
    issueTypeElement.setAttribute('data-project-key', newProjectKey);
    var issueTypeOptions = issueTypeElement.options;
    for (var i = issueTypeElement.options.length - 1; i >= 0; i--) {
        issueTypeElement.options[i].remove();
    }
    if (newProjectKey in projectCache) {
        setProject(projectElement, issueTypeElement, projectCache[newProjectKey]);
        return;
    }
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function () {
        updateProjectCache(JSON.parse(this.responseText).projects);
        setProject(projectElement, issueTypeElement, projectCache[newProjectKey]);
    });
    var restURL = 'https://' + document.location.host + '/rest/api/2/issue/createmeta?projectKeys=' + newProjectKey + '&fields=projects.issuetypes.fields';
    xhr.open('GET', restURL);
    xhr.send();
}
function makeProjectSelectUsable() {
    var projectOptionsElement = document.getElementById('project-options');
    var projectElement = document.getElementById('project');
    projectElement.setAttribute('type', 'hidden');
    var projectKeyElement = document.createElement('input');
    projectKeyElement.value = 'LPS';
    var oldIssueTypeElement = document.getElementById('issuetype');
    var newIssueTypeElement = document.createElement('select');
    newIssueTypeElement.setAttribute('name', 'issuetype');
    var parentElement = oldIssueTypeElement.parentElement;
    parentElement.replaceChild(newIssueTypeElement, oldIssueTypeElement);
    var projectKeyListener = _.debounce(updateProjectKey.bind(null, projectElement, projectKeyElement, newIssueTypeElement), 500);
    projectKeyElement.addEventListener('keyup', projectKeyListener);
    projectKeyElement.addEventListener('change', projectKeyListener);
    parentElement = projectElement.parentElement;
    parentElement.appendChild(projectKeyElement);
    projectKeyListener();
}
function makeSummaryUsable() {
    enableToggleTabs();
    var hiddenSelectElements = document.querySelectorAll('select.hidden');
    for (var i = 0; i < hiddenSelectElements.length; i++) {
        hiddenSelectElements[i].classList.remove('hidden');
    }
}
function makeCreateIssueUsable() {
    if (document.getElementById('project')) {
        makeProjectSelectUsable();
    }
    if (document.getElementById('summary')) {
        makeSummaryUsable();
    }
}
function updateTicket() {
    if (document.querySelector('#activitymodule .aui-tabs')) {
        return;
    }
    addComments();
    updateTicketActions();
    enableShowMoreLinks();
    addPatcherPortalLinks();
}
function isMatchesPathName(partialPathName) {
    return pathName.indexOf('/secure/' + partialPathName + '!') == 0 ||
        pathName === '/secure/' + partialPathName + '.jspa';
}
enableMenuActions();
var pathName = document.location.pathname;
if (pathName.indexOf('/browse/') == 0) {
    updateTicket();
}
else if (isMatchesPathName('AssignIssue')) {
    addAssigneeInput();
}
else if (isMatchesPathName('CreateIssue')) {
    makeCreateIssueUsable();
}
else if (isMatchesPathName('EditIssue')) {
    enableToggleTabs();
}
else if (isMatchesPathName('LinkJiraIssue')) {
    addIssueKeySelect();
}
else if (pathName.indexOf('/issues/') == 0) {
    addAdvancedSearch();
}
else if (isMatchesPathName('QuickSearch')) {
    addAdvancedSearch();
}
