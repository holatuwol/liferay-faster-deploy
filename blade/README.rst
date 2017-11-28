Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Make sure that you've got all the prerequisite binary tools and Python packages:

* `Initial Setup <SETUP.rst>`__

Then, add this section to ``.bash_aliases`` (or the equivalent on whichever shell you're using) which calls the script, making sure to change ``/path/to/clone/location`` to wherever you cloned the repository:

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

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
