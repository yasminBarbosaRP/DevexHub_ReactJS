import { Settings } from '@internal/plugin-picpay-scaffolder-commons-backend';
import { validateWebhook } from './helper';

describe('validateWebhook', () => {
  const settings: Settings[] = [
    {
      active: true,
      type: 'Repository',
      config: {
        url: 'https://github.com/repo1/webhook',
      },
    },
    {
      active: true,
      type: 'Repository',
      config: {
        url: 'https://github.com/repo2/webhook',
      },
    },
    {
      active: false,
      type: 'Repository',
      config: {
        url: 'https://github.com/repo3/webhook',
      },
    },
  ];

  test('Should return true if at least one webhook matches the active Repository setting', async () => {
    const webhooks: string[] = [
      'https://github.com/repo1/webhook',
      'https://github.com/repo2/webhook',
    ];

    const result = await validateWebhook(webhooks, settings);
    expect(result).toBe(true);
  });

  test('Should return false if no webhook matches the active Repository setting', async () => {
    const webhooks: string[] = [
      'https://github.com/repo3/webhook',
      'https://github.com/repo4/webhook',
    ];

    const result = await validateWebhook(webhooks, settings);
    expect(result).toBe(false);
  });

  test('Should return false if there are no active Repository settings', async () => {
    const inactiveSettings: Settings[] = [
      {
        active: false,
        type: 'Repository',
        config: {
          url: 'https://github.com/repo1',
        },
      },
      {
        active: false,
        type: 'Repository',
        config: {
          url: 'https://github.com/repo2',
        },
      },
    ];

    const webhooks: string[] = [
      'https://github.com/repo1/webhook',
      'https://github.com/repo2/webhook',
    ];

    const result = await validateWebhook(webhooks, inactiveSettings);
    expect(result).toBe(false);
  });
});
