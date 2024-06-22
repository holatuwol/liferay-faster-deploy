#!/bin/bash

if [ "" == "${AWS_PROFILE}" ]; then
	echo AWS_PROFILE environment variable not set
	exit 1
fi

if [ "" == "${S3_BUCKET}" ]; then
	echo S3_BUCKET environment variable not set
	exit 1
fi

# python releases.py

aws s3 --profile ${AWS_PROFILE} ls s3://${S3_BUCKET}/releases/ | awk '{ print $4 "\t" $3 }' | sort > 1.txt

cd releases.production

for file in *.json; do
  gzip -c ${file} > ${file}.gz
done

cd -

ls -l releases.production/*.gz | sed 's/\.gz$//g' | sed 's@releases.production/@@g' | awk '{ print $9 "\t" $5 }' | sort > 2.txt

for file in $(diff 1.txt 2.txt | grep '<' | awk '{ print $2 }'); do
  aws s3 --profile ${AWS_PROFILE} rm s3://${S3_BUCKET}/releases/${file}
done

for file in $(diff 1.txt 2.txt | grep '>' | awk '{ print $2 }'); do
  aws s3 --profile ${AWS_PROFILE} cp releases.production/${file}.gz "s3://${S3_BUCKET}/releases/${file}" --acl public-read --metadata-directive REPLACE --content-encoding gzip
done

gzip -c releases.production.json > releases.json.gz
aws s3 cp --profile ${AWS_PROFILE} releases.json.gz "s3://${S3_BUCKET}/releases.json" --acl public-read --metadata-directive REPLACE --content-encoding gzip

for file in releases.html releases.js; do
  gzip -c ${file} > ${file}.gz
  aws s3 --profile ${AWS_PROFILE} cp ${file}.gz "s3://${S3_BUCKET}/${file}" --acl public-read --metadata-directive REPLACE --content-encoding gzip
done

rm 1.txt 2.txt