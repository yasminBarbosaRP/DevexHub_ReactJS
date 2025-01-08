import { MoonlightTemplatesRepository } from './MoonlightTemplatesRepository';
import { GithubRepository } from '@internal/plugin-picpay-core-components';
import { encode } from '@internal/plugin-picpay-core-components';
import YAML from 'js-yaml';
import * as winston from 'winston';

describe('MoonlightTemplatesRepository', () => {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.Console()
    ],
  });

  const Octokit = jest.fn().mockImplementation(() => {
    return {
      rest: {
        repos: {
          getContent: jest.fn().mockImplementation(() => {
            return {
              data: {
                content: 'YXBpVmVyc2lvbjogc2NhZmZvbGRlci5iYWNrc3RhZ2UuaW8vdjFiZXRhMwpraW5kOiBUZW1wbGF0ZQptZXRhZGF0YToKICBuYW1lOiB0ZXN0',
              },
            };
          }),
          createOrUpdateFileContents: jest.fn().mockResolvedValue({
            data: {
              name: '',
              path: '',
              content: '',
              sha: ''
            }
          })
        },
      },
      request: jest.fn().mockImplementation(() => {
        return {
          data: [{}],
        };
      }),
    };
  });
  const githubApi = new Octokit();
  const githubRepositoryMock = new GithubRepository(githubApi);

  let moonlightTemplatesRepository: MoonlightTemplatesRepository;
  let moonlightTemplate: any;
  let moonlightTemplateExpected: any;

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as winston.Logger));
    moonlightTemplateExpected = {};
    moonlightTemplate = {
      "apiVersion": "backstage.io/v1alpha1",
      "kind": "Location",
      "metadata": {
        "name": "moonlight-templates",
        "description": "Coleção de todas os templates do grupo PicPay."
      },
      "spec": {
        "type": "url",
        "targets": [
          "https://github.com/PicPay/repo-name-0/tree/8a1f6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-0/tree/abcf6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-1/tree/dfgf6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-1/tree/fcbb3419a5e943482e6643a5d8b3331ea47be174/template.yaml"
        ]
      }
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should change content by repository name', async () => {
    moonlightTemplatesRepository = new MoonlightTemplatesRepository({
      githubRepository: githubRepositoryMock,
      organization: 'mockedOrganization',
      repository: 'repo-name-1',
      sha: ['mockedSha'],
      logger,
    });

    const result = await moonlightTemplatesRepository.changeContent(moonlightTemplate);
    moonlightTemplateExpected = {
      "apiVersion": "backstage.io/v1alpha1",
      "kind": "Location",
      "metadata": {
        "name": "moonlight-templates",
        "description": "Coleção de todas os templates do grupo PicPay."
      },
      "spec": {
        "type": "url",
        "targets": [
          "https://github.com/PicPay/repo-name-0/tree/8a1f6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-0/tree/abcf6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-1/tree/mockedSha/template.yaml"
        ]
      }
    }

    const newContent = encode(YAML.dump(moonlightTemplateExpected, { lineWidth: 800 }))
    expect(result).toEqual(newContent);
  });

  it('Should change content by hash commit', async () => {
    moonlightTemplatesRepository = new MoonlightTemplatesRepository({
      githubRepository: githubRepositoryMock,
      organization: 'mockedOrganization',
      repository: 'repo-name-1',
      sha: ['test-00-11-22-33'],
      listHash: [
        'fcbb3419a5e943482e6643a5d8b3331ea47be174',
      ],
      logger,
    });

    const result = await moonlightTemplatesRepository.changeContent(moonlightTemplate, false);
    moonlightTemplateExpected = {
      "apiVersion": "backstage.io/v1alpha1",
      "kind": "Location",
      "metadata": {
        "name": "moonlight-templates",
        "description": "Coleção de todas os templates do grupo PicPay."
      },
      "spec": {
        "type": "url",
        "targets": [
          "https://github.com/PicPay/repo-name-0/tree/8a1f6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-0/tree/abcf6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-1/tree/dfgf6e76fb9957010923e5e0d4390e9e1a901e34/template.yaml",
          "https://github.com/PicPay/repo-name-1/tree/test-00-11-22-33/template.yaml"
        ]
      }
    }

    const newContent = encode(YAML.dump(moonlightTemplateExpected, { lineWidth: 800 }))
    expect(result).toEqual(newContent);
  });

  it('Should update file moonlight templates', async () => {
    jest.spyOn(githubRepositoryMock, 'createOrUpdateFile');
    jest.spyOn(githubRepositoryMock, 'getShaFromFile').mockResolvedValue('abc0123');
    await moonlightTemplatesRepository.updateFileMoonlightTemplates('mockedTemplate');

    expect(githubRepositoryMock.createOrUpdateFile).toHaveBeenCalledWith(
      'mockedOrganization',
      'moonlight-templates',
      'testing',
      'template.yaml',
      'mockedTemplate',
      'Update: Adicionando template repo-name-1',
      'abc0123'
    );
  });

  it('should get content successfully', async () => {
    jest.spyOn(githubRepositoryMock, 'getContent');
    const expected = {
      "apiVersion": "scaffolder.backstage.io/v1beta3",
      "kind": "Template",
      "metadata": {
        "name": "test"
      }
    }

    const content = await moonlightTemplatesRepository.getTemplate()

    expect(content).toEqual(expected);
    expect(githubApi.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'mockedOrganization',
      repo: 'moonlight-templates',
      path: 'template.yaml',
      ref: 'testing',
    });
  });

});