Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Make sure that you've got all the prerequisite binary tools and Python packages:

* `Initial Setup <SETUP.rst>`__

Then, add this section to ``.bash_aliases`` (or the equivalent on whichever shell you're using) which calls the script, making sure to change ``/path/to/clone/location`` to wherever you cloned the repository:

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	aa() {
		${MCD_RD_CLONE_PATH}/nodejs/safeant all
	}

	cachenpm() {
		${MCD_RD_CLONE_PATH}/nodejs/cachenpm
	}

Separate Node.js from Main Build
================================

If you decide you want to use the scripts this folder in order to speed up your build, you can add an alias for ``ant all`` to do this automatically.

Because Node.js technically will then have a time that is separate from the ``ant all`` time, it's useful to report the total time afterwards. Therefore, ``aa`` is a wrapper which calls ``time`` on ``acd``, which performs the actual work, in order to get a total build time at the end.

Other Notes
===========

Motivation
----------

Liferay performs a substantial amount of duplicate work related to node.js for every module. Essentially it downloads a release of Node.js, constructs a private cache folder so that it can run ``npm install`` in parallel, and then proceeds to run ``npm install``. Neither of the first two steps is actually necessary, because in practice, the limited number of connections you can have to an NPM registry means that any attempts at parallel execution ultimately fall apart anyway.

Can we do better? This experimental project is based on the idea that maybe that's possible!

Install Node.js
---------------

One of the things this script attempts to do is work around failures in ``npm install`` (which strangely result in empty ``node_modules`` folders) by calling ``yarn``. To make use of this, you will need to first install Node.js by following the instructions on its website.

* `Download Node.js <https://nodejs.org/en/download/>`__

From there, you can use ``npm`` to acquire ``yarn``.

.. code-block:: bash

	npm install -g yarn

Iterations
----------

This section documents some of the ideas that I've experimented with in order to improve the speed of the Node.js execution. Currently, the script is configured to use ``modulecache``, because I frequently run ``git clean -xdf``, while ``modulerun`` is the recommended configuration if you have your heart set to being as close to the actual master compilation as possible. Recent changes to master have made it so that ``globalcache`` does not work without further improvements to its merge strategy (right now it naively creates a single file).

You would tell ``cachenpm`` to use a different caching strategy by setting a global ``npm`` configuration.

.. code-block:: bash

	npm config set cachenpm-cache-strategy modulecache

``modulerun``
~~~~~~~~~~~~~

The first idea is to simply run all of the ``npm install`` together. This doesn't really speed up the build in any way, but it's used by the other strategy.

* `modulerun <modulerun>`__

``modulecache``
~~~~~~~~~~~~~~~

What can we do about ``npm install`` being slow after a ``git clean -xdf``?

The existing Gradle plugin that Liferay has created to wrap node.js has the ability to check a cache to see if any work is necessary. To implement caching, the plugin deserializes JSON files into a Java map, and it computes the hash code for that map. Unfortunately, however, in practice this computation is unusually slow, which is the most likely reason why such caching is not enabled by default.

This hashing idea works if only the hashing were faster, and if changes do not happen often. Luckily, it's possible to get fast hashing of files by combining ``jq`` to parse the JSON and ``md5sum`` to compute a hash of the parsed JSON. We can then create a ``.tar.gz`` and unzip it before any processing begins.

* `modulecache <modulecache>`__
