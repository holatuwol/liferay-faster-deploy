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

	filtererror() {
		${MCD_RD_CLONE_PATH}/logparse/filtererror $@
	}

	upgradetimes() {
		${MCD_RD_CLONE_PATH}/logparse/upgradetimes $@
	}

Filter Error from Log
=====================

Sometimes, logs are flooded with a single error, like a ``StaleStateException``, which makes it difficult to find out if there is anything else useful in these logs. This script will remove all instances of that error from the logs so you can focus on the remaining errors.

.. code-block:: bash

	filtererror FILE_NAME StaleStateException

The file generates numbered files so that you can repeatedly call it with new exceptions, and it uses the last numbered file rather than the original log. This allows you to incrementally remove all of the errors, if there are many different types of errors flooding the logs.

Extract Upgrade Times
=====================

TODO