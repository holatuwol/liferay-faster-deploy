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

While opening a pull request is pretty trivial, but running all the checks that would cause an automatic close of that pull request isn't something that you're likely to remember after your excitement at having fixed a bug. What if a script automatically checked for the most common issues, so you could just remember who you need to send a pull request and the script would take care of the rest?

.. code-block:: bash

	gpr dustin
	gpr brian chan

For now, the script doesn't automatically do a ``-f`` when pushing to your origin repository to avoid accidental bad things happening, and it also enforces the convention of always submitting from a new branch, so ``master`` is not allowed.

* `ghsendpull <ghsendpull>`__

It is also designed specifically to account for multiple origin repositories, such as if you decided to have ``liferay-portal`` and ``liferay-portal-ee`` share a ``.git`` folder and setup your tracking branches so that you ignore the ``master`` branch from ``liferay-portal-ee``, as is done in `fixupstream <fixupstream>`__. This is my own personal setup, which is why it's written in this way.

Aside from that, currently, the script does the following:

* specify reviewer by partial name
* rebase against upstream
* run source formatter against your changes
* run PMD against your changes
* open your web browser to the compare URL so you can create a pull request