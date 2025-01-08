import { pluginGithubPlugin } from './plugin';

describe('picpay-github', () => {
  it('should export plugin', () => {
    expect(pluginGithubPlugin).toBeDefined();
  });
});
