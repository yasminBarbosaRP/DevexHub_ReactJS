import { Settings } from '@internal/plugin-picpay-scaffolder-commons-backend';
import { getPipeline } from './helper';

const webhookWithPipelineMock: Settings[] = [
  {
    active: true,
    type: 'Repository',
    config: {
      url: 'https://tekton-webhook.prd-hub-virginia.k8s.hub.picpay.cloud/microservices',
    },
  },
];

const webhookWithoutPipelineMock: Settings[] = [
  {
    type: 'Repository',
    config: {
      url: '',
    },
  },
];

describe('getPipeline', () => {
  it('Should pass when result equal tekton', () => {
    expect(getPipeline(webhookWithPipelineMock)).toEqual(['tekton']);
  });

  it('Should pass when result equal unknown', () => {
    expect(getPipeline(webhookWithoutPipelineMock)).toEqual('unknown');
  });
});
