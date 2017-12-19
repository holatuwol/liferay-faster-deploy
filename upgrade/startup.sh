#!/bin/bash

. ./common.sh

start_apache() {
	sudo a2enmod proxy proxy_ajp

	local LIFERAY_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${NAME_PREFIX}liferay)

echo '
<VirtualHost *:80>
ProxyPass "/" "ajp://'${LIFERAY_IP}':8009/"
</VirtualHost>
' | sudo tee /etc/apache2/sites-available/001-liferay.conf

	sudo a2dissite 000-default
	sudo a2ensite 001-liferay

	sudo service apache2 restart
}

start_liferay() {
	echo 'Starting Liferay...'

	if docker inspect ${NAME_PREFIX}liferay 2>&1 > /dev/null; then
		docker start --attach ${NAME_PREFIX}liferay
	else
		docker run --name ${NAME_PREFIX}liferay --detach \
			--network ${NAME_PREFIX}upgrade --network-alias liferay \
			-e "BUILD_NAME=${BUILD_NAME}" \
			--volume ${LOCAL_LIFERAY_HOME}:/build mcd-nightly
	fi
}

if setenv; then
	clean_liferay
	prep_bundle
	start_liferay
	start_apache
fi