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

	bundle() {
		${MCD_RD_CLONE_PATH}/tomcat/bundle $@
	}

	cluster() {
		${MCD_RD_CLONE_PATH}/tomcat/cluster $@
	}

	cr() {
		${MCD_RD_CLONE_PATH}/tomcat/catalinastart $@
	}

Docker Bundle
=============

Simple wrapper script that recreates a Docker container named ``test`` by passing arguments to the initialization of a `nightly build downloader <https://github.com/holatuwol/lps-dockerfiles/tree/master/nightly>`__ Docker image. This allows the user to quickly spin up release bundles, patched Liferay bundles, or the latest successful nightly build of different Liferay branches for "does this bug still exist" validation testing.

If the current folder contains a ``portal-ext.properties`` file or any of the alternate folders listed in the **Provide Additional Files** section of the nightly build downloader documentation, the current working directory will be automatically mounts the local folder so that its contents can be copied to ``LIFERAY_HOME``. If none of the above apply, but there is a ``bundles`` folder as a child of the current working folder, that ``bundles`` folder will be automatically mounted so that its contents can be copied to ``LIFERAY_HOME``.

* `bundle <bundle>`__

Prepare Tomcat Cluster
======================

This is a script that I use in order to prepare a simple unicast cluster using TCPPING on Ubuntu. You need to run from the portal source, and it uses ``app.server.USERNAME.properties`` in order to determine how to generate the nodes.

* `cluster <cluster>`__

Start Tomcat
============

This is just a script that I use in order to start multiple Tomcat servers on the same machine while allowing the script to simply auto-detect an open port.

* `catalinastart <catalinastart>`__
