#!/bin/bash

mkdir -p backup

for volume in $(docker volume ls -f "name=^$(basename ${PWD,,})_${1}" | awk '{ if (NR > 1) print $2 }'); do
  echo ${volume}
  rm -f backup/${volume}.tar
  docker run --rm -v ${volume}:/data -v ./backup:/backup ubuntu tar cf /backup/${volume}.tar -C /data .
done