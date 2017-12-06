#!/bin/bash

BUCKET_PATH=$(cat $HOME/installer_bucket.txt)

cd /mnt/github

if [ ! -d oracle-docker-images ]; then
	git clone https://github.com/oracle/docker-images.git oracle-docker-images
fi

cd oracle-docker-images/OracleDatabase/dockerfiles

if [ ! -f 12.2.0.1/linuxx64_12201_database.zip ]; then
	aws s3 cp ${BUCKET_PATH}/linuxx64_12201_database.zip 12.2.0.1/
fi

sed -i.bak 's/--start-period=5m //g' 12.2.0.1/Dockerfile.se2

./buildDockerImage.sh -v 12.2.0.1 -s