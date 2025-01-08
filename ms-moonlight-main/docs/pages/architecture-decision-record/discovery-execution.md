# Execução paralela entre Github Org Reader e Github Discovery

## Data: 15/08/2022

Registro de decisão de alteração de arquitetura na descoberta de componentes, times e pessoas.

- **Status**: Não implementado.
  O Discovery e o OrgReader como Processors funcionam apenas como coletas por Location's, nenhum deles buscam de fato a informação no Github, existe um outro fluxo no plugin Catalog que processa as informações que estão na tabela refresh_state, que serve como uma fila do que será processado e agregador para montar o documento final no final_entities.

- **Issue**: A decisão de separar a execução entre os descobridores de registros na Organização utilizando tokens do Github separados vêm do constante atingimento do RateLimit no Github.
  A organização consta com mais de 400 times e 1,4k pessoas registrados, além dos quase 3k repositórios. Com uma organização nesta magnitude, estamos atingindo os limites do Github com facilidade.

- **Decision**: Separar os descobridores (Org Reader e Discovery) por worker, cada um com seu token de app separado. Cada App do Github possui um RateLimit exclusivo de 15k requisições/hora.

O arquivo [autodiscover.ts](../../../packages/backend/src/plugins/autodiscover.ts) conterá uma condicional de configurações criadas utilizando variáveis de ambiente para ativar um worker específico ou os dois ao mesmo tempo.

Variáveis:

- WORKER_DISCOVERY, ativa a descobertra de componentes
- WORKER_ORG_READER, ativa a descoberta de times e pessoas

### Github Discovery

Continuará atuando com coleta a cada 300ms utilizando dois [CronJobs](https://kubernetes.io/pt-br/docs/concepts/workloads/controllers/cron-jobs/) para troca de token em uma estratégia de "turnos":
O Primeiro CronJob rodará a partir do minuto zero e rodará durante 30 minutos a coleta de informações com o token 1.
O Segundo CronJob rodará a partir do minuto trinta e um e rodará durante 30 minutos a coleta de informações com o token 2.

### Org Discovery

Passará a atuar como Worker com coleta a cada 300ms utilizando seu token exclusivo.

- **Status**: Refinado e Aprovado por todas as pessoas no time.

- **Related decisions**: Esta decisão compõe uma do total de três mudanças no funcionamento da coleta de informações do Github.

[Permissões do Discovery](./discovery-permissions.md)
[Estratégia do Discovery](./discovery-strategy.md)
