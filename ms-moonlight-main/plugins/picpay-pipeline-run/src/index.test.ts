import { picpayPipelineRunPlugin, PicpayPipelineRunPage } from './plugin';
import { PipelineRunClient, PipelineRunApiRef } from './api';

describe('picpayPipelineRunPlugin', () => {
  it('should to be defined', () => {
    expect(picpayPipelineRunPlugin).toBeDefined();
  });

  it('PicpayPipelineRunPage', () => {
    expect(PicpayPipelineRunPage).toBeDefined();
  });

  it('PipelineRunClient', () => {
    expect(PipelineRunClient).toBeDefined();
  });

  it('PipelineRunApiRef', () => {
    expect(PipelineRunApiRef).toBeDefined();
  });
});
