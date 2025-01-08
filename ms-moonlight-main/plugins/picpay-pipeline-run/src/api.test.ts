import { PipelineRunApiRef } from './api';

describe('api', () => {
  it('api ref exists', () => {
    expect(PipelineRunApiRef.id).toBe('pipeline-run-api');
  });
});
