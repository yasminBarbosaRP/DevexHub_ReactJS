import { ConfigApi } from '@backstage/core-plugin-api';
import { CatalogReportClient } from './catalog';

describe('CatalogReportClient', () => {
  let configApi: ConfigApi;
  let client: CatalogReportClient;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('/api/catalog/'),
    } as unknown as ConfigApi;
    client = new CatalogReportClient({ configApi });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Should get Catalog Component', async () => {
    const mockResponse = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
      },
    };

    jest.spyOn(client, 'getCatalogComponent').mockResolvedValue(mockResponse);

    const response = await client.getCatalogComponent();

    expect(response).toEqual(mockResponse);
  });
});
