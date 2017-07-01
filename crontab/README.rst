Prerequisites
=============

Before using the scripts in this repository, you must have the following installed

* ``jq``: https://stedolan.github.io/jq/
* ``nodejs``: https://nodejs.org/en/
* ``python``: https://conda.io/miniconda.html

  * ``dateparser``: http://jupyter.org/
  * ``jupyter``: http://jupyter.org/
  * ``pandas``: http://pandas.pydata.org/
  * ``semver``: https://pypi.python.org/pypi/semver
  * ``ujson``: https://pypi.python.org/pypi/ujson

Overview
========

These scripts attempt to create running servers with builds of ``master``, ``ee-7.0.x``, ``ee-6.2.x``, and ``ee-6.1.x`` that are accessible by modifying your machine's local hosts files. The provided Apache server configuration `liferay.conf <liferay.conf>`__ will direct you to one of four running Liferay instances, depending on the host name you provide.

It's important to note that in order to allow the build process to run predictably, builds use `cachenpm <../cachenpm>`__ to run the ``npm install`` outside of the regular ``ant all`` process to avoid unexpected errors (and ``npm install`` is fairly unpredictable) that would otherwise cause the build to fail.

Manual Initialization
=====================

The scripts make the following assumptions about the server setup.

* User ``tomcat`` has been created for the server
* You have cloned the ``liferay-portal-ee`` repository into ``/home/tomcat/source`` with proper credentials set for ``user.email`` and ``user.name``
* You have cloned this repository into ``/home/tomcat/redeploy``
* You have created a ``/var/www/html/builds/branches`` folder if you wish to archive the generated branch builds
* You have created a ``/var/www/html/builds/fixpacks`` folder if you wish to create fix pack builds as well
* If you wish to monitor someone's pull requests, you have run ``git config --global github.pull-user`` to specify a GitHub user and ``git config --global github.oauth-token`` to specify an authentication token to use for grabbing the pull requests

The scripts also assume that you have ``portal-ext.properties`` that make the virtual host strategy not raise security errors and an ``lpkgs.txt`` if you wish to do more than a minimal build. Additional notes are below.

``portal-ext.properties``
~~~~~~~~~~~~~~~~~~~~~~~~~

The script assumes that there is a file ``/home/tomcat/portal-ext.properties`` which contains the default portal properties used by all servers. This is an example of what this file can contain.

.. code-block:: properties

	web.server.display.node=true
	browser.launcher.url=

	session.cookie.use.full.hostname=true
	virtual.hosts.valid.hosts=\
		master.lrsupport.com,70x.lrsupport.com,62x.lrsupport.com,61x.lrsupport.com,debug.lrsupport.com,\
		master,70x,62x,61x,debug,PUBLIC_IP,PUBLIC_HOSTNAME

	setup.wizard.enabled=false
	terms.of.use.required=false
	users.reminder.queries.enabled=false
	layout.parallel.render.enable=false

``lpkgs.txt``
~~~~~~~~~~~~~

The build server will use `skipmp <../skipmp>`__ in order to reduce the startup time on the bundle (with the added benefit of faster build times).

The script assumes that there is a file ``/home/tomcat/lpkgs.txt`` which contains the applications (defined via the ``app.bnd`` files in the portal source) that should be included with every build. If this file is not created, a very minimal build will be created. An example of what this file could contain is as follows.

.. code-block:: txt

	Collaboration
	Forms and Workflow
	Foundation
	Push
	Static
	Web Experience

Automated Initialization
========================

Please see `server_setup.ipynb <server_setup.ipynb>`__ for a Jupyter notebook that can be used to setup the server. Note that this notebook assumes that you've run through the Amazon EC2 Basics notebooks to generate all of its different utility scripts.