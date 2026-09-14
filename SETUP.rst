Initial Setup
=============

Binary Tools
------------

You will need to have the following programs installed for your operating system.

* ``ant``: https://ant.apache.org
* ``conda``: https://conda.io/miniconda.html
* ``docker``: https://www.docker.com/get-started
* ``groovy``: http://groovy-lang.org/download.html
* ``jq``: https://stedolan.github.io/jq/
* ``mvn``: https://maven.apache.org
* ``nodejs``: https://nodejs.org/en/

When installing ``conda`` on Windows, make sure to include it in your PATH environment variable. It displays the option in red, but it makes things much easier because Python is then available for External Tools as well.

Python Packages
---------------

These scripts make use of the Python libraries documented in ``requirements.txt``:

* `requirements <requirements.txt>`__

You can install all of these packages using the following commands:

.. code-block:: bash

	cd /path/to/repository
	python3 -m venv ${PWD}
	source bin/activate
	pip install -r requirements.txt