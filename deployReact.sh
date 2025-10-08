#!/bin/bash

while getopts k:h:s: flag
do
    case "${flag}" in
        k) key=${OPTARG};;
        h) hostname=${OPTARG};;
        s) service=${OPTARG};;
    esac
done

if [[ -z "$key" || -z "$hostname" || -z "$service" ]]; then
    printf "\nMissing required parameter.\n"
    printf "  syntax: deployReact.sh -k <pem key file> -h <hostname> -s <service>\n\n"
    exit 1
fi

printf "\n----> Deploying React bundle $service to $hostname with $key\n"

# Step 1 - build the front-end bundle
printf "\n----> Build the distribution package\n"
rm -rf build
mkdir build
npm install
npm run build
cp -rf dist/* build

# Step 2 - clear remote directory
printf "\n----> Clearing out previous distribution on the target\n"
ssh -i "$key" ubuntu@$hostname << ENDSSH
rm -rf services/${service}/public
mkdir -p services/${service}/public
ENDSSH

# Step 3 - copy bundle to target
printf "\n----> Copy the distribution package to the target\n"
scp -r -i "$key" build/* ubuntu@$hostname:services/$service/public

# Step 4 - clean local artifacts
printf "\n----> Removing local copy of the distribution package\n"
rm -rf build
rm -rf dist
