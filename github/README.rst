.. code-block:: bash

	github() {
		/path/to/clone/location/github/github $@
	}

	gpr() {
		/path/to/clone/location/github/pullrequest $@
	}

	patcher() {
		/path/to/clone/location/github/patcher
	}

Open GitHub In Web Browser
==========================

You might run into a situation where you want to show a file to someone on GitHub. If you were to do it manually, you would navigate to GitHub, switch to the correct branch, and then navigate the folder structure. What if you could leverage ``git ls-files`` from your local file system to speed that up?

.. code-block:: bash

	github UserLocalServiceImpl
	github publish_portlet_processes.jsp

This function takes advantage of the fact that most of the logic is very similar to locating a folder, and that GitHub just needs the name of the branch or tag you want to use and the path to the file.

* `github <github>`__

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

For now, the script doesn't automatically do a ``-f`` when pushing to your origin repository to avoid accidental bad things happening, and it also enforces the convention of always submitting from a new branch, so ``master`` is not allowed.

* `ghsendpull <ghsendpull>`__

It is also designed specifically to account for multiple origin repositories, such as if you decided to have ``liferay-portal`` and ``liferay-portal-ee`` share a ``.git`` folder and setup your tracking branches so that you ignore the ``master`` branch from ``liferay-portal-ee``, as is done in `fixupstream <fixupstream>`__. This is my own personal setup, which is why it's written in this way.

Aside from that, currently, the script does the following:

* specify reviewer by partial name
* rebase against upstream
* run source formatter against your changes
* run PMD against your changes
* open your web browser to the compare URL so you can create a pull request

Open Browser to Patcher Portal
==============================

You might want to create a new fix inside of patcher portal. This script ensures that all the fix baselines used in patcher portal (or at least, the ones that I remember to update in an S3 bucket) are available out locally, and then opens your web browser to the fix creation page.

* `patcher <patcher>`__

Right now, patcher has a defect where it doesn’t know what to do with the URL parameter for the baseline ID the version is 2 (in other words, 7.0.x and later fixes). In order to work around this defect, you can use a Bookmarklet. Just paste the Javascript into the Bookmarklet Creator and add the result as a bookmarklet in your Bookmarks bar and click on it after Patcher Portal loads.

* http://mrcoles.com/bookmarklet/

``` .js
var selectName = '_1_WAR_osbpatcherportlet_patcherProjectVersionId';
var select = AUI().one('#' + selectName);

var re = new RegExp(selectName + '=(\\d+)');
var match = re.exec(document.location.search);

if (match) {
	var id = match[1];
	var option = select.one('option[value="' + id + '"]');

	if (option) {
		option.set('selected', true);
	}
}
```