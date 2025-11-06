#!/bin/bash

set -e

while getopts k:h:s: flag; do
  case "${flag}" in
    k) key=${OPTARG} ;;
    h) hostname=${OPTARG} ;;
    s) service=${OPTARG} ;;
  esac
done

if [[ -z "$key" || -z "$hostname" || -z "$service" ]]; then
  printf "\nMissing required parameter.\n"
  printf "  syntax: deployService.sh -k <pem key file> -h <hostname> -s <service>\n\n"
  exit 1
fi

printf "\n----> Deploying service '%s' to %s with %s\n" "$service" "$hostname" "$key"

printf "\n----> Building frontend bundle\n"
rm -rf build dist
mkdir -p build/public
npm install
npm run build
cp -R dist/* build/public

printf "\n----> Packing backend service\n"
mkdir -p build/service
if command -v rsync >/dev/null 2>&1; then
  rsync -av --exclude=node_modules service/ build/service >/dev/null
else
  cp -R service/* build/service/
  rm -rf build/service/node_modules
fi

printf "\n----> Clearing target deployment on %s\n" "$hostname"
ssh -i "$key" ubuntu@"$hostname" <<ENDSSH
set -e
rm -rf services/${service}
mkdir -p services/${service}
ENDSSH

printf "\n----> Uploading bundle\n"
scp -r -i "$key" build/* ubuntu@"$hostname":services/"$service"

printf "\n----> Installing backend dependencies and restarting service\n"
ssh -i "$key" ubuntu@"$hostname" <<ENDSSH
set -e
cd services/${service}/service
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
npm install
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart ${service} || pm2 start index.js --name ${service}
else
  echo "pm2 not found; skipping process restart."
fi
ENDSSH

printf "\n----> Cleaning local artifacts\n"
rm -rf build dist

printf "\n----> Deployment complete\n"
