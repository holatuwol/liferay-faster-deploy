#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

mkdir -p customer_export

python customer_export.py $@