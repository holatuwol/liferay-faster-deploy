#!/bin/bash

. ./common.sh

waitfor_mysql() {
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

setenv && waitfor_mysql