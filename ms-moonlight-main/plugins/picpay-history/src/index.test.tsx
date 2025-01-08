import { HistoryPlugin, HistoryPage, HistoryApi, HistoryApiRef } from '.';

describe('History Plugin', () => {
  it('should to be defined', () => {
    expect(HistoryPlugin).toBeDefined();
    expect(HistoryPage).toBeDefined();
    expect(HistoryApi).toBeDefined();
    expect(HistoryApiRef).toBeDefined();
  });
});
