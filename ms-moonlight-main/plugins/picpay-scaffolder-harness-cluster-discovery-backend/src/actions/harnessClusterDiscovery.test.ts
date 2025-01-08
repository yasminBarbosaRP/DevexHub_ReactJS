import { ClusterDiscovery } from '../service/clusterDiscovery';
import { harnessClusterIdentidy } from './harnessClusterDiscovery';

jest.mock('../repository/github');
jest.mock('../service/clusterDiscovery');

describe('#RunningPlugin', () => {
  it('should return clusters correctly', async () => {
    const ScmIntegrations = jest.fn();
    const GithubCredentialsProvider = jest.fn().mockImplementation(() => ({
      getCredentials: jest.fn(),
    }));
    const integrations = new ScmIntegrations();
    const githubCredentials = new GithubCredentialsProvider();

    const ActionContext = jest.fn().mockImplementation(() => ({
      logger: {
        info: jest.fn(),
      },
      input: {
        serviceName: 'ms-foobar',
      },
      output: jest.fn(),
    }));
    const context = new ActionContext();

    // @ts-ignore
    ClusterDiscovery.mockImplementation(() => ({
      getClusterByEnvironment: jest.fn(),
      discover: () => ({ hom: 'picpay-ms-00', prd: 'picpay-msprod-00' }),
    }));

    const plugin = harnessClusterIdentidy(integrations, githubCredentials);
    await plugin.handler(context);

    expect(context.output).toHaveBeenCalledWith('harnessClusterIdentity', {
      hom: 'picpay-ms-00',
      prd: 'picpay-msprod-00',
    });
    expect(context.output).toHaveBeenCalledWith(
      'harnessClusterHom',
      'picpay-ms-00',
    );
    expect(context.output).toHaveBeenCalledWith(
      'harnessClusterPrd',
      'picpay-msprod-00',
    );
  });
});
