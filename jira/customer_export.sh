#!/bin/bash

SCRIPT_FOLDER=$(dirname $0)
source ${SCRIPT_FOLDER}/../bin/activate

mkdir -p issue_export customer_export

if [ -f "${1}" ]; then
    python customer_export.py "${1}"

    for ACCOUNT_CODE in $(cat "${1}" | jq -r '.[].code' | sort -u); do
        python issue_export_html.py "customer_export/${ACCOUNT_CODE}.json" "${ACCOUNT_CODE}"
    done
else
    ACCOUNT_CODE="${1}"
    ACCOUNT_NAME="${2}"

    if [ "" == "${ACCOUNT_NAME}" ]; then
        ACCOUNT_NAME="${ACCOUNT_CODE}"
    fi

    python customer_export.py "${ACCOUNT_CODE}"

    if [[ $1 != LRHC-* ]]; then
        python issue_export_html.py "customer_export/${ACCOUNT_CODE}.json" "${ACCOUNT_NAME}"
        python issue_export_html.py "customer_export/${ACCOUNT_CODE}.internal.json" "${ACCOUNT_NAME} (Internal)"
    fi
fi