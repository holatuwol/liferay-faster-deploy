#!/bin/bash

BUCKET_PATH=$(cat $HOME/installer_bucket.txt)

cd /mnt/github
git clone https://github.com/oracle/docker-images.git oracle-docker-images

cd oracle-docker-images/OracleDatabase/dockerfiles
aws s3 cp ${BUCKET_PATH}/linuxx64_12201_database.zip 12.2.0.1/

./buildDockerImage.sh -v 12.2.0.1 -s