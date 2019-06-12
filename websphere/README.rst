Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Make sure that you've got all the prerequisite binary tools and Python packages:

* `Initial Setup <../SETUP.rst>`__

Then, add this section to ``.bash_aliases`` (or the equivalent on whichever shell you're using) which calls the script, making sure to change ``/path/to/clone/location`` to wherever you cloned the repository, and ``/path/to/folder/with/jdbc/jars`` to a folder containing JDBC driver .jar files:

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	websphere() {
		LICENSE_MIRROR=http://10.50.0.165/licenses \
		LIFERAY_PASSWORD=test \
		DRIVERS_FOLDER=/path/to/folder/with/jdbc/jars \
			${MCD_RD_CLONE_PATH}/websphere/websphere "$@"
	}

Websphere Bundle
================

Takes any Liferay Tomcat bundle (including one built from source) and uses it to start a Websphere container running Liferay. Currently only works with versions of Liferay compatible with Websphere 8.5.5.14 (6.2, 7.0, 7.1).