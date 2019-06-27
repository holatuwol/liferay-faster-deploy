#!/bin/bash

install_jar() {
	local EXTRA_JAR="${1}/${2}.jar"

	if [ -f ${EXTRA_JAR} ]; then
		return 0
	fi

	while read -r lpkg; do
		if [ "" != "${lpkg}" ] && [ -f ${lpkg} ] && [ "" != "$(unzip -l "${lpkg}" | grep -F $2)" ]; then
			return 0
		fi
	done <<< "$(find ${LIFERAY_HOME}/osgi/marketplace -name '*.lpkg')"

	if [ "" == "${GIT_ROOT}" ] || [ "" == "${BASE_BRANCH}" ]; then
		return 0
	fi

	local PRIVATE_BRANCH=${BASE_BRANCH}
	local REFERENCE_HASH=${BASE_TAG}
	local REFERENCE_HASH_PRIVATE=${BASE_TAG}

	if [ "" == "${BASE_TAG}" ]; then
		REFERENCE_HASH=${BASE_BRANCH}
		REFERENCE_HASH_PRIVATE=${BASE_BRANCH}
	fi

	if [ "master" == "${BASE_BRANCH}" ]; then
		PRIVATE_BRANCH=7.2.x-private
		REFERENCE_HASH=7.2.x
		REFERENCE_HASH_PRIVATE=7.2.x-private
	else
		if [[ ${PRIVATE_BRANCH} != ee-* ]] && [[ ${PRIVATE_BRANCH} != *-private ]]; then
			PRIVATE_BRANCH=${PRIVATE_BRANCH}-private
		fi

		if [[ ${REFERENCE_HASH_PRIVATE} != ee-* ]] && [[ ${REFERENCE_HASH_PRIVATE} != *-private ]]; then
			REFERENCE_HASH_PRIVATE=${PRIVATE_TAG}-private
		fi
	fi

	local ARTIFACT_PROPERTIES=$(git ls-tree -r --name-only ${REFERENCE_HASH} modules/.releng | grep -F "/$3/" | grep -F artifact.properties)

	if [ "" != "${ARTIFACT_PROPERTIES}" ]; then
		local ARTIFACT_URL=$(git show ${REFERENCE_HASH}:${ARTIFACT_PROPERTIES} | grep -F artifact.url | cut -d'=' -f 2)

		echo "Downloading ${ARTIFACT_URL}"

		curl -o ${EXTRA_JAR} ${ARTIFACT_URL}

		return 0
	fi

	ARTIFACT_PROPERTIES=$(git ls-tree -r --name-only ${REFERENCE_HASH_PRIVATE} modules/.releng | grep -F "/$3/" | grep -F artifact.properties)

	if [ "" == "${ARTIFACT_PROPERTIES}" ]; then
		return 1
	fi

	local ARTIFACT_URL=$(git show ${REFERENCE_HASH_PRIVATE}:${ARTIFACT_PROPERTIES} | grep -F artifact.url | cut -d'=' -f 2)

	echo "Downloading ${ARTIFACT_URL}"

	local PRIVATE_USERNAME=$(git show ${PRIVATE_BRANCH}:working.dir.properties | grep -F "build.repository.private.username[${PRIVATE_BRANCH}]=" | cut -d'=' -f 2)
	local PRIVATE_PASSWORD=$(git show ${PRIVATE_BRANCH}:working.dir.properties | grep -F "build.repository.private.password[${PRIVATE_BRANCH}]=" | cut -d'=' -f 2)

	curl -u ${PRIVATE_USERNAME}:${PRIVATE_PASSWORD} -o ${EXTRA_JAR} ${ARTIFACT_URL}
}

tcp_cluster() {
	. $(dirname "${BASH_SOURCE[0]}")/../setopts
	. $(dirname "${BASH_SOURCE[0]}")/../getparent

	tcp_extractxml

	if [ ! -f ${LIFERAY_HOME}/tcp.xml ]; then
		echo 'Unable to extract tcp.xml'
		return 1
	fi

	if [ -f ${LIFERAY_HOME}/portal-setup-wizard.properties ] && [ "" == "$(grep -F cluster.link.enabled= ${LIFERAY_HOME}/portal-setup-wizard.properties)" ]; then
		echo '' >> ${LIFERAY_HOME}/portal-setup-wizard.properties
		echo 'cluster.link.enabled=true' >> ${LIFERAY_HOME}/portal-setup-wizard.properties
		echo "cluster.link.channel.properties.control=${LIFERAY_HOME}/tcp.xml" >> ${LIFERAY_HOME}/portal-setup-wizard.properties
		echo "cluster.link.channel.properties.transport.0=${LIFERAY_HOME}/tcp.xml" >> ${LIFERAY_HOME}/portal-setup-wizard.properties
	fi

	if [ ! -f ${LIFERAY_HOME}/portal-ext.properties ] || [ "" == "$(grep -F jdbc.default ${LIFERAY_HOME}/portal-ext.properties | grep -vF '#')" ]; then
		echo 'No database properties set, cluster will be limited to one node'
		return 0
	fi

	if [ "${APP_SERVER}" == "tomcat" ]; then
		tcp_jdbcping
	else
		tcp_tcpping
	fi
}

tcp_extractxml() {
	rm -f ${LIFERAY_HOME}/tcp.xml

	if [ -f ${LIFERAY_HOME}/tomcat/webapps/ROOT/WEB-INF/lib/jgroups.jar ]; then
		echo "Extracting tcp.xml from WEB-INF/lib/jgroups.jar"
		unzip -qq -j ${LIFERAY_HOME}/tomcat/webapps/ROOT/WEB-INF/lib/jgroups.jar tcp.xml
		mv tcp.xml ${LIFERAY_HOME}/

		return 0
	fi

	install_jar ${LIFERAY_HOME}/osgi/portal com.liferay.portal.cluster.multiple portal-cluster-multiple
	install_jar ${LIFERAY_HOME}/osgi/portal com.liferay.portal.scheduler.multiple portal-scheduler-multiple

	while read -r lpkg; do
		if [ ! -f ${lpkg} ] || [ "" == "$(unzip -l "${lpkg}" | grep -F 'com.liferay.portal.cluster.multiple')" ]; then
			continue
		fi

		echo "Extracting tcp.xml from ${lpkg}"
		unzip -qq -j "${lpkg}" 'com.liferay.portal.cluster.multiple*.jar'
		unzip -qq -j com.liferay.portal.cluster.multiple*.jar 'lib/jgroups*'
		rm com.liferay.portal.cluster.multiple*.jar
		unzip -qq -j jgroups*.jar tcp.xml
		rm jgroups*.jar
		mv tcp.xml ${LIFERAY_HOME}/

		return 0
	done <<< "$(find ${LIFERAY_HOME}/osgi/marketplace -name '*.lpkg')"

	if [ -f ${LIFERAY_HOME}/osgi/portal/com.liferay.portal.cluster.multiple.jar ]; then
		echo "Extracting tcp.xml from com.liferay.portal.cluster.multiple.jar"
		unzip -qq -j ${LIFERAY_HOME}/osgi/portal/com.liferay.portal.cluster.multiple.jar 'lib/jgroups*'
		unzip -qq -j jgroups*.jar tcp.xml
		rm jgroups*.jar
		mv tcp.xml ${LIFERAY_HOME}/

		return 0
	fi

	return 1
}

tcp_jdbcping() {
	echo "Using JDBC_PING for clustering"

	local JNDI_NAME=$(grep -F jdbc.default.jndi.name= ${LIFERAY_HOME}/portal-ext.properties | grep -vF '#' | cut -d'=' -f 2-)
	local DRIVER_CLASS_NAME=$(grep -F jdbc.default.driverClassName= ${LIFERAY_HOME}/portal-ext.properties | grep -vF '#' | cut -d'=' -f 2-)
	local DRIVER_URL=$(grep -F jdbc.default.url= ${LIFERAY_HOME}/portal-ext.properties | grep -vF '#' | cut -d'=' -f 2-)
	local USERNAME=$(grep -F jdbc.default.username= ${LIFERAY_HOME}/portal-ext.properties | grep -vF '#' | cut -d'=' -f 2-)
	local PASSWORD=$(grep -F jdbc.default.password= ${LIFERAY_HOME}/portal-ext.properties | grep -vF '#' | cut -d'=' -f 2-)

	# If using Tomcat, force a switch to JNDI

	if [ "" != "${CATALINA_HOME}" ]; then
		if [ "" == "${JNDI_NAME}" ]; then
			JNDI_NAME='jdbc/LiferayPool'
			echo -e '\njdbc.default.jndi.name=jdbc/LiferayPool' >> ${LIFERAY_HOME}/portal-ext.properties
		fi

		local ROOT_XML="${CATALINA_HOME}/conf/Catalina/localhost/ROOT.xml"

		if [ -f ${ROOT_XML} ]; then
			mkdir -p $(dirname ${ROOT_XML})
			echo -e '<Context crossContext="true" path="">\n</Context>' > ${ROOT_XML}
		fi

		if [ "" == "$(grep -F "${JNDI_NAME}" ${ROOT_XML})" ]; then
			mv ${ROOT_XML} ${ROOT_XML}.old
			grep -vF '</Context>' ${ROOT_XML}.old > ${ROOT_XML}
			echo '
	<Resource name="'${JNDI_NAME}'"
		auth="Container"
		type="javax.sql.DataSource"
		factory="org.apache.tomcat.jdbc.pool.DataSourceFactory"
		driverClassName="'${DRIVER_CLASS_NAME}'"
		url="'$(echo ${DRIVER_URL} | sed 's/&/&amp;/g')'"
		username="'$(echo ${USERNAME} | sed 's/&/&amp;/g')'"
		password="'$(echo ${PASSWORD} | sed 's/&/&amp;/g')'"
		maxActive="20" maxIdle="5" />
</Context>' >> ${ROOT_XML}
		fi
	fi

	# Generate a JDBC connection URL for JGroups

	local CONNECT_OPTIONS=

	if [ "" != "${JNDI_NAME}" ]; then
		CONNECT_OPTIONS='
datasource_jndi_name="java:comp/env/'${JNDI_NAME}'"
'
	else
		CONNECT_OPTIONS='
connection_driver="'${DRIVER_CLASS_NAME}'"
connection_url="'$(echo ${DRIVER_URL} | sed 's/&/&amp;/g')'"
connection_username="'$(echo ${USERNAME} | sed 's/&/&amp;/g')'"
connection_password="'$(echo ${PASSWORD} | sed 's/&/&amp;/g')'"
'
	fi

	# Choose the binary data type

	local BINARY_DATA_TYPE=

	if [ "" == "${DRIVER_CLASS_NAME}" ] || [ "org.hsqldb.jdbc.JDBCDriver" == "${DRIVER_CLASS_NAME}" ]; then
		BINARY_DATA_TYPE='varbinary(5000)'
	elif [ "org.mariadb.jdbc.Driver" == "${DRIVER_CLASS_NAME}" ]; then
		BINARY_DATA_TYPE='longblob'
	elif [ "com.mysql.jdbc.Driver" == "${DRIVER_CLASS_NAME}" ]; then
		BINARY_DATA_TYPE='longblob'
	elif [ "oracle.jdbc.OracleDriver" == "${DRIVER_CLASS_NAME}" ]; then
		BINARY_DATA_TYPE='blob'
	elif [ "org.postgresql.Driver" == "${DRIVER_CLASS_NAME}" ]; then
		BINARY_DATA_TYPE='bytea'
	elif [ "com.microsoft.sqlserver.jdbc.SQLServerDriver" == "${DRIVER_CLASS_NAME}" ]; then
		BINARY_DATA_TYPE='image'
	elif [ "com.sybase.jdbc4.jdbc.SybDriver" == "${DRIVER_CLASS_NAME}" ]; then
		BINARY_DATA_TYPE='image'
	else
		BINARY_DATA_TYPE='varbinary(5000)'
	fi

	# Use the binary data type to generate the correct create table statement

	local EXTRA_OPTIONS='
initialize_sql="CREATE TABLE JGROUPSPING (own_addr varchar(200) NOT NULL, cluster_name varchar(200) NOT NULL, ping_data '${BINARY_DATA_TYPE}', constraint PK_JGROUPSPING PRIMARY KEY (own_addr, cluster_name))"
'

	# Generate a new tcp.xml with the proper JDBC_PING configuration

	sed -n '1,/<TCPPING/p' ${LIFERAY_HOME}/tcp.xml | sed '$d' > ${LIFERAY_HOME}/tcp.xml.jdbcping
	echo "<JDBC_PING ${CONNECT_OPTIONS} ${EXTRA_OPTIONS} />" >> ${LIFERAY_HOME}/tcp.xml.jdbcping
	sed -n '/<MERGE/,$p' ${LIFERAY_HOME}/tcp.xml >> ${LIFERAY_HOME}/tcp.xml.jdbcping

	cp -f ${LIFERAY_HOME}/tcp.xml.jdbcping ${LIFERAY_HOME}/tcp.xml
	rm ${LIFERAY_HOME}/tcp.xml.jdbcping
}

tcp_tcpping() {
	if [ "" == "${NETWORK_NAME}" ]; then
		BASE_IP=$(docker network inspect bridge | jq '.[0].IPAM.Config[0].Gateway' | cut -d'"' -f 2)
	else
		BASE_IP=$(docker network inspect ${NETWORK_NAME} | jq '.[0].IPAM.Config[0].Gateway' | cut -d'"' -f 2)
	fi

	INITIAL_HOSTS=$(seq 9 | awk '{ print "'${BASE_IP}'." $1 "[7800],'${BASE_IP}'." $1 "[7801]" }' | tr '\n' ',' | sed 's/,$//g')

	# Generate a new tcp.xml that enumerates 10 hosts

	sed -n '1,/<TCPPING/p' ${LIFERAY_HOME}/tcp.xml | sed '$d' > ${LIFERAY_HOME}/tcp.xml.tcpping
	echo '<TCPPING async_discovery="true" initial_hosts="${jgroups.tcpping.initial_hosts:'${INITIAL_HOSTS}'}" port_range="2"/>' >> ${LIFERAY_HOME}/tcp.xml.tcpping
	sed -n '/<MERGE/,$p' ${LIFERAY_HOME}/tcp.xml >> ${LIFERAY_HOME}/tcp.xml.tcpping

	cp -f ${LIFERAY_HOME}/tcp.xml.tcpping ${LIFERAY_HOME}/tcp.xml
	rm ${LIFERAY_HOME}/tcp.xml.tcpping
}

tcp_cluster