# Moonlight Pipeline

## O que é Pipeline?

Pipeline é a automatização dos processos de desenvolvimento de software. Envolve os procedimentos e práticas de CI/CD, que são integradas ao template de criação de microsserviços, que utilizam o Tekton como motor.

## Qual o objetivo?

Unificar e padronizar as tarefas de teste, build e deploy em um fluxo único, reduzindo assim, a chance de que tarefas rodem de forma desnecessária caso algum teste falhe. Além disso, traz também tarefas importantes já definidas, reduzindo a chance de falha humana na definição das tarefas a serem rodadas.

## O que é executado?

- Testes do SonarQube;
- Build da imagem para containers;
- Deploy em QA;
- Criação de Release no Github;
- Tarefas customizadas;
  - Exemplo: testes, copiar arquivos de um bucket, mostrar alguma mensagem, enfim, qualquer coisa que a pessoa desenvolvedora queira definir e inserir.
- Verificação de vulnerabilidades utilizando Trivy;
  - É verificado o repositório, as imagens base utilizadas e a imagem criada após o build.
  - Ao encontrar a vulnerabilidade Log4j a Moonlight Pipeline para e é informada no pull request.
  - Ao encontrar qualquer vulnerabilidade crítica a Moonlight Pipeline continua e é informado os dados encontrados na pull request.
- Validação com Buildchecker;
  - São verificados se alguns arquivos de configuração existem e se os dados contidos estão corretos, como: catalog-info.yaml, sonarcloud.properties, módulos php, configurações do sonar para o gradle, maven e javascript.
  - Caso algum arquivo ou configuração seja não seja encontrado a Moonlight Pipeline para e é informado no pull request o que é necessário para correção.

## O que a diferencia?

Ao invés de ter inúmeras ferramentas (Drone, Code Build, etc.) executando em paralelo e possivelmente gerando artefatos falhos com a pipeline, temos um fluxo único onde cada tarefa é rodada no momento certo. Além disso, há tarefas já pré-definidas para rodar em sistema opt-out (na qual se pode desativar sua execução, mas que rodam por padrão).

As imagens geradas utilizam como tag o hash do último commit gerador, até a ida para produção, em produção a imagem é promovida para uma nova tag utilizando [semantic versioning](https://semver.org/).
