Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Then, add this section to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script, making sure to change `/path/to/clone/location` to wherever you cloned the repository.

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	patcher() {
		${MCD_RD_CLONE_PATH}/patcher/patcher
	}

Open Browser to Patcher Portal
==============================

You might want to create a new fix inside of patcher portal. This script ensures that all the fix baselines used in patcher portal (or at least, the ones that I remember to update in an S3 bucket) are available out locally, and then opens your web browser to the fix creation page.

* `patcher <patcher>`__

Right now, patcher has a defect where it doesn’t know what to do with the URL parameter for the baseline ID the version is 2 (in other words, 7.0.x and later fixes). In order to work around this defect, you can use a Bookmarklet. Just paste the Javascript into the Bookmarklet Creator and add the result as a bookmarklet in your Bookmarks bar and click on it after Patcher Portal loads.

* http://mrcoles.com/bookmarklet/

.. code-block:: javascript

	var selectName = '_1_WAR_osbpatcherportlet_patcherProjectVersionId';
	var select = AUI().one('#' + selectName);

	var re = new RegExp(selectName + '=(\\d+)');
	var match = re.exec(document.location.search);

	if (match) {
		var id = match[1];
		var option = select.one('option[value="' + id + '"]');

		if (option) {
			option.set('selected', true);
		}
	}
