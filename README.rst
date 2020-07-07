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

	checktags() {
		${MCD_RD_CLONE_PATH}/checktags
	}

	dbjar() {
		${MCD_RD_CLONE_PATH}/dbjar
	}

	gw() {
		${MCD_RD_CLONE_PATH}/gw $@
	}

	rd() {
		# Please reset the below to point to the correct server locations.
		# If something does not apply, set the value to blank.

		LIFERAY_FILES_MIRROR='http://mirrors/files.liferay.com' \
			LIFERAY_RELEASES_MIRROR='http://mirrors/releases.liferay.com' \
			TAG_ARCHIVE_MIRROR='http://cloud-10-0-30-27/builds/fixpacks' \
			BRANCH_ARCHIVE_MIRROR='http://cloud-10-50-0-165/builds/branches' \
				${MCD_RD_CLONE_PATH}/redeploy $@
	}

Liferay Tag Checker
===================

Downloads any missing liferay-portal and liferay-portal-ee tags corresponding to a Liferay release.

.. code-block:: bash

	checktags

Enable EE-only Databases
========================

In order to run EE-only databases, you need the appropriate com.liferay.portal.dao.db.jar. This script will auto-download it and place it in the ``ROOT/WEB-INF/lib`` folder of the Tomcat bundle specified in ``app.server.USERNAME.properties``.

.. code-block:: bash

	dbjar

Robust Gradle Wrapper
=====================

When compiling from source, ``gradlew`` will fail for seemingly arbitrary reasons. After debugging the build system, you will ultimately discover that it's often related to a missing portal snapshot or the presence of a ``settings.gradle`` folder created for when compiling a subrepository.

This script improves the consistency of ``gradlew`` by automatically looking for these and fixing them. It also provides the same functionality as other ``gradlew`` wrappers, such as `gdub <https://github.com/dougborg/gdub>`__, by searching for a ``gradlew`` binary somewhere in the current folder or in ancestor folders.

* `gw <gw>`__

Building from a Daily Build
===========================

**Note**: Unlike the documented scripts in the subfolders, this script is currently experimental! It also only works if you are inside the Liferay LAX office!

Running ``ant all`` can be a time consuming ordeal on some operating systems. What if you could use a binary from some time earlier in the day (so you have at least some sense that things are up to date) and then only deploy the changes that you made without having to run ``ant all``?

Use whatever shorthand you think makes sense, with the example here being ``rd``. Navigate to the root of the portal repository and invoke the function you created.

.. code-block:: bash

	cd /path/to/portal/source
	rd

This script currently downloads the latest daily build from a local mirror and relies on there being a high speed connection between your local computer and that daily build host machine (so don't do this over WiFi!).  Update the mirror to be whatever internal server is available in your local office. The plan is for these builds to be automatically distributed via  ``files.liferay.com`` (because many Liferay offices have a mirror), but it's also possible to create the build server via the provided scripts.

* `crontab <crontab>`__

Essentially, the script uses the build as a base, attempts to compute the changed modules and folders, runs ``install-portal-snapshots`` on any root level dependencies (in the case of ``default`` dependencies), and then asks Gradle to mass deploy the changed modules.