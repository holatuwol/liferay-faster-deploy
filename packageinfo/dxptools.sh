#!/bin/bash

AWS_PROFILE=training
S3_BUCKET=mdang.grow

for file in dxppackages dxpmodules dxpschemas; do
	for ext in html js; do
		rm -f ${file}.${ext}.gz
		gzip ${file}.${ext}
		aws s3 --profile $AWS_PROFILE cp ${file}.${ext}.gz s3://$S3_BUCKET/${file}.${ext} --acl public-read --metadata-directive REPLACE --content-encoding gzip
		gunzip ${file}.${ext}.gz
	done
done