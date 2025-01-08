import { ConfigApi } from '@backstage/core-plugin-api';
import { EntityRefreshState } from './refreshState';

describe('EntityRefreshState', () => {
  let configApi: ConfigApi;
  let entityRefreshState: EntityRefreshState;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('http://localhost'),
    } as unknown as ConfigApi;
    entityRefreshState = new EntityRefreshState(configApi);
  });

  it('should get entity refresh state', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve([{ state: 'refreshed' }]),
      } as Response),
    );

    const result = await entityRefreshState.getEntityRefreshState('entityRef', 'desc', 5);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost/api/catalog/entities/refresh-state?entity_ref=entityRef&order=desc&limit=5',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );
    expect(result).toEqual([{ state: 'refreshed' }]);
    fetchMock.mockRestore();
  });
});