import { MockFetchApi, setupRequestMockHandlers } from '@backstage/test-utils';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ToolsClient } from './ToolsClient';
import {
  CustomExploreTool,
  CustomGetExploreToolsResponse,
} from '@internal/plugin-picpay-tools-backend';

const server = setupServer();

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('ToolsClient', () => {
  setupRequestMockHandlers(server);

  const mockBaseUrl = 'http://localhost/api/tools';
  const discoveryApi = { getBaseUrl: async () => mockBaseUrl };
  const fetchApi = new MockFetchApi();

  let client: ToolsClient;
  beforeEach(() => {
    client = new ToolsClient({ discoveryApi, fetchApi });
  });

  describe('getTools', () => {
    const mockTools: CustomExploreTool[] = [
      {
        categoryName: 'TYPE',
        categoryType: 'TYPE',
        categoryTools: [
          {
            id: 'aaa-aaa',
            title: 'Tool 1',
            description: 'Description 1',
            productUrl: 'https://example1.com/',
            typeInterface: 'Type 1',
          },
          {
            id: 'bbb-bbb',
            title: 'Tool 2',
            description: 'Description 2',
            productUrl: 'https://example2.com',
            typeInterface: 'Type 2',
          },
        ],
      },
    ];

    it('should fetch data from the tools-backend', async () => {
      const expectedResponse: CustomGetExploreToolsResponse = {
        tools: mockTools,
      };

      server.use(
        rest.get(`${mockBaseUrl}`, (_, res, ctx) =>
          res(ctx.json(expectedResponse)),
        ),
      );

      const response = await client.getTools();
      expect(response).toEqual(expectedResponse);
    });

    it('should request explore tools with specific filters', async () => {
      const expectedResponse: CustomGetExploreToolsResponse = {
        tools: mockTools,
      };

      server.use(
        rest.get(`${mockBaseUrl}`, (req, res, ctx) => {
          expect(req.url.search).toBe('?tag=a&tag=b&lifecycle=alpha');
          return res(ctx.json(expectedResponse));
        }),
      );

      const response = await client.getTools({
        filter: { tags: ['a', 'b'], lifecycle: ['alpha'] },
      });
      expect(response).toEqual(expectedResponse);
    });
  });

  describe('when using CustomExploreToolsConfig for backwards compatibility', () => {
    const mockCustomExploreToolsConfig = {
      getTools: jest.fn(),
    };

    beforeEach(() => {
      client = new ToolsClient({
        discoveryApi,
        fetchApi,
        customExploreToolsConfig: mockCustomExploreToolsConfig,
      });
    });

    it('should return data from the deprecated api', async () => {
      mockCustomExploreToolsConfig.getTools.mockResolvedValue([
        {
          title: 'Some Tool',
          image: 'https://example.com/image.png',
          url: 'https://example.com',
        },
      ]);

      await client.getTools();
      expect(mockCustomExploreToolsConfig.getTools).toHaveBeenCalled();
    });
  });
});
