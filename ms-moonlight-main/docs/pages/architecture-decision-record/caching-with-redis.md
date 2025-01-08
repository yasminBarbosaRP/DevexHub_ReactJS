# Caching with Redis

## Data: 25/08/2022

Registro de decisão de alteração da estratégia de caching do Backstage.

- **Status**: Implantado.

- **Issue**: A decisão de colocar o Redis como Cache do Moonlight vêm após identificarmos que os pods do Moonlight estavam com repetidos erros de CrashLoopBackOff. Identificamos que os pods morriam com o seguinte erro:

````<--- Last few GCs --->

[1:0x7f240cd49320]  4879177 ms: Scavenge 503.4 (521.1) -> 502.4 (523.1) MB, 4.2 / 0.0 ms  (average mu = 0.160, current mu = 0.118) allocation failure
[1:0x7f240cd49320]  4880867 ms: Mark-sweep 504.3 (523.1) -> 501.4 (522.6) MB, 1674.7 / 0.1 ms  (average mu = 0.101, current mu = 0.022) allocation failure scavenge might not succeed


<--- JS stacktrace --->

FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory```

Este erro ocorria pelo fato de que o Moonlight e por consequência seus os plugins, utilizava-se da memória do pod para estratégia de Cache, resultando em estouro da memória heap do NodeJS.

Após realização de mais estudos, percebeu-se que ao utilizarmos cache em memória em ambiente produtivo, estávamos utilizando um padrão não recomendado pelo Backstage.

Nas configurações do [app-config.yaml](/app-config.yaml) conseguíamos identificar a configuração compartilhada entre todos os ambientes (produtivo e não produtivo):

```yaml
  cache:
    store: memory
````

- **Decision**: Sabendo dessa não recomendação, optamos por realizar as adaptações nas configurações do Backstage e utilizar Redis como estratégia de Cache, desestressando assim a memória heap dos pods do Moonlight.

Pensando nisso, entendemos que não teria necessidade de utilizarmos Redis em ambientes não produtivos, continuando assim a configuração citada acima. Sendo assim, removeu-se as configurações do arquivo [app-config.yaml](/app-config.yaml) que é compartilhado entre os ambientes, movendo as definições para os arquivos de ambiente:

- Para ambiente local: [app-config.local.yaml](/app-config.local.yaml)
- Para ambiente não produtivo [app-config.qa.yaml](/app-config.qa.yaml)
- Para ambiente produtivo [app-config.prod.yaml](/app-config.prod.yaml)

Todas as configurações na estrutura backend.cache

Para realizar essas adaptações, seguimos as recomendações [desta documentação](https://backstage.io/docs/overview/architecture-overview#cache).
