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

These scripts make use of the following Python libraries:

* ``beautifulsoup4``: https://www.crummy.com/software/BeautifulSoup/
* ``dateparser``: https://dateparser.readthedocs.io/en/stable/
* ``jupyter``: http://jupyter.org/
* ``pandas``: http://pandas.pydata.org/
* ``requests``: http://docs.python-requests.org/en/master/
* ``semver``: https://pypi.python.org/pypi/semver
* ``ujson``: https://pypi.python.org/pypi/ujson
* ``yq``: https://yq.readthedocs.io/en/latest/

You can install all of these packages using the following commands:

.. code-block:: bash

	conda install -y beautifulsoup4 jupyter pandas requests ujson
	pip install dateparser semver yq