import {
  CustomExploreTool,
  CustomGetExploreToolsResponse,
  CustomProvider,
  createRouter,
} from '@internal/plugin-picpay-tools-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

async function queryExternalTools(): Promise<CustomExploreTool[]> {
  const tools: CustomExploreTool[] = [
    {
      categoryType: 'REPOSITORY',
      categoryName: 'Repository',
      categoryTools: [
        {
          id: 'bc71538c-63a4-4915-b7c5-2fe946497db7',
          title: 'Atlantis',
          description:
            'GitHub é uma plataforma de hospedagem de código-fonte e arquivos com controle de versão usando o Git. Ele permite que programadores, utilitários ou qualquer usuário cadastrado na plataforma contribuam em projetos privados e/ou Open Source de qualquer lugar do mundo.',
          productUrl: 'https://github.com/PicPay/',
          docsUrl: 'https://docs.github.com/pt',
          typeInterface: 'GitHub',
        },
      ],
    },
    {
      categoryType: 'CI/CD',
      categoryName: 'CI/CD',
      categoryTools: [
        {
          id: 'b977a219-accc-415b-a51c-f46422ab2207',
          title: 'Devx',
          description:
            'Esteira de CI/CD para microsserviços de backend , onde são feitos testes e análises do código, além da entrega do mesmo nos ambientes de homologação e produção.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/MOON/pages/2418442460/Moonlight+Pipeline',
          typeInterface: 'Moonlight Pipeline Backend',
        },
        {
          id: '17c5630d-72ee-40db-b2a8-726992f33653',
          title: 'Devx',
          description:
            'Serviço integrado ao Moonlight Pipeline que garante o registro de mudanças para suportar o processo de auditoria dos MSs no PicPay.',
          docsUrl:
            'https://picpay.atlassian.net/jira/software/c/projects/GMUD/boards/727',
          typeInterface: 'Gestão de Mudanças',
        },
        {
          id: '56a6f1ee-b48c-4f54-937d-42b5ce41c458',
          title: 'Devx',
          description:
            'Serviço que faz as configurações necessárias para que um repositório passe a utilizar o Moonlight Pipeline.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/MOON/pages/2429453286/Migrar+servi+os+para+Moonlight+Pipeline',
          productUrl:
            'https://moonlight.limbo.work/create/templates/default/moonlight-template-update-to-argocd',
          typeInterface: 'Migração Moonlight Pipeline',
        },
        {
          id: 'd8282718-8528-41d4-a421-58afe78a48eb',
          title: 'Devx',
          description:
            'O Argo CD é uma ferramenta de entrega contínua declarativa criada especificamente para Kubernetes.',
          docsUrl: 'https://argo-cd.readthedocs.io/en/stable/',
          productUrl:
            'https://dashboard.argocd.hub.ppay.me/login?return_url=https%3A%2F%2Fdashboard.argocd.hub.ppay.me%2Fapplications%3FshowFavorites%3Dfalse%26proj%3D%26sync%3D%26health%3D%26namespace%3D%26cluster%3D%26labels%3D',
          typeInterface: 'Argo CD',
        },
        {
          id: 'd4b5dca8-3249-4808-88a4-29f4c6a5fe99',
          title: 'Devx',
          description:
            'O Tekton é um framework de código aberto nativo do Kubernetes avançado e flexível para criar pipelines de integração e entrega contínuas (CI/CD). No PicPay esta ferramenta é usada como orquestrador do processo de CI da Moonlight Pipeline',
          docsUrl: 'https://tekton.dev/docs/',
          productUrl:
            'https://dashboard.tekton.hub.ppay.me/#/namespaces/tekton-builds/pipelineruns',
          typeInterface: 'Tekton',
        },
      ],
    },
    {
      categoryType: 'QUALITY',
      categoryName: 'Quality',
      categoryTools: [
        {
          id: '2dece9ac-c51a-437b-a01b-c0edbca30a51',
          title: 'DevUp',
          description:
            'Repositório que contém as regras e os cenários dos testes de carga em serviços. Para esse serviço prestamos suporte via canal no slack #suporte-faustao',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/DUP/pages/2668560677/Faust+o+Stress+Test',
          typeInterface: 'Faustão Stress Test',
        },
        {
          id: '41a03a57-d482-4929-a14b-6b45c90a525d',
          title: 'DevUp',
          description:
            'Testes E2E de interfaces dos aplicativos Android e iOS do Picpay Para esse serviço prestamos suporte via canal no slack #suporte-mobile-tests.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/DUP/pages/2526808243/Testes+E2E+mobile+com+Appium+Mobile',
          typeInterface: 'Mobile Tests',
        },
        {
          id: 'bb8cb2f6-05ae-468e-bf1e-fbb6bb81eaca',
          title: 'DevUp',
          description:
            'Serviço responsável pela análise do Quality gate dos projetos, tais como cobertura de teste unitário. bugs e vulnerabilidades. Para esse serviço prestamos suporte via canal no slack #suporte-sonar.',
          productUrl: 'https://sonarcloud.io/projects',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/DUP/pages/2528051668/SonarCloud',
          typeInterface: 'SonarCloud',
        },
        {
          id: '3c13b3a3-b75d-49c8-9c85-0391d53eb4c1',
          title: 'DevUp',
          description:
            'Pipeline com a configuração para execução de testes na execução da build dos projetos. Para esse serviço prestamos suporte via canal no slack #suporte-ci-testes.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/DUP/pages/3083436622/CI+Testes+de+API',
          typeInterface: 'Testes Integrados backend',
        },
      ],
    },
    {
      categoryType: 'OBSERVABILITY',
      categoryName: 'Observability',
      categoryTools: [
        {
          id: 'fd5950dea-14ee-4fd2-ac4c-d8a2fd978c3a',
          title: 'O11y',
          description: 'Plataforma de observabilidade Dynatrace.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/Dynatrace/pages/3161718909/Configurando+microsservi+os+no+Dynatrace',
          productUrl: 'https://oxq68941.live.dynatrace.com',
          typeInterface: 'Dynatrace - Production',
        },
        {
          id: 'ef551e95-43de-433c-be54-49046384448c',
          title: 'O11y',
          description: 'Plataforma de observabilidade Dynatrace.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/Dynatrace/pages/3161718909/Configurando+microsservi+os+no+Dynatrace',
          productUrl: 'https://dvh67605.live.dynatrace.com',
          typeInterface: 'Dynatrace - QA',
        },

        {
          id: 'fef5a7c2-43d5-4e4e-b8b9-3c9bbd54ca0b',
          title: 'O11y',
          description: 'Logs dos microsserviços via OpenSearch.',
          productUrl: 'https://opensearch.observability.ppay.me/_dashboards',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2678554889/Logs',
          typeInterface: 'Sunlight Logs Production',
        },
        {
          id: '8d67ed39-5b22-4481-a465-d3947decdbdb',
          title: 'O11y',
          description: 'Logs dos microsserviços via OpenSearch.',
          productUrl:
            'https://o11y-logs-qa.observability.ppay.me/_dashboards/app/home/',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2678554889/Logs',
          typeInterface: 'Sunlight Logs QA',
        },
        {
          id: '993d3832-af51-46c8-9a4d-2c30db58c5aa',
          title: 'O11y',
          description: 'Traces dos microsserviços via Jaeger.',
          productUrl: 'https://jaeger.observability.ppay.me/search',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2678751589/Traces',
          typeInterface: 'Sunlight Traces Production',
        },
        {
          id: '81db28d2-a104-4462-bb42-8e8e5b9d90da',
          title: 'O11y',
          description: 'Traces dos microsserviços via Jaeger.',
          productUrl: 'https://jaeger-qa.observability.ppay.me/search',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2678751589/Traces',
          typeInterface: 'Sunlight Traces QA',
        },
        {
          id: '370db67e-20a5-4a3d-97d4-93f57f1c83f4',
          title: 'O11y',
          description:
            'Métricas, dashboards e alertas dos microsserviços via Grafana.',
          productUrl: 'https://grafana-prod-o11y.observability.ppay.me/',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2679537723/M+tricas',
          typeInterface: 'Sunlight Metrics Production',
        },
        {
          id: '19e0f8c7-6127-4297-8d0e-4981bdb70d47',
          title: 'O11y',
          description:
            'Métricas, dashboards e alertas dos microsserviços via Grafana.',
          productUrl: 'https://grafana-qa-o11y.observability.ppay.me/',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2679537723/M+tricas',
          typeInterface: 'Sunlight Metrics QA',
        },
        {
          id: '80682ffc-8856-495c-8519-569bff39e0f8',
          title: 'O11y',
          description: 'Grafana para observabilidade de infraestrutura.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2740389471/Clusters+EKS#M%C3%A9tricas',
          productUrl: 'https://grafana.observability.ppay.me/',
          typeInterface: 'Grafana Infra Production',
        },
        {
          id: 'd1b029b3-6c02-412b-985c-977de3808577',
          title: 'O11y',
          description: 'Grafana para observabilidade de infraestrutura.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/SMONITORING/pages/2740389471/Clusters+EKS#M%C3%A9tricas',
          productUrl: 'https://grafana-qa.observability.ppay.me/',
          typeInterface: 'Grafana Infra QA',
        },
      ],
    },

    {
      categoryType: 'SSO',
      categoryName: 'SSO',
      categoryTools: [
        {
          id: '1abeefc7-5d82-461c-82d9-dba36e9db0e8',
          title: 'Gatekeepers',
          description:
            'Gerenciamento de credenciais via SSO, os produtos do PP se integram com a ferramenta para oferecer login via SSO em seus produtos e serviços para usuários picpay ou usuários internos.',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/PA/pages/2737144486/SSO',
          productUrl: 'https://picpay.slack.com/archives/C02C79GSQ3C',
          typeInterface: 'SSO',
        },
      ],
    },
    {
      categoryType: 'GATEWAY',
      categoryName: 'Gateway',
      categoryTools: [
        {
          id: 'dec48f23-8799-416a-86e7-b03b154f17e7',
          title: 'Gatekeepers',
          description:
            "O gateway é a porta de entrada para as API's públicas e internas do picpay, todo micro-serviço criado deve ser cadastrado em um gateway para que suas API's sejam disponíveis para consulta de forma segura interna e externamente.",
          productUrl: 'https://github.com/PicPay/ops-kong-routes',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/PA/pages/2693497942/Gateway+3.0',
          typeInterface: 'Gateway',
        },
      ],
    },
    {
      categoryType: 'MESSAGING_EVENT',
      categoryName: 'Messaging Event',
      categoryTools: [
        {
          id: '7a5a7514-c28f-45a2-a1bf-c7a76c83d943',
          title: 'Messaging',
          description:
            'O cluster Kafka é usado para troca de mensagens (dados) entre microserviços e pra isto o dev faz uso de tópicos que são agrupamentos de mensagens/eventos dentro do kafka.',
          typeInterface: 'Tópicos Kafka',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/IC/pages/3118629320/Usabilidade+do+KP',
        },
        {
          id: '7a5a7514-c28f-45a2-a1bf-c7a76c83d943',
          title: 'Messaging',
          description:
            'O cluster Kafka é usado para troca de mensagens (dados) entre microserviços e pra isto o dev faz uso de tópicos que são agrupamentos de mensagens/eventos dentro do kafka.',
          typeInterface: 'Tópicos Kafka - Legado',
          docsUrl:
            'https://picpay.atlassian.net/wiki/spaces/IC/pages/2481784051/How-to+Kafka+topics+terraform',
        },
      ],
    },
  ];

  return tools;
}

class CustomExploreToolProvider implements CustomProvider {
  async getTools(): Promise<CustomGetExploreToolsResponse> {
    const externalTools = await queryExternalTools();

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const tools: CustomExploreTool[] = [...externalTools];

    return { tools };
  }
}

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    toolProvider: new CustomExploreToolProvider(),
  });
}
