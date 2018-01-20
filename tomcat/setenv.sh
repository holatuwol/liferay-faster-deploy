#!/bin/sh

jrebelopts() {
	if [ ! -f $HOME/.jrebel/jrebel.lic ] || [ ! -d $HOME/.jrebel/jrebel ]; then
		return 0
	fi

	export REBEL_BASE="$HOME/.jrebel"
	local AGENT_LIB_NAME=""

	case $(uname) in
	  'Linux')
		AGENT_LIB_NAME=libjrebel64.so
	    ;;
	  'WindowsNT')
		AGENT_LIB_NAME=jrebel64.dll
	    ;;
	  'Darwin')
		AGENT_LIB_NAME=libjrebel64.dylib
	    ;;
	esac

	local AGENT_LIB_PATH=$(find $HOME/.jrebel/jrebel -name $AGENT_LIB_NAME)
	export REBEL_HOME=$(dirname "$(dirname "$AGENT_LIB_PATH")")
	export JAVA_OPTS="\"-agentpath:$AGENT_LIB_PATH\" $JAVA_OPTS"
}

jrebelopts

if [ "" != "$JAVA_HOME" ]; then
	export PATH=$JAVA_HOME/bin:$PATH
fi

if [ "" != "$JRE_HOME" ]; then
	export PATH=$JRE_HOME/bin:$PATH
fi

CATALINA_BASE=$(dirname $(dirname $(readlink -f $0)))

if [ -f $CATALINA_BASE/conf/jaas.config ]; then
	JAVA_OPTS="$JAVA_OPTS -Djava.security.auth.login.config=$CATALINA_BASE/conf/jaas.config"
fi

if [ -d $CATALINA_BASE/lib/apr ]; then
	export LD_LIBRARY_PATH=$CATALINA_BASE/lib/apr/lib:$LD_LIBRARY_PATH
fi

export JAVA_OPTS="$JAVA_OPTS -Dfile.encoding=UTF8 -Djava.net.preferIPv4Stack=true -Duser.timezone=GMT"

export CATALINA_OPTS="$CATALINA_OPTS -Dorg.apache.tomcat.util.buf.UDecoder.ALLOW_ENCODED_SLASH=true"
export CATALINA_OPTS="$CATALINA_OPTS -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=${CATALINA_HOME}/.."

if [ -d $CATALINA_BASE/webapps/ROOT ]; then
	mkdir -p $CATALINA_BASE/webapps/ROOT/WEB-INF/classes/META-INF

	if [ ! -d $CATALINA_BASE/../osgi ]; then
		mkdir -p $CATALINA_BASE/webapps/ROOT/WEB-INF/classes/com/liferay/portal/deploy/dependencies/plugins1
		echo > $CATALINA_BASE/webapps/ROOT/WEB-INF/classes/com/liferay/portal/deploy/dependencies/plugins1/wars.txt
	fi

	for file in $(find $CATALINA_BASE/webapps -name *.css | grep -F .sass-cache); do
		reference_file=$(dirname $(dirname $file))/$(basename $file)

		if [ -f $reference_file ]; then
			touch $file -r $reference_file
		fi
	done
fi

mkdir -p $CATALINA_BASE/../deploy

if hostname -s 2> /dev/null; then
	export JVM_ROUTE="$(hostname -s).$(pwd | cut -d'/' -f 4)"
	export CATALINA_OPTS="-DjvmRoute=$JVM_ROUTE"
	IP_ADDRESS=$(hostname -I | cut -d' ' -f 1)
else
	IP_ADDRESS='127.0.0.1'
fi

export CATALINA_OPTS="$CATALINA_OPTS -Xms2g -Xmx2g -Xmn500m -Xss2m"

JAVA_MAJOR_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f 2 | cut -d'.' -f 2)

if [ 8 -gt $JAVA_MAJOR_VERSION ]; then
	export CATALINA_OPTS="$CATALINA_OPTS -XX:PermSize=384m -XX:MaxPermSize=384m"
fi

export CATALINA_OPTS="$CATALINA_OPTS -verbose:gc -XX:+UseSerialGC -XX:+PrintGCDateStamps -XX:+PrintGCTimeStamps -XX:+PrintGCDetails -Xloggc:$CATALINA_BASE/logs/gc.log"

TOMCAT_PORT_PREFIX=$(grep -o "port=\"[89][0-9]05\"" $CATALINA_BASE/conf/server.xml | cut -d'"' -f 2 | grep -o "^[89][0-9]")

DEBUG_PORT_SUFFIX=00
DEBUG_PORT=$TOMCAT_PORT_PREFIX$DEBUG_PORT_SUFFIX

export JPDA_OPTS="-Xdebug -Xrunjdwp:transport=dt_socket,address=$DEBUG_PORT,server=y,suspend=n"

JMX_PORT_SUFFIX=99
JMX_PORT=$TOMCAT_PORT_PREFIX$JMX_PORT_SUFFIX

export CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=$JMX_PORT -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.authenticate=false"