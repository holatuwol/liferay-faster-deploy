#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

mkdir -p issue_export customer_export

python customer_export.py "$1"

if [[ $1 != LRHC-* ]]; then
    python issue_export_html.py "customer_export/$1.json" "$1"
    python issue_export_html.py "customer_export/$1.internal.json" "$1 (Internal)"
fi