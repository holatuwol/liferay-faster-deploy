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

	csvmanifest() {
		${MCD_RD_CLONE_PATH}/packageinfo/csvmanifest $@
	}

	trackprop() {
		${MCD_RD_CLONE_PATH}/packageinfo/trackprop $@
	}

Extract Import/Export Package from Manifest
===========================================

If you know an artifact exports a specific package, you can check which version it exports with the ``inspect`` command:

.. code-block:: bash

	inspect cap osgi.wiring.package BUNDLE_ID | grep PACKAGE_NAME

However, if you don't know what packages are exported, and you want to check everything in bulk, it's not immediately obvious what packages are imported/exported from the build artifact, because ``inspect cap osgi.wiring.package`` includes metadata on what uses the package as well, which is a lot of noise if your package is used by a lot of packages, or if you want to check what Liferay itself (bundle 0) exports.

You could try reading the generated MANIFEST.MF, but is not formatted in a human-readable way (it line wraps every 72 characters). You might also consider the ``headers`` command via Gogo shell, but everything is still all gathered together on one line.

A little bit of stream editing, and you can convert the manifest into a CSV file.

.. code-block:: bash

	csvmanifest com.liferay.portal.template.freemarker.jar
	csvmanifest Export com.liferay.portal.template.freemarker.jar
	csvmanifest modules/core/portal-bootstrap/system.packages.extra.mf

Track Portal Property Value
===========================

The following script will let you see the value of a portal property for every DE release that you have available locally as a tag.

* `trackprop <trackprop>`__

Users may need to update the value for ``module.framework.properties.org.osgi.framework.bootdelegation`` in order to get things working on different application servers and different databases, such as in `LPS-67662 <https://liferay.atlassian.net/browse/LPS-67662>`__.

.. code-block:: bash

	trackprop module.framework.properties.org.osgi.framework.bootdelegation

However, the default value of that property might change in each DE release as Liferay discovers bugs with the value being too inclusive, such as in `LPS-65488 <https://liferay.atlassian.net/browse/LPS-65488>`__, or as Liferay introduces new classes, such as in `LPS-69090 <https://liferay.atlassian.net/browse/LPS-69090>`__ (DE-8) and `LPS-68753 <https://liferay.atlassian.net/browse/LPS-68753>`__ (DE-10).

As a side-effect, any customer overriding that property may suddenly discover that Liferay stops working correctly for them after they apply a new fix pack.

We've also found that as Liferay updates the value to the property ``module.framework.web.generator.excluded.paths``, customer WAB plugins may also suddenly stop working, because the value will cause their WAB to use the Liferay exported package rather than the package provided by their bundle, which can cause problems for things like Hibernate.