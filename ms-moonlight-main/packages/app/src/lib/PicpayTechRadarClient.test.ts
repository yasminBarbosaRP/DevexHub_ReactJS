import { PicpayTechRadarClient } from './PicpayTechRadarClient';
import fetchMock from 'jest-fetch-mock';

const MOCK = {
  rings: [
    {
      id: 'adopt',
      name: 'ADOPT',
      color: '#93c47d',
    },
    {
      id: 'trial',
      name: 'TRIAL',
      color: '#93d2c2',
    },
    {
      id: 'assess',
      name: 'ASSESS',
      color: '#fbdb84',
    },
    {
      id: 'hold',
      name: 'HOLD',
      color: '#efafa9',
    },
  ],
  quadrants: [
    {
      id: 'techniques',
      name: 'Techniques',
    },
    {
      id: 'languages',
      name: 'Languages and Frameworks',
    },
    {
      id: 'tools',
      name: 'Tools',
    },
    {
      id: 'platforms',
      name: 'Platforms',
    },
  ],
  entries: [
    {
      timeline: [
        {
          moved: 0,
          ringId: 'adopt',
          date: new Date('2023-03-03T00:00:00.000Z'),
        },
      ],
      url: 'https://picpay.atlassian.net/wiki/spaces/DevEX/pages/2330755610',
      key: 'tekton',
      id: 'tekton',
      title: 'Tekton',
      quadrant: 'platforms',
      description:
        'O Tekton é o framework usado para criação da Moonlight Pipeline, como solução de CI (continuous integration) da instituição, onde basicamente todos os elementos são objetos do Kubernetes',
      license: 'Open Source',
      version: '',
      links: [
        {
          url: 'https://picpay.atlassian.net/wiki/spaces/DevEX/pages/2330755610',
          title: 'Documentação',
        },
        {
          url: 'https://tekton.dev/',
          title: 'Site',
        },
      ],
    },
  ],
};

const Config = jest.fn().mockImplementation(() => {
  return {
    getString: jest.fn().mockImplementation(() => {
      return '/api/github/file/arqr-tech-radar/data.json';
    }),
  };
});

const IdentityApi = jest.fn().mockImplementation(() => {
  return {
    getCredentials: jest.fn().mockImplementation(() => {
      return { token: 'mockToken' };
    }),
  };
});

describe('should fetch file from github', () => {
  it('should fetch with sucess', async () => {
    // @ts-ignore
    fetchMock.enableMocks();
    fetchMock.mockResponseOnce(JSON.stringify(MOCK));

    const config = new Config();
    const identityApi = new IdentityApi();
    const picpayTechRadarClient = PicpayTechRadarClient.fromConfig(
      config,
      identityApi,
    );
    const response = await picpayTechRadarClient.load('1');
    expect(response).toEqual(MOCK);
    fetchMock.mockClear();
  });

  it('should fetch with error', async () => {
    // @ts-ignore
    fetchMock.enableMocks();
    const error = new Error('An unexpected error occurred.');
    fetchMock.mockRejectedValue(error);

    const config = new Config();
    const identityApi = new IdentityApi();

    const picpayTechRadarClient = PicpayTechRadarClient.fromConfig(
      config,
      identityApi,
    );
    await expect(picpayTechRadarClient.load('1')).rejects.toThrow(error);
    fetchMock.mockClear();
  });
});
