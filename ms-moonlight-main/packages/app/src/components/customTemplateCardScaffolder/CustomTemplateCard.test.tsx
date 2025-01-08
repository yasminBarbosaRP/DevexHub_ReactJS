import { ScmIntegrationsApi } from '@backstage/integration-react';
import { ConfigReader } from '@backstage/core-app-api';
import { getEntitySourceLocation } from '@backstage/plugin-catalog-react';
import {
  validateCanViewRestrictedTemplate,
  handleSourceLocation,
} from './CustomTemplateCard';

jest.mock('@backstage/plugin-catalog-react', () => ({
  getEntitySourceLocation: jest.fn(),
}));

describe('handleSourceLocation', () => {
  it('Should handle locationTargetUrl correctly', () => {
    const scmIntegrationsApiMock = ScmIntegrationsApi.fromConfig(
      new ConfigReader({
        integrations: {},
      }),
    );

    let template = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Template',
      metadata: {
        name: 'test-qa',
      },
      spec: {
        owner: 'squad-test'
      }
    };

    (getEntitySourceLocation as jest.Mock).mockReturnValue({
      locationTargetUrl: 'https://test.com/tree/aaabbccc',
    });

    let result = handleSourceLocation(template, scmIntegrationsApiMock);
    expect(result?.locationTargetUrl).toBe('https://test.com/tree/qa');

    template = {
      ...template,
      metadata: {
        name: 'test',
      },
    };

    (getEntitySourceLocation as jest.Mock).mockReturnValue({
      locationTargetUrl: 'https://test.com/tree/eeebbbcc',
    });

    result = handleSourceLocation(template, scmIntegrationsApiMock);
    expect(result?.locationTargetUrl).toBe('https://test.com/tree/main');
  });

  it('Should return a url without changing', () => {
    const scmIntegrationsApiMock = ScmIntegrationsApi.fromConfig(
      new ConfigReader({
        integrations: {},
      }),
    );

    let template = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Template',
      metadata: {
        name: 'test-qa',
      },
      spec: {
        owner: 'squad-test'
      }
    };

    (getEntitySourceLocation as jest.Mock).mockReturnValue({
      locationTargetUrl: 'https://test.com/tree/qa',
    });

    let result = handleSourceLocation(template, scmIntegrationsApiMock);
    expect(result?.locationTargetUrl).toBe('https://test.com/tree/qa');

    template = {
      ...template,
      metadata: {
        name: 'test',
      },
    };

    (getEntitySourceLocation as jest.Mock).mockReturnValue({
      locationTargetUrl: 'https://test.com/tree/main',
    });

    result = handleSourceLocation(template, scmIntegrationsApiMock);
    expect(result?.locationTargetUrl).toBe('https://test.com/tree/main');
  });
});


describe('validateCanViewRestrictedTemplate', () => {
  it('should return true when user has permission', () => {
    const groupsAllowed = ['group1', 'group2'];
    const userGroups = [
      {
        label: 'group1',
        ref: 'group:default/group1', 
        type: 'squad', 
        children: ['ref-4'], 
        isOwnerOfEntities: false
      },
      {
        label: 'group3',
        ref: 'group:default/group3', 
        type: 'squad', 
        children: ['ref-4'], 
        isOwnerOfEntities: false
      },
    ];

    const result = validateCanViewRestrictedTemplate(groupsAllowed, userGroups);

    expect(result).toBe(true);
  });

  it('should return false when user does not have permission', () => {
    const groupsAllowed = ['group3'];
    const userGroups = [
      {
        label: 'group1',
        ref: 'group:default/group1', 
        type: 'squad', 
        children: ['ref-4'], 
        isOwnerOfEntities: false
      },
      {
        label: 'group2',
        ref: 'group:default/group2', 
        type: 'squad', 
        children: ['ref-4'], 
        isOwnerOfEntities: false
      },
    ];

    const result = validateCanViewRestrictedTemplate(groupsAllowed, userGroups);

    expect(result).toBe(false);
  });

  it('should return false when no groups are allowed', () => {
    const groupsAllowed: string[] = [];
    const userGroups = [
      {
        label: 'group1',
        ref: 'group:default/group1', 
        type: 'squad', 
        children: ['ref-4'], 
        isOwnerOfEntities: false
      },
      {
        label: 'group2',
        ref: 'group:default/group2', 
        type: 'squad', 
        children: ['ref-4'], 
        isOwnerOfEntities: false
      },
    ];

    const result = validateCanViewRestrictedTemplate(groupsAllowed, userGroups);

    expect(result).toBe(false);
  });

  it('should return false when user groups are null', () => {
    const groupsAllowed = ['group1', 'group2'];
    const userGroups = null;

    const result = validateCanViewRestrictedTemplate(groupsAllowed, userGroups);

    expect(result).toBe(false);
  });

  it('should return false when no groups are allowed and user groups are null', () => {
    const groupsAllowed: string[] = [];
    const userGroups = null;

    const result = validateCanViewRestrictedTemplate(groupsAllowed, userGroups);

    expect(result).toBe(false);
  });
});