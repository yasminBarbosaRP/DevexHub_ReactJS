import { getVoidLogger } from '@backstage/backend-common';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { MoonlightTemplatesRepository } from '@internal/plugin-picpay-scaffolder-templates-intermediator-backend';
import { GithubRepository } from '@internal/plugin-picpay-core-components';
import * as winston from 'winston';

const mockOctokit = {
  rest: {
    repos: {
      getContent: jest.fn(),
      listCommits: jest.fn()
    },
  },
};
jest.mock('octokit', () => ({
  Octokit: class {
    constructor() {
      return mockOctokit;
    }
  },
}));


jest.mock('@internal/plugin-picpay-scaffolder-commons-backend', () => {
  return {
    GithubRepository: jest.fn().mockImplementation(() => {
      return {
        getHashes: jest.fn().mockResolvedValue([
          'mocked-hash-1',
          'mocked-hash-2',
          'mocked-hash-3',
        ]),
      };
    }),
  };
});

jest.mock('@internal/plugin-picpay-scaffolder-templates-intermediator-backend', () => {
  return {
    MoonlightTemplatesRepository: jest.fn().mockImplementation(() => {
      return {
        changeContent: jest.fn().mockResolvedValue('mocked-content'),
        getTemplate: jest.fn().mockResolvedValue({}),
        deleteByRepositoryName: jest.fn().mockResolvedValue([]),
        deleteByHashCommit: jest.fn().mockResolvedValue([]),
        updateFileMoonlightTemplates: jest.fn().mockResolvedValue(''),
      };
    }),
  };
});

jest.mock('@internal/plugin-picpay-scaffolder-templates-intermediator-backend');
jest.mock('@internal/plugin-picpay-scaffolder-commons-backend');

const mockCredentialsProvider = {
  getCredentials: jest.fn().mockResolvedValue({ headers: {} }),
} satisfies GithubCredentialsProvider;

describe('Backend Template Version CreateRouter', () => {
  let integrations: ScmIntegrations;
  let app: express.Express;

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.Console()
    ],
  });


  beforeEach(async () => {
    integrations = ScmIntegrations.fromConfig(
      new ConfigReader({
        backend: {
          baseUrl: 'http://localhost:7000'
        },
        integrations: {
          github: [
            {
              host: 'github.com',
              apps: [
                {
                  appId: 1,
                  privateKey: 'privateKey',
                  webhookSecret: '123',
                  clientId: 'CLIENT_ID',
                  clientSecret: 'CLIENT_SECRET',
                },
              ],
              token: 'hardcoded_token',
            },
            {
              host: 'grithub.com',
              token: 'hardcoded_token',
            },
          ],
        },
      }),
    );

    const router = await createRouter({
      logger: getVoidLogger(),
      config: new ConfigReader({
        backend: {
          baseUrl: 'http://localhost:7000'
        },
      }),
      integrations,
      githubCredentialsProvider: mockCredentialsProvider,
    });

    app = express().use(router);
  });

  describe('Backend Template Version GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /commit', () => {
    it('should respond with a status code of 200', async () => {
      mockOctokit.rest.repos.listCommits.mockResolvedValueOnce({ data: [] })

      const response = await request(app).post('/commit').send({
        hash: 'test-hash',
        repository: 'test-repo',
        branch: 'test-branch',
        name: 'test-name',
      });

      expect(response.statusCode).toEqual(200);
    });

    it('Should log error and send response with status 400', async () => {
      const mockError = new Error('Test error');
      const mockLogger = { error: jest.fn() };

      const mockStatus = jest.fn().mockReturnThis();
      const mockJson = jest.fn();
      const response = { status: mockStatus, json: mockJson };

      try {
        throw mockError;
      } catch (error: any) {
        mockLogger.error(`Error to update template version: ${error.message}`);
        response.status(400).json({ error: error.message });
      }

      expect(mockLogger.error).toHaveBeenCalledWith(`Error to update template version: ${mockError.message}`);
    })

    it('Should call MoonlightTemplatesRepository methods', async () => {
      const mockGetTemplate = jest.fn();
      const mockChangeContent = jest.fn();
      const mockUpdateFileMoonlightTemplates = jest.fn();
      const repository = 'test-repo';

      (MoonlightTemplatesRepository as jest.Mock).mockImplementation(() => {
        return {
          getTemplate: mockGetTemplate,
          changeContent: mockChangeContent,
          updateFileMoonlightTemplates: mockUpdateFileMoonlightTemplates,
        };
      });
      jest.spyOn(logger, 'info').mockImplementation(() => ({} as winston.Logger));

      const Octokit = jest.fn().mockImplementation();
      const githubApi = new Octokit();
      const githubRepository = new GithubRepository(githubApi);

      const moonlightTemplate = new MoonlightTemplatesRepository({
        githubRepository,
        organization: 'PicPay',
        repository,
        sha: ['test-hash'],
        listHash: ['mocked-hash-1', 'mocked-hash-2', 'mocked-hash-3'],
        logger,
      });

      const content = await moonlightTemplate.changeContent(
        await moonlightTemplate.getTemplate(),
        false
      );
      await moonlightTemplate.updateFileMoonlightTemplates(content);

      expect(MoonlightTemplatesRepository).toHaveBeenCalledWith(
        expect.objectContaining({
          githubRepository: expect.any(GithubRepository),
          organization: 'PicPay',
          repository: 'test-repo',
          sha: ['test-hash'],
          listHash: ['mocked-hash-1', 'mocked-hash-2', 'mocked-hash-3'],
          logger: expect.any(Object),
        })
      );
      expect(mockGetTemplate).toHaveBeenCalled();
      expect(mockChangeContent).toHaveBeenCalledWith(await mockGetTemplate(), false);
      expect(mockUpdateFileMoonlightTemplates).toHaveBeenCalledWith(content);
    });
  });
});