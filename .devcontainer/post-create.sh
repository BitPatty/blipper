#!/bin/bash

set -e

# Init project
nvm install
nvm use
nvm alias default $(node --version)
npm i -g npm@latest

# Tab Completion for npm
npm completion >> ~/.bashrc
