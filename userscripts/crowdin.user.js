// ==UserScript==
// @name CrowdIn Incomplete Translation Highlighter
// @namespace holatuwol
// @version 1.0
// @match https://crowdin.com/project/liferay-japan-documentation/*
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

async function highlightIncompleteItems() {
    var folders = Array.from(document.querySelectorAll('.node-directory.expanded'));

    folders.forEach((folder) => {
        var translationProgress = Array.from(folder.querySelectorAll('.translation-progress-holder .number:first-child'));

        var incompleteTranslationProgress = translationProgress.filter((node) => node.textContent?.trim() != '100%');

        var incompleteItems = incompleteTranslationProgress.map((node) => node.closest('.node:not(.node-directory)')).filter((node) => node);

        var lastIncompleteCount = folder.getAttribute('data-incomplete-count') || 0;

        if (lastIncompleteCount == incompleteItems.length) {
            return;
        }

        folder.setAttribute('data-incomplete-count', String(incompleteItems.length));

        incompleteItems.forEach((incompleteItem) => {
            incompleteItem.classList.add('lesa-incomplete');
        });
    });
}

var styleElement = document.createElement('style');
styleElement.textContent = `
.lesa-incomplete {
  background-color: #fcf;
}
`;

document.head.appendChild(styleElement);

const observer = new MutationObserver(debounce(highlightIncompleteItems, 500));

observer.observe(document.body, {
    childList: true,
    subtree: true,
});