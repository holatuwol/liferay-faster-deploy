Repository Overview
===================

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Then, add a Bash function to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script. Each group has a set of aliases and some descriptions that describe what the executable you've aliased actually does. The aliases located in this root folder are as follows.

.. code-block:: bash

	rd() {
		TAG_ARCHIVE_MIRROR='http://cloud-10-50-0-165/builds/fixpacks' \
			BRANCH_ARCHIVE_MIRROR='http://cloud-10-50-0-165/builds/branches' \
				/path/to/clone/location/redeploy $@
	}

Building from a Daily Build
===========================

Running ``ant all`` can be a time consuming ordeal on some operating systems. What if you could use a binary from some time earlier in the day (so you have at least some sense that things are up to date) and then only deploy the changes that you made without having to run ``ant all``?

Use whatever shorthand you think makes sense, with the example here being ``rd``. Navigate to the root of the portal repository and invoke the function you created.

.. code-block:: bash

	cd /path/to/portal/source
	rd

This script currently downloads the latest daily build from a local mirror and relies on there being a high speed connection between your local computer and that daily build host machine (so don't do this over WiFi!).  Update the mirror to be whatever internal server is available in your local office. The plan is for these builds to be automatically distributed via  ``files.liferay.com``, but it's also possible to create the build server via the provided scripts.

Essentially, the script uses the build as a base, attempts to compute the changed modules and folders, runs ``install-portal-snapshots`` on any root level dependencies (in the case of ``default`` dependencies), and then asks Gradle to mass deploy the changed modules.