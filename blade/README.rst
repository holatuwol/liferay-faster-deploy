Installation
============

Make sure that you've followed the initial setup steps for this repository:

* `Initial Setup <../SETUP.rst>`__

Then, add this section to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script.

.. code-block:: bash

	updatesb() {
		PORTAL_SOURCE_ROOT=/path/to/portal/source \
			BLADE_WORKSPACE_ROOT=/path/to/blade/samples \
				${MCD_RD_CLONE_PATH}/blade/updatesb
	}

Update Service Builder
======================

Update service builder and test against the service-builder blade sample.

.. code-block:: bash

	updatesb

Source code

* `updatesb <updatesb>`__
