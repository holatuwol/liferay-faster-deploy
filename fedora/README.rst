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

	touchpad() {
		${MCD_RD_CLONE_PATH}/fedora/touchpad $@
	}

Disable Touchpad
================

In most modern operating systems, you can tell the operating system to ignore the trackpad input when an external mouse is connected, but no such option exists in the Liferay Fedora setups. This script checks ``xinput`` for the Touchpad and then either disables it if you pass ``0`` or enables it if you pass ``1``.

.. code-block:: bash

	touchpad 0
	touchpad 1