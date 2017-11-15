Prerequisites
=============

Before using the scripts in this repository, you must have the following installed

* ``jq``: https://stedolan.github.io/jq/
* ``nodejs``: https://nodejs.org/en/
* ``python``: https://conda.io/miniconda.html

  * ``dateparser``: https://pypi.python.org/pypi/dateparser
  * ``jupyter``: http://jupyter.org/
  * ``pandas``: http://pandas.pydata.org/
  * ``pytz``: https://pypi.python.org/pypi/pytz
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

	github() {
		${MCD_RD_CLONE_PATH}/github/github $@
	}

	gpr() {
		SUBREPO_ROOT=/path/to/subrepo/root \
			${MCD_RD_CLONE_PATH}/github/pullrequest $@
	}

	pushorigin() {
		${MCD_RD_CLONE_PATH}/github/pushorigin "$1" "$2"
	}

Open GitHub In Web Browser
==========================

You might run into a situation where you want to show a file to someone on GitHub. If you were to do it manually, you would navigate to GitHub, switch to the correct branch, and then navigate the folder structure. What if you could leverage ``git ls-files`` from your local file system to speed that up?

.. code-block:: bash

	github UserLocalServiceImpl
	github publish_portlet_processes.jsp

This function takes advantage of the fact that most of the logic is very similar to locating a folder, and that GitHub just needs the name of the branch or tag you want to use and the path to the file.

* `github <github>`__

An alternate way to use this is to add a configuration to your IDE. For IntelliJ, you would add an External Tool with the following configuration (replace the ``${MCD_RD_CLONE_PATH}`` below with the actual path:

* **Program**: ``${MCD_RD_CLONE_PATH}/github/github``
* **Parameters**: ``$FileName$ $SelectionStartLine$ $SelectionEndLine$``
* **Working Directory**: ``$FileDir$``

Work with Pull Requests
=======================

There are a variety of tools for working with pull requests, such as `hub <https://github.com/github/hub>`__, `nodegh <https://github.com/node-gh/gh>`__, and `git-pull-request <https://github.com/liferay/git-tools/tree/master/git-pull-request>`__. This is just one more.

Auto-Rebase Pull Request
~~~~~~~~~~~~~~~~~~~~~~~~

I often need to download a pull request that was sent against someone else's repository to diagnose what happened with it. However, if you don't do something like that very often, you may end up having to Google how to fetch a pull request from an arbitrary repository, only to either discover two extremes: the hard to remember ``git fetch git@github.com:liferay/liferay-portal.git pull/id/head:BRANCH_NAME``, or the easy to remember ``hub checkout``.

* `ghfetchpull <ghfetchpull>`__

The script used to do the former, but now does the latter. Given that, the only extra thing this script does is an auto-rebase against the base branch in the upstream repository after checking it out.

.. code-block:: bash

	gpr https://github.com/brianchandotcom/liferay-portal/pull/1
	gpr https://github.com/brianchandotcom/liferay-portal/pull/1 LPS-18273


Open GitHub Pull Request
~~~~~~~~~~~~~~~~~~~~~~~~

While opening a pull request is pretty trivial, but running all the checks that would cause an automatic close of that pull request isn't something that you're likely to remember after your excitement at having fixed a bug. What if a script automatically checked for the most common issues, so you could just remember who you need to send a pull request and the script would take care of the rest?

.. code-block:: bash

	gpr dustin
	gpr brian chan

For now, the script enforces the convention of always submitting from a new branch, so ``master`` is not allowed.

* `ghsendpull <ghsendpull>`__

It is also designed specifically to account for multiple origin repositories, such as if you decided to have ``liferay-portal`` and ``liferay-portal-ee`` share a ``.git`` folder and setup your tracking branches so that you ignore the ``master`` branch from ``liferay-portal-ee``, as is done in `fixupstream <fixupstream>`__. This is my own personal setup, which is why it's written in this way.

Aside from that, currently, the script does the following:

* finds reviewer by partial name
* rebases against upstream
* generates patches to split changes across subrepositories if needed
* runs the baseline task against changed modules (ignoring profiles)
* runs source formatter against your changes (ignoring profiles)
* runs `pmd <https://pmd.github.io>`__ against all changed files (required by pull request tests)
* opens a web browser to the GitHub compare URL so you can create a pull request

Push Branch to Origin
=====================

For Git histories involving commits with many files, GitHub won't allow you to easily push up your commit history. This can be problematic if someone creates a branch new branch in your upstream with tens of thousands of commits that diverged many thousands of commits earlier in your existing branches. To work around the problem, it's possible to break your commit history up into much smaller pieces (for example, 10k commits) and push it up that way.

.. code-block:: bash

	pushorigin BRANCH_NAME UPSTREAM_NAME