#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

python releases.py

if [ "" == "${AWS_PROFILE}" ]; then
	AWS_PROFILE='default'
fi

if [ "" == "${S3_BUCKET}" ]; then
	S3_BUCKET='mdang.grow'
fi

# Each releases.production/<name>.json has a <name>.json.sha256 (in sha256sum
# format) recording the hash of the file as of its last upload, so a file is
# only uploaded when it is new or its hash has changed.

if [ ! -d releases.production ]; then
	aws s3 --profile ${AWS_PROFILE} sync s3://${S3_BUCKET}/releases/ releases.production/

	pushd releases.production > /dev/null

	for file in *.json; do
		mv ${file} ${file}.gz
		gunzip -c ${file}.gz > ${file}
		rm ${file}.gz
		sha256sum ${file} > ${file}.sha256
	done

	popd > /dev/null
fi

pushd releases.production > /dev/null

# Remove files from S3 that no longer exist locally

aws s3 --profile ${AWS_PROFILE} ls s3://${S3_BUCKET}/releases/ | awk '{ print $4 }' | sort > ../1.txt
ls *.json | sort > ../2.txt

for file in $(comm -23 ../1.txt ../2.txt); do
	aws s3 --profile ${AWS_PROFILE} rm s3://${S3_BUCKET}/releases/${file}
done

rm ../1.txt ../2.txt

for file in *.json.sha256; do
	if [ ! -f "${file%.sha256}" ]; then
		rm ${file}
	fi
done

# Upload files that are new or whose hash changed since their last upload

for file in *.json; do
	if [ -f ${file}.sha256 ] && sha256sum --status -c ${file}.sha256; then
		continue
	fi

	gzip -c -n ${file} > ${file}.gz

	if aws s3 --profile ${AWS_PROFILE} cp ${file}.gz "s3://${S3_BUCKET}/releases/${file}" --acl public-read --metadata-directive REPLACE --content-encoding gzip; then
		sha256sum ${file} > ${file}.sha256
	fi

	rm ${file}.gz
done

popd > /dev/null

gzip -c releases.production.json > releases.json.gz
aws s3 cp --profile ${AWS_PROFILE} releases.json.gz "s3://${S3_BUCKET}/releases.json" --acl public-read --metadata-directive REPLACE --content-encoding gzip
rm releases.json.gz

gzip -c releases.production.names.json > releases.names.json.gz
aws s3 cp --profile ${AWS_PROFILE} releases.names.json.gz "s3://${S3_BUCKET}/releases.names.json" --acl public-read --metadata-directive REPLACE --content-encoding gzip
rm releases.names.json.gz

JS_MODIFIED=$(date -r releases.js '+%s')
sed -i '/<script src="releases.js/s@"releases.js.*"@"releases.js?t='${JS_MODIFIED}'"@g' releases.html

for file in releases.html releases.js; do
  gzip -c ${file} > ${file}.gz
  aws s3 --profile ${AWS_PROFILE} cp ${file}.gz "s3://${S3_BUCKET}/${file}" --acl public-read --metadata-directive REPLACE --content-encoding gzip
  rm ${file}.gz
done