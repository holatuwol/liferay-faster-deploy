#!/bin/bash

BUCKET_PATH=$(cat bucket_path.txt)
LIFERAY_USERNAME=$(head -1 liferay_auth.txt)
LIFERAY_PASSWORD=$(tail -1 liferay_auth.txt)

clean_docker() {
	echo 'Removing previous database...'

	docker kill upgradedb
	docker rm -v upgradedb

	echo 'Removing container for previous upgrade...'

	docker kill liferay
	docker rm -v liferay
}

prep_bundle() {
	echo 'Checking for new bundle...'

	aws s3 sync $BUCKET_PATH /mnt/backup/

	if [ ! -f /mnt/backup/liferay.tar.gz ]; then
		return 0
	fi

	cp -f /mnt/backup/liferay.tar.gz /mnt/liferay
}

prep_database() {
	echo 'Initializing new database...'

	docker run --name upgradedb \
	  --health-cmd='mysqladmin ping --silent' \
	  --detach -p 3306:3306 dbsnapshot --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

	docker network connect --alias upgradedb upgrade upgradedb
}

prep_docker() {
	docker build /mnt/github/lps-dockerfiles/nightly -t liferay-nightly-build
}

prep_upgrade_props() {
	echo 'Generating upgrade properties...'

	mkdir -p /mnt/liferay/tools/portal-tools-db-upgrade-client

	echo 'dir=/opt/liferay/tomcat
extra.lib.dirs=/bin
global.lib.dir=/lib
portal.dir=/webapps/ROOT
server.detector.server.id=tomcat
' > /mnt/liferay/tools/portal-tools-db-upgrade-client/app-server.properties

	echo 'jdbc.default.driverClassName=com.mysql.jdbc.Driver
jdbc.default.url=jdbc:mysql://upgradedb/lportal?characterEncoding=UTF-8&dontTrackOpenResources=true&holdResultsOpenOverStatementClose=true&useFastDateParsing=false&useUnicode=true
jdbc.default.username=lportal
jdbc.default.password=lportal
' > /mnt/liferay/tools/portal-tools-db-upgrade-client/portal-upgrade-database.properties

	echo 'liferay.home=/opt/liferay' > /mnt/liferay/tools/portal-tools-db-upgrade-client/portal-upgrade-ext.properties
}

start_upgrade() {
	echo 'Starting upgrade...'

	docker run --name liferay --network upgrade \
		-e 'IS_UPGRADE=true' -e 'BUILD_NAME=liferay.tar.gz' \
		-e "LIFERAY_FILES_MIRROR=https://${LIFERAY_USERNAME}:${LIFERAY_PASSWORD}@files.liferay.com/" \
		--volume /mnt/liferay:/build liferay-nightly-build
}

waitfor_database() {
	echo 'Waiting for database reload to complete...'

	local HEALTH=$(docker inspect --format "{{json .State.Health.Status }}" upgradedb | cut -d'"' -f 2)

	while [ "healthy" != "$HEALTH" ]; do
		sleep 1
		HEALTH=$(docker inspect --format "{{json .State.Health.Status }}" upgradedb | cut -d'"' -f 2)
	done

	HEALTH=$(docker logs upgradedb 2>&1 | grep -F Ready)

	while [ "" == "$HEALTH" ]; do
		sleep 1
		HEALTH=$(docker logs upgradedb 2>&1 | grep -F Ready)
	done
}

clean_docker
prep_database
prep_bundle
prep_upgrade_props
prep_docker
waitfor_database
start_upgrade