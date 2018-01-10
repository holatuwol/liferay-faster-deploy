#!/bin/bash

create_reload_sql() {

	echo "
create schema lportal default charset utf8 default collate utf8_unicode_ci;
grant all on lportal.* to 'lportal'@'%';
use lportal;

source /data/backup.sql
" > /mnt/build/reload.sql

	local PRIMKEY_LENGTH=255

	if [ "5.6" != "${MYSQL_VERSION}" ]; then
		cat /mnt/backup/*.sql > /mnt/build/backup.sql
	elif [ "Barracuda" == "${INNODB_FILE_FORMAT}" ]; then
		cat /mnt/backup/*.sql | sed 's/ENGINE=InnoDB/ROW_FORMAT=DYNAMIC ENGINE=InnoDB/g' > /mnt/build/backup.sql
	else
		PRIMKEY_LENGTH=190
		cat /mnt/backup/*.sql > /mnt/build/backup.sql
	fi

	cat /mnt/backup/*.sql > /mnt/build/backup.sql

		echo "

create table Configuration_ (
	configurationId VARCHAR(${PRIMKEY_LENGTH}) not null primary key,
	dictionary TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
" >> /mnt/build/backup.sql

	fi

}

create_configuration() {

	echo "
[mysqld]
innodb-file-format    = ${INNODB_FILE_FORMAT}
innodb-file-per-table
innodb-large-prefix

character-set-server  = utf8
collation-server      = utf8_unicode_ci
" > /mnt/build/runtime.cnf

}

create_dockerfile() {

	echo "FROM mysql:${MYSQL_VERSION}

ENV MYSQL_ALLOW_EMPTY_PASSWORD yes
ENV MYSQL_USER lportal
ENV MYSQL_PASSWORD $(cat ${HOME}/db_pass.txt)

EXPOSE 3306

ADD reload.sql /docker-entrypoint-initdb.d/
ADD runtime.cnf /etc/mysql/conf.d/

RUN mkdir /data
ADD backup.sql /data/
" > /mnt/build/Dockerfile

}

create_properties() {

	mkdir -p /mnt/liferay/tools/portal-tools-db-upgrade-client

	echo 'jdbc.default.driverClassName=com.mysql.jdbc.Driver
jdbc.default.url=jdbc:mysql://upgradedb/lportal?characterEncoding=UTF-8&dontTrackOpenResources=true&holdResultsOpenOverStatementClose=true&useFastDateParsing=false&useUnicode=true
jdbc.default.username=lportal
jdbc.default.password=lportal
' > /mnt/liferay/tools/portal-tools-db-upgrade-client/portal-upgrade-database.properties

	if [ "5.6" == "${MYSQL_VERSION}" ]; then
		set_index_max_length /mnt/liferay/portal-ext.properties
		set_index_max_length /mnt/liferay/tools/portal-tools-db-upgrade-client/portal-upgrade-database.properties
	fi

}

set_index_max_length() {

	if [ -f ${1} ] && [ "" != "$(grep -F database.string.index.max.length ${1})" ]; then
		return
	fi

	echo '
database.string.index.max.length[mysql]=70
' >> ${1}

}

cd /mnt/github/lps-dockerfiles/nightly-jdk8
./build.sh mcd-nightly

create_reload_sql
create_configuration
create_dockerfile
create_properties

docker build /mnt/build/ -t dbsnapshot

echo -n 'mysql' > ${HOME}/db_type.txt