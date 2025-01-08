import {
  isHelmchartsVersionAvailable,
  checkVersionIsAvailable,
} from './helmchartVersionPolicy';

describe('checkVersionIsAvailable', () => {
  it('should compare successfully', () => {
    expect(checkVersionIsAvailable('0.12.0', '0.18.0')).toBeFalsy();
    expect(checkVersionIsAvailable('0.10.0', '0.10.0')).toBeTruthy();
    expect(checkVersionIsAvailable('0.46.0', '0.18.0')).toBeTruthy();
    expect(checkVersionIsAvailable('0.16.0', '0.18.0')).toBeFalsy();
  });
});

describe('#isHelmchartsVersionAvailable', () => {
  const mockComponents: any = { logger: { info: jest.fn() } };

  it('should helmchart in valid version', async () => {
    const mockGithubServices = {
      getFileContents: jest.fn().mockImplementation(() => {
        return 'YXBpVmVyc2lvbjogdjIKbmFtZTogbXMtYm5wbC1jb250cmFjdHMKZGVzY3Jp\ncHRpb246IEEgSGVsbSBjaGFydCBmb3IgS3ViZXJuZXRlcwp0eXBlOiBhcHBs\naWNhdGlvbgp2ZXJzaW9uOiAwLjEuMAphcHBWZXJzaW9uOiAxLjE2LjIKCmRl\ncGVuZGVuY2llczoKICAtIG5hbWU6IHBpY3BheS1tcwogICAgdmVyc2lvbjog\nJz49MC41NC4wJwogICAgcmVwb3NpdG9yeTogZmlsZTovLy4uLy4uL2NoYXJ0\ncy9waWNwYXktbXMK\n';
      }),
    };

    mockComponents.githubService = mockGithubServices;

    const isAvailable = await isHelmchartsVersionAvailable(
      mockComponents,
      'ms-fake-service',
    );

    expect(isAvailable).toBeTruthy();
    expect(mockGithubServices.getFileContents).toHaveBeenCalledWith(
      'picpay',
      'helm-charts',
      'services/ms-fake-service/Chart.yaml',
    );
  });

  it('should helmchart in not valid version', async () => {
    const mockGithubServices = {
      getFileContents: jest.fn().mockImplementation(() => {
        return 'YXBpVmVyc2lvbjogdjIKbmFtZTogbXMtYm5wbC1jb250cmFjdHMKZGVzY3JpcHRpb246IEEgSGVsbSBjaGFydCBmb3IgS3ViZXJuZXRlcwp0eXBlOiBhcHBsaWNhdGlvbgp2ZXJzaW9uOiAwLjEuMAphcHBWZXJzaW9uOiAxLjE2LjIKCmRlcGVuZGVuY2llczoKICAtIG5hbWU6IHBpY3BheS1tcwogICAgdmVyc2lvbjogJz49MC4xNi4wJwogICAgcmVwb3NpdG9yeTogZmlsZTovLy4uLy4uL2NoYXJ0cy9waWNwYXktbXMK';
      }),
    };

    mockComponents.githubService = mockGithubServices;

    const isAvailable = await isHelmchartsVersionAvailable(
      mockComponents,
      'ms-fake-service',
    );

    expect(isAvailable).toBeFalsy();
    expect(mockGithubServices.getFileContents).toHaveBeenCalledWith(
      'picpay',
      'helm-charts',
      'services/ms-fake-service/Chart.yaml',
    );
  });

  it('should not throw exception when has a lot of dependencies on helmcharts', async () => {
    const mockGithubServices = {
      getFileContents: jest.fn().mockImplementation(() => {
        return 'YXBpVmVyc2lvbjogdjIKbmFtZTogbXMtYm5wbC1jb250cmFjdHMKZGVzY3JpcHRpb246IEEgSGVsbSBjaGFydCBmb3IgS3ViZXJuZXRlcwp0eXBlOiBhcHBsaWNhdGlvbgp2ZXJzaW9uOiAwLjEuMAphcHBWZXJzaW9uOiAxLjE2LjIKCmRlcGVuZGVuY2llczoKICAtIG5hbWU6IHBpY3BheS1tcy0yCiAgICB2ZXJzaW9uOiAnPj0wLjE2LjAnCiAgICByZXBvc2l0b3J5OiBmaWxlOi8vLi4vLi4vY2hhcnRzL3BpY3BheS1tcyIKICAtIG5hbWU6IHBpY3BheS1tcwogICAgdmVyc2lvbjogJz49MC4xNi4wJwogICAgcmVwb3NpdG9yeTogZmlsZTovLy4uLy4uL2NoYXJ0cy9waWNwYXktbXMiCg==';
      }),
    };

    mockComponents.githubService = mockGithubServices;

    await expect(
      isHelmchartsVersionAvailable(mockComponents, 'ms-fake-service'),
    ).toBeTruthy();
    expect(mockGithubServices.getFileContents).toHaveBeenCalledWith(
      'picpay',
      'helm-charts',
      'services/ms-fake-service/Chart.yaml',
    );
  });

  it('should not found picpay-ms as dependencies on helmcharts', async () => {
    const mockGithubServices = {
      getFileContents: jest.fn().mockImplementation(() => {
        return 'YXBpVmVyc2lvbjogdjIKbmFtZTogbXMtYm5wbC1jb250cmFjdHMKZGVzY3JpcHRpb246IEEgSGVsbSBjaGFydCBmb3IgS3ViZXJuZXRlcwp0eXBlOiBhcHBsaWNhdGlvbgp2ZXJzaW9uOiAwLjEuMAphcHBWZXJzaW9uOiAxLjE2LjIKCmRlcGVuZGVuY2llczoKICAtIG5hbWU6IHBpY3BheS1tcy12MgogICAgdmVyc2lvbjogJz49MC4xNi4wJwogICAgcmVwb3NpdG9yeTogZmlsZTovLy4uLy4uL2NoYXJ0cy9waWNwYXktbXMiCg==';
      }),
    };

    mockComponents.githubService = mockGithubServices;

    await expect(
      isHelmchartsVersionAvailable(mockComponents, 'ms-fake-service'),
    ).toBeTruthy();
    expect(mockGithubServices.getFileContents).toHaveBeenCalledWith(
      'picpay',
      'helm-charts',
      'services/ms-fake-service/Chart.yaml',
    );
  });
});
