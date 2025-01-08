import { manageTemplateVersionPlugin } from './plugin';

describe('picpay-manage-template-version', () => {
  it('should export plugin', () => {
    expect(manageTemplateVersionPlugin).toBeDefined();
  });
});