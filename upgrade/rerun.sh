#!/bin/bash

. ./common.sh

clean_database() {
	echo 'Removing previous database...'

	docker kill ${NAME_PREFIX}upgradedb
	docker rm -v ${NAME_PREFIX}upgradedb
}

prep_database() {
	if docker image inspect ${NAME_PREFIX}dbsnapshot 2>&1 > /dev/null; then
		echo Found database snapshot image: ${NAME_PREFIX}dbsnapshot
	else
		echo Unable to find database snapshot image: ${NAME_PREFIX}dbsnapshot
		return 1
	fi

	echo 'Initializing new database...'

	docker run --name ${NAME_PREFIX}upgradedb \
		--network ${NAME_PREFIX}upgrade --network-alias upgradedb \
		--health-cmd='mysqladmin ping --silent' \
		--detach -p 3306:3306 ${NAME_PREFIX}dbsnapshot \
		--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
}

prep_upgrade_props() {
	echo 'Generating upgrade properties...'

	mkdir -p ${LOCAL_LIFERAY_HOME}/tools/portal-tools-db-upgrade-client

	echo 'dir=/opt/liferay/tomcat
extra.lib.dirs=/bin
global.lib.dir=/lib
portal.dir=/webapps/ROOT
server.detector.server.id=tomcat
' > ${LOCAL_LIFERAY_HOME}/tools/portal-tools-db-upgrade-client/app-server.properties

	if [ -f ${LOCAL_LIFERAY_HOME}/portal-ext.properties ]; then
		cp -f ${LOCAL_LIFERAY_HOME}/portal-ext.properties ${LOCAL_LIFERAY_HOME}/tools/portal-tools-db-upgrade-client/portal-upgrade-ext.properties
		echo '
liferay.home=/opt/liferay' >> ${LOCAL_LIFERAY_HOME}/tools/portal-tools-db-upgrade-client/portal-upgrade-ext.properties
	else
		echo 'liferay.home=/opt/liferay' > ${LOCAL_LIFERAY_HOME}/tools/portal-tools-db-upgrade-client/portal-upgrade-ext.properties
	fi

	mkdir -p ${LOCAL_LIFERAY_HOME}/osgi/configs

	if [ -f ${LOCAL_LIFERAY_HOME}/osgi/configs/com.liferay.portal.search.configuration.IndexStatusManagerConfiguration.cfg ]; then
		mv ${LOCAL_LIFERAY_HOME}/osgi/configs/com.liferay.portal.search.configuration.IndexStatusManagerConfiguration.cfg \
			${LOCAL_LIFERAY_HOME}/osgi/configs/com.liferay.portal.search.configuration.IndexStatusManagerConfiguration.cfg.old
	fi

	echo 'indexReadOnly=true' > ${LOCAL_LIFERAY_HOME}/osgi/configs/com.liferay.portal.search.configuration.IndexStatusManagerConfiguration.cfg
}

start_upgrade() {
	echo 'Starting upgrade...'

	if docker inspect ${NAME_PREFIX}liferay 2>&1 > /dev/null; then
		docker start --attach ${NAME_PREFIX}liferay
	else
		docker run --name ${NAME_PREFIX}liferay \
			--network ${NAME_PREFIX}upgrade --network-alias liferay \
			-e 'IS_UPGRADE=true' -e "BUILD_NAME=${BUILD_NAME}" \
			--volume ${LOCAL_LIFERAY_HOME}:/build mcd-nightly
	fi
}

if setenv; then
	if [ "continue" == "$1" ]; then
		prep_bundle
		prep_upgrade_props
		stop_liferay
		start_upgrade
	else
		clean_database
		clean_liferay

		if prep_database; then
			prep_bundle
			prep_upgrade_props
			./waitfor_${DB_TYPE}.sh
			start_upgrade
		fi
	fi
fi