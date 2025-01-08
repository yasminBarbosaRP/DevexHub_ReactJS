import { RepositoryDetails } from '../../interfaces/githubRepository';
import { filterBy } from './filterFileByName';

const withMoonlightYAML: RepositoryDetails = {
  repository: '',
  files: [{ name: '.moonlight.yaml' }],
  settings: [],
};
const withCatalogInfo: RepositoryDetails = {
  repository: '',
  files: [{ name: 'catalog-info.yaml' }],
  settings: [],
};
const withSonarProperties: RepositoryDetails = {
  repository: '',
  files: [{ name: 'sonar.properties' }],
  settings: [],
};
const without: RepositoryDetails = {
  repository: '',
  files: [{ name: 'fake.yaml' }],
  settings: [],
};

describe('IsThereMoonlightYAML', () => {
  const mockComponents = { logger: { info: jest.fn() } };

  it('should filter .moonlight.yaml', () => {
    const filterMoonlight = filterBy('.moonlight.yaml');
    expect(filterMoonlight(mockComponents, withMoonlightYAML)).toBe(undefined);
  });

  it('should filter catalog-info.yaml', () => {
    const filterCatalogInfo = filterBy('catalog-info.yaml');
    expect(filterCatalogInfo(mockComponents, withCatalogInfo)).toBe(undefined);
  });

  it('should filter sonar.properties', () => {
    const filterSonarProperties = filterBy('sonar.properties');
    expect(filterSonarProperties(mockComponents, withSonarProperties)).toBe(
      undefined,
    );
  });

  it('should throw exception when not found a file', () => {
    for (const filename of ['./moonlight.yaml', 'catalog-info.yaml']) {
      const func = filterBy(filename);
      expect(() => func(mockComponents, without)).toThrow(
        `There is no ${filename} in this repository`,
      );
    }
  });
});
