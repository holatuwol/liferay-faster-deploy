#!/bin/bash

BUCKET_PATH=$(cat bucket_path.txt)

sudo mkdir /mnt/backup
sudo chown $USER:$USER /mnt/backup
aws s3 sync $BUCKET_PATH /mnt/backup/

sudo mkdir /mnt/github
sudo chown $USER:$USER /mnt/github

cd /mnt/github
git clone https://github.com/holatuwol/lps-dockerfiles.git
cd -

sudo mkdir /mnt/liferay
sudo chown $USER:$USER /mnt/liferay

sudo mkdir /mnt/docker
sudo ln -s /mnt/docker /var/lib/docker

sudo apt-get install docker docker.io

sudo service docker start
sudo usermod -aG docker $USER

sudo mkdir /mnt/build
sudo chown $USER:$USER /mnt/build

echo "create schema lportal default charset utf8mb4 default collate utf8mb4_unicode_ci;
grant all on lportal.* to 'lportal'@'%';
use lportal;

source /data/backup.sql
" > /mnt/build/reload.sql

cat /mnt/backup/*.sql >> /mnt/build/backup.sql

echo 'FROM mysql:5.7

ENV MYSQL_ALLOW_EMPTY_PASSWORD yes
ENV MYSQL_USER lportal
ENV MYSQL_PASSWORD lportal

EXPOSE 3306

ADD reload.sql /docker-entrypoint-initdb.d/
RUN mkdir /data
ADD backup.sql /data/
' > /mnt/build/Dockerfile

docker build /mnt/build/ -t dbsnapshot

docker network create upgrade
