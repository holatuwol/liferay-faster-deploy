#!/bin/bash

# Stages the given HTML files and their dependencies in next/ for upload,
# keeping only the files that changed since the last run (which are copied to
# prev/ at the start of the next run, so upload everything left in next/).
#
# Dependencies are the local scripts and stylesheets each HTML file loads, and
# the data files (*.csv, *.json, *.ndjson) that the HTML file or those scripts
# mention by name. Data files are staged gzipped and base64-encoded.
#
# Usage: ./upload.sh lsv_checker.html [other.html ...]

if [ $# -eq 0 ]; then
	echo "Usage: $0 file.html [file.html ...]"
	exit 1
fi

HTML_FILES=()

for arg in "$@"; do
	if [ ! -f "${arg}" ]; then
		echo "${arg} does not exist"
		exit 1
	fi

	HTML_FILES+=("$(cd "$(dirname "${arg}")" && pwd)/$(basename "${arg}")")
done

SCRIPT_FOLDER=$(cd "$(dirname "$0")" && pwd)

cd "${SCRIPT_FOLDER}"

shopt -s nullglob

mkdir -p prev

if [ -d next ]; then
	for file in next/*; do
		cp -f "${file}" prev/
	done
fi

rm -rf next
mkdir next

for html_file in "${HTML_FILES[@]}"; do
	html_folder=$(dirname "${html_file}")

	cp "${html_file}" next/

	# Local scripts and stylesheets loaded by the HTML file, ignoring URLs and
	# query strings such as lsv_checker.js?t=0

	checked_files=("${html_file}")

	for dependency in $(grep -oE "(src|href)=(\"[^\"]+\"|'[^']+')" "${html_file}" | sed -E "s/^(src|href)=[\"']//; s/[\"']\$//; s/[?#].*\$//" | grep -v '://' | grep -E '\.(js|css)$' | sort -u); do
		if [ -f "${html_folder}/${dependency}" ]; then
			cp "${html_folder}/${dependency}" next/
			checked_files+=("${html_folder}/${dependency}")
		else
			echo "${dependency} (loaded by $(basename "${html_file}")) is not a local file"
		fi
	done

	# Data files mentioned by the HTML file or its scripts

	for data_file in "${html_folder}"/*.csv "${html_folder}"/*.json "${html_folder}"/*.ndjson; do
		if grep -qF "$(basename "${data_file}")" "${checked_files[@]}"; then
			gzip -c -9 -n "${data_file}" | base64 > "next/$(basename "${data_file}").base64"
		fi
	done
done

for file in next/*; do
	if test ! -f "prev/$(basename "${file}")"; then
		echo "${file} is missing"
	elif [[ $(diff "${file}" "prev/$(basename "${file}")" | wc -l) -eq 0 ]]; then
		rm "${file}"
	else
		echo "${file} is out of date"
	fi
done

source ../bin/activate

if [ "lsv_checker.html" == "${1}" ]; then
	for file in lsv_checker.js lsv_checker_public.json lsv_checker_public.html; do
		S3_BUCKET=mdang.grow ./s3upload ${file}
	done
fi