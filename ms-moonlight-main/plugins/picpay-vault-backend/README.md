# picpay-vault

Welcome to the picpay-vault backend plugin!

_This plugin was created through the Backstage CLI_

## Getting started

Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn
start` in the root directory, and then navigating to [/picpay-vault](http://localhost:3000/picpay-vault).

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside the [/dev](/dev) directory.

# Referência

https://github.com/PicPay/sre-financial-marketplace/tree/copy-k8s-secret-to-vault/utils/scripts/copy-k8s-secret-to-vault

# Subir ambiente Local

## Variaveis

```
export ENV=test
export MICROSERVICE="ms-sample"
export VAULT_ADDR="http://127.0.0.1:8200"
export VAULT_ROLE_NAME="rundeck"
```

## Subir o Vault Server

```
vault server -dev
```

## Criar KV engine

```
vault secrets enable -path=kv/financial_marketplace/${ENV} -version=2 kv
```

## Habilitar approle

```
vault auth enable approle
```

# Configuração Vault para o Rundeck

## 1. criar policy

```
vault policy write ${VAULT_ROLE_NAME} - <<EOF
path "kv/financial_marketplace/${ENV}/*" {
    capabilities = [ "create", "read", "update" ]
}
EOF
```

## 2. criar role com policy

```
vault write auth/approle/role/${VAULT_ROLE_NAME} \
role_name=${VAULT_ROLE_NAME} \
token_policies=${VAULT_ROLE_NAME} \
token_ttl=15m \
token_max_ttl=30m
```

## 3. Ler Role ID

```
vault read auth/approle/role/${VAULT_ROLE_NAME}/role-id
export ROLE_ID="INFORME_ROLEID"
```

## 4. Gerar Secret Id

```
vault write -force auth/approle/role/${VAULT_ROLE_NAME}/secret-id
export SECRET_ID="INFORME_SECRETID"
```

## 5. Login

```
vault write auth/approle/login role_id=$ROLE_ID secret_id=$SECRET_ID
export VAULT_TOKEN=`vault write -field=token auth/approle/login role_id=$ROLE_ID secret_id=$SECRET_ID`
```

ou

```
curl --silent --request POST \
     --data "{ \"role_id\": \"$ROLE_ID\", \"secret_id\": \"$SECRET_ID\" }" \
     $VAULT_ADDR/v1/auth/approle/login | jq '.auth.client_token'
```

## 6. Criar secret

```
curl --request POST \
     --header "X-Vault-Token: ${VAULT_TOKEN}" \
     --data @sample.json \
     ${VAULT_ADDR}/v1/kv/financial_marketplace/${ENV}/data/${MICROSERVICE}
```

# Referência

https://developer.hashicorp.com/vault/tutorials/auth-methods/approle
