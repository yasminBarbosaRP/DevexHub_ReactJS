import { picpayPipelineRunPlugin, PicpayPipelineRunPage } from './plugin';

describe('picpayPipelineRunPlugin', () => {
  it('should export plugin', () => {
    expect(picpayPipelineRunPlugin).toBeDefined();
  });

  it('should export page', () => {
    expect(PicpayPipelineRunPage).toBeDefined();
  });
});
