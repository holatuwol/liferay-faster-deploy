This is just a reference for wrapper scripts around scripts provided in other repositories, but I don't install into my path (for example, ``npm install -g``), and prefer instead to run directly from the repository.

CDS
===

* Wrapper: ``cds``
* Repository: `ericyanLr/gist <https://gist.github.com/ericyanLr/7b8d223aca096e45bfd75785c6fed9e1>`__

.. code-block:: bash

	. ${MCD_RD_CLONE_PATH}/notmine/cds

GM
==

* Wrapper: ``gm``
* Repository: `drewbrokke/gist <https://gist.github.com/drewbrokke/d6e4889c0dff1ea4d7c5c31a17cded94>`__

.. code-block:: bash

	. ${MCD_RD_CLONE_PATH}/notmine/gm

Jack
====

* Wrapper: ``jack``
* Repository: `drewbrokke/jack <https://github.com/drewbrokke/jack>`__

.. code-block:: bash

	jack() {
		REPO_PATH=/path/to/jack/repository \
			${MCD_RD_CLONE_PATH}/notmine/jack $@
	}

Liferay Bisect
==============

* Wrapper: ``lb``
* Repository: `SpencerWoo/gist <https://grow.liferay.com/people/Liferay+Bisect+script>`__

.. code-block:: bash

	lb() {
		python ${MCD_RD_CLONE_PATH}/notmine/liferay-bisect.py $@
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
