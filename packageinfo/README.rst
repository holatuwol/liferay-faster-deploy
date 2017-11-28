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

	fixdeps() {
		${MCD_RD_CLONE_PATH}/packageinfo/fixdeps
	}

	trackprop() {
		${MCD_RD_CLONE_PATH}/packageinfo/trackprop
	}

Track Portal Property Value
===========================

The following script will let you see the value of a portal property for every DE release that you have available locally as a tag.

* `trackprop <trackprop>`__

Users may need to update the value for ``module.framework.properties.org.osgi.framework.bootdelegation`` in order to get things working on different application servers and different databases, such as in `LPS-67662 <https://issues.liferay.com/browse/LPS-67662>`__.

However, the default value of that property might change in each DE release as Liferay discovers bugs with the value being too inclusive, such as in `LPS-65488 <https://issues.liferay.com/browse/LPS-65488>`__, or as Liferay introduces new classes, such as in `LPS-69090 <https://issues.liferay.com/browse/LPS-69090>`__ (DE-8) and `LPS-68753 <https://issues.liferay.com/browse/LPS-68753>`__ (DE-10).

As a side-effect, any customer overriding that property may suddenly discover that Liferay stops working correctly for them after they apply a new fix pack.

We've also found that as Liferay updates the value to the property ``module.framework.web.generator.excluded.paths``, customer WAB plugins may also suddenly stop working, because the value will cause their WAB to use the Liferay exported package rather than the package provided by their bundle, which can cause problems for things like Hibernate.

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