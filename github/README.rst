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

	backport() {
		${MCD_RD_CLONE_PATH}/github/backport $1
	}

	github() {
		${MCD_RD_CLONE_PATH}/github/github $@
	}

	gpr() {
		SUBREPO_ROOT=/path/to/subrepo/root \
			${MCD_RD_CLONE_PATH}/github/pullrequest $@
	}

	linkprivate() {
		${MCD_RD_CLONE_PATH}/github/linkprivate $@
	}

	pushorigin() {
		${MCD_RD_CLONE_PATH}/github/pushorigin "$1" "$2"
	}

	itest() {
		${MCD_RD_CLONE_PATH}/github/ci_retest_group
	}

Attempt to Backport LPS Tickets
===============================

This script generates ``.patch`` files (which you get from ``git format-patch``) to the current branch and replaces any paths that appear to have changed between the base branch and the current branch, based on the path to the folder containing a ``bnd.bnd``.

Open GitHub In Web Browser
==========================

You might run into a situation where you want to show a file to someone on GitHub. If you were to do it manually, you would navigate to GitHub, switch to the correct branch, and then navigate the folder structure. What if you could leverage ``git ls-files`` from your local file system to speed that up?

.. code-block:: bash

	github UserLocalServiceImpl
	github publish_portlet_processes.jsp

This function takes advantage of the fact that most of the logic is very similar to locating a folder, and that GitHub just needs the name of the branch or tag you want to use and the path to the file.

* `github <github>`__

An alternate way to use this is to add a configuration to your IDE. For IntelliJ, you would add an External Tool with the following configuration (replace the ``${MCD_RD_CLONE_PATH}`` below with the actual path):

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

Use Symlinks for Private Repositories
=====================================

It's possible that ``ant -f build-working-dir.xml`` is extremely slow in your environment. If that's the case, you can speed things up by generating symlinks against your master folder (or ``rsync`` in the case of modules, because Gradle can't handle symlinked references to projects), and then modify the ``prepare-working-dir`` task to only apply the source-level modifications it needs to.

* `linkprivate <linkprivate>`__

You can invoke it without arguments to simply apply the symlinks. Optionally, you can also ask it to reset your current master to whatever is specified in your private branch's ``git-commit-portal`` file. In order to prevent accidental loss of changes, it uses the same format-patch and apply strategy as the ``redeploy`` script (it uses the branch specified in ``working.dir.properties`` as an estimate) in order to retain your changes.

.. code-block:: bash

	linkprivate
	linkprivate reset

**Warning**: Because this script relies on symlinks, you cannot run ``ant all``, because it will remove those symlinks during the ``clean`` phase. Instead, run ``ant compile deploy``.

Push Branch to Origin
=====================

For Git histories involving commits with many files, GitHub won't allow you to easily push up your commit history. This can be problematic if someone creates a branch new branch in your upstream with tens of thousands of commits that diverged many thousands of commits earlier in your existing branches. To work around the problem, it's possible to break your commit history up into much smaller pieces (for example, 10k commits) and push it up that way.

.. code-block:: bash

	pushorigin <BRANCH_NAME> <UPSTREAM_NAME> [ORIGIN_NAME]

Run Test Group
==============

This script makes it easier to re-run Liferay 6.2 integration tests by automatically identifying the test group (generated from ``ant -f build-test.xml record-test-class-file-names``) instead of having you find it manually.

.. code-block:: bash

	itest TestClassName

The script also copies database properties from an existing ``${LIFERAY_HOME}/portal-ext.properties``, or will automatically create a Docker container with MySQL 5.6 and a clean database if no such file is present, which is what the integration tests attempt to use by default.