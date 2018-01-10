#!/bin/bash

BUCKET_PATH=$(cat $HOME/installer_bucket.txt)

cd /mnt/github

if [ ! -d oracle-docker-images ]; then
	git clone https://github.com/oracle/docker-images.git oracle-docker-images
fi

cd oracle-docker-images/OracleDatabase/dockerfiles

for file in ${ORACLE_INSTALLERS}; do
	if [ ! -f ${ORACLE_VERSION}/${file} ]; then
		aws s3 cp ${BUCKET_PATH}/${file} ${ORACLE_VERSION}/
	fi

done

sed -i.bak 's/--start-period=5m //g' ${ORACLE_VERSION}/Dockerfile.${ORACLE_VERSION_FILE}

./buildDockerImage.sh -v ${ORACLE_VERSION} ${ORACLE_VERSION_ARGS}

echo -n 'oracle' > ${HOME}/db_type.txt