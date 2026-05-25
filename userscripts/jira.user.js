// ==UserScript==
// @name JIRA with Less Scrolling
// @namespace holatuwol
// @version 1.0
// @match https://liferay.atlassian.net/browse/*
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

async function scrollIntoView(selector) {
	var header = await waitForElement(document.body, 'div[data-testid="issue-view-sticky-header-container.sticky-header"]');
	var element = document.querySelector(selector);

	element.style.scrollMarginTop = (header.offsetHeight) + 'px';

	const observerCallback = debounce(() => {
		observer.disconnect();

		element.scrollIntoView({
			'behavior': 'instant',
			'block': 'start',
		});
	}, 500);

	const observer = new MutationObserver(observerCallback);

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	element.scrollIntoView({
		'behavior': 'instant',
		'block': 'start',
	});

	observerCallback();
}

async function scrollToComment() {
	var select = this;
	var selectedCommentId = select.options[select.selectedIndex].value;

	if (!selectedCommentId) {
		return;
	}

	if (selectedCommentId == 'description') {
		scrollIntoView('h1');
		return;
	}

	if (selectedCommentId == 'attachments') {
		scrollIntoView('*[data-testid="issue.views.issue-base.content.attachment.heading.section-heading-title"]');
		return;
	}

	if (selectedCommentId == 'issue-links') {
		scrollIntoView('*[data-testid="issue-view-content-issue-links.title"]');
		return;
	}

	var selectedCommentSelector = `div[data-testid="issue-comment-base.ui.comment.ak-comment.${selectedCommentId}"]`;

	var selectedComment = document.querySelector(selectedCommentSelector);

	if (selectedComment != null) {
		var relativeTime = selectedComment.querySelector('span[data-testid="issue-timestamp.relative-time"]');

		if (relativeTime) {
			relativeTime.click();
		}

		scrollIntoView(selectedCommentSelector);

		return;
	}

	const observerCallback = debounce(() => {
		selectedComment = document.querySelector(selectedCommentSelector);

		if (selectedComment != null) {
			observer.disconnect();
			scrollToComment.bind(select)();
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

function createOption(value, label) {
	var option = document.createElement('option');
	option.setAttribute('value', value);
	option.textContent = label;
	return option;
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

async function addJumpToHeader() {
	const [header, issueKeyLink] = await Promise.all([
		waitForElement(document.body, 'div[data-testid="issue-view-sticky-header-container.sticky-header"]'),
		waitForElement(document.body, 'a[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')
	]);

	var issueKey = issueKeyLink.textContent;

	var comments = (await fetchComments(issueKey)).reverse();

	var select = appendElement(header, 'select', 'lesa-jumps', addJumpToHeader);
	select.addEventListener('change', scrollToComment.bind(select));

	header.appendChild(select);

	var defaultOption = createOption('', 'Select an item to jump to...');
	defaultOption.setAttribute('disabled', '');
	defaultOption.setAttribute('selected', '');

	select.appendChild(defaultOption);
	select.appendChild(createOption('description', 'Description'));
	select.appendChild(createOption('attachments', 'Attachments'));
	select.appendChild(createOption('issue-links', 'Linked work items'));

	comments.forEach(comment => {
		select.appendChild(createOption(comment.id, 'Comment on ' + moment(comment.created).format('YYYY-MM-DD HH:mm') + ', by ' + comment.author?.displayName));
	});
}

await Promise.all([
	addJumpToHeader(),
]);