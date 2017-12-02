#!/bin/bash

BUCKET_PATH=$(cat bucket_path.txt)

sudo mkdir /mnt/backup
sudo chown $USER:$USER /mnt/backup
aws s3 sync $BUCKET_PATH /mnt/backup/

sudo mkdir /mnt/github
sudo chown $USER:$USER /mnt/github

cd /mnt/github
git clone https://github.com/holatuwol/lps-dockerfiles.git
cd -

sudo mkdir /mnt/liferay
sudo chown $USER:$USER /mnt/liferay

sudo mkdir /mnt/docker
sudo ln -s /mnt/docker /var/lib/docker

sudo apt-get install docker docker.io

sudo service docker start
sudo usermod -aG docker $USER

sudo mkdir /mnt/build
sudo chown $USER:$USER /mnt/build
