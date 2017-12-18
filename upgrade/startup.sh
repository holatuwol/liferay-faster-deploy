#!/bin/bash

. ./common.sh

start_liferay() {
	echo 'Starting Liferay...'

	if docker inspect ${NAME_PREFIX}liferay 2>&1 > /dev/null; then
		docker start --attach ${NAME_PREFIX}liferay
	else
		docker run --name ${NAME_PREFIX}liferay \
			--network ${NAME_PREFIX}upgrade --network-alias liferay \
			-e "BUILD_NAME=${BUILD_NAME}" \
			--volume ${LOCAL_LIFERAY_HOME}:/build mcd-nightly
	fi
}

if setenv; then
	clean_liferay
	prep_bundle
	start_liferay
fi