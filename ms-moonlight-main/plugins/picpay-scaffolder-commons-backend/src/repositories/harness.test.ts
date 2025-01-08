import HarnessRepository from './harness';

const postEnvironmentsIdsByServiceName = {
  post: jest.fn().mockImplementation(async () => {
    return {
      body: {
        data: {
          applicationByName: {
            environments: {
              nodes: [
                { name: 'prod', type: 'PROD', id: 'qwe123' },
                { name: 'qa', type: 'NON_PROD', id: '123qwe' },
              ],
            },
          },
        },
      },
    };
  }),
};

const postEnvironmentDetailsById = {
  post: jest.fn().mockImplementation(async () => {
    return {
      body: {
        data: {
          environment: {
            infrastructureDefinitions: {
              nodes: [
                { name: 'k8s-fmktpl-prd', id: 'C8-hyAnARee762s7ucz7mA' },
                { name: 'k8s-prod', id: 'IBVaXeykTdKXFOj_N2fNwg' },
              ],
            },
          },
        },
      },
    };
  }),
};

describe('#HarnessRepository', () => {
  it('should initialize', () => {
    const client = jest.fn();
    const harnessRepository = new HarnessRepository(client);

    expect(harnessRepository).toBeDefined();
  });

  it('should get environments by id successfully', async () => {
    const serviceName: string = 'ms-fake-service';
    const harnessAPI = new HarnessRepository(postEnvironmentsIdsByServiceName);
    const response = await harnessAPI.getEnvironmentIdsBy(serviceName);

    expect(response).toEqual([
      { name: 'prod', id: 'qwe123' },
      { name: 'qa', id: '123qwe' },
    ]);
  });

  it('should get environments details by service name successfully', async () => {
    const environmentId: string = 'qwe123';
    const harnessAPI = new HarnessRepository(postEnvironmentDetailsById);
    const response = await harnessAPI.getEnvironmentDetailsBy(environmentId);

    expect(response).toEqual([
      { name: 'k8s-fmktpl-prd', id: 'C8-hyAnARee762s7ucz7mA' },
      { name: 'k8s-prod', id: 'IBVaXeykTdKXFOj_N2fNwg' },
    ]);
  });

  it('should throw error when service name is empty', async () => {
    const mockHttpClient = jest.fn();
    const harnessAPI = new HarnessRepository(mockHttpClient);

    await expect(harnessAPI.getEnvironmentIdsBy('')).rejects.toThrow(
      "The service name shouldn't be empty.",
    );
  });

  it('should get error type when application does not exists', async () => {
    const mockHttpClient = jest.fn();
    const harnessAPI = new HarnessRepository(mockHttpClient);

    await expect(
      harnessAPI.getEnvironmentIdsBy('ms-fake-service'),
    ).rejects.toThrow('The application ms-fake-service does not exists');
  });
});
