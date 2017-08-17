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

	updatesb() {
		PORTAL_SOURCE_ROOT=/path/to/portal/source \
			BLADE_WORKSPACE_ROOT=/path/to/blade/samples \
				${MCD_RD_CLONE_PATH}/blade/updatesb
	}

Update Service Builder
======================

Update service builder and test against the service-builder blade sample.

.. code-block:: bash

	updatesb

Source code

* `updatesb <updatesb>`__
