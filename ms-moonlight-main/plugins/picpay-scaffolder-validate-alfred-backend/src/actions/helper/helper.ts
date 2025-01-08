import { Settings } from '@internal/plugin-picpay-scaffolder-commons-backend';

export const validateWebhook = async (
  webhook: string[],
  settings: Settings[],
): Promise<boolean> => {
  let alfredWebhook: number = 0;

  webhook.forEach((link: string) => {
    settings.forEach(setting => {
      if (!setting.active || setting.type !== 'Repository') {
        return;
      }

      if (setting?.config?.url && setting.config.url.includes(link)) {
        alfredWebhook++;
      }
    });
  });

  return !!alfredWebhook;
};
