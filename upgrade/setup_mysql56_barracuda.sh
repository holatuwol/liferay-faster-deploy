#!/bin/bash

docker build /mnt/github/lps-dockerfiles/nightly -t liferay-nightly-build

echo "create schema lportal default charset utf8 default collate utf8_unicode_ci;
grant all on lportal.* to 'lportal'@'%';
use lportal;

source /data/backup.sql
" > /mnt/build/reload.sql

cat /mnt/backup/*.sql | sed 's/ENGINE=InnoDB/ROW_FORMAT=DYNAMIC ENGINE=InnoDB/g' > /mnt/build/backup.sql

echo '

create table Configuration_ (
	configurationId VARCHAR(255) not null primary key,
	dictionary TEXT
) ROW_FORMAT=DYNAMIC ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
' >> /mnt/build/backup.sql

echo '[mysqld]
innodb-file-format    = Barracuda
innodb-file-per-table
innodb-large-prefix

character-set-server  = utf8
collation-server      = utf8_unicode_ci
' > /mnt/build/runtime.cnf

echo "FROM mysql:5.6

ENV MYSQL_ALLOW_EMPTY_PASSWORD yes
ENV MYSQL_USER lportal
ENV MYSQL_PASSWORD $(cat $HOME/db_pass.txt)

EXPOSE 3306

ADD reload.sql /docker-entrypoint-initdb.d/
ADD runtime.cnf /etc/mysql/conf.d/

RUN mkdir /data
ADD backup.sql /data/
" > /mnt/build/Dockerfile

docker build /mnt/build/ -t dbsnapshot

if [ ! -f /mnt/liferay/portal-ext.properties ] || [ "" == "$(grep -F database.string.index.max.length /mnt/liferay/portal-ext.properties)" ]; then
	echo '
database.string.index.max.length[mysql]=70
' >> /mnt/liferay/portal-ext.properties
fi