import { RepositoryDetails } from '../../interfaces/githubRepository';

const ThereIsNoMoonlightWebhook = new Error(
  'There is no moonlight webhook configured for this repository',
);

const WEBHOOKS_URL = [
  'https://tekton-webhook.prd-hub-virginia.k8s.hub.picpay.cloud/microservices',
  'https://moonlight-pipeline-webhook.tekton.ppay.me/microservices',
];

export const isThereMoonlightWebhookConfigured = (
  components: any,
  repositoryDetails: RepositoryDetails,
) => {
  const { logger } = components;
  const webhookFilter = repositoryDetails.settings
    .filter(setting => setting.type === 'Repository')
    .filter(webhook => {
      if (webhook.config.url) {
        return WEBHOOKS_URL.includes(webhook.config.url);
      }
      return false;
    });

  logger.info(
    `There is ${webhookFilter.length} webhook created for this repository`,
  );

  if (webhookFilter.length <= 0) {
    throw ThereIsNoMoonlightWebhook;
  }
};
