# Moonlight :full_moon_with_face:

Repositório do app moonlight.

## Rodando o projeto

Veja instruções abaixo para rodar o projeto usando apenas o Docker ou nativamente caso queira usar
o nodejs da sua máquina.
<details>
    <summary>Setup</summary>

    # Para configurar todas as dependencias execute
    > make setup

</details>
<details>
    <summary>Com o NodeJS instalado</summary>
    
    # [obrigatório] Para criar o arquivo .env
    > make envar

    # [opcional] Para subir o banco (precisará adaptar o arquivo app-config.local.yaml)
    > make up-db

    # [obrigatório] Para subir o backstage em modo dev

    ## primeira execução:
    > make init-native

    ## após a primeira execução:
    > make up-native

    # Caso acontece algum erro inexplicavel rode o comando para limpar tudo local e execute os comandos anteriores novamente
    > make clean

    # Erro de configuração faltando
    `Error: Missing required config value at`

    ## Alguma variável de ambiente está faltando

    Pare a execução do projeto, e siga as instruções:

    ### [opcional] Se não possuir o arquivo .env, execute
    > make envar

    ### [opcional] Se já possuir o .env configurado, execute
    > make load-envs

    ### após a primeira execução:
    > make up-native

</details>

<details>
    <summary>Docker</summary>

    # Para criar o arquivo .env
    > make envar

    # Para buildar a imagem
    > make build-image

    # Para instalar as dependências (é necessário buildar a imagem primeiro no comando anterior)
    > make install

    # Subir o ambiente
    > make up

</details>

<details>
    <summary>Contornando CORS ao utilizar backend de QA</summary>

    # Abra o Chrome desativando o web-security
    > open -a Google\ Chrome --args --disable-web-security --user-data-dir="/tmp/chrome_dev_test"

</details>

_Obs.:_ No ambiente local usamos um personal token ao invés da aplicação do github para
facilitar o desenvolvimento. Você precisa colocar o seu token na env `GITHUB_TOKEN` no arquivo `.env`

_Obs2.:_ O autodiscovery está desligado para o ambiente local, caso precise de uma entidade para teste iniciei o discovery atravez do comando

```shel
make discovery
```

<details>
    <summary>Install minikube</summary>

    # Para installar
    > curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
    sudo install minikube-darwin-amd64 /usr/local/bin/minikube

    # Para startar o cluster
    > minikube start

</details>

<details>
    <summary>Criando plugins</summary>

    # Para criar novos plugins backend basta executar o comando na raiz do projeto, lembre-se de ter executado o comando yarn install antes
    > make plugin-backend

    # Para criar novos plugins front end
    > make plugin-front

</details>

## Contribuindo
Para contribuir neste repositório, siga as regras de commits e Pull Requests descritas abaixo.  
Utilizamos o padrão [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), que facilita a organização e rastreamento de mudanças.  

1. Commits  
   - Devem ser escritos em inglês.  
   - Podem conter um escopo opcional indicando o plugin (ex.: feat(picpay-metrics): new metric added).  

2. Pull Requests  
   - A descrição deve ser em inglês, explicando claramente o que foi alterado.  
   - O título também segue o padrão do Conventional Commits, porém o escopo (nome do plugin afetado) é obrigatório.  
   - Exemplo de título: feat(picpay-users-github): add new API endpoint  

## Plugins

[picpay-metrics](https://github.com/PicPay/ms-moonlight/blob/main/plugins/picpay-metrics-backend/README.md)
[picpay-users-github](https://github.com/PicPay/ms-moonlight/blob/main/plugins/picpay-users-github-backend/README.md)

