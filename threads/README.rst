Thread Dumps 3: Analysis with Jupyter
=====================================

.. contents:: :local:

Training Objective
------------------

You will be able to use visualization-supported filtering to speed up the process of analyzing thread dumps with large numbers of active threads. The assumption is that you're familiar with how to break down thread dumps. If not, feel free to read through the explanations on `Stack Traces <threads1.rst>`__ and `Thread Dumps <threads2.rst>`__.

Setup and Installation
----------------------

Before you can use the tool, you will need to make sure that you have Python as well as several Python libraries.

Miniconda
~~~~~~~~~

As noted on the Conda website, "Conda is a package manager application that quickly installs, runs, and updates packages and their dependencies."

Conda's primary benefit is that it provides a virtual environment manager allows you to manage separate sandboxes that each have their own separate Python version and their own set of Python packages. For some packages (like ``numpy``), conda makes installing packages much easier than the built-in Python package manager ``pip`` and the full version of Conda also provides enhancements to those scientific analysis libraries, such as leveraging highly optimized Fortran code that uses the graphical processing unit on your machine for intense matrix calculations.

* `Downloading Conda <http://conda.pydata.org/docs/download.html>`__

Make sure to include Conda on the path so that you can use the commands described later in the tutorial without too much fuss.

Environments
~~~~~~~~~~~~

For the purposes of thread dump analysis, you will need to have the packages ``jupyter``, ``matplotlib``, ``numpy``, ``pandas``, ``seaborn``. However, it's possible that these will conflict with other Python requirements you may want to use in the future, so you should create a sandbox for it.

For the sake of this tutorial, we'll create an environment using Python 2.7 named ``threads`` that has the four libraries that we need for our thread dump analysis tool.

.. code-block:: bash

	conda create --name threads jupyter matplotlib numpy pandas seaborn python=2

Switch to a Conda virtual environment using the ``activate`` script. If you are using OS X or Linux, you will need to use ``source`` in order to invoke the activate script.

.. code-block:: bash

	source activate threads

Navigate to the folder containing the ``LogAnalyzer.ipynb`` notebook file and run the following command to start up an interactive Jupyter session.

.. code-block:: bash

	jupyter notebook

Your web browser should open automatically to localhost:8888, and you will then be able to either create a notebook, or you can use the pre-existing ``LogAnalyzer.ipynb`` that shows an example thread dump analysis session.

Histogram-Based Analysis
------------------------

In order to use the tool, all thread dumps must be pre-separated, with one thread dump per file. If files are not in this format, a separate tool must be used in order to divide the thread dump into multiple files. Optionally, a very simple one is provided in ``log_splitter.py`` and an example of how to use it is provided in ``LogSplitter.ipynb``.

Dániel Jávorszky has also provided such a tool with Logalyzer which also performs additional analysis related to logs which may be very valuable during analysis.

* `Logalyzer <https://grow.liferay.com/group/guest/excellence/-/wiki/Grow/Logalyzer+-+analyze+Liferay+logs>`__

Next, you need to have a notebook that imports all the functions from ``multi_thread_dump.py``. You achieve this with by adding the following to a cell in the notebook and running the cell.

.. code-block:: python

	from multi_thread_dump import *

Doing this gives you access to three Python classes: ``FolderThreadDump`` (if your thread dumps are all contained in a single folder all by themselves), ``TarThreadDump`` (if your thread dumps are all contained in a ``.tar`` file), and ``ZipThreadDump`` (if your thread dumps are all contained in a ``.zip`` file). They are instantiated as follows.

.. code-block:: python

	threads = FolderThreadDump('/path/to/folder')
	threads = TarThreadDump('/path/to/filename.tar')
	threads = ZipThreadDump('/path/to/filename.zip')

Some notes before we begin.

All tables and plots uses `pandas <http://pandas.pydata.org>`__, which is a fairly popular Python library for data analysis. Colors in this tool are based on the `cubehelix <https://www.mrao.cam.ac.uk/~dag/CUBEHELIX/>`__ color map. All visualization instance methods provide a ``split`` parameter that will plot everything separate plots (rather than all sharing the same plot) if set to ``True``.

All plotting methods have both a singular name version (``length_histogram``) and a plural name version (``lengths_histogram``). This is to account for both those who prefer the singular version for readability and those who prefer the plural version for consistency with the table variant of the instance method.

Process Overview
~~~~~~~~~~~~~~~~

Using this tool, thread dump analysis is a process through where the thread dump is scanned, "interesting" stack frames are identified, the corresponding method names are recorded, and the thread dump is filtered to remove the interesting stack frames to see if there is anything else that might be interesting in the thread dump.

The first capability (identifying interesting stack frames) is provided through the following instance methods:

* ``counts(phrases)``: The ``phrases`` parameter is a Python list containing all of the method names that were deemed interesting. Create a table listing the number of times that method name appears in each thread dump. This can be used to determine if you've identified something that is actually useful.
* ``counts_plot(phrases, split)``: If you are a more visual person and prefer seeing a bar chart rather than a list of numbers, this is equivalent to the ``counts`` function but visual instead.

The second capability is to remove the interesting stack frames from the thread dump so that you do not get bogged down in the details and then are able to move on to the next potentially interesting stack frames.  This capability is provided through the following instance methods:

* ``hide(phrases, min_length, max_length)``: This will mark visible threads that satisfy the criteria described in the parameters as hidden. You can hide threads based on the stack frames they contain (``phrases``) or you can decide that certain stack frame counts are uninteresting (the parameters here might be a little counterintuitive in that ``min_length`` corresponds to the minimum length of an interesting thread and ``max_length`` corresponds to the maximum length of an interesting thread).
* ``store(foldername)``: This will save the threads which are still visible to a specific folder into file names that match those of the original thread dump. Make sure this is **not** the same folder used when referencing the thread dump, as this eliminates the repeatability of the thread dump analysis.

The "are we done yet" aspect of this tool is provided through the following instance methods:

* ``lengths``: Produces a giant table telling you the thread length of every thread in each thread dump. Since you end up with hundreds of columns that are truncated in the Jupyter display by default, this is generally unusable except in upgrade thread dump analysis. However, upgrade thread dump analysis generally only focuses on a handful of threads so it has limited utility there as well.
* ``length_histogram(split)``: Rather than working with a giant table of numbers with hundreds of columns, it's much friendlier to interact with a histogram. Other than being a visualization rather than an unusable table, this is equivalent to the ``lengths`` function.

In the example notebook, the following helper function combines these three function calls by relying on ``threads`` being a global variable as well as a global variable named ``suspects`` that documents the last "interesting" stack frame method calls. Effectively it filters out the suspects, saves it to pre-specified folder, and then re-renders the length histogram.

.. code-block:: python

	suspects = []
	best_suspects = []

	def confirm_suspects():
		threads.hide(suspects)
		threads.store('/path/to/target/folder')
		threads.length_histogram()

Analyze Idle Threads
~~~~~~~~~~~~~~~~~~~~

Analyzing idle threads consists of narrowing the thread dump down to threads with very small lengths and understanding what is happening within the thread dumps for those threads. A typical maximum length is 20. This might reveal a large number of background executor threads that are not being properly cleaned up, or it might reveal that the customer has configured too many threads for their application server worker pool.

.. code-block:: python

	threads.hide(max_length=20)

In addition to the process noted above, one extra function is provided to help with this analysis:

* ``thread_names(substring)``: This will list all threads matching a given substring, or just simply list all thread names if no parameter is provided.

This function is helpful in understanding what kinds of threads are idle: are they threads which are related to managing requests (in Tomcat, threads such as ``http-`` and ``ajp-`` worker threads are in this category), are they Liferay message bus threads (which start with ``liferay/``), or are they custom threads instantiated by the customer's custom code?

Analyze Active Threads
~~~~~~~~~~~~~~~~~~~~~~

After analyzing all the idle threads, you need to reset the threads you've hidden back into a visible state in order to continue the analysis, and then continue the analysis with threads that are longer than the ones that you considered idle. To avoid having to reload the thread dump, one extra function is provided which simply remarks all the threads as visible:

* ``show(phrases)``: This will mark hidden threads matching the given terms as visible. If you pass nothing to this function, it will mark all threads as visible.

In the case where you treat idle threads as those that have a stack depth of 20, you would re-show everything that was hidden by the idle thread analysis and then hide everything that you already analyzed in your idle thread analysis, allowing you to focus only on the non-idle threads you have yet to analyze.

.. code-block:: python

	threads.show()

	suspects = []
	threads.hide(min_length=20)
	confirm_suspects()

From here, you would iterate as follows.

1. Examine the histogram and see if there is a thread dump file that looks interesting based on its shape.
2. Check the thread dump to see if there are any threads containing interesting stack frames.
3. Treat this stack frame as a suspect and then see what its appearance count looks like across thread dumps.

.. code-block:: python

	suspects = ['a.suspicious.class.name']
	threads.counts_plot(suspects)

4. Determine whether or not you want to treat this as something to revisit after you've finished your analysis. If you do so, add them to a list of things to revisit after you've completed the first pass of your thread dump analysis.

.. code-block:: python

	best_suspects += suspects

5. Remove all the threads that contained this suspicious stack frame from your thread dump so you are left with only those threads that explain everything but what you originally found suspicious and re-plot the histogram.

.. code-block:: python

   	confirm_suspects()

The last step allows you to eliminate noisy things that looked interesting at first but aren't actually good at providing a root cause explanation. After repeating this process several times, you will end up with an uninteresting looking stack depth count histogram, and the first pass of your analysis is complete.

After completing this phase of your analysis, you examine your suspects to see if they, together, explain the problem that the customer states they are experiencing.

If you're not sure, you can conduct a reversed thread dump analysis by hiding all threads and then systematically showing the elements that you believed were the best suspects back to the thread dumps.

.. code-block:: python

	threads.hide()
	threads.show(best_suspects[0:1])

Your goal will then be to use your knowledge to say whether all of those suspicious threads together would result in server slowness or whatever problem you were originally trying to diagnose.