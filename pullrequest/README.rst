.. code-block:: bash

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

Open GitHub Pull Request
========================

While opening a pull request is pretty trivial, but running all the checks that would cause an automatic close of that pull request isn't something that you're likely to remember after your excitement at having fixed a bug. What if a script automatically checked for the most common issues?

* `ghsendpull <ghsendpull>`__

Currently, the script does the following:

* specify reviewer by partial name
* rebase against upstream
* run source formatter against your changes
* run PMD against your changes
* open your web browser to the compare URL so you can create a pull request