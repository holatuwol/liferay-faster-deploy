This is just a reference for wrapper scripts around scripts provided in other repositories, but I don't install into my path (for example, ``npm install -g``), and prefer instead to run directly from the repository.

CheckIt
=======

* Wrapper: ``checkit``
* Repository: `jwu910/check-it-out <https://github.com/jwu910/check-it-out>`__

.. code-block:: bash

	checkit() {
		REPO_PATH=/path/to/checkit/repository \
			${MCD_RD_CLONE_PATH}/notmine/checkit $@
	}

Jack
====

* Wrapper: ``jack``
* Repository: `drewbrokke/jack <https://github.com/drewbrokke/jack>`__

.. code-block:: bash

	jack() {
		REPO_PATH=/path/to/jack/repository \
			${MCD_RD_CLONE_PATH}/notmine/jack $@
	}

Liferay Watch
=============

* Wrapper: ``lwatch``
* Repository: `brunobasto/liferay-watch <https://github.com/liferay/liferay-osgi-watch>`__

.. code-block:: bash

	lwatch() {
		REPO_PATH=/path/to/lwatch/repository \
			${MCD_RD_CLONE_PATH}/notmine/lwatch $@
	}
