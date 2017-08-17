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

	MCD_RD_CLONE_PATH=/path/to/clone/location

	aa() {
		${MCD_RD_CLONE_PATH}/nodejs/safeant all
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

Before you can use this, you will need to install Node.js by following the instructions on its website.

* `Download Node.js <https://nodejs.org/en/download/>`__

It also turns out that ``yarn`` is much faster than ``npm`` (on a per-folder basis, it reduces the time to create a ``node_modules`` folder from scratch on a new computer from 30 minutes in a brand new development environment to 8 minutes in a brand new development environment). It is also compatible with how Liferay is currently using node.js. You can install ``yarn`` by running the following after you've installed node.js.

.. code-block:: bash

	npm install -g yarn

You would then tell ``cachenpm`` to use it by setting a global ``npm`` configuration.

.. code-block:: bash

	npm config set cachenpm-install-strategy yarn

Update Gradle Plugin
--------------------

All of these ideas are based on avoiding the Gradle ``npmInstall`` task. Therefore, we must disable the ``npmInstall`` task by modifying ``build.gradle`` so that we don't have to deal with the default behavior. This is done automatically by the script.

* `disablegwnpm <disablegwnpm>`__

Iterations
----------

This section documents some of the ideas that I've experimented with in order to improve the speed of the Node.js execution. Currently, the script is configured to use ``modulecache``, because I frequently run ``git clean -xdf``, while ``modulerun`` is the recommended configuration if you have your heart set to being as close to the actual master compilation as possible. Recent changes to master have made it so that ``globalcache`` does not work without further improvements to its merge strategy (right now it naively creates a single file).

You would tell ``cachenpm`` to use a different caching strategy by setting a global ``npm`` configuration. Note that for now, ``modulerun`` and ``modulecache`` work, and ``globalcache`` is kept as a code reference for when I can find time to make it work again.

.. code-block:: bash

	npm config set cachenpm-cache-strategy modulecache


``modulerun``
~~~~~~~~~~~~~

The first idea is to simply run ``npm install`` manually, so that we can make use of the shared global cache that's created by regular ``npm``. This speeds up the build by avoiding the Gradle wrapper (which might be slower due to the additional overhead) and making use of the shared cache.

* `modulerun <modulerun>`__

``modulecache``
~~~~~~~~~~~~~~~

What can we do about ``npm install`` being slow after a ``git clean -xdf``?

The existing Gradle plugin that Liferay has created to wrap node.js has the ability to check a cache to see if any work is necessary. To implement caching, the plugin deserializes JSON files into a Java map, and it computes the hash code for that map. Unfortunately, however, in practice this computation is unusually slow, which is the most likely reason why such caching is not enabled by default.

This hashing idea works if only the hashing were faster, and if changes do not happen often. Luckily, it's possible to get fast hashing of files by combining ``jq`` to parse the JSON and ``md5sum`` to compute a hash of the parsed JSON.

* `modulecache <modulecache>`__

``globalcache``
~~~~~~~~~~~~~~~

Unfortunately, over time we've discovered that changes do happen very often, and the number of ``package.json`` files has been steadily increasing. Additionally, sometimes the number of inodes used in Liferay source explodes as a side-effect of node.js ``node_modules`` folders, introducing variability in whether or not the build will even succeed.

Therefore, a more ideal solution is to limit the number of ``package.json`` files we process to keep the number of inodes low. What if you could merge ``package.json`` files together and have a single master folder that you symlink to in order to reduce the number of inodes?

* `globalcache <globalcache>`__
