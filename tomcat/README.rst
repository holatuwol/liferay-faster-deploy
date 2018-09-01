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

	bundle() {
		LIFERAY_RELEASES_MIRROR=http://172.16.168.221/files.liferay.com \
		LIFERAY_FILES_MIRROR=http://172.16.168.221/releases.liferay.com \
		BRANCH_ARCHIVE_MIRROR=http://10.50.0.165/builds/branches/ \
		LICENSE_MIRROR=http://10.50.0.165/license/ \
		LIFERAY_PASSWORD=test \
		DRIVERS_FOLDER=/path/to/folder/with/jdbc/jars \
			${MCD_RD_CLONE_PATH}/tomcat/bundle "$@"
	}

	cluster() {
		LIFERAY_RELEASES_MIRROR=http://172.16.168.221/files.liferay.com \
		LIFERAY_FILES_MIRROR=http://172.16.168.221/releases.liferay.com \
		BRANCH_ARCHIVE_MIRROR=http://10.50.0.165/builds/branches/ \
		LICENSE_MIRROR=http://10.50.0.165/license/ \
		LIFERAY_PASSWORD=test \
		DRIVERS_FOLDER=/path/to/folder/with/jdbc/jars \
			${MCD_RD_CLONE_PATH}/tomcat/cluster_docker "$@"
	}

	cr() {
		${MCD_RD_CLONE_PATH}/tomcat/catalinastart $@
	}

Docker Bundle
=============

Simple wrapper script that recreates a Docker container by passing arguments to the initialization of a `build downloader <https://github.com/holatuwol/lps-dockerfiles/tree/master/nightly>`__ Docker image. The built Docker images will use any of the following Tomcat bundles:

* a bundle that has been built from source (run the command from a folder with the proper ``app.server.${USERNAME}.properties``, or run it from the ``LIFERAY_HOME`` of the Tomcat bundle)
* one of my `cloud-10-0-30-27 <http://cloud-10-0-30-27/builds/>`__ weekly builds, `cloud-10-50-0-165 <http://cloud-10-50-0-165/builds/>`__ nightly builds, or an official snapshot build hosted on an internal office mirror of ``releases.liferay.com`` (for public branches) or ``files.liferay.com`` (for private branches)
* an official release bundle (CE GA release, EE service pack release) from an internal office mirror of ``releases.liferay.com`` (for CE releases) or ``files.liferay.com`` (for EE releases)
* a fix pack, which will use the internal office mirror of ``files.liferay.com`` to download the closest service pack (note that this is hard-coded, so you will have to periodically rebuild the Docker image whenever I update it) and apply the fix pack
* a bundle that can be easily derived from a hotfix name (``liferay-hotfix-123-7010``) or URL, which will use the internal office mirror of ``files.liferay.com`` to download the needed fix pack derived from its fix pack documentation XML

The script accepts the following parameters:

.. code-block:: bash

	bundle [fix-pack-level] [port-number] [container-name]

All parameters are technically optional, but you have to leave off parameters starting from right to left.

1. If you leave off the container name, and you do not set a ``CONTAINER_NAME`` environment variable, it will name it ``test`` followed by the port number.
2. If you leave off the port number, and you do not set a ``TOMCAT_PORT`` environment variable, it will do its best to guess the port number it should use, starting at 8080.
3. If you leave off the fix pack level, it will check to see if there is a bundle that can be identified from the current folder (either you are located in ``LIFERAY_HOME`` with a ``portal-ext.properties`` file, or you're located in portal source with a ``build.USERNAME.properties`` file). If there is no such bundle, it will default to downloading a snapshot of master.

You can also specify an ``IMAGE_NAME`` environment variable if you'd like it to start using a different JDK version than the one it will guess (6.2 will use JDK7, all others will use JDK8).

.. code-block:: bash

	bundle de-32
	IMAGE_NAME='holatuwol/liferay:ibmjdk8' bundle hotfix-1852
	cd ${LIFERAY_HOME} && bundle

The script has some additional logic to check ``LIFERAY_HOME`` (when ``LIFERAY_HOME`` isn't specified as an environment variable, it checks in the current working directory for ``portal-ext.properties``), and the container will use ``rsync`` to copy everything in ``LIFERAY_HOME`` to itself on each restart. This means that if it has a bundle, it copies the bundle. If it does not have a bundle, the script allows you to spin up multiple versions simultaneously using the same ``portal-ext.properties``, and it allows you to evaluate OSGi bundles and OSGi configurations across multiple releases and branches of Liferay.

If you specify a ``NETWORK_NAME`` environment variable, it enables a TCP-based clustering configuration. If your ``portal-ext.properties`` specifies a ``jdbc.default.jndi.name``, it will use that for its clustering with ``JDBC_PING``. If there is no such value, it will enable an aggressive ``TCPPING`` configuration that will check port 7800 and 7801 for all 250+ nodes allowed for the subnet, which effectively equates to hard-coding a cluster of 250 nodes.

The alias allows you to pass in whatever password you wish to use for the portal instance by setting the ``LIFERAY_PASSWORD`` environment variable before running the script. If this environment variable is not set, it will randomly generate one, which you can extract by checking ``portal-setup-wizard.properties`` inside of the home folder inside of the container.

.. code-block:: bash

	docker exec test grep default.admin.password= /home/liferay/portal-setup-wizard.properties

If the current folder contains a ``portal-ext.properties`` file or any of the alternate folders listed in the **Provide Additional Files** section of the nightly build downloader documentation, the current working directory will be automatically mounted so that its contents can be copied to ``LIFERAY_HOME``. If none of the above apply, but there is a ``bundles`` folder as a child of the current working folder, that ``bundles`` folder will be automatically mounted so that its contents can be copied to ``LIFERAY_HOME``.

* `bundle <bundle>`__

Docker Cluster
==============

A wrapper script which uses the ``bundle`` command (described above) to start a cluster. If a database is not specified in ``portal-ext.properties``, it will use the `database <https://github.com/holatuwol/liferay-faster-deploy/tree/master/database>`__ scripts from this repository to create a MySQL database.

* `cluster_docker <cluster_docker>`__

Start Tomcat
============

This is just a script that I use in order to start multiple Tomcat servers on the same machine while allowing the script to simply auto-detect an open port.

* `catalinastart <catalinastart>`__
