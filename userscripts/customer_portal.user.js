// ==UserScript==
// @name         Customer Portal Quarterly Release Downloads Filter
// @namespace    holatuwol
// @version      0.3
// @updateURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/customer_portal.user.js
// @match        https://customer.liferay.com/downloads*
// @grant        unsafeWindow
// ==/UserScript==
/**
 * Vibe-coded using Ask Gemini with a Chrome browser window opened to https://customer.liferay.com/downloads
 */
(function () {
    'use strict';

    if (document.location.search.indexOf('_com_liferay_osb_customer_downloads_display_web_DownloadsDisplayPortlet_productAssetCategoryId=122235468') == -1) {
        return;
    }

    if (document.location.search.indexOf('_com_liferay_osb_customer_downloads_display_web_DownloadsDisplayPortlet_delta=') == -1) {
        var paginationResults = document.querySelector('#_com_liferay_osb_customer_downloads_display_web_DownloadsDisplayPortlet_journalArticlesSearchContainerPageIteratorBottom .pagination-results').textContent;
        var total = Math.max(...Array.from(paginationResults.matchAll(/[0-9]+/g)).map(it => parseInt(it[0])));

        if (total > 20) {
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

            document.location.href = document.location.href + '&_com_liferay_osb_customer_downloads_display_web_DownloadsDisplayPortlet_delta=' + total;
            return;
        }
    }

    function initFilter() {
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
        input.placeholder = 'Filter or target release (e.g., 2023.Q4)...';
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

        var presets = document.location.search.indexOf('_com_liferay_osb_customer_downloads_display_web_DownloadsDisplayPortlet_fileTypeAssetCategoryId=122589696') != -1 ?
            ['All'].concat(Array.from(new Set(Array.from(document.querySelectorAll('.section-title')).map(it => /[0-9]+\.Q[1-4]/g.exec(it.textContent?.trim())).filter(it => it).map(it => it[0]))).sort().reverse()) : [];

        // Retrieve active stored filter across page reloads
        const activeTarget = sessionStorage.getItem('liferay_active_filter') || '';
        input.value = activeTarget;

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
                sessionStorage.setItem('liferay_active_filter', targetVal);
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

        // Filter visible releases or navigate to next pagination page if 0 matches found
        function applyFilterOrNavigate(query) {
            const searchTerm = query.toLowerCase().trim();
            const rows = Array.from(document.querySelectorAll('tbody tr, .download-item, [class*="download"]'));
            let visibleCount = 0;

            rows.forEach(row => {
                const text = (row.innerText || row.textContent).toLowerCase();
                // Match against release titles
                if (text.includes('dxp') || text.includes('release') || text.includes('quarterly')) {
                    if (!searchTerm || text.includes(searchTerm)) {
                        row.style.display = '';
                        visibleCount++;
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        }

        input.oninput = (e) => {
            sessionStorage.setItem('liferay_active_filter', e.target.value);
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
            applyFilterOrNavigate(activeTarget);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initFilter();
    } else {
        document.addEventListener('DOMContentLoaded', initFilter);
    }
})();