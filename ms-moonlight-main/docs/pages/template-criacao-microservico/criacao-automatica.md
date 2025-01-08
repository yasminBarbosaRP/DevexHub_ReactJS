# Criação automática via template

## O que é criado automaticamente?

- Criação do Repositório no Github (com definição de permissões, Branch principal e proteção de Branch);
- Integração com a Moonlight pipeline;
- Criação da Label “Deploy-QA”;
- Configuração de CI;
- Configuração de CD;
- Configuração do Helm Charts da Pipeline.
- Criação do repositório da imagem no ECR;
- Criação do namespace no Kubernetes;
- Criação de variáveis de ambiente do New Relic;
- Adição do novo serviço ao catálogo de componentes;
- Criação do template de arquivo Readme;
- Criação dos arquivos Dockerfile e Docker-Compose.

## Quais arquivos são gerados?

- .changelog
- .editorconfig
- .env.example
- .gitignore
- .sonarcloud.properties
- .styleci.yml
- .tekton.yaml
- changelog.md
- Dockerfile
- readme.md
- captainhook.json
- catalog-info.yaml
- docker-compose-cloud.yml
- docker-compose.yml
- \+ Arquivos do Framework ou Linguagem selecionada na criação do serviço.

## Quais integrações são realizadas ao escolher o template?

- Integração com a Pipeline do Tekton (Webhook);
- Integração com o repositório [Helm-chart](https://github.com/PicPay/helm-charts);
- Integração com o repositório [Harness](https://github.com/PicPay/ops-harness-setup);
- Variável de ambiente do NewRelic (appName/licenseKey) , somente em QA. A pessoa desenvolvedora precisa criar em produção.

## O que não é gerado automaticamente pelo template?

Atualmente, os templates não criam a infraestrutura de cada projeto, tais como:

- Banco de Dados;
- Fila em mensageria (kafka, sqs);
- Configuração do Apdex da aplicação no NewRelic.
