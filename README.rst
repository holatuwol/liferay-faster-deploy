Prerequisites
=============

Before using the scripts in this repository, you must have the following installed

* ``jq``: https://stedolan.github.io/jq/
* ``nodejs``: https://nodejs.org/en/
* ``python``: https://conda.io/miniconda.html

  * ``dateparser``: http://jupyter.org/
  * ``jupyter``: http://jupyter.org/
  * ``pandas``: http://pandas.pydata.org/
  * ``semver``: https://pypi.python.org/pypi/semver
  * ``ujson``: https://pypi.python.org/pypi/ujson

Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Then, add this section to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script, making sure to change `/path/to/clone/location` to wherever you cloned the repository.

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	gw() {
		${MCD_RD_CLONE_PATH}/gw $@
	}

	rd() {
		TAG_ARCHIVE_MIRROR='http://cloud-10-50-0-165/builds/fixpacks' \
			BRANCH_ARCHIVE_MIRROR='http://cloud-10-50-0-165/builds/branches' \
				${MCD_RD_CLONE_PATH}/redeploy $@
	}

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