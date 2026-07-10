#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

mkdir -p customer_export

python customer_export.py $1

if [[ $1 != LRHC-* ]]; then
    python customer_export_html.py $1
fi