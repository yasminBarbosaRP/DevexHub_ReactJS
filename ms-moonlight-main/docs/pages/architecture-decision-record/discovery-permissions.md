# Discovery do catalogo

### Data: 12/08/2022

Existe um plugin chamado discovery que é resposavel por buscar as informações de catalogo dentro do github.
ele é altamente customizavel. para mais informações de customização veja a documentação oficial da comunidade [aqui.](https://backstage.io/docs/features/software-catalog/software-catalog-overview)

## Decisão de arquitetura de Discovery

### Problema

O plugin não está funcionando corretamente, os usuários não estão aparecendo corretamente no portal
A estratégia sugerida pelo backstage não está sendo utilizada e pode ser esse o problema.
a configuração das locations padrões do discovery foi feita a muito tempo atraz e precisava de uma reestruturação para os novos padrões e quantidades de componentes a serem catalogados na plataforma.

### Decisão

Regras de Auto Discovery implementadas:

• Regras do que é permitido buscar para o Catalogo se manteve:

- allow:
  [
  Component,
  API,
  Resource,
  Group,
  User,
  Template,
  System,
  Domain,
  Location,
  ]

• Foram removidos duas URL que não fazia sentido, estava mais sujando do que ajudando, piorando nossa performance.

    - target: https://github.com/PicPay/picpay-ops-moonlight/blob/main/packages/backend/config/all-domains.yaml

    - target: https://github.com/PicPay/picpay-ops-moonlight/blob/main/packages/backend/config/all-systems.yaml

• Regras de locations:

    - Inserido uma nova regra do que será permitido buscar github-org pelo target: https://github.com/PicPay
    	- rules:
    		- allow: [Group, User]

    - Inserido uma nova regra do que será permitido buscar github-discovery pelo target: https://github.com/PicPay/*/blob/-/catalog-info.yaml
    	- rules:
    		- allow: [Component, API, Resource, System, Domain, Location]

    - E mantendo a regra para o busca no github-discovery, para busca de Template no target: https://github.com/PicPay/moonlight-template-*/blob/qa/template.yaml

• Yaml deletados que não serão mais utilizados:

    - packages/backend/config/all-domains.yaml
    - packages/backend/config/all-systems.yaml
    - packages/backend/config/domains/labs.yaml
    - packages/backend/config/systems/labs-devops.yaml
    - packages/backend/config/systems/labs-general
    - packages/backend/config/systems/labs-go.yaml
    - packages/backend/config/systems/labs-java.yaml
    - packages/backend/config/systems/labs-php.yaml
    - packages/backend/config/systems/labs-python.yaml

• nova configuração do discovery:

```yaml
catalog:
  rules:
    - allow:
        [
          Component,
          API,
          Resource,
          Group,
          User,
          Template,
          System,
          Domain,
          Location,
        ]
  locations:
    - type: github-org
      target: https://github.com/PicPay
      rules:
        - allow: [Group, User]
    - type: github-discovery
      target: https://github.com/PicPay/*/blob/-/catalog-info.yaml
      rules:
        - allow: [Component, API, Resource, System, Domain, Location]
    - type: github-discovery
      target: https://github.com/PicPay/moonlight-template-*/blob/-/template.yaml
      rules:
        - allow: [Template]
```
