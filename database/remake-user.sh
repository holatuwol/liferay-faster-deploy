#!/bin/bash

export ORACLE_SID='ORCLCDB'

SCRIPT_FOLDER=$(dirname ${BASH_SOURCE[0]})

sqlplus / AS SYSDBA @remake-user.sql

FILENAME=$(ls ${SCRIPT_FOLDER}/ | grep -F .dmp)

ORACLE_COMPAT_VERSION=19.3

OLD_SCHEMA=$(grep -o 'CREATE USER ".*"' ${SCRIPT_FOLDER}/ddl_dump.txt | cut -d'"' -f 2)
OLD_TABLESPACE=$(grep -o 'TABLESPACE ".*"' ${SCRIPT_FOLDER}/ddl_dump.txt | cut -d'"' -f 2 | sort -u | grep -vF TEMP)

impdp lportal/lportal \
  directory=export_lportal \
  dumpfile=${FILENAME} \
  remap_schema=${OLD_SCHEMA}:lportal \
  tablespaces=$(echo ${OLD_TABLESPACE} | tr ' ' ',') \
  $(echo "$OLD_TABLESPACE" | awk '{print "remap_tablespace=" $1 ":lportal"}' | tr '\n' ' ') \
  exclude=INDEX table_exists_action=TRUNCATE version=${ORACLE_COMPAT_VERSION}

echo 'revoke imp_full_database from lportal;' | sqlplus / AS SYSDBA
