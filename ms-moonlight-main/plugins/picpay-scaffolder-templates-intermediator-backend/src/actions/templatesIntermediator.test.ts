import { DefaultGithubCredentialsProvider, ScmIntegrations } from '@backstage/integration';
import { CatalogApi } from '@backstage/catalog-client';
import { ConfigReader } from '@backstage/config';
import {
  templatesIntermediatorAction,
  extraContent,
  validateOwner,
  validateTemplateName,
} from './templatesIntermediator';

jest.mock('octokit');
jest.mock('@internal/plugin-picpay-scaffolder-commons-backend');
jest.mock('../repository/MoonlightTemplatesRepository');

const mockScmIntegrations = ScmIntegrations.fromConfig(
  new ConfigReader({
    backend: {
      baseUrl: 'http://localhost:7000'
    },
    integrations: {
      github: [{ host: 'github.com', token: 'token' }],
    },
  }),
);
const mockGithubCredentialsProvider =
  DefaultGithubCredentialsProvider.fromIntegrations(mockScmIntegrations);
const mockCatalogApi = {} as CatalogApi;
describe('Scaffolder:template-intermediator', () => {
  it('Should create a template action', async () => {
    const action = templatesIntermediatorAction(mockScmIntegrations, mockGithubCredentialsProvider, mockCatalogApi);
    expect(action).toBeDefined();
    expect(action.id).toBe('moonlight:templates-intermediator');
  });

  it('Should return correct content when allowedOwners is not provided', () => {
    const result = extraContent('owner1');
    expect(result).toEqual({
      annotations: {
        'moonlight.picpay/hidden': 'true',
      },
      groupAllowedView: ['squad-atlantis', 'owner1'],
    });
  });

  it('Should return correct content when allowedOwners is provided', () => {
    const result = extraContent('owner1', ['owner2', 'owner3']);
    expect(result).toEqual({
      annotations: {
        'moonlight.picpay/hidden': 'true',
      },
      groupAllowedView: ['squad-atlantis', 'owner1', 'owner2', 'owner3'],
    });
  });

  it('Should remove duplicate owners', () => {
    const result = extraContent('owner1', ['owner1', 'owner2']);
    expect(result).toEqual({
      annotations: {
        'moonlight.picpay/hidden': 'true',
      },
      groupAllowedView: ['squad-atlantis', 'owner1', 'owner2'],
    });
  });

  it('Should throw error when templateName is different from repository name', () => {
    expect(() =>
      validateTemplateName('test', 'testing-qa', 'main'))
      .toThrow(/Branch MAIN metadata.name: testing is different from repository name: test/);
  });

  it('should not throw error when templateName is same as repository name', () => {
    expect(() => validateTemplateName('test', 'test', 'main')).not.toThrow();
  });

  it('should throw error when templateOwner is not defined', () => {
    expect(() => validateOwner('owner1')).toThrow(/Template owner is not defined/);
  });

  it('should throw error when templateOwner is different from owner', () => {
    expect(() => validateOwner('owner1', 'owner2')).toThrow(/Owner owner1 is different from template spec.owner owner2/);
  });

  it('should not throw error when templateOwner is same as owner', () => {
    expect(() => validateOwner('owner1', 'owner1')).not.toThrow();
  });
});