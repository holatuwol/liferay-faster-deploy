// ==UserScript==
// @name JIRA with Less Scrolling
// @namespace holatuwol
// @version 1.7
// @match https://liferay.atlassian.net/browse/*
// @match https://liferay.atlassian.net/jira/servicedesk/*
// @require https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js
// @grant none
// ==/UserScript==

function debounce(func, delay) {
	let timeoutId;
	return function(...args) {
	clearTimeout(timeoutId);
	timeoutId = setTimeout(() => {
	  func.apply(this, args);
	}, delay);
  };
}

function waitForElement(parent, selector) {
	return new Promise(resolve => {
		const result = parent.querySelector(selector);

		if (result) {
			resolve(result);
			return;
		}

		var observerCallback = debounce(() => {
			const result = parent.querySelector(selector);
			if (result) {
				observer.disconnect();
				resolve(result);
			}
		}, 500);

		observerCallback();

		const observer = new MutationObserver(observerCallback);

		observer.observe(parent, {
			childList: true,
			subtree: true,
		});
	})
}

function appendElement(parent, tagName, testId, recreateCallback) {
	var element = parent.querySelector(`${tagName}[data-testid="${testId}"]`);

	if (element != null) {
		return element;
	}

	element = document.createElement(tagName);
	element.setAttribute('data-testid', testId);
	parent.appendChild(element);

	var observerCallback = debounce(() => {
		if (!element.isConnected) {
			observer.disconnect();
			recreateCallback();
		}
	}, 500);

	const observer = new MutationObserver(observerCallback);

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	return element;
}

async function appendStyle() {
	var styleElement = document.head.querySelector('style.lesa-style-element');
	if (!styleElement) {
		styleElement = document.createElement('style');
		styleElement.classList.add('lesa-style-element');
		document.head.appendChild(styleElement);
	}
	
	styleElement.textContent = `
	nav[data-testid="page-layout.sidebar"] {
		display: none;
	}
	div[data-testid="issue.views.issue-details.issue-layout.container-left"] {
		padding-left: 0;
	}
	div[data-testid="issue.views.issue-details.issue-layout.container-right"] {
		padding-right: 0;
	}
	.lesa-pills-container {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin-left: 12px;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	}
	.lesa-pill {
		display: inline-flex;
		align-items: center;
		padding: 3px 8px;
		border-radius: 10px;
		font-size: 9px;
		font-weight: 500;
		cursor: pointer;
		user-select: none;
		border: 1px solid #dfe1e6;
		background-color: #f4f5f7;
		color: #42526e;
		transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease;
	}
	.lesa-pill:hover {
		background-color: #ebecf0;
		color: #172b4d;
	}
	.lesa-pill-comment.active {
		background-color: #eae6ff;
		color: #403294;
		border-color: #c0b6f2;
	}
	.lesa-pill-comment.active:hover {
		background-color: #d2ccff;
		color: #352a80;
	}
	.lesa-pill-comment.inactive {
		background-color: #f4f5f7;
		color: #7a869a;
		border-color: #dfe1e6;
		text-decoration: line-through;
	}
	.lesa-pill-comment.inactive:hover {
		background-color: #ebecf0;
		color: #5e6c84;
	}
	`
}

function getCommentsSelector(commentIds) {
	return Array.from(commentIds)
		.map(id => [
			`div[data-testid="issue-comment-base.ui.comment.ak-comment.${id}"]`,
			// `div[data-testid="issue-comment-base.ui.comment.ak-comment.${id}-header"]`,
			// `div[data-testid="issue-comment-base.ui.comment.ak-comment.${id}-body"]`,
			// `div[data-testid="issue-comment-base.ui.comment.ak-comment.${id}-footer"]`,
		])
		.flat()
		.join(',\n');
}

function updateCommentsStyle(hiddenCommentIds) {
	var styleElement = document.head.querySelector('style.lesa-comments-visibility-style');
	if (!styleElement) {
		styleElement = document.createElement('style');
		styleElement.classList.add('lesa-comments-visibility-style');
		document.head.appendChild(styleElement);
	}

	if (hiddenCommentIds.size === 0) {
		styleElement.textContent = '';
		return;
	}

	styleElement.textContent = `${getCommentsSelector(hiddenCommentIds)} { display: none !important; }`;
}

async function fetchComments(issueKey) {
	var url = `https://liferay.atlassian.net/rest/api/3/issue/${issueKey}?fields=comment`;

	var response = await fetch(url, {
		method: 'GET',
		headers: {
			'Accept': 'application/json'
		}
	});

	var data = await response.json();

	return data.fields?.comment?.comments;
}

function ensureVisibleComment(commentIds) {
	if (commentIds.size === 0) {
		return;
	}

	var commentsSelector = getCommentsSelector(commentIds);

	const observerCallback = debounce(() => {
		if (document.querySelector(commentsSelector) != null) {
			observer.disconnect();
		}
		else {
			var moreButtons = document.body.querySelectorAll('button[data-testid="issue.activity.common.component.load-more-button.loading-button"], button[data-testid="issue-view-activity-comment.comment-show-more-replies.show-more-button"]');

			moreButtons.forEach(button => button.click());
		}
	}, 500);

	const observer = new MutationObserver(observerCallback);

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	var moreButtons = document.body.querySelectorAll('button[data-testid="issue.activity.common.component.load-more-button.loading-button"], button[data-testid="issue-view-activity-comment.comment-show-more-replies.show-more-button"]');

	moreButtons.forEach(button => button.click());
}

async function addJumpToHeader() {
	const [header, issueKeyLink] = await Promise.all([
		waitForElement(document.body, 'div[data-testid="issue-view-sticky-header-container.sticky-header"]'),
		waitForElement(document.body, 'a[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')
	]);

	header.style.position = 'sticky';
	header.style.top = '0px';
	header.style.zIndex = '1000';

	let parent = header.parentElement;
	while (parent && parent !== document.body) {
		const computedStyle = window.getComputedStyle(parent);
		if (computedStyle.overflow === 'hidden' || computedStyle.overflow === 'auto') {
			parent.style.overflow = 'visible';
		}
		parent = parent.parentElement;
	}

	var issueKey = issueKeyLink.textContent;

	var comments = (await fetchComments(issueKey)).reverse();

	var pillsContainer = appendElement(header, 'div', 'lesa-pills', addJumpToHeader);
	pillsContainer.replaceChildren();
	pillsContainer.classList.add('lesa-pills-container');

	const commentsByUser = {};
	comments.forEach(comment => {
		const authorName = comment.author?.displayName || 'Unknown';
		if (!commentsByUser[authorName]) {
			commentsByUser[authorName] = [];
		}
		commentsByUser[authorName].push(comment.id);
	});

	let activeAuthor = null;
	const commentPills = [];

	function applyCommentsFilter() {
		const visibleCommentIds = new Set();
		const hiddenCommentIds = new Set();

		commentPills.forEach(item => {
			const isVisible = (activeAuthor === null) || (activeAuthor === item.authorName);

			if (isVisible) {
				item.element.classList.remove('inactive');
				item.element.classList.add('active');
				item.commentIds.forEach(it => visibleCommentIds.add(it));
			} else {
				item.element.classList.remove('active');
				item.element.classList.add('inactive');
				item.commentIds.forEach(it => hiddenCommentIds.add(it));
			}
		});

		updateCommentsStyle(hiddenCommentIds);
		if (activeAuthor !== null) {
			ensureVisibleComment(visibleCommentIds);
		}
	}

	Object.keys(commentsByUser).forEach(authorName => {
		const commentIds = commentsByUser[authorName];
		const count = commentIds.length;

		const pill = document.createElement('div');
		pill.classList.add('lesa-pill', 'lesa-pill-comment', 'active');
		pill.textContent = `${authorName} (${count})`;

		commentPills.push({
			authorName,
			commentIds,
			element: pill
		});

		pill.addEventListener('click', () => {
			if (activeAuthor === authorName) {
				activeAuthor = null;
			} else {
				activeAuthor = authorName;
			}
			applyCommentsFilter();
		});

		pillsContainer.appendChild(pill);
	});

	applyCommentsFilter();
}

async function addLinksToOtherSystems() {
	const [accountCodeElement] = await Promise.all([
		waitForElement(document.body, 'div[data-testid="issue.views.field.single-line-text.read-view.customfield_12570"], div[data-testid="issue.views.field.single-line-text.read-view.customfield_10163"]'),
	]);

	const accountCode = accountCodeElement.textContent;
	accountCodeElement.replaceChildren();

	var newAccountCode = appendElement(accountCodeElement, 'div', 'lesa-account-code', addLinksToOtherSystems);
	newAccountCode.appendChild(document.createTextNode(accountCode));

	var accountCodeLinks = document.createElement('div');
	accountCodeLinks.classList.add('lesa-account-code-links');
	accountCodeLinks.style.fontSize = 'smaller';
	newAccountCode.appendChild(accountCodeLinks);

	var patcherLink = document.createElement('a');
	patcherLink.textContent = 'patcher';
	patcherLink.setAttribute('href', 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts?p_p_id=1_WAR_osbpatcherportlet&_1_WAR_osbpatcherportlet_accountEntryCode=' + accountCode);
	patcherLink.setAttribute('target', '_blank');

	accountCodeLinks.appendChild(patcherLink);

	accountCodeLinks.appendChild(document.createTextNode(' | '));

	var jiraSearchLink = document.createElement('a');
	jiraSearchLink.textContent = 'tickets';
	jiraSearchLink.setAttribute('href', 'https://liferay.atlassian.net/issues?jql=' + encodeURIComponent(`cf[12570] ~ '${accountCode}' or cf[10163] ~ '${accountCode}' order by created desc`));
	jiraSearchLink.setAttribute('target', '_blank');

	accountCodeLinks.appendChild(jiraSearchLink);
}

await Promise.all([
	appendStyle(),
	addJumpToHeader(),
	addLinksToOtherSystems(),
]);