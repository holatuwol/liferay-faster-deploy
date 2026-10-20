// ==UserScript==
// @name		 Customer Portal Quarterly Release Downloads Filter
// @namespace	holatuwol
// @version	  0.8
// @updateURL	https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/customer_portal.user.js
// @match		https://customer.liferay.com/downloads*
// @grant		unsafeWindow
// ==/UserScript==
/**
 * Vibe-coded using Ask Gemini with a Chrome browser window opened to https://customer.liferay.com/downloads
 */

(function () {
	'use strict';

	var portletId = 'com_liferay_osb_customer_downloads_display_web_DownloadsDisplayPortlet';
	var ns = `_${portletId}_`;
	var params = new URLSearchParams(document.location.search);

	function debounce(func, delay) {
		let timeoutId;
		return (...args) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				func(...args);
			}, delay);
		};
	}

	function getSearchParam(key) {
		return params.has(key) ? params.get(key) : params.get(ns + key);
	}

	function showAllResults() {
		if (getSearchParam('delta')) {
			return true;
		}

		var paginationResults = document.querySelector(`#${ns}journalArticlesSearchContainerPageIteratorBottom .pagination-results`)?.textContent;

		if (!paginationResults) {
			return true;
		}

		var pages = paginationResults.matchAll(/[0-9]+/g);

		if (!pages) {
			return true;
		}

		var total = Math.max(...Array.from(pages).map(it => parseInt(it[0])));

		if (total <= 20) {
			return true;
		}

		var spinnerOverlay = document.createElement('div');
		spinnerOverlay.style.cssText = `
				position: fixed;
				top: 0;
				left: 0;
				width: 100vw;
				height: 100vh;
				background-color: rgba(255, 255, 255, 0.7); /* Semi-transparent background */
				display: flex;
				justify-content: center;
				align-items: center;
				z-index: 9999; /* Ensures it sits above other content */
				transition: opacity 0.2s ease-in-out;
			`;

		var spinner = document.createElement('div');
		spinner.style.cssText = `
				width: 48px;
				height: 48px;
				border: 5px solid #f3f3f3;
				border-top: 5px solid #3498db; /* Color of spinning arc */
				border-radius: 50%;
				animation: spin 1s linear infinite;
			`;

		spinnerOverlay.appendChild(spinner);

		document.body.appendChild(spinnerOverlay);

		document.location.href = `${document.location.href}&${ns}delta=${total}`;
		return false;
	}

	function initFilter() {
		if (!showAllResults()) return;

		// Prevent duplicate injection
		if (document.getElementById('liferay-release-filter-wrapper')) return;

		// Container to inject controls
		const mainContainer = document.querySelector('.portlet-body') || document.body;

		// Create UI controls wrapper
		const filterWrapper = document.createElement('div');
		filterWrapper.id = 'liferay-release-filter-wrapper';
		filterWrapper.style.cssText = `
			background: #ffffff;
			padding: 14px 18px;
			margin: 15px 0 25px 0;
			border-radius: 8px;
			border: 1px solid #d0d7de;
			box-shadow: 0 2px 4px rgba(0,0,0,0.05);
			display: flex;
			align-items: center;
			gap: 12px;
			flex-wrap: wrap;
			font-family: system-ui, -apple-system, sans-serif;
		`;

		// Input field for dynamic typing
		const input = document.createElement('input');
		input.type = 'text';
		input.style.cssText = `
			padding: 6px 12px;
			border: 1px solid #cbd5e1;
			border-radius: 6px;
			font-size: 14px;
			min-width: 250px;
			outline: none;
		`;

		// Container for presets
		const buttonGroup = document.createElement('div');
		buttonGroup.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; align-items: center;';

		var productAssetCategoryId = getSearchParam('productAssetCategoryId');
		var fileTypeAssetCategoryId = getSearchParam('fileTypeAssetCategoryId');

		var presets = [];

		// Quarterly releases are grouped by quarter, other products list each
		// service pack, fix pack, security fix pack, or update in the order of
		// the page.
		var sectionTitles = Array.from(document.querySelectorAll('.section-title')).map(it => it.textContent?.trim());
		var quarters = sectionTitles.map(it => /[0-9]+\.Q[1-4]/g.exec(it)).filter(it => it).map(it => it[0]);

		if (quarters.length) {
			presets = Array.from(new Set(quarters)).sort().reverse();
		}
		else {
			presets = Array.from(new Set(sectionTitles.map(it => /(Security Fix Pack|Service Pack|Fix Pack|Update|GA) ?[0-9]+/gi.exec(it)).filter(it => it).map(it => it[0])));
		}

		if (presets.length) {
			input.placeholder = `Filter or target release (e.g., ${presets[0]})...`;
			presets = ['All'].concat(presets);
		}
		else {
			input.placeholder = 'Filter or target release...';
		}

		// Remember the active filter for each product, so that a quarterly
		// filter does not hide the releases of another product.
		var activeFilterKey = `liferay_active_filter_${productAssetCategoryId}`;

		var activeTarget = sessionStorage.getItem(activeFilterKey) || '';
		input.value = activeTarget;

		// Retrieve active stored filter across page reloads

		presets.forEach(text => {
			const btn = document.createElement('button');
			btn.textContent = text;
			const isSelected = (activeTarget === text) || (!activeTarget && text === 'All');

			btn.style.cssText = `
				padding: 5px 10px;
				border: 1px solid #00539C;
				background-color: ${isSelected ? '#00539C' : '#ffffff'};
				color: ${isSelected ? '#ffffff' : '#00539C'};
				border-radius: 4px;
				cursor: pointer;
				font-size: 12px;
				font-weight: 600;
				transition: background-color 0.15s, color 0.15s;
			`;

			btn.onclick = () => {
				const targetVal = text === 'All' ? '' : text;
				sessionStorage.setItem(activeFilterKey, targetVal);
				input.value = targetVal;

				// Update UI active styles
				Array.from(buttonGroup.children).forEach(b => {
					b.style.backgroundColor = '#ffffff';
					b.style.color = '#00539C';
				});
				btn.style.backgroundColor = '#00539C';
				btn.style.color = '#ffffff';

				applyFilterOrNavigate(targetVal);
			};

			buttonGroup.appendChild(btn);
		});

		// A term that ends with a number does not match a longer number, so
		// "Fix Pack 1" does not match "Fix Pack 10".
		function matches(text, searchTerm) {
			var index = text.indexOf(searchTerm);

			while (index != -1) {
				var nextChar = text.charAt(index + searchTerm.length);

				if (!/[0-9]$/.test(searchTerm) || !/[0-9]/.test(nextChar)) {
					return true;
				}

				index = text.indexOf(searchTerm, index + 1);
			}

			return false;
		}

		// Filter visible releases or navigate to next pagination page if 0 matches found
		function applyFilterOrNavigate(query) {
			const searchTerm = query.toLowerCase().trim();
			const titles = Array.from(document.querySelectorAll(`table[data-searchcontainerid="${ns}journalArticlesSearchContainer"] tbody tr h3.section-title a`));
			let visibleCount = 0;

			titles.forEach(title => {
				const text = (title.textContent).toLowerCase();
				const row = title.closest('tr');
				// Match against release titles
				if (!searchTerm || matches(text, searchTerm)) {
					row.style.display = '';
					visibleCount++;
				} else {
					row.style.display = 'none';
				}
			});
		}

		// The page keeps the old releases until a product and a type are
		// selected, so remove the buttons of the old product.
		const productForm = document.getElementById(`portlet_${portletId}`) || document;

		productForm.addEventListener('change', (e) => {
			if (e.target.tagName != 'SELECT') {
				return;
			}

			buttonGroup.remove();
			input.value = '';
			input.disabled = true;
			input.placeholder = 'Select a product and a type to filter the releases...';
			applyFilterOrNavigate('');
		});

		input.oninput = (e) => {
			sessionStorage.setItem(activeFilterKey, e.target.value);
			applyFilterOrNavigate(e.target.value);
		};

		// Assemble controls
		const label = document.createElement('span');
		label.style.cssText = 'font-weight: 600; font-size: 13px; color: #334155;';
		label.textContent = 'Quick Release Filter:';

		filterWrapper.appendChild(label);
		filterWrapper.appendChild(input);
		filterWrapper.appendChild(buttonGroup);

		// Inject right above table/list
		const targetElement = document.querySelector('table') || document.querySelector('.table') || mainContainer.firstChild;
		if (targetElement && targetElement.parentNode) {
			targetElement.parentNode.insertBefore(filterWrapper, targetElement);
		} else {
			mainContainer.prepend(filterWrapper);
		}

		// Apply saved filter if reloading page
		if (activeTarget) {
			const portlet = document.getElementById(`portlet_${portletId}`);
			const resultsTable = portlet.querySelector(`table[data-searchcontainerid="${ns}journalArticlesSearchContainer"]`);

			if (resultsTable == null) {
				const waitForResultsTable = new MutationObserver(debounce(function() {
					const resultsTable = portlet.querySelector(`table[data-searchcontainerid="${ns}journalArticlesSearchContainer"]`);
					if (resultsTable) {
						applyFilterOrNavigate(activeTarget);
						waitForResultsTable.disconnect();
					}
				}, 300));

				waitForResultsTable.observe(portlet, {childList: true, subtree: true});
			}
			else {
				applyFilterOrNavigate(activeTarget);
			}
		}
	}

	// Run when DOM is ready
	if (document.readyState === 'interactive' || document.readyState === 'complete') {
		initFilter();
	} else {
		document.addEventListener('DOMContentLoaded', initFilter);
	}
})();