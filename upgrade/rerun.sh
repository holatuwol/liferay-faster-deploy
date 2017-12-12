#!/bin/bash

BUCKET_PATH=

if [ -f $HOME/backup_bucket.txt ]; then
	BUCKET_PATH=$(cat $HOME/backup_bucket.txt)
fi

clean_database() {
	echo 'Removing previous database...'

	docker kill ${NAME_PREFIX}upgradedb
	docker rm -v ${NAME_PREFIX}upgradedb
}

clean_liferay() {
	echo 'Removing container for previous upgrade...'

	docker kill ${NAME_PREFIX}liferay
	docker rm -v ${NAME_PREFIX}liferay
}

prep_bundle() {
	if [ "/mnt/liferay" != "${LOCAL_LIFERAY_HOME}" ]; then
		return 0
	fi

	echo 'Checking for new bundle...'

	aws s3 sync $BUCKET_PATH /mnt/backup/

	if [ ! -f /mnt/backup/liferay.tar.gz ]; then
		return 0
	fi

	cp -f /mnt/backup/liferay.tar.gz /mnt/liferay
}

prep_database() {
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

setenv() {
	if [ -f $HOME/liferay_auth.txt ]; then
		LIFERAY_FILES_MIRROR=https://$(head -1 $HOME/liferay_auth.txt):$(tail -1 $HOME/liferay_auth.txt)@files.liferay.com/
	else
		LIFERAY_FILES_MIRROR=http://172.16.168.222/files.liferay.com/
	fi

	NAME_PREFIX=
	LOCAL_LIFERAY_HOME=/mnt/liferay

	if [ "" != "$1" ] && [ ! -d $1 ]; then
		echo $1 is not a directory
		return 1
	elif [ "" != "$1" ]; then
		LOCAL_LIFERAY_HOME=$1
	elif [ "$PWD" != "$HOME" ] && [ -f portal-ext.properties ]; then
		LOCAL_LIFERAY_HOME=${PWD}
	fi

	NAME_PREFIX=

	if [ "/mnt/liferay" != "${LOCAL_LIFERAY_HOME}" ]; then
		NAME_PREFIX=$(basename "${LOCAL_LIFERAY_HOME}")_

		if [ "bundles_" == "${NAME_PREFIX}" ]; then
			NAME_PREFIX=$(basename $(dirname "${LOCAL_LIFERAY_HOME}"))_
		fi
	fi

	if docker image inspect liferay-nightly-build 2>&1 > /dev/null; then
		echo Found upgrade helper image: liferay-nightly-build
	else
		echo Unable to find upgrade helper image: liferay-nightly-build
		echo Please follow the instructions at https://github.com/holatuwol/lps-dockerfiles/tree/master/nightly
		return 1
	fi

	if docker image inspect ${NAME_PREFIX}dbsnapshot 2>&1 > /dev/null; then
		echo Found database snapshot image: ${NAME_PREFIX}dbsnapshot
	else
		echo Unable to find database snapshot image: ${NAME_PREFIX}dbsnapshot
		return 1
	fi

	if [ -d /mnt/github ]; then
		docker build /mnt/github/lps-dockerfiles/nightly -t liferay-nightly-build
	fi

	if docker network inspect ${NAME_PREFIX}upgrade 2>&1 > /dev/null; then
		echo Upgrade-related containers will join the existing ${NAME_PREFIX}upgrade network.
	else
		echo Upgrade-related containers will join a newly-created ${NAME_PREFIX}upgrade network.
		docker network create ${NAME_PREFIX}upgrade
	fi
}

start_upgrade() {
	echo 'Starting upgrade...'

	if docker inspect ${NAME_PREFIX}liferay 2>&1 > /dev/null; then
		docker start --attach ${NAME_PREFIX}liferay
	else
		docker run --name ${NAME_PREFIX}liferay \
			--network ${NAME_PREFIX}upgrade --network-alias liferay \
			-e 'IS_UPGRADE=true' -e 'BUILD_NAME=liferay.tar.gz' \
			-e "LIFERAY_FILES_MIRROR=${LIFERAY_FILES_MIRROR}" \
			--volume ${LOCAL_LIFERAY_HOME}:/build liferay-nightly-build
	fi
}

stop_liferay() {
	if [ "exited" == "$(docker inspect ${NAME_PREFIX}liferay --format "{{json .State.Status }}" | cut -d'"' -f 2)" ]; then
		return 0
	fi

	docker stop ${NAME_PREFIX}liferay
}

waitfor_database() {
	echo 'Waiting for database reload to complete...'

	local HEALTH=$(docker inspect --format "{{json .State.Health.Status }}" ${NAME_PREFIX}upgradedb | cut -d'"' -f 2)

	while [ "healthy" != "$HEALTH" ]; do
		sleep 1
		HEALTH=$(docker inspect --format "{{json .State.Health.Status }}" ${NAME_PREFIX}upgradedb | cut -d'"' -f 2)
	done

	HEALTH=$(docker logs ${NAME_PREFIX}upgradedb 2>&1 | grep -F Ready)

	while [ "" == "$HEALTH" ]; do
		sleep 1
		HEALTH=$(docker logs ${NAME_PREFIX}upgradedb 2>&1 | grep -F Ready)
	done
}

if setenv; then
	if [ "clean" == "$1" ]; then
		clean_database
		clean_liferay
		prep_database
		prep_bundle
		prep_upgrade_props
		waitfor_database
	else
		prep_bundle
		prep_upgrade_props
		stop_liferay
	fi

	start_upgrade
fi