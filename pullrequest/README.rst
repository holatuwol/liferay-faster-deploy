.. code-block:: bash

	afs() {
		/path/to/clone/location/pullrequest/formatsource $@
	}

	github() {
		/path/to/clone/location/pullrequest/github $@
	}

	gpr() {
		/path/to/clone/location/pullrequest/ghsendpull $@
	}

Open GitHub In Web Browser
==========================

You might run into a situation where you want to show a file to someone on GitHub. If you were to do it manually, you would navigate to GitHub, switch to the correct branch, and then navigate the folder structure. What if you could leverage ``git ls-files`` from your local file system to speed that up?

.. code-block:: bash

	github UserLocalServiceImpl
	github publish_portlet_processes.jsp

This function takes advantage of the fact that most of the logic is very similar to locating a folder, and that GitHub just needs the name of the branch or tag you want to use and the path to the file.

* `github <github>`__