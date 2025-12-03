#!/bin/bash

set -e

# Init project
nvm install
nvm use
nvm alias default $(node --version)

npm i
npm completion >> ~/.bashrc

sudo apt update && sudo apt install -y imagemagick exiftool

