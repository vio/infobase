#!/bin/bash
set -e # will exit if any command has non-zero exit value

source ./deploy_build_Scripts/create_transient_secrets.sh
source ./deploy_build_Scripts/create_prod_env_vars.sh

#refresh node_modules
npm ci

#build everything
./deploy_build_scripts/build_all.sh

#push build to staging dir of GCloud bucket
export GCLOUD_BUCKET_URL=$STAGING_BUCKET
./deploy_build_scripts/push_to_gcloud_bucket.sh

#within the GCloud bucket, backup the live prod directory (/InfoBase) to the /rollback dir, rsync /staging to /InfoBase
#leaves us a safe version to roll back to in /rollback, and minimizes the mid-deploy downtime for the InfoBase
gsutil -m rsync -a public-read -r -d $PROD_BUCKET $ROLLBACK_BUCKET
gsutil -m rsync -a public-read -r -d $STAGING_BUCKET $PROD_BUCKET

#clear certain cloudflare caches
./deploy_build_scripts/selectively_clear_cloudflare_cache.sh

cleanup