#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

mkdir -p issue_export participant_export

export_html() {
    display_name=$(cat "participant_export/${1}[account].json" | jq -r '.[].displayName')

    python issue_export_html.py "participant_export/${1}.json" "${display_name}"
}

if [ "" == "${1}" ]; then
    python participant_export.py

    for file_name in participant_export/*.json.gz; do
        user_name="$(basename "${file_name}" | sed 's/.json.gz$//g')"
        export_html ${user_name}
    done
else
    python participant_export.py "${1}"
    export_html "${1}"
fi