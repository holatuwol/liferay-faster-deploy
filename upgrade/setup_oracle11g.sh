#!/bin/bash

BUCKET_PATH=$(cat $HOME/installer_bucket.txt)

cd /mnt/github

if [ ! -d oracle-docker-images ]; then
	git clone https://github.com/oracle/docker-images.git oracle-docker-images
fi

cd oracle-docker-images/OracleDatabase/dockerfiles

if [ ! -f 11.2.0.2/oracle-xe-11.2.0-1.0.x86_64.rpm.zip ]; then
	aws s3 cp ${BUCKET_PATH}/oracle-xe-11.2.0-1.0.x86_64.rpm.zip 11.2.0.2/
fi

sed -i.bak 's/--start-period=5m //g' 11.2.0.2/Dockerfile.xe

./buildDockerImage.sh -v 11.2.0.2 -x

echo -n 'oracle' > ${HOME}/db_type.txt