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

	itest() {
		${MCD_RD_CLONE_PATH}/tests/ci_retest_group
	}

Run Test Group
==============

This script makes it easier to re-run Liferay 6.2 integration tests by automatically identifying the test group (generated from ``ant -f build-test.xml record-test-class-file-names``) instead of having you find it manually.

.. code-block:: bash

	itest TestClassName

The script also copies database properties from an existing ``${LIFERAY_HOME}/portal-ext.properties``, or will automatically create a Docker container with MySQL 5.6 and a clean database if no such file is present, which is what the integration tests attempt to use by default.