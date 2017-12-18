#!/bin/bash

BUCKET_PATH=

if [ -f $HOME/backup_bucket.txt ]; then
	BUCKET_PATH=$(cat $HOME/backup_bucket.txt)
fi

clean_liferay() {
	echo 'Removing container for previous upgrade...'

	docker kill ${NAME_PREFIX}liferay
	docker rm -v ${NAME_PREFIX}liferay
}

prep_bundle() {
	if [ "/mnt/liferay" != "${LOCAL_LIFERAY_HOME}" ]; then
		return 0
	fi

	if [ "" == "${BUCKET_PATH}" ]; then
		BUILD_NAME=$(basename $(ls /mnt/liferay/liferay-*.zip))
		return 0
	fi

	echo 'Checking for new bundle...'

	aws s3 sync $BUCKET_PATH /mnt/backup/

	if [ ! -f /mnt/backup/liferay.tar.gz ]; then
		return 0
	fi

	BUILD_NAME='liferay.tar.gz'
	cp -f /mnt/backup/liferay.tar.gz /mnt/liferay
}

setenv() {
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

	if docker image inspect mcd-nightly 2>&1 > /dev/null; then
		echo Found upgrade helper image: mcd-nightly
	else
		echo Unable to find upgrade helper image: mcd-nightly
		echo Please follow the instructions at https://github.com/holatuwol/lps-dockerfiles/tree/master/nightly
		return 1
	fi

	if docker network inspect ${NAME_PREFIX}upgrade 2>&1 > /dev/null; then
		echo Upgrade-related containers will join the existing ${NAME_PREFIX}upgrade network.
	else
		echo Upgrade-related containers will join a newly-created ${NAME_PREFIX}upgrade network.
		docker network create ${NAME_PREFIX}upgrade
	fi
}

stop_liferay() {
	if [ "exited" == "$(docker inspect ${NAME_PREFIX}liferay --format "{{json .State.Status }}" | cut -d'"' -f 2)" ]; then
		return 0
	fi

	docker stop ${NAME_PREFIX}liferay
}