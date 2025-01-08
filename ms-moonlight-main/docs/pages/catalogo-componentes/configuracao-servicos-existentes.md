# Configuração de serviços já existentes

Para serviços já existentes na organização do PicPay, é necessário adicionar algumas configurações para que sejam apresentados no catálogo e para o agrupamento de serviços integrados, em um mesmo domínio e pertencentes ao mesmo sistema distribuído.

## Configuração de Domain

!!! info "Os arquivos de domains devem ser adicionados como PR no [repositório do Moonlight](https://github.com/PicPay/picpay-ops-moonlight/tree/main/packages/backend/config), na pasta domains."

Após criação, o nome da configuração deve ser adicionado ao arquivo all-domains.yaml no diretório anterior.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: MeuDomain //exemplo: P2P
  description: Vertical P2P
spec:
  owner: minha-squad
```

## Configuração de System

!!! info "Os arquivos de systems devem ser adicionados como PR no [repositório do Moonlight](https://github.com/PicPay/picpay-ops-moonlight/tree/main/packages/backend/config), na pasta systems."

Após criação, o nome do config deve ser adicionado ao arquivo de configuração all-systems.yaml no diretório anterior.

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: MeuSystem
  description: System de P2P
  tags:
    - system
    - p2p
    - transacao
spec:
  owner: minha-squad
  domain: MeuDomain
```

## Configuração de Microsserviço

!!! warning "O nome do arquivo de configuração deve seguir o padrão `catalog-info.yaml`, sendo adicionado na raiz do projeto, para que possa ser rastreado pelo Moonlight."

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: meu-servico-em-go
  tags:
    - go
    - mysql
    - dynatrace
    - k8s
  description: |
    Meu serviços criam uma integração com o P2P do PicPay
  links:
    - title: Website
      url: http://meuservico.io
    - title: Documentation
      url: https://github.com/PicPay/picpay-ms-meuservico/docs
    - title: Storybook
      url: https://meuservico.io/storybook
    - title: Discord Chat
      url: https://discord.com/invite/ASD123
  annotations:
    backstage.io/kubernetes-label-selector: service=ms-meuservico
    backstage.io/techdocs-ref: https://github.com/PicPay/picpay-ms-meuservico/docs
    github.com/project-slug: PicPay/picpay-ms-meuservico
    sonarqube.org/project-key: PicPay_picpay-ms-meuservico
spec:
  type: service
  lifecycle: experimental ou production
  owner: minha-squad
  system: MeuSystem
  domain: MeuDomain
```

## Configuração de Website

!!! warning "O nome do arquivo de configuração deve seguir o padrão `catalog-info.yaml`, sendo adicionado na raiz do projeto, para que possa ser rastreado pelo Moonlight."

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: meu-front-em-react
  tags:
    - react
    - javascript
    - webpack
  description: |
    Meu website de cadastro de usuário
  links:
    - title: Website
      url: http://meufront.io
    - title: Documentation
      url: https://github.com/PicPay/picpay-meufront/docs
    - title: Storybook
      url: https://meufront.io/storybook
    - title: Discord Chat
      url: https://discord.com/invite/ASD123
  annotations:
    backstage.io/techdocs-ref: https://github.com/PicPay/picpay-meufront/docs
    github.com/project-slug: PicPay/picpay-meufront
    sonarqube.org/project-key: PicPay_picpay-meufront
    lighthouse.com/website-url: https://meufront.io
spec:
  type: website
  lifecycle: experimental ou production
  owner: minha-squad
  system: MeuSystem
  domain: MeuDomain
```

!!! warning "A configuração de outros tipos de componentes deve seguir o mesmo padrão apresentado. Caso tenha dúvidas na configuração do seu componente entre em contato com o nosso time no #moonlight do slack."
