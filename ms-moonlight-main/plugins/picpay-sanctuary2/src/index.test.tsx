import {
  picpaySanctuary2Plugin,
  Sanctuary2Page,
  ManagementPage,
  Management,
  Sanctuary2ApiRef,
  Sanctuary2ApiClient,
} from '.';

describe('Sanctuary2Plugin', () => {
  it('should to be defined', () => {
    expect(picpaySanctuary2Plugin).toBeDefined();
    expect(Sanctuary2Page).toBeDefined();
    expect(ManagementPage).toBeDefined();
    expect(Management).toBeDefined();
    expect(Sanctuary2ApiRef).toBeDefined();
    expect(Sanctuary2ApiClient).toBeDefined();
  });
});
