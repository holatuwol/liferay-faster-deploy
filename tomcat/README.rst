Installation
============

Make sure that you've followed the initial setup steps for this repository:

* `Initial Setup <../SETUP.rst>`__

Then, add this section to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script.

.. code-block:: bash

	cr() {
		${MCD_RD_CLONE_PATH}/tomcat/catalinastart
	}

Start Tomcat
============

This is just a script that I use in order to start multiple Tomcat servers on the same machine while allowing the script to simply auto-detect an open port.

* `catalinastart <catalinastart>`__