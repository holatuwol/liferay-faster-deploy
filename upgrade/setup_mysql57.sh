#!/bin/bash

cd /mnt/github/lps-dockerfiles/nightly-jdk8
./build.sh mcd-nightly

echo "create schema lportal default charset utf8mb4 default collate utf8mb4_unicode_ci;
grant all on lportal.* to 'lportal'@'%';
use lportal;

source /data/backup.sql
" > /mnt/build/reload.sql

cat /mnt/backup/*.sql > /mnt/build/backup.sql

echo '[mysqld]
character-set-server  = utf8mb4
collation-server      = utf8mb4_unicode_ci
' > /mnt/build/runtime.cnf

echo "FROM mysql:5.7

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

mkdir -p /mnt/liferay/tools/portal-tools-db-upgrade-client

echo 'jdbc.default.driverClassName=com.mysql.jdbc.Driver
jdbc.default.url=jdbc:mysql://upgradedb/lportal?characterEncoding=UTF-8&dontTrackOpenResources=true&holdResultsOpenOverStatementClose=true&useFastDateParsing=false&useUnicode=true
jdbc.default.username=lportal
jdbc.default.password=lportal
' > /mnt/liferay/tools/portal-tools-db-upgrade-client/portal-upgrade-database.properties

echo -n 'mysql' > ${HOME}/db_type.txt