#!/bin/bash

if [ "" == "${AWS_PROFILE}" ]; then
	echo AWS_PROFILE environment variable not set
	exit 1
fi

if [ "" == "${S3_BUCKET}" ]; then
	echo S3_BUCKET environment variable not set
	exit 1
fi

aws s3 --profile ${AWS_PROFILE} ls s3://${S3_BUCKET}/fixed_issues/ | awk '{ print $4 "\t" $3 }' | sort > 1.txt

if [ ! -d fixed_issues ]; then
	aws s3 --profile ${AWS_PROFILE} sync s3://${S3_BUCKET}/fixed_issues/ fixed_issues/

	for file in fixed_issues/*.txt; do
		mv ${file} ${file}.gz
		gunzip -c ${file}.gz > ${file}
	done
fi

python fixed_issues.py

cd fixed_issues

for file in *.txt; do
	gzip -c ${file} > ${file}.gz
done

cd -

ls -l fixed_issues/*.gz | sed 's/\.gz$//g' | sed 's@fixed_issues/@@g' | awk '{ print $9 "\t" $5 }' | sort > 2.txt

diff 1.txt 2.txt | grep '<' | awk '{ print $2 }' > 3.txt
diff 1.txt 2.txt | grep '>' | awk '{ print $2 }' > 4.txt

for file in $(cat 3.txt); do
	if [ "" == "$(grep "^${file}$" 4.txt)" ]; then
		aws s3 --profile ${AWS_PROFILE} rm s3://${S3_BUCKET}/fixed_issues/${file}
	fi
done

for file in $(cat 4.txt); do
	aws s3 --profile ${AWS_PROFILE} cp fixed_issues/${file}.gz "s3://${S3_BUCKET}/fixed_issues/${file}" --acl public-read --metadata-directive REPLACE --content-encoding gzip
done

rm 1.txt 2.txt 3.txt 4.txt fixed_issues/*.gz
