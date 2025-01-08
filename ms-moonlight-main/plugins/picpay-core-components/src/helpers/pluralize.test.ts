import { pluralize } from './pluralize';

describe('pluralize', () => {
  it('should return the singular form when count is 1', () => {
    expect(pluralize('apple', 1)).toBe('apple');
  });

  it('should return the plural form when count is not 1', () => {
    expect(pluralize('apple', 0)).toBe('apples');
    expect(pluralize('apple', 2)).toBe('apples');
  });

  it('should use the provided plural suffix when count is not 1', () => {
    expect(pluralize('index', 2, 'ices')).toBe('indexices');
  });
});