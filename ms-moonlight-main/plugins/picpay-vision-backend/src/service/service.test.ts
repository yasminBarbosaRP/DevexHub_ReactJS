import {
  VisionAPIEvaluationResponse,
  VisionAPISourcesResponse,
} from '../types/api';
import { VisionCatalogContent } from '../types/domain';
import { createVisionCatalogContentResponse } from './service';

describe('createVisionCatalogContentResponse', () => {
  it('should return the BFF component correctly', () => {
    const source1 = {
      id: '1',
      name: 'katchau-001 [ms-katchau-accelerate-metrics]',
      description: 'Fake dora metrics',
      bu: 'business_unit_1',
      squad: 'squad-atlantis',
      url: 'http://127.0.0.1:28089/dora-metrics/:componentName',
      linkDoc: 'https://docs.picpay.com/',
      active: true,
      createdAt: '2023-10-04T14:27:52.952742-03:00',
      updatedAt: '2023-10-04T14:28:12.855457-03:00',
    };

    const source2 = {
      id: '2',
      name: 'katchau-002 [ms-katchau-accelerate-metrics]',
      linkDoc: 'https://docs.picpay.com/',
      description: 'Fake sonar',
      bu: 'business_unit_1',
      squad: 'squad-atlantis',
      url: 'http://127.0.0.1:28089/sonar/componentName',
      active: true,
      createdAt: '2023-10-04T14:27:52.967193-03:00',
      updatedAt: '2023-10-04T14:28:12.86984-03:00',
    };

    const source3 = {
      id: '3',
      name: 'katchau-003 [ms-katchau-accelerate-metrics]',
      description: 'Fake sonar',
      bu: 'business_unit_1',
      linkDoc: 'https://docs.picpay.com/',
      squad: 'squad-atlantis',
      url: 'http://127.0.0.1:28089/sonar/componentName',
      active: true,
      createdAt: '2023-10-04T14:27:52.967193-03:00',
      updatedAt: '2023-10-04T14:28:12.86984-03:00',
    };

    const apiEvaluationsResponse: VisionAPIEvaluationResponse = {
      id: 1,
      project: {
        id: 1,
        name: 'ms-fausthanos',
        status: 'updated',
        description:
          'Serviço responsável pelo self-gerenciamento de repositórios, infraestrutura criados pelo Moonlight',
        bu: 'business_unit_1',
        squad: 'squad-atlantis',
        active: true,
        createdAt: '2023-10-04T14:28:45.4398-03:00',
        updatedAt: '2023-10-04T14:28:49.869803-03:00',
      },
      metrics: [
        {
          id: 1,
          source: source1,
          name: 'dora_metric_1',
          description: 'name_dora_metric_1',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'required',
          pass: true,
          data: {
            value: 100.0,
            valueUnit: 'percentage',
          }
        },
        {
          id: 2,
          source: source1,
          name: 'dora_metric_2',
          description: 'name_dora_metric_2',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'optional',
          pass: true,
          data: {
            value: 80,
            valueUnit: 'number',
          }
        },
        {
          id: 3,
          source: source1,
          name: 'dora_metric_3',
          description: 'name_dora_metric_3',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'optional',
          pass: false,
          data: {
            value: 70,
            valueUnit: 'day',
          }
        },
        {
          id: 4,
          source: source2,
          name: 'sonar_1',
          description: 'name_1_description',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'required',
          pass: true,
          data: {
            value: true,
            valueUnit: 'boolean',
          }
        },
        {
          id: 5,
          source: source2,
          name: 'sonar_2',
          description: 'name_2_description',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'optional',
          pass: true,
          data: {
            value: 'SIM',
            valueUnit: 'string',
          }
        },
        {
          id: 6,
          source: source2,
          name: 'sonar_3',
          description: 'name_3_description',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'optional',
          pass: true,
          data: {
            value: 2.123,
            valueUnit: 'number_by_day',
          }
        },
        {
          id: 7,
          source: source2,
          name: 'sonar_4',
          description: 'name_4_description',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'optional',
          pass: true,
          data: {
            value: 'valor',
            valueUnit: 'unidade',
          }
        },
        {
          id: 8,
          source: source2,
          name: 'sonar_5',
          description: 'name_5_description',
          linkDoc: 'https://docs.picpay.com/',
          requirement: 'optional',
          pass: true,
          data: null,
        },
      ],
      scores: [
        {
          id: 1,
          source: source1,
          score: 100,
          pass: true,
        },
        {
          id: 2,
          source: source2,
          score: 20,
          pass: false,
        },
      ],
      score: 80,
      pass: true,
      createdAt: '2023-10-04T14:28:49.837137-03:00',
    };

    const apiSourcesResponse: VisionAPISourcesResponse = [
      source1,
      source2,
      source3,
    ];

    const expectedBFFResponse: VisionCatalogContent = {
      visionChecks: {
        behavior: 'IDLE',
        data: [
          {
            behavior: 'PASS',
            data: {
              toolId: '1',
              docsUrl: 'https://docs.picpay.com/',
              toolName: 'katchau-001 [ms-katchau-accelerate-metrics]',
              toolScore: 100,
              metrics: [
                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'dora_metric_1',
                  metricDetails: 'name_dora_metric_1',
                  status: 'PASS',
                  required: true,
                  metricValue: '100%',
                },

                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'dora_metric_2',
                  metricDetails: 'name_dora_metric_2',
                  status: 'PASS',
                  required: false,
                  metricValue: '80.00',
                },

                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'dora_metric_3',
                  metricDetails: 'name_dora_metric_3',
                  status: 'FAILED',
                  required: false,
                  metricValue: '70.00 days',
                },
              ],
            },
          },

          {
            behavior: 'FAILED',
            data: {
              toolId: '2',
              docsUrl: 'https://docs.picpay.com/',
              toolName: 'katchau-002 [ms-katchau-accelerate-metrics]',
              toolScore: 20,
              metrics: [
                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'sonar_1',
                  metricDetails: 'name_1_description',
                  status: 'PASS',
                  required: true,
                  metricValue: 'Yes',
                },
                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'sonar_2',
                  metricDetails: 'name_2_description',
                  status: 'PASS',
                  required: false,
                  metricValue: 'SIM',
                },
                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'sonar_3',
                  metricDetails: 'name_3_description',
                  status: 'PASS',
                  required: false,
                  metricValue: '2.1230/day',
                },
                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'sonar_4',
                  metricDetails: 'name_4_description',
                  status: 'PASS',
                  required: false,
                  metricValue: 'valor unidade',
                },
                {
                  metricDocUrl: 'https://docs.picpay.com/',
                  metricName: 'sonar_5',
                  metricDetails: 'name_5_description',
                  status: 'PASS',
                  required: false,
                  metricValue: undefined,
                },
              ],
            },
          },

          {
            behavior: 'DISABLED',
            data: {
              toolId: '3',
              docsUrl: 'https://docs.picpay.com/',
              toolName: 'katchau-003 [ms-katchau-accelerate-metrics]',
            },
          },
        ],
      },
      visionOverview: {
        behavior: 'DETAILED',
        data: {
          bestToolScore: {
            name: 'katchau-001 [ms-katchau-accelerate-metrics]',
            score: 100,
          },
          worstToolScore: {
            name: 'katchau-002 [ms-katchau-accelerate-metrics]',
            score: 20,
          },
          visionScore: 80,
        },
      },
    };

    const BFFResponse = createVisionCatalogContentResponse(
      apiEvaluationsResponse,
      apiSourcesResponse,
    );

    expect(BFFResponse).toEqual(expectedBFFResponse);
  });
});
