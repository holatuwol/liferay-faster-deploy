#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

s3upload() {
	S3_BUCKET=mdang.grow ${SCRIPT_FOLDER}/../packageinfo/s3upload "${1}"
}

python security_issue_export.py
python security_issue_synonyms.py
python security_issue_fix_versions.py

for file in security_issue_synonyms.ndjson; do
	s3upload ${file}
done

