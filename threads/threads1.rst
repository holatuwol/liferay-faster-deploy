Thread Dumps 1: Stack Traces
============================

.. contents:: :local:

Training Objective
------------------

You will be able to describe the phases of a thread dump analysis (identifying the problem to investigate, isolating the relevant evidence, constructing a supportable argument). You will be able to describe how your existing knowledge of error stack trace and identifying stack frames of interest applies to filtering thread dumps and isolating relevant evidence.

Critical Analysis
-----------------

Critical analysis is something you may vaguely remember doing in secondary school or possibly even college (depending on your major). If you don't remember it, here's a short description of it to jog your memory.

* `Critical Analysis Papers <http://depts.washington.edu/pswrite/Handouts/CriticalAnalysisPapers.pdf>`__

Thread dump analysis is really just another form of critical analysis. In thread dump analysis, your goal is to construct an argument based on the thread dump that either supports or rejects the subscriber's claim that their portal is slow.

Introduction to Problem Solving
-------------------------------

Before we start on our exercise, let's play a game that's tangentially related to both thread dump analysis and critical analysis. Once everyone's done, we'll talk a little bit about the result and some 1960s research related to the problem.

* `New York Times Puzzle <http://www.nytimes.com/interactive/2015/07/03/upshot/a-quick-puzzle-to-test-your-problem-solving.html>`__

Identify the Argument
---------------------

In critical analysis, before you do anything, you should first identify the argument that the original work is making. Something similar applies to thread dumps.

Before you begin your thread dump analysis, you should first identify the claim that the subscriber is making. Unlike critical analysis where the theme is derived from the text, the claim for thread dump analysis is usually explicitly provided before you even look at the text.

In general, there are only two types of claims that the subscriber will make when presenting support with the thread dumps: the portal is slow, or a specific page or component is slow.

Essentially, knowing this in advance will help you determine whether or not the evidence that you gather from within the thread dump is relevant to their claim. The more narrow the claim, the more you narrow your search for evidence.

Define the Evidence
-------------------

In critical analysis, you need to first understand the terms in the text before you can analyze the text.

Therefore, let's talk about some terminology related to the thread dump analysis. The first piece of evidence that you get to work with is the thread dump itself. A clear definition for a thread dump comes from the documentation of the most common tool used to create them, ``jstack``.

* `JStack Tool <http://docs.oracle.com/javase/7/docs/technotes/tools/share/jstack.html>`__

	``jstack`` prints Java stack traces of Java threads for a given Java process or core file or a remote debug server. For each Java frame, the full class name, method name, 'bci' (byte code index) and line number, if available, are printed.

While the terms included above may be familiar to you, you might not actually know some of their implications. Knowing those implications will help you better understand and appreciate what is conveyed in a thread dump as well as provide additional clarity on the end goal of a thread dump analysis.

Stack Trace
~~~~~~~~~~~

Let's start with a clearer understanding of a "stack trace".

	``jstack`` prints Java **stack traces of Java threads** for a given Java process or core file or a remote debug server. For each Java frame, the full class name, method name, 'bci' (byte code index) and line number, if available, are printed.

The term "stack trace" comes from what happens when you convert a "method call" as a programming concept into the assembly code that actually runs in your computer from that method call.

* `X86 Assembly Language Instruction Types <http://en.wikipedia.org/wiki/X86_assembly_language#Instruction_types>`__

Whenever a "method call" happens, the CPU does some magic in order to store the parameters and then does some more magic to call the method. In invoking all of these spells, the CPU has to make sure it has an answer to the following question: how does it know where to come back to once the method call is done? The answer is something referred to as the *call stack*.

* `Call Stack <http://en.wikipedia.org/wiki/Call_stack>`__

As obviated through the name, it's a "stack" (the actual data structure) that the CPU refers to in order to know where to go after it's finished a "call". Any time a method invocation happens, it pushes the address to come back to onto this call stack. And when it comes time to return from the method call, the CPU simply pops the return-to information off of the call stack and goes to that address.

A *stack trace*, then, is the trace of everything that is on the *call stack*. You will therefore also hear this referred to as a *stack backtrace* (the idea of back tracking along the stack) or a *call traceback* (the idea of unwinding everything to trace back to the origin of the invocation).

* `Stack Trace <http://en.wikipedia.org/wiki/Stack_trace>`__


Java Frame
~~~~~~~~~~

Let's continue with a clearer understanding of a "Java frame".

	``jstack`` prints Java stack traces of Java threads for a given Java process or core file or a remote debug server. For each **Java frame**, the full class name, method name, 'bci' (byte code index) and line number, if available, are printed.

If you remember the discussion on stack traces, we understood that the CPU pushes the address to come back to onto the call stack. That return-to address, along with the parameters and lots of other useful information, is summarized in the term "stack frame".

* `Stack Frame <http://en.wikipedia.org/wiki/Stack_frame>`__

In other words, stack frames are the components that you are actually being unwound when generating the "stack trace". In practice, the stack frame representation in a stack trace includes the full class name, method name, and line number for the instruction that the CPU returns to after execution.

With that being said, stack frames contain a lot of state information which is not printed as part of a stack trace. Third-party vendors have created fairly elaborate stack trace creation tools which provide some of that extra information stored in the stack frame to help with debugging issues that occurred in live environments.

* `Takipi <https://www.takipi.com/>`__

Isolate the Evidence
--------------------

So that brings us back to the problem at hand. Whenever a subscriber is experiencing a performance issue, it is common to ask that subscriber to run ``jstack`` at 5-10 second intervals and then provide the output to support for analysis.

When performing thread dump analysis, we are essentially reading the output of this tool, which like the HTTP protocol, is intended to be both machine-readable and human-readable.

When reading this output, we are attempting to identify two types of evidence: **threads of interest** within the thread dump and **stack frames of interest** within the stack traces of those threads.

Threads of Interest
~~~~~~~~~~~~~~~~~~~

Traditionally, there are two things that make a thread interesting: its name and its state.

Thread Name
^^^^^^^^^^^

In a clean installation of Liferay, there are two categories of thread names which are interesting: the processing threads that handle requests (provided by the application server worker thread pool, often with a prefix involving the word "connector") and the processing threads that handle message bus messages (often with the destination name as a prefix).

This means that if you look only at the name, the focus of most thread dump analysis in Liferay will be on these threads, and you may want to isolate these threads during your analysis.

Additionally, we're interested in threads with similar prefixes appearing frequently in the thread dump. For example, another common prefix you may see is the large number of RMI threads for the default EhCache replication mechanism.

* `EhCache Replication (Shuyang Zhou) <https://www.liferay.com/web/shuyang.zhou/blog/-/blogs/new-ehcache-replication-mechanism>`__

Thread State
^^^^^^^^^^^^

Many people use tools in order to parse the ``jstack`` output because the tools provide the ability to sort by name and color-code the different states that a thread may be in (blocked, running) in order to separate the threads that are likely to be interesting from the threads that are likely to be uninteresting.

* `Thread States <http://docs.oracle.com/javase/1.5.0/docs/api/java/lang/Thread.State.html>`__

Thread Depth
^^^^^^^^^^^^

When analyzing a Liferay thread dump, it turns out that thread state is usually very uninteresting, because there is rarely anything more interesting about a running thread than a blocked thread. Both threads are equally important because both of them can indicate a problem.

Rather than thread state, due to the sheer amount of code delegation and the number of chain-like method invocations in work performed when handling requests and when handling message bus messages, a different attribute of a Liferay thread will make it more interesting than its peers: the depth of its stack trace.

Essentially, regardless of the content of actual stack frames within the stack trace, a stack trace which has more stack frames will be more interesting in a Liferay thread dump than a stack trace with few stack frames.

Stack Frames of Interest
~~~~~~~~~~~~~~~~~~~~~~~~

Let's say that you declare a stack trace is interesting because it has a clearly problematic name like "LukeIAmYourFatherThread" or it has an extraordinarily large number of stack frames compared to other threads. You can try to convince someone that those two attributes alone are sufficient, but your argument would be met with a reaction like this:

* `Not Sure if Serious <http://s2.quickmeme.com/img/67/671256e55e7b94c478f77c4dd2aa2641afb98ec711bc9be66307aab25cd881fe.jpg>`__

This is where the next step second step in thread dump analysis comes into play. In order to make a more compelling case for why a stack trace is interesting, you will want to identify **stack frames** of interest within those **stack traces** of interest.

As noted before, a thread dump in of itself provides very little information about what is going on inside of the stack frame beyond the name and the line number. Therefore, it is often unclear how you actually identify whether a stack frame is interesting.

To work around this problem, people will often define a stack frame of interest as one that consumes a large amount of CPU time, whether it's due to each iteration being slow or due to the large number of iterations being slow in the aggregate or due to holding a lock on a resource that indirectly causes CPU usage to increase for all other threads waiting on that resource.

In many production environments, people use monitoring tools (usually coded as Java agents) in order to monitor the CPU time usage of every stack frame.

* `YourKit CPU Statistics <https://www.yourkit.com/docs/java/help/cpu_stat.jsp>`__

In a standard Java thread dump, however, those metrics are usually not available.

Instead, what we are provided with is just the stack traces for all the threads at a specific point in time. From there, we ask ourselves if the given stack frame has a reasonable probability of consuming a large amount of CPU time. This suspicion tells us that we should flag this stack frame (and its corresponding stack trace) as interesting.

Thread Dump Analysis
--------------------

While it is tempting to immediately draw conclusions immediately upon identifying one or two stack frames of interest, you should avoid doing this. Instead, you should first aggregate as many interesting stack frames as possible so that you can explore alternate hypotheses.

After you've aggregated many interesting stack frames, you should still avoid immediately drawing conclusions from that evidence alone. Essentially, the thread dump is a single source of useful information, but if you draw your conclusion here, you're just summarizing the evidence.

As noted in the document on writing critical analysis papers, the bulk of an analysis is not to simply summarize the provided evidence. Rather, a critical analysis paper takes the evidence and determine whether it truly supports the original argument, if it adds no value to that argument, or if it in fact rejects the argument.

* `Evidence <https://en.wikipedia.org/wiki/Evidence>`__

Furthermore, it collects additional evidence not explicitly presented in the original argument and argues why that additional evidence supports or contradicts that original argument.

* `Supporting Evidence <http://learninghub.une.edu.au/tlc/aso/aso-online/academic-writing/supporting-evidence.php>`__

Similarly, the goal of thread dump analysis is not to summarize the thread dump, though that may happen along the way. Rather, you are evaluating the subscriber's claim that there is a performance issue using the thread dump as basic evidence for your evaluation and using supporting evidence in order to add substance to your argument.

Supporting Evidence
~~~~~~~~~~~~~~~~~~~

In the case of thread dump analysis, the supporting evidence is the source code described in the output for the stack frames. As noted previously, in a stack trace, the stack frame provides you with a method name and a line number which detail exactly where additional supporting evidence may be found.

Therefore, for each stack frame of interest, you should look at its corresponding supporting evidence and determine whether it supports the argument, rejects the argument, or adds no value to the subscriber's original claim. This examination of supporting evidence is actually the "analysis" part of a thread dump analysis.

Improving Analytic Skill
------------------------

In critical analysis, you improve your ability to construct arguments by acquiring domain knowledge. With domain knowledge, you know whether a piece of evidence is signal or if it's noise or if it's a noisy signal.

In thread dump analysis, that domain knowledge is familiarity with stack frames. More explicitly, a domain expert is able to encounter a stack frame such as ``java.lang.Thread`` or ``com.liferay.portal.model.persistence.UserFinderImpl`` and having an intuition about the **probability** that the stack frame is interesting or uninteresting based on what they already know of the corresponding source code.

In other words, domain knowledge is like improving the accuracy of your Naive Bayes classifier by adjusting how you weight the stack frames of interest.

* `Naive Bayes classifier <https://en.wikipedia.org/wiki/Naive_Bayes_classifier>`__

In order to acquire domain expertise, you essentially practice by reading source code and gaining familiarity with what that code is actually doing (this is what technical support does).

A close approximation of that domain knowledge acquisition is recognizing patterns in the stack frames and relating that to knowledge of past patterns of interesting stack frames (this is what customer support does).

Conclusions
-----------

In summary, thread dump analysis is really just like writing a critical analysis paper. It requires some domain knowledge in order to come to a meaningful conclusion, but other than that, there is a very well-defined process for how it is conducted that involves quite a bit of hypothesis elimination, so remember to fail early and fail often just as in the previous logic puzzle.

* Wason, Peter Cathcart (1960). On the failure to eliminate hypotheses in a conceptual task. *Quarterly Journal of Experimental Psychology*, 12(3). DOI: `10.1080/17470216008416717 <http://doi.org/10.1080/17470216008416717>`__

You identify the original argument, you identify the original evidence, you gather additional supporting evidence, and you reach some conclusion on whether there is a performance problem consistent with the original claims.
