import { Settings } from '@internal/plugin-picpay-scaffolder-commons-backend';

const pipelines: any = {
  tekton: [
    'https://tekton-webhook.prd-hub-virginia.k8s.hub.picpay.cloud/microservices',
    'https://tekton-webhooks.prd-hub-east1.k8s.hub.picpay.cloud/microservices',
    'https://moonlight-pipeline-webhook.tekton.ppay.me/microservices',
  ],
  codebuild: ['https://codebuild.us-east-1.amazonaws.com/webhooks'],
  drone: ['https://drone.ppay.me/hook'],
};

export const getPipeline = (settings: Settings[]): string | string[] => {
  const discoveryPipeline: string[] = [];

  Object.keys(pipelines).forEach((pipeline: string) => {
    settings.forEach(setting => {
      if (!setting.active || setting.type !== 'Repository') {
        return;
      }

      pipelines[pipeline].forEach((url: string) => {
        if (setting.config.url && setting.config.url.split('?')[0] === url) {
          discoveryPipeline.push(pipeline);
        }
      });
    });
  });

  if (discoveryPipeline.length <= 0) {
    return 'unknown';
  }

  return [...new Set(discoveryPipeline)];
};
