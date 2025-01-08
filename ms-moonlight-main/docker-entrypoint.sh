#!/bin/bash

set -e

env_vars_set=false

index=0

while : ; do
  if [[ $index -eq 0 ]]; then
    id_var="GITHUB_APP_ID"
    private_key_var="GITHUB_APP_PRIVATE_KEY"
    webhook_url_var="GITHUB_APP_WEBHOOK_URL"
    client_id_var="GITHUB_APP_CLIENT_ID"
    client_secret_var="GITHUB_APP_CLIENT_SECRET"
    webhook_secret_var="GITHUB_APP_WEBHOOK_SECRET"
  else
    id_var="GITHUB_APP_ID_$index"
    private_key_var="GITHUB_APP_PRIVATE_KEY_$index"
    webhook_url_var="GITHUB_APP_WEBHOOK_URL"
    client_id_var="GITHUB_APP_CLIENT_ID"
    client_secret_var="GITHUB_APP_CLIENT_SECRET"
    webhook_secret_var="GITHUB_APP_WEBHOOK_SECRET"
  fi
  
  if [[ -z "${!id_var}" ]]; then
    if [[ $index -eq 0 ]]; then
      break
    else
      break
    fi
  fi

  env_vars_set=true

  appId="${!id_var}"
  webhookUrl="${!webhook_url_var}"
  clientId="${!client_id_var}"
  clientSecret="${!client_secret_var}"
  webhookSecret="${!webhook_secret_var}"
  privateKeyVar="${private_key_var}"

  if [[ -z "$appId" || -z "${!private_key_var}" ]]; then
    echo "Error: Mandatory environment variables are missing for app index $index."
    exit 1
  fi

  if [[ $index -eq 0 ]]; then
    rm -f github-apps-prod.yaml
    rm -f github-apps-qa.yaml
  fi

  cat >> github-apps-prod.yaml <<EOL
- appId: $appId
  webhookUrl: $webhookUrl
  clientId: $clientId
  clientSecret: $clientSecret
  webhookSecret: $webhookSecret
  privateKey:
    \$env: $privateKeyVar
EOL

  cat >> github-apps-qa.yaml <<EOL
- appId: $appId
  webhookUrl: $webhookUrl
  clientId: $clientId
  clientSecret: $clientSecret
  webhookSecret: $webhookSecret
  privateKey:
    \$env: $privateKeyVar
EOL

  index=$((index+1))
done

if [[ "$env_vars_set" = false ]]; then
  echo "No GITHUB_APP_ID environment variables set. Keeping existing github-apps-prod.yaml and github-apps-qa.yaml files."
fi

exec "$@"
