Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Make sure that you've got all the prerequisite binary tools and Python packages:

* `Initial Setup <../SETUP.rst>`__

Then, add this section to ``.bash_aliases`` (or the equivalent on whichever shell you're using) which calls the script, making sure to change ``/path/to/clone/location`` to wherever you cloned the repository, and ``/path/to/folder/with/jdbc/jars`` to a folder containing JDBC driver .jar files:

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	websphere() {
		DRIVERS_FOLDER=/path/to/folder/with/jdbc/jars \
			${MCD_RD_CLONE_PATH}/websphere/websphere "$@"
	}

Websphere Bundle
================

Takes any Liferay Tomcat bundle (including one built from source) and uses it to start a Websphere container running Liferay. Currently only works with versions of Liferay compatible with a Websphere version that has at least one tag available on DockerHub (`reference <https://hub.docker.com/r/ibmcom/websphere-traditional/tags>`__).

First, make sure the following two files are available in ``LIFERAY_HOME``:

* ``portal-ext.properties``
* ``license.xml`` (only required if using an EE/DXP release bundle, file name is important!)

Once both files are available, simply navigate to ``LIFERAY_HOME`` (or navigate to a portal source folder where ``app.server.USERNAME.properties`` has an ``app.server.parent.dir`` pointing to ``LIFERAY_HOME``) and then call the script, specifying which major.minor version of Websphere to use (8.5, 9.0) as the argument.

.. code-block:: bash

	websphere 8.5
	websphere 9.0

**Limitations**: I haven't figured out how to get lambda expressions in ROOT.war .jsp files to work. Therefore, a side-effect of one of the commits for `LPS-89139 <https://issues.liferay.com/browse/LPS-89139>`__ (`reference <https://github.com/liferay/liferay-portal/commit/65f73ce970f4c95f6807d795bed06884ebf8493d>`__) is that it will result in a non-functioning Websphere 9.0.0.9 bundle, even though that release should contain a fix for `PI89577 <https://www-01.ibm.com/support/docview.wss?uid=swg1PI89577>`__. For now, the script aborts if it detects a lambda expression (``->``) somewhere in a .jsp.

In order to undo the changes from `LPS-89139 <https://issues.liferay.com/browse/LPS-89139>`__, you can use anonymous inner classes. Here are the changes you will need to apply:

* `portal-web/docroot/html/common/themes/bottom_portlet_resources_css.jspf <https://github.com/liferay/liferay-portal/blob/7.2.0-ga1/portal-web/docroot/html/common/themes/bottom_portlet_resources_css.jspf#L21>`__
* `portal-web/docroot/html/common/themes/top_portlet_resources_css.jspf <https://github.com/liferay/liferay-portal/blob/7.2.0-ga1/portal-web/docroot/html/common/themes/top_portlet_resources_css.jspf#L21>`__

.. code-block:: java

	// Predicate<String> predicate = s -> true;
	Predicate<String> predicate = new Predicate<String>() { public boolean test(String s) { return true; } };

* `portal-web/docroot/html/common/themes/bottom_portlet_resources_js.jspf <https://github.com/liferay/liferay-portal/blob/7.2.0-ga1/portal-web/docroot/html/common/themes/bottom_portlet_resources_js.jspf#L24>`__
* `portal-web/docroot/html/common/themes/top_portlet_resources_js.jspf <https://github.com/liferay/liferay-portal/blob/7.2.0-ga1/portal-web/docroot/html/common/themes/top_portlet_resources_js.jspf#L24>`__

.. code-block:: java

	// Predicate<String> predicate = resource -> !finalThemeDisplay.isIncludedJs(resource);
	Predicate<String> predicate = new Predicate<String>() { public boolean test(String resource) { return !finalThemeDisplay.isIncludedJs(resource); } };
