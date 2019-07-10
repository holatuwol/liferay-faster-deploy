#!/usr/bin/env python

heap_size = 4096
jpda_port = 8000

# Define utility methods

def get_config(type, filter=None):
    return [x[x.find('(')+1:x.rfind(')')] for x in AdminConfig.list(type).split('\n') if len(x) > 0 and (filter is None or x.find(filter) != -1)]

# Configuring the WebSphere Application Server

for web_container in get_config('WebContainer'):
    AdminConfig.create('Property', '(%s)' % web_container, '[[validationExpression ""] [name "com.ibm.ws.webcontainer.initFilterBeforeInitServlet"] [description ""] [value "true"] [required "false"]]')
    AdminConfig.create('Property', '(%s)' % web_container, '[[validationExpression ""] [name "com.ibm.ws.webcontainer.invokeFilterInitAtStartup"] [description ""] [value "true"] [required "false"]]')
    AdminConfig.create('Property', '(%s)' % web_container, '[[validationExpression ""] [name "com.ibm.ws.jsp.jdksourcelevel"] [description ""] [value "18"] [required "false"]]')

# Setting up JVM Parameters for Liferay DXP

AdminTask.setJVMProperties('[-nodeName DefaultNode01 -serverName server1 -verboseModeClass false -verboseModeGarbageCollection false -verboseModeJNI false -initialHeapSize %d -maximumHeapSize %d -runHProf false -hprofArguments -debugMode false -debugArgs "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=%d" -executableJarFileName -genericJvmArguments "-Dfile.encoding=UTF-8" -disableJIT false]' % (heap_size, heap_size, jpda_port))

AdminConfig.create('DebugService', '(%s)' % get_config('Server')[0], '[[BSFDebugPort "4444"] [enable "true"] [jvmDebugPort "%d"] [jvmDebugArgs "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=%d"] [debugClassFilters ""] [BSFLoggingLevel "0"]]' % (jpda_port, jpda_port))
AdminConfig.modify('(%s)' % get_config('JavaVirtualMachine')[0], '[[debugMode "true"]]')

# Removing the secureSessionCookie Tag

for secure_session_cookie in get_config('SecureSessionCookie'):
    AdminTask.removeDisabledSessionCookie('[-cookieId %s]' % secure_session_cookie)

for cookie in get_config('Cookie', '/server.xml#'):
    AdminConfig.modify('(%s)' % cookie, '[[maximumAge "-1"] [name "JSESSIONID"] [useContextRootAsPath "false"] [domain ""] [path "/"] [secure "false"] [httpOnly "false"]]')

AdminConfig.save()