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

	cd() {
		. ${MCD_RD_CLONE_PATH}/gitcd/gitcd $@
	}

	cdb() {
		. ${MCD_RD_CLONE_PATH}/gitcd/gitcdb $@
	}

	cdp() {
		. ${MCD_RD_CLONE_PATH}/gitcd/gitcdp $@
	}

Folder Overview
===============

Imagine that you are in ``modules/apps/foundation/portal-search/portal-search`` and you wanted to switch to the directory ``modules/apps/static/portal-osgi-web/portal-osgi-web-wab-generator``. How would you do it? Maybe you'd do something like this.

.. code-block:: bash

	cd ../../../static/portal-osgi-web/portal-osgi-web-wab-generator

After awhile, though, this would get pretty tedious. Did you know that you can make ``cd`` type commands that change directories by using ``git ls-files`` as an intermediate step? The following are some of the things that I use in my day-to-day work. You can add all of them with the following.

CD to Module Root
=================

We can add /bnd.bnd and /ivy.xml files to the argument we pass and use git ls-files to see if there is a match. Since that makes it suffix based, you can do any of the following in order to reach the portal-osgi-web-wab-generator folder, as it only checks to make sure that the /bnd.bnd or /ivy.xml path is unique:

.. code-block:: bash

	cd portal-osgi-web-wab-generator
	cd wab-generator

So that you don't have to remember another command, it is also called ``cd`` and it and uses the Bash "builtin" capability to use the real ``cd`` command. However, this isn't required, so you're welcome to give it whatever name you'd like to use.

* `gitcd <gitcd>`__

CD by Bundle-SymbolicName
=========================

Let's say that you are diagnosing something related to the portal-osgi-web-wab-generator so you only know it by its Bundle-SymbolicName, "com.liferay.portal.osgi.web.wab.generator" and not by its folder name. How would you reach the folder? In most cases, you might just be lost.  What if you could do something like this?

.. code-block:: bash

	cdb com.liferay.portal.osgi.web.wab.generator
	cdb wab.generator

Again, this is suffix based, but this time it's not the file name that is a suffix, but rather a specific line in bnd.bnd. You can achieve this by doing a grep that searches for ": .~*${1}$", which essentially asks for a colon, a space, any number of characters, then the term you're searching for terminated by an end of line.

Luckily, only bnd.bnd files contain this value, so you can use git ls-files to filter the list of files down to only bnd.bnd files to make this grep go much faster. You can use similar tricks with git ls-files to reduce the files you're searching for, such as only looking inside of build.gradle to see if anything uses a dependency, or searching inside of bnd.bnd for anything embedding a JAR.

* `gitcdb <gitcdb>`__

CD by Exported Package
======================

Sometimes you'll run into a bundle resolution error where some package is not available. Then that would lead you to wonder, what bundle exports the package?

Luckily, the path to a package is luckily very easy to find, because the package name translates to a path directly: just change all the periods with forward slashes and add /packageinfo to the end. Like using bnd.bnd or ivy.xml, this makes the search also suffix-based.

.. code-block:: bash

	cdp com.liferay.portal.osgi.web.wab.generator
	cdp wab.generator

The main difference is that because we're searching for something that is nested at a level deeper than the module root, we'll need to figure out how to cut out (this cuts out src/main/resources for modules while also working for portal-impl and portal-kernel). Also, we might also just be curious what the packageinfo version number is, so we'd want to echo out the contents of the packageinfo file as well.

* `gitcdp <gitcdp>`__
