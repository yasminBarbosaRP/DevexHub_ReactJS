import { npsPlugin, NpsDialog, NpsApiRef, NpsApiClient } from '.';

describe('NpsPlugin', () => {
  it('should to be defined', () => {
    expect(npsPlugin).toBeDefined();
    expect(NpsDialog).toBeDefined();
    expect(NpsApiRef).toBeDefined();
    expect(NpsApiClient).toBeDefined();
  });
});
