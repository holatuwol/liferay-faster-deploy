#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

s3upload() {
	S3_BUCKET=mdang.grow ${SCRIPT_FOLDER}/../packageinfo/s3upload "${1}"
	S3_BUCKET=mdang.tokyo ${SCRIPT_FOLDER}/../packageinfo/s3upload "${1}"
}

python security_issue_export.py
python security_issue_lpe_cve.py
python security_issue_cve_lpe.py

for file in security_issue*.json; do
	s3upload ${file}
done

