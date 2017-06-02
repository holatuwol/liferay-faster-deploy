Installation
============

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Then, add this section to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script, making sure to change `/path/to/clone/location` to wherever you cloned the repository.

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location

	cr() {
		${MCD_RD_CLONE_PATH}/tomcat/catalinastart
	}

Start Tomcat
============

This is just a script that I use in order to start multiple Tomcat servers on the same machine while allowing the script to simply auto-detect an open port.

* `catalinastart <catalinastart>`__