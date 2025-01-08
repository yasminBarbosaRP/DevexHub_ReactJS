import { EntityProperty } from './EntityProperty';
import { CatalogApi } from '@backstage/catalog-client';
import { Logger } from 'winston';

describe('EntityProperty', () => {
  let catalogApi: CatalogApi;
  let entityProperty: EntityProperty;
  let logger: Logger;

  beforeEach(() => {
    catalogApi = {
      getEntities: jest.fn(),
    } as unknown as CatalogApi;
    logger = new Logger(); //
    entityProperty = new EntityProperty({ catalog: catalogApi, logger: logger });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should not has Entity', async () => {
    const spy = jest
      .spyOn(entityProperty as any, 'getEntities')
      .mockResolvedValue([]);

    const result = await entityProperty.hasEntity('test-component-id');

    expect(result).toBe(false);
    spy.mockRestore();
  });
  it('Should has Entity', async () => {
    const spy = jest
      .spyOn(entityProperty as any, 'getEntities')
      .mockResolvedValue(['entity1', 'entity2', 'entity3']);

    const result = await entityProperty.hasEntity('test-component-id');

    expect(result).toBe(true);
    spy.mockRestore();
  });

  it('Should get Owner', async () => {
    const mockEntities = [
      {
        relations: [
          {
            type: 'ownedBy',
            target: { name: 'test-owner' },
            targetRef: 'test-group',
          },
        ],
      },
    ];

    const spy = jest
      .spyOn(entityProperty as any, 'getEntities')
      .mockResolvedValue(mockEntities);

    const result = await entityProperty.getOwner('test-component-id', 'test-kind');
    expect(result).toEqual({ owner: 'test-owner', group: 'test-group' });
    spy.mockRestore();
  });

  it('get Members Group', async () => {
    const mockEntities = [
      {
        metadata: {
          name: 'test-member1',
        },
        spec: {
          github: {
            login: 'test-member1'
          }
        }
      },
      {
        metadata: {
          name: 'test-member2',
        },
        spec: {
          github: {
            login: 'test-member2'
          }
        }
      },
    ];
    const spy = jest
      .spyOn(entityProperty as any, 'getEntities')
      .mockResolvedValue(mockEntities);

    const result = await entityProperty.getMembersGroup('test-owner');
    expect(result).toEqual(['test-member1', 'test-member2']);
    spy.mockRestore();
  });

  it('get Reviewers by Group', async () => {
    const mockEntities = [
      {
        metadata: { name: 'test-reviewer1' },
        spec: {
          profile: {
            email: 'test1@picpay.com',
            display: 'display-test'
          },
          github: {
            login: 'test-reviewer1'
          }
        }
      },
      {
        metadata: { name: 'test-reviewer2' },
        spec: {
          profile: {
            email: 'test2@picpay.com',
            display: 'display-test2'
          },
          github: {
            login: 'test-reviewer2'
          }
        }
      }
    ];

    const spy = jest
      .spyOn(entityProperty as any, 'getEntities')
      .mockResolvedValue(mockEntities);

    const result = await entityProperty.getReviewersByGroup('test-owner');
    expect(result).toEqual([
      { githubProfile: 'test-reviewer1', email: 'test1@picpay.com' },
      { githubProfile: 'test-reviewer2', email: 'test2@picpay.com' }
    ]);
    spy.mockRestore();
  });
});
