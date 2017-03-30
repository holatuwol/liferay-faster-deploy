Use for Local Development
=========================

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Add a Bash function to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script while also specifying where you want the builds to go by setting the `BUILD_FOLDER_PREFIX` variable. Use whatever shorthand you think makes sense, with the example here being `rd`.

.. code-block:: bash

	rd() {
		BUILD_FOLDER_PREFIX=/opt/liferay \
			BUILD_FOLDER_SUFFIX=bundles \
			TAG_ARCHIVE_MIRROR='http://cloud-10-50-0-165/builds/fixpacks' \
			BRANCH_ARCHIVE_MIRROR='http://cloud-10-50-0-165/builds/branches' \
				/path/to/clone/location/redeploy
	}

Navigate to the root of the portal repository and invoke the function you created.

.. code-block:: bash

	cd /path/to/portal/source

	rd