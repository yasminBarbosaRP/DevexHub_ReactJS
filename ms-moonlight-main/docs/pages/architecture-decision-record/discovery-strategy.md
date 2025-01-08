# Troca de GithubProcessor e GithubOrgReader para GitHubEntityProvider e GitHubOrgEntityProvider

## Data: 09/11/2022

Registro de decisão de alteração de arquitetura na descoberta de componentes, times e pessoas.

- **Status**: Implementado.

- **Issue**:

Encontramos problemas frequentes de RateLimit com o plugin do Github devido à alta frequência (curto período) de buscas das informações. Além disso, após analisarmos na documentação do Backstage, o Moonlight não estava de acordo com o [recomendado pela equipe do Backstage](https://backstage.io/docs/integrations/github/discovery) e estava utilizando Processors ao invés de Providers para coleta de informações.

- **Decision**:

1. Rodar a descoberta de informações com 3 tokens de Apps do Github em forma de CronJob, aumentando assim nossos limites de 15 mil requisições por hora para um total de 45 mil requisiões por hora.
2. Trocar Processors por Providers, implantado neste [PR](https://github.com/PicPay/ms-moonlight/pull/449)

Na troca de Processors para Providers ganharíamos um facilitador que possibilitou o próximo passo. O Provider quando identifica uma entidade que está inválida ou não é mais referenciada por nenhuma Location, o mesmo [adiciona uma Annotation informando que a entidade é órfã](https://backstage.io/docs/features/software-catalog/life-of-an-entity#orphaning).

3. Criar estratégia de limpeza para entidades órfãs via CronJob;
