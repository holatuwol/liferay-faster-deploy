Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Then, add this section to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script.

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	fixdeps() {
		${MCD_RD_CLONE_PATH}/packageinfo/fixdeps
	}

Update Gradle Dependencies
==========================

Manual Update
~~~~~~~~~~~~~

Let's assume, for example, that you made a change that triggers a version increment of the ``com.liferay.portal.kernel.util`` package of the ``portal-service`` folder.

In a pessimistic approach, you have to change any module that uses ``com.liferay.portal.kernel``. In an optimistic approach, you would run with the assumption that only one bundle exports a given package (usually a safe assumption), and ensure that anything mentioning the ``com.liferay.portal.kernel.util`` package in either a ``.java`` file or a ``.jsp`` file translates to a ``build.gradle`` update. If you were even more optimistic, what you could do is identify the specific class names that you modified, since either the class name would appear as a fully qualified name, or as a result of source-formatting rules would appear in an import statement.

Whether you're optimistic or pessimistic, all ``build.gradle`` files that match your criteria will need to be updated.

Scripted Update
~~~~~~~~~~~~~~~

If it's possible to find the ``build.gradle`` files you must update using basic UNIX commands, it is also possible to script their modification. That is the purpose behind the following script.

* `fixdeps <fixdeps>`__