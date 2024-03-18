#!/bin/bash

python releases.py

aws s3 --profile ${AWS_PROFILE} ls s3://${S3_BUCKET}/releases/ | awk '{ print $4 "\t" $3 }' | sort > 1.txt

cd releases

for file in *.json; do
  gzip -c ${file} > ${file}.gz
done

cd -

ls -l releases/*.gz | sed 's/\.gz$//g' | sed 's@releases/@@g' | awk '{ print $9 "\t" $5 }' | sort > 2.txt

for file in $(diff 1.txt 2.txt | grep '<' | awk '{ print $2 }'); do
  aws s3 --profile ${AWS_PROFILE} rm s3://${S3_BUCKET}/releases/${file}
done

for file in $(diff 1.txt 2.txt | grep '>' | awk '{ print $2 }'); do
  aws s3 --profile ${AWS_PROFILE} cp releases/${file}.gz "s3://${S3_BUCKET}/releases/${file}" --acl public-read --metadata-directive REPLACE --content-encoding gzip
done

gzip -c releases.json > releases.json.gz
aws s3 cp --profile ${AWS_PROFILE} releases.json.gz "s3://${S3_BUCKET}/releases.json" --acl public-read --metadata-directive REPLACE --content-encoding gzip

rm 1.txt 2.txt