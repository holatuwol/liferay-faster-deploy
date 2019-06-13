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
		DRIVERS_FOLDER=/path/to/folder/with/jdbc/jars \
			${MCD_RD_CLONE_PATH}/websphere/websphere "$@"
	}

Websphere Bundle
================

Takes any Liferay Tomcat bundle (including one built from source) and uses it to start a Websphere container running Liferay. Currently only works with versions of Liferay compatible with a Websphere version that has at least one tag available on DockerHub (`reference <https://hub.docker.com/r/ibmcom/websphere-traditional/tags>`__).

.. code-block:: bash

	websphere 8.5.5
	websphere 9.0.0

**Limitations**: I haven't figured out how to get lambda expressions in ROOT.war .jsp files to work. Therefore, a side-effect of one of the commits for `LPS-89139 <https://issues.liferay.com/browse/LPS-89139>`__ (`reference <https://github.com/liferay/liferay-portal/commit/65f73ce970f4c95f6807d795bed06884ebf8493d>`__) is that it will result in a non-functioning Websphere 9.0.0.9 bundle, even though that release should contain a fix for `PI89577 <https://www-01.ibm.com/support/docview.wss?uid=swg1PI89577>`__. For now, the script aborts if it detects a lambda expression (``->``) somewhere in a .jsp.