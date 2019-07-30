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

Sometimes it's hard to know what you should prioritize when attempting to create an upgrade performance enhancement. This converts an upgrade log into a ``times_old.csv`` file that shows the time that elapsed for each upgrade step, which allows you to sort the upgrade times in descending order using spreadsheet software.

.. code-block:: bash

	upgradetimes FILE_NAME

After you've completed your upgrade performance enhancements, you can confirm whether your code change has improved the performance of a previous upgrade, this script can also be used to compare upgrade times by providing two file names.

.. code-block:: bash

	upgradetimes FILE_NAME_1 FILE_NAME_2

The resulting output is a ``times_old.csv`` which shows the times of the first log, a ``times_new.csv`` which shows the times of the second log, and a ``times_compare.csv`` that allows you to compare the upgrade times for each step, and a ``times_compare_totals.csv`` that allows you to only compare the total time for each upgrade process.