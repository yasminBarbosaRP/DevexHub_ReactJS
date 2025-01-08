# Componentes e Ferramentas

## Tekton

O Tekton é o framework utilizado para criação da Moonlight pipeline.

No PicPay, ele é usado como nossa solução de CI ( Continuous Integration). Basicamente todos os seus elementos são objetos do Kubernetes e, por conta disso, umas de suas vantagens é ser um produto altamente escalável. Outra vantagem é a reutilização dos objetos criados através de arquivos yaml, exemplo, os objetos do tipo Task, os quais podem conter Steps que fazem o clone de um repositório.

Esse objeto pode ser utilizado em várias outras Pipelines de microsserviços diferentes, sendo assim, não é preciso reescrever uma Pipeline se for criá-la, ou conter uma tarefa que clone um repositório. Basta informar alguns parâmetros para a Task, que assim ela fará todo o processo de forma padronizada.

Outra informação importante é que ele faz uso de [CRDs (Custom Resource Definition)](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) para os objetos, abaixo alguns destes CRDs que são criados dentro do cluster:

- eventListener
- trigger
- triggerTemplate
- pipeline
- pipelineRun
- tasks, entre outros.

Maiores detalhes em relação a arquitetura do Tekton, clique [aqui](https://picpay.atlassian.net/wiki/spaces/DevEX/pages/2330755610).

## Sonar

O SonarCloud é um serviço baseado no SonarQube onde são avaliadas métricas, vulnerabilidades, qualidade do código-fonte, etc. Na Moonlight pipeline, ele é integrado de maneira automatizada com o intuito de promover a cobertura de testes do código.

Para mais informações, clique [aqui](https://picpay.atlassian.net/wiki/spaces/DEVTOOLS/pages/2058682702/Sonar+Em+constru+o).

## Harness

O Harness é atualmente a ferramenta de CD (Continuous Delivery) da instituição, é através dela que a pessoa desenvolvedora promove ou faz deploy dos seus artefatos buildados para os Clusters dos microsserviços.

Atualmente, a promoção para o ambiente de QA na [Moonlight Pipeline](https://picpay.atlassian.net/wiki/spaces/DEVTOOLS/pages/2317385843/Moonlight+Pipeline+Em+constru+o), implica em uma ação da pessoa desenvolvedora no Github, onde através de uma **PR** é atribuída a **label deploy-QA** e o Tekton faz o trabalho de informar ao [Harness](https://app.harness.io/) qual o artefato, através do ultimo hash commit, deve ser deployado no cluster de QA.

Para o ambiente de Produção, atualmente o processo ainda é manual. Usamos tagueamento semântico dentro do repositório, uma vez que a TAG é criada e atribuída ao artefato no ECR, a imagem fica disponível para o Harness, permitindo a promoção do artefato. Em breve, este processo também será automatizado para o ambiente de Prod.

Um ponto importante a se observar em relação ao Harness é que no workflow atual, sempre que um microsserviço é deployado pela primeira vez, ele fará um “skip” no step do NewRelic, isso se deve ao fato de que por ser o primeiro deploy o app ainda não existe na plataforma New Relic, ele só passa a existir quando o serviço envia as métricas pela plataforma através do Agent.

Mais detalhes sobre o Harness, pode ser obtido no link abaixo.

[Harness](https://picpay.atlassian.net/wiki/spaces/DevEX/pages/1514930520/Harness)

## Trivy

O Trivy é uma ferramenta de scan de vulnerabilidades simples e bastante abrangente que realiza uma varredura em imagem de container, sistemas de arquivos, arquivos de configuração e repositórios git. O Trivy detecta vulnerabilidades em pacotes do sistema operacional (Alpine, RHEL, CentOS, etc.)e pacotes das linguagens utilizadas como (Bundler, Composer, npm, yarn, etc.). O Trivy além de todas esses pacotes também verifica arquivos de infraestrutura como código, como: Terraform, Dockerfile e Kubernetes, para detectar possíveis problemas de configuração que expõem suas implantações ao risco de ataque.

Atualmente o Trivy é executado como um passo obrigatório na Moonlight Pipeline logo após o build da imagem da aplicação informando as vulnerabilidades encontradas e parando a Moonlight Pipeline caso seja encontradas a vulnerabilidade Log4J (CVE-2021-44228, CVE-2021-45046).
