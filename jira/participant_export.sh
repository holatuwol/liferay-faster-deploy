#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

mkdir -p issue_export participant_export

python participant_export.py "$1"

python issue_export_html.py "participant_export/$1.json" "$2"