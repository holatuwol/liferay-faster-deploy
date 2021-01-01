Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Make sure that you've got all the prerequisite binary tools and Python packages:

* `Initial Setup <../SETUP.rst>`__

Then, add this section to ``.bash_aliases`` (or the equivalent on whichever shell you're using) which calls the script, making sure to change ``/path/to/clone/location`` to wherever you cloned the repository:

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	azuresql() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/azuresql $@
	}

	benchmarks() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/benchmarks $@
	}

	mysql() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/db2 $@
	}

	mssql() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/mssql $@
	}

	mysql() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/mysql $@
	}

	oracle() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/oracle $@
	}

	postgres() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/postgres $@
	}

	sybase() {
		DRIVERS_FOLDER=/path/to/jdbc/drivers \
			${MCD_RD_CLONE_PATH}/database/sybase $@
	}

Run Liferay Sample SQL Builder
------------------------------

Run the Liferay Sample SQL builder, with the specified number of users.

.. code-block:: bash

	benchmarks 20000
