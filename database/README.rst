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

Start a Database in a Docker Container
--------------------------------------

All of the other scripts in this folder are used to run Docker containers for various Liferay-supported databases. The scripts require that either you set the `LIFERAY_HOME` environment variable to the location of a Tomcat bundle, or your current working directory is one of the following locations (which will allow it to automatically detect a `LIFERAY_HOME`):

* the root folder of a Tomcat bundle with a `portal-ext.properties` file (really obvious `LIFERAY_HOME`)
* the root folder of a clone of the `liferay-portal` repository (tries to auto-detect from `app.server.properties`)
* the root folder of a clone of the `liferay-portal-ee` repository (tries to auto-detect from `app.server.properties`)

Some of the databases allow you to specify the location of a database backup (for these, just add the path to the database backup as an argument to the script), and the scripts will automatically run scripts or mount volumes to allow for the database initialization to complete.

* `azuresql`
* `db2`
* `oracle`