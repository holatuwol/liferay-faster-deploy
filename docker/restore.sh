#!/bin/bash

docker compose down -v
docker compose create

for restore in $(test -d restore && find restore -name '*.tar'); do
  volume=$(basename ${restore} | sed 's/\.tar$//g')
  if [ "" != "$(docker volume ls -f "name=^${volume}$")" ]; then
    echo ${volume} && docker run --rm -v ${volume}:/data -v ./restore:/restore ubuntu tar xf /restore/${volume}.tar -C /data
  fi
done