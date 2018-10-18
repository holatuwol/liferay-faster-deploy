Thread Dumps 2: Thread Dumps
============================

.. contents:: :local:

Training Objective
------------------

You will be able to describe the assumptions that underlie the capture of thread dumps used for thread dump analysis. You will be able to list several heuristics that can be applied when isolating the relevant evidence that is contained in a collection of thread dumps and constructing an argument that can be delivered to a client.

Most importantly, you will be able to frame thread dump analysis as a modeling and prediction problem where you attempt to generalize from small collections of thread dumps rather than analyze an entire set of thread dumps.

A Single Sample
---------------

Not having a goal before attempting to do analysis is not unlike trying to solve a symbolic logic puzzle without understanding its rules.

* `Symbolic Logic Puzzles <http://www.math.hawaii.edu/~hile/math100/logice.htm>`__

So let's review the goal of thread dump analysis.

Reviewing Our Objective
~~~~~~~~~~~~~~~~~~~~~~~

In thread dump analysis, your goal is to construct an argument rooted in a provided thread dump that either supports or rejects the subscriber's claim that their portal is slow or that a specific component is slow.

With that in mind, your first intermediate goal is simply to identify interesting stack frames and stack traces within a single thread dump, which you treat as all the available evidence.

From there, the interesting stack frames are revisited together with the source code (which provides additional supporting evidence) which might allow you to construct a convincing argument (or tell a compelling story, if you are more of a creative writer than an analytic one) which explains why the portal is slow.

Curse of Dimensionality
~~~~~~~~~~~~~~~~~~~~~~~

With that being said, we are using the ``jstack`` to create a snapshot of the threads that are running at a specific point in time. Over time, there is a lot that can happen, which means all the possible stack trace permutations is actually quite large, and you could theoretically get anything from this space.

* `Curse of Dimensionality <https://en.wikipedia.org/wiki/Curse_of_dimensionality>`__

For any given thread dump, there is a non-zero probability that it was taken at just the right time to completely miss all possible stack traces of interest. In these cases, our analysis will reach the conclusion that there is no evidence suggesting that the portal is slow.

* `Proof by Example <https://en.wikipedia.org/wiki/Proof_by_example>`__

While it may be technically correct to say that there is nothing interesting in the thread dump, communicating this conclusion to a client often results in dissatisfaction and rapidly degenerates into a customer relationship management situation.

From this perspective, taking thread dumps is similar to systematic random sampling.

* `Systematic Sampling <https://en.wikipedia.org/wiki/Systematic_sampling>`__

With that in mind, we realize that encountering low probability events is actually a general problem of random sampling. The thread dump is taken when we think it should have a high probability of providing us with an explanation, but it's all probability.

Put another way, if we rely entirely on a single high probability event winning over a much lower probability one, we're Katniss at the beginning of *Hunger Games* with no volunteer option. As they say, "May the odds be ever in your favor."

Multiple Samples
----------------

Therefore, to reduce the probability that our analysis yields nothing of value, we request that our clients take multiple thread dumps rather than a single thread dump. In doing so, the probability that all of the thread dumps captured nothing of interest is drastically reduced.

Of course, it is still theoretically possible that we capture nothing of value, particularly if the client takes the thread dumps on the wrong server or at a time when the slowness was not being experienced (they simply took thread dumps without fully understanding why we needed them). We can also reach incorrect conclusions based on the qualities of the sample.

* `Common Sampling Errors <http://www.qualtrics.com/blog/frequent-sampling-errors/>`__

However, assuming that we avoided the worst case scenario of all of our thread dumps still capturing no useful information in spite of our best efforts, we can use all the thread dumps in order to reach a good approximation of what's happening in the portal over the time period represented in the thread dumps.

Monte Carlo Simulation
~~~~~~~~~~~~~~~~~~~~~~

From the perspective of deriving approximate truths using systematic random sampling of the input space, this is equivalent to asking the subscriber to perform a Monte Carlo simulation.

* `Monte Carlo Method <https://en.wikipedia.org/wiki/Monte_Carlo_method>`__

Taking that analogy further, if subscribers are performing a Monte Carlo simulation, thread dump analysis is the task of understanding what happened at each thread dump, reaching a separate conclusion or classification for each. From there, we aggregate the conclusions and we wind up with a body of evidence that we can use to construct an approximately true argument (with some level of confidence) for why the portal is slow.

With that analogy, we now officially expand the task of thread dump analysis to identifying interesting stack frames and stack traces across multiple thread dumps.

Brute Force Approach
--------------------

In an ideal world with infinite time, you would be able to analyze every thread dump and then combine all of the analyses together in order to construct a comprehensive argument on if the thread dumps provide sufficient evidence that the portal is slow.

However, since we do not have infinite time, this is impractical and only done if no other approaches appear viable or if you're simply not aware of any of the other approaches.

NP-Completeness Approach
------------------------

One solution to the problem of finite time is to assume that thread dump analysis shares qualities with NP-complete problems. More explicitly, while analyzing a thread dump to determine the problems is expensive and time-consuming, it's actually relatively quick to verify if a thread dump exhibits a specific problem.

* `NP Complete <https://en.wikipedia.org/wiki/NP-complete>`__

With this approach, we start by choosing a random subset of the thread dumps to analyze. Of course, just like any random sample, we assume that we might capture nothing, and we expand our random sample until we succeed at finding a thread dump that is interesting and then we derive some argument which explains the interesting thread dump.

* `Inductive Reasoning <https://en.wikipedia.org/wiki/Inductive_reasoning>`__

We then treat this result as a hypothesis that can be tested with the remaining thread dumps. We achieve this by asking ourselves, "If this is true, what should we see in the other thread dumps?" We then validate the hypothesis by testing if the other thread dumps manifest the symptoms that we expected based on our original analysis.

* `Deductive Reasoning <https://en.wikipedia.org/wiki/Deductive_reasoning>`__

It is also possible to perform this type of thread dump analysis without any inductive analysis step by using the subscriber's description of the problem in order to formulate our hypothesis on what should be seen in the other thread dumps. In this strategy, we immediately begin looking at the thread dumps to see if they manifest the expected symptoms.

In both cases, once you have a hypothesis, your validation would occur by opening a folder containing all the separated thread dumps and then using a text editor or ``grep`` in order to validate your hypothesis.

Occurrence Count Test
~~~~~~~~~~~~~~~~~~~~~

In this case, you're looking for a specific method invocation that is occurring frequently throughout the thread dumps. Because it's often a straight text search without regular expressions, you can also use ``grep -F`` to avoid having dots or periods being treated as a regular expression. You're mainly interested in the trend in the counts over time.

.. code-block:: bash

	grep -F -c 'interesting.phrase' *

Thread Tracking Test
~~~~~~~~~~~~~~~~~~~~

If your hypothesis involves a specific thread and it's behavior over time, you might attempt to capture that specific name and look for the first several 20 or so lines of that thread, which can be achieved with ``grep -A#``, where # corresponds to the number of lines of after-context you wish to include in the ``grep`` output. Because you're looking for this thread's behavior over time, it's less important to capture the name, so you might use ``grep -h`` to exclude the file name from the grep output to make things easier to analyze.

.. code-block:: bash

	grep -h -A20 '".*partial.thread.name.*"' *

This kind of search can also be conducted by your text editor, as it provides the surrounding context for search matches.

Stuck Method Test
~~~~~~~~~~~~~~~~~

If your hypothesis is that certain methods are frequently stuck, you might know the method name that gets stuck and you'd like to see what the behavior looks like around that method call in all threads. Here, you would want to capture the before context with ``grep -B#`` as well as the after context with ``grep -A#``, possibly 10 or so lines before and 5 or so lines after.

.. code-block:: bash

	grep -F -h -A5 -B10 'interesting.method.call' *

This kind of search can also be conducted by your text editor, as it provides the surrounding context for search matches.

Heuristic-Based Approaches
--------------------------

Another solution to the problem of finite time is to apply a heuristic in order to identify probable thread dumps of interest and restrict our analysis to those thread dumps without validating against the remaining thread dumps.

* `Heuristic (Computer Science) <https://en.wikipedia.org/wiki/Heuristic_(computer_science)>`__

If we view our approach from the perspective of a classification problem from the world of information science, we still have a training set in order to derive the model, but we no longer have a test set to validate our model.

* `Test Set <https://en.wikipedia.org/wiki/Test_set>`__

As noted above, lacking a test set is generally discouraged in analysis, because without it, we do not know if the conclusions we draw from our analysis apply to the large amount of data we are missing, which may be significant because we know that thread dumps actually only capture a very small subset of the activity happening over time and we're further reducing that subset with heuristic approaches.

* `Overfitting <https://en.wikipedia.org/wiki/Overfitting>`__

Furthermore, we rely on the assumption that any threads not selected by the heuristic are uninteresting and would not have been able to validate or invalidate our conclusions. If this assumption is correct, we do not lose anything when we remove the validation phase.

However, just as relying on a single thread dump runs the risk of having a thread dump with no information, relying a heuristic runs the risk of the assumption being incorrect (namely, there is an interesting thread dump excluded by our heuristic). Heuristics are models of how we believe we can find an interesting thread dump, and as they say:

* `George Box's famous quote <https://en.wikipedia.org/wiki/All_models_are_wrong>`__

As a result, when applying heuristics without cross-validation, there is a non-zero probability of analyzing thread dumps and reaching an incorrect conclusion. However, just like greedy heuristics in NP-complete problems, we accept that as a limitation of not having infinite time.

File Size Heuristic
~~~~~~~~~~~~~~~~~~~

One type of heuristic is something that is fast to do by hand.

Imagine you're sifting through a bunch of pages of a report in order to look for a summary of the report, but there was no abstract. As you're flipping through, what would you stop on? If you said, "One with lots of pictures" you're applying a heuristic where you choose the page with the most information density.

Looking at things in this way, the information density of a thread dump can be roughly approximated with its file size. With that in mind, it is fairly common to identify interesting thread dumps by simply looking at the biggest ones. In other words, text is what we consider interesting in a thread dump, and the bigger the thread dump, the more text it has in it.

In applying this heuristic, you use your file browser to sort on the file size and you open the largest thread dump dumps and proceed in descending file size order until you are satisfied with your analysis.

* `Best-first search <https://en.wikipedia.org/wiki/Best-first_search>`__

Stack Depth Heuristic
~~~~~~~~~~~~~~~~~~~~~

Another type of heuristic is something that can be easily performed by a computer.

In a similar vein as file size, we noted in the previous discussion on interesting stack traces that the length of a stack trace is something that can be used to categorize a stack trace as interesting. Since an interesting thread dump is one that contains interesting stack traces, one heuristic you can use to identify interesting thread dumps is to find the distribution of those stack trace lengths.

* `Histogram <https://en.wikipedia.org/wiki/Histogram>`__

With this heuristic, more interesting stack traces either have an unusually high number of threads in a specific range of stack trace lengths, or possibly just threads with a high number of long stack traces. Additionally, similar thread dumps will have similar stack length distributions.

By comparing the distributions of each of the thread dumps, it's often easy to pick out the stack traces that are similar to each other as well as those thread dumps that are different from each other and proceed with your analysis with that in mind.

Execution Time Heuristic
~~~~~~~~~~~~~~~~~~~~~~~~

Another good type of heuristic takes advantage of the fact that the problem you are solving is a subset of a larger problem, and you apply methods that would work in the original problem space to the reduced problem space you are dealing with for your current problem.

In thread dump analysis, the input space is all possible snapshots of what is occurring in the Java virtual machine. When you put together all possible snapshots, you arrive at something that has the granularity of a Java virtual machine profiler.

* `VisualVM Thread View <http://docs.oracle.com/javase/7/docs/technotes/guides/visualvm/threads.html>`__

In addressing the problems within this input space, you identify slowness by looking at threads that are themselves taking a long time to execute a given task by looking at the thread's state over time. In mapping this back to the problem of thread dump analysis, you are looking for a series of thread dumps that indicate that something is taking a long time to complete.

In other words, in order to identify interesting thread dumps, you search for a sequence of thread dumps that indicate a long-running task.

The weakness of this heuristic is that compared to the granularity of the time unit used for Java profiling tools (nanoseconds and milliseconds), the granularity of the time unit used for thread dumps is very large (seconds and dozens of seconds).

Therefore, in thread dump analysis, it is difficult to differentiate between a thread that has switched from one task to another and a thread that takes a long time handling a single task. It is for that reason that visualizing thread state information in a thread dump is much less useful than using thread state information in a profiler, and this heuristic is only rarely effective in practice.

Monitor Contention Heuristic
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Another type of good heuristic is something that tests a common hypothesis and is not time consuming to do by hand with the assistance of a computer.

One not-uncommon reason for slowness is monitor contention. You may recognize it by one of its symptoms which is often described with the more familiar term "apparent deadlock". When there is a lot of monitor contention, the entire environment will appear to be slow.

* `Detecting Thread Contention <http://www.nuxeo.com/blog/detecting-threads-contention/>`__

In applying this heuristic, you examine every thread dump and record how much monitor contention that thread dump experiences. From there, you examine your record to identify which threads have the most monitor contention. Those which have more monitor contention are more likely to be interesting and are therefore what you examine first.

With that being said, applying a monitor contention heuristic is only somewhat helpful in thread dump analysis. This is because it is possible for short-lived monitor contention to cause performance problems but not be captured because the time granularity between thread dumps is too large.

You can, however, see monitor contention if the granularity of thread dumps decreases, particularly at the granularity of a Java profiler which has sampling times on the order of nanoseconds or milliseconds instead of seconds.

* `Fighting Thread Contention <http://blogs.mulesoft.com/chasing-the-bottleneck-true-story-about-fighting-thread-contention-in-your-code/>`__

As such, any visualization that comes from a monitoring tool benefits enormously from this heuristic as they allow you to visualize the monitor contention over time.

Conclusions
-----------

In summary, identifying a thread dump of interest (or many thread dumps of interest) in all of the thread dumps you've been provided can be a daunting task, and you might think that you have to analyze every thread dump in order to be confident in your conclusions.

However, there are a variety of approaches you can use in order to reduce the amount of work that is performed in identifying thread dumps of interest. These range the entire spectrum from simple hypothesis testing to sophisticated heuristics that obviate the interesting thread dumps and separate them from the uninteresting ones.

In short, hopefully you have learned how you can transform the intractable problem of analyzing all the thread dumps that a client provides into a problem that is far more accessible. While there is always a looming risk of reaching an incorrect conclusion when applying such methods, the error rate is fairly low in practice.
