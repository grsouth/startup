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

printf "\n----> Deploying service '%s' to %s with key %s\n" "$service" "$hostname" "$key"

printf "\n----> Building frontend bundle\n"
npm install
npm run build

printf "\n----> Preparing backend dependencies\n"
pushd service > /dev/null
npm install
popd > /dev/null

printf "\n----> Staging deployment artifacts\n"
DEPLOY_DIR=".deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
cp -R dist "$DEPLOY_DIR/dist"
cp -R service "$DEPLOY_DIR/service"
rm -rf "$DEPLOY_DIR/service/node_modules"

printf "\n----> Clearing target directories on %s\n" "$hostname"
ssh -i "$key" ubuntu@"$hostname" <<ENDSSH
set -e
mkdir -p services/${service}
rm -rf services/${service}/dist
rm -rf services/${service}/service
ENDSSH

printf "\n----> Uploading frontend bundle\n"
scp -r -i "$key" "$DEPLOY_DIR/dist" ubuntu@"$hostname":services/"$service"/

printf "\n----> Uploading backend service code\n"
scp -r -i "$key" "$DEPLOY_DIR/service" ubuntu@"$hostname":services/"$service"/

printf "\n----> Installing backend production dependencies on target\n"
ssh -i "$key" ubuntu@"$hostname" <<ENDSSH
set -e
cd services/${service}/service
npm install --omit=dev
sudo systemctl restart ${service} || true
ENDSSH

printf "\n----> Cleaning up local deployment artifacts\n"
rm -rf "$DEPLOY_DIR"

printf "\n----> Deployment complete\n"
