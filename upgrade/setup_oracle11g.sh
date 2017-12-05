#!/bin/bash

BUCKET_PATH=$(cat $HOME/installer_bucket.txt)

cd /mnt/github
git clone https://github.com/oracle/docker-images.git oracle-docker-images

cd oracle-docker-images/OracleDatabase/dockerfiles
aws s3 cp ${BUCKET_PATH}/oracle-xe-11.2.0-1.0.x86_64.rpm.zip 11.2.0.2/

./buildDockerImage.sh -v 11.2.0.2 -x