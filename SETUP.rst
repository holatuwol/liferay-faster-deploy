Initial Setup
=============

Prerequisites
-------------

You will need to have the following programs installed for your operating system.

* ``conda``: https://conda.io/miniconda.html
* ``jq``: https://stedolan.github.io/jq/
* ``nodejs``: https://nodejs.org/en/

When installing ``conda`` on Windows, make sure to include it in your PATH environment variable. It displays the option in red, but it makes things much easier because Python is then available for External Tools as well.

Python Packages
---------------

These scripts make use of the following Python libraries:

  * ``dateparser``: https://dateparser.readthedocs.io/en/stable/
  * ``gitpython``: https://gitpython.readthedocs.io/en/stable/
  * ``jupyter``: http://jupyter.org/
  * ``pandas``: http://pandas.pydata.org/
  * ``semver``: https://pypi.python.org/pypi/semver
  * ``ujson``: https://pypi.python.org/pypi/ujson

You can install all of these packages using the following commands:

.. code-block:: bash

	conda install -y gitpython jupyter pandas ujson
	pip install dateparser semver

Environment Variables
---------------------

Clone this repository.

.. code-block:: bash

	git clone git@github.com:holatuwol/liferay-faster-deploy.git

Add the following environment variable to your ``.bash_aliases`` file, making sure to change `/path/to/clone/location` to wherever you cloned the repository:

.. code-block:: bash

	MCD_RD_CLONE_PATH=/path/to/clone/location