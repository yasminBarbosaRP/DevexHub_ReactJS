import { RepositoryDetails } from '../../interfaces/githubRepository';
import { isThereMoonlightWebhookConfigured } from './moonlightWebhookPolicy';

const buildWebhook = (host: string): RepositoryDetails => {
  return {
    repository: 'ms-fake-service',
    files: [],
    settings: [
      {
        type: 'Repository',
        config: {
          url: host,
        },
      },
    ],
  };
};

const withNewWebhook: RepositoryDetails = buildWebhook(
  'https://moonlight-pipeline-webhook.tekton.ppay.me/microservices',
);
const withWebhook: RepositoryDetails = buildWebhook(
  'https://tekton-webhook.prd-hub-virginia.k8s.hub.picpay.cloud/microservices',
);
const withoutWebhook: RepositoryDetails = buildWebhook('fake');

describe('IsThereMoonlightYAML', () => {
  const mockComponents = { logger: { info: jest.fn() } };

  it('should pass when there is .moonlight.yaml', () => {
    expect(isThereMoonlightWebhookConfigured(mockComponents, withWebhook)).toBe(
      undefined,
    );
    expect(
      isThereMoonlightWebhookConfigured(mockComponents, withNewWebhook),
    ).toBe(undefined);
  });

  it('should throw error when there is no .moonlight.yaml', () => {
    expect(() =>
      isThereMoonlightWebhookConfigured(mockComponents, withoutWebhook),
    ).toThrow('There is no moonlight webhook configured for this repository');
  });
});
