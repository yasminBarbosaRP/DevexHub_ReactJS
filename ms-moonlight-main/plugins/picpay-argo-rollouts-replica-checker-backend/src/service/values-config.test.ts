import yaml from 'js-yaml';
import { valuesConfig, argoRolloutChecksValues, rolloutsStringValues, addRollout, inspectForRolloutsValues, changeDepName } from './values-config';
import { RolloutsConfig } from '../domain/RolloutsConfig';
import * as winston from 'winston';


const VALUES_ENCODED = 'Z2xvYmFsOgogIGFwcF9zdGFnZTogcWEKICBpbWFnZToKICAgIHRhZzogNDEzZTZmMzM2MGY3MmIyOGExOGY2NWE3ZmUzYzU1Y2Y3ZDA0ZTAzMQogIHJlbGVhc2VOdW1iZXI6IDAKICBhcGlfcm9sZUFybjogYXJuOmF3czppYW06OjQwNDE4NzQzNjk0OTpyb2xlL21vb25saWdodC1zYQogIHdvcmtlcl9yb2xlQXJuOiBhcm46YXdzOmlhbTo6NDA0MTg3NDM2OTQ5OnJvbGUvbW9vbmxpZ2h0LXNhCiAgZXh0ZXJuYWxTZWNyZXRzOgogICAgLSBlbmFibGVkOiB0cnVlCiAgICAgIG5hbWU6IGRlZmF1bHQKICAgICAgdHlwZTogdmF1bHQKICAgICAgcmVmcmVzaEludGVydmFsOiAxbQogICAgICBtb3VudFBhdGg6IGt1YmVybmV0ZXMtZGV2ZXhwLXVzZTEtaG9tCiAgICAgIHBhdGg6IGRldmVsb3Blcl9leHBlcmllbmNlL2hvbS9zY3J0CiAgICAgIGRhdGFGcm9tOgogICAgICAgIC0gc2VjcmV0RmlsZTogbXMtbW9vbmxpZ2h0CgpwaWNwYXktbXMtdjI6CiAgYXBpczoKICAgIC0gbmFtZTogbW9vbmxpZ2h0CiAgICAgIGltYWdlOgogICAgICAgIHJlcG9zaXRvcnlVUkk6IDI4OTIwODExNDM4OS5ka3IuZWNyLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL3BpY3BheS1kZXYvbXMtbW9vbmxpZ2h0CiAgICAgIGNvbnRhaW5lclBvcnQ6IDcwMDAKICAgICAgY29tbWFuZDoKICAgICAgICAtIC91c3IvbG9jYWwvYmluL2RvY2tlci1lbnRyeXBvaW50LnNoCiAgICAgICAgLSBub2RlCiAgICAgICAgLSAnLS1tYXgtb2xkLXNwYWNlLXNpemU9ODQ4JwogICAgICBhcmdzOgogICAgICAgIC0gcGFja2FnZXMvYmFja2VuZAogICAgICAgIC0gJy0tY29uZmlnJwogICAgICAgIC0gYXBwLWNvbmZpZy55YW1sCiAgICAgICAgLSAnLS1jb25maWcnCiAgICAgICAgLSBhcHAtY29uZmlnLnFhLnlhbWwKICAgICAgd29ya2xvYWQ6IGRldmV4cAogICAgICBzcG90X3N1cHBvcnQ6IHRydWUKICAgICAgZW52RnJvbToKICAgICAgICAtIHNlY3JldFJlZjoKICAgICAgICAgICAgbmFtZTogZW52cwogICAgICBzZXJ2aWNlOgogICAgICAgIGVuYWJsZWQ6IHRydWUKICAgICAgICBwb3J0OiA4MAogICAgICAgIHRhcmdldFBvcnQ6IDcwMDAKICAgICAgaW5ncmVzczogICAgICAKICAgICAgICAtIGVuYWJsZWQ6IHRydWUKICAgICAgICAgIHR5cGU6IGluZ3Jlc3MtZGVmYXVsdC1hd3MKICAgICAgICAgIG5hbWU6IGludGVybmFsLW1zLW1vb25saWdodC1wcGF5CiAgICAgICAgICBwYXRoOiAvCiAgICAgICAgICBob3N0czoKICAgICAgICAgICAgLSBob3N0bmFtZTogbW9vbmxpZ2h0LnFhLnBwYXkubWUKICAgICAgaHBhOgogICAgICAgIGVuYWJsZWQ6IHRydWUKICAgICAgICBtaW46IDEKICAgICAgICBtYXg6IDEKICAgICAgICB0YXJnZXRDUFU6IDEwMAogICAgICBzYToKICAgICAgICBlbmFibGVkOiBmYWxzZQogICAgICBsaW1pdHNfbWVtb3J5OiAxR2kKICAgICAgcmVxdWVzdHNfbWVtb3J5OiAxR2kKICAgICAgbGltaXRzX2NwdTogMQogICAgICByZXF1ZXN0c19jcHU6IDIwbQogICAgICBoZWFsdGg6CiAgICAgICAgcGF0aDogL2hlYWx0aGNoZWNrCiAgICAgIHJlYWRpbmVzczoKICAgICAgICBpbml0aWFsRGVsYXlTZWNvbmRzOiAyMAogICAgICAgIHBlcmlvZFNlY29uZHM6IDUKICAgICAgICBzdWNjZXNzVGhyZXNob2xkOiAxCiAgICAgICAgZmFpbHVyZVRocmVzaG9sZDogMTAKICAgICAgICB0aW1lb3V0U2Vjb25kczogMTAKICAgICAgbGl2ZW5lc3M6CiAgICAgICAgaW5pdGlhbERlbGF5U2Vjb25kczogNjAKICAgICAgICBwZXJpb2RTZWNvbmRzOiA1CiAgICAgICAgc3VjY2Vzc1RocmVzaG9sZDogMQogICAgICAgIGZhaWx1cmVUaHJlc2hvbGQ6IDEwCiAgICAgICAgdGltZW91dFNlY29uZHM6IDEwCiAgICAgIHZvbHVtZXM6CiAgICAgICAgLSBuYW1lOiBnaXRodWItc2VjcmV0CiAgICAgICAgICBzZWNyZXQ6CiAgICAgICAgICAgIHNlY3JldE5hbWU6IGVudnMKICAgICAgICAgICAgaXRlbXM6CiAgICAgICAgICAgICAgLSBrZXk6IEdJVEhVQl9BUFBfUFJJVkFURV9LRVkKICAgICAgICAgICAgICAgIHBhdGg6IGdpdGh1Yi5wZW0KICAgICAgdm9sdW1lTW91bnRzOgogICAgICAgIC0gbmFtZTogZ2l0aHViLXNlY3JldAogICAgICAgICAgbW91bnRQYXRoOiAvYXBwL3NlY3JldHMKCiAgd29ya2VyczogW10KCiAgY3JvbmpvYnM6IFtd';

// Unit tests
describe('values-config', () => {
  const Octokit = jest.fn().mockImplementation(() => {
    return {
      rest: {
        repos: {
          getContent: jest.fn(),
          getBranch: jest.fn(),
          createOrUpdateFileContents: jest.fn(),
        },
        git: {
          createRef: jest.fn(),
        },
        pulls: {
          create: jest.fn(),
        }
      },
      request: jest.fn(),
    };
  });
  const rolloutsConfig = new RolloutsConfig('10m', '1/20/30/50/100', 'web', '10s', 'http://example.com', 'result == true', '30');

  describe('rolloutsStringValues', () => {
    it('should return a string with rollouts config', () => {
      const result = rolloutsStringValues(rolloutsConfig);
      expect(result).toContain('rollouts');
    });
  });

  describe('addRollout', () => {
    it('should add rollouts to api object', () => {
      const data = { 'picpay-ms-v2': { apis: [{name: 'abcd'}] } };
      const [added, updatedData] = addRollout(yaml.dump(data), rolloutsConfig);
      expect(added).toBe(true);
      expect(updatedData).toContain('rollouts');
    });
  });

  describe('inspectForRolloutsValues', () => {
    it('should parse YAML and apply rollouts as necessary', () => {
      const yamlString = 'picpay-ms-v2:\n    apis:\n    - name: "test-api"\n';
      const [needToAddRollouts, updatedYaml] = inspectForRolloutsValues(yamlString, rolloutsConfig);
      expect(needToAddRollouts).toBe(true);
      expect(updatedYaml).toContain('rollouts');
    });
  });

  describe('valuesConfig', () => {
    it('should fetch and inspect values from GitHub', async () => {
      const logger = winston.createLogger();
      const octokit = new Octokit();
      const [needToAddRollouts, _] = await valuesConfig(logger, octokit, rolloutsConfig, 'test-repo', 'chart/values.qa.yaml');
      expect(needToAddRollouts).toBe(false);
    });
  });

  describe('changeDepName', () => {
    it('should rename "picpay-ms-v2" key to "picpay-ms-v2-qa"', () => {
      const yamlData = yaml.dump({ 'picpay-ms-v2': { apis: [] } });
      const updatedYaml = changeDepName(yamlData);
      expect(updatedYaml).toContain('picpay-ms-v2-qa:');
      expect(updatedYaml).not.toContain('picpay-ms-v2:');
    });
  });

  describe('argoRolloutChecksValues', () => {
    it('should check and update values for argo rollouts', async () => {
      const logger = winston.createLogger();
      const octokit = new Octokit();
      octokit.rest.repos.getContent = jest.fn().mockResolvedValueOnce({ status: 200, data: { content: VALUES_ENCODED } });
      octokit.rest.repos.getBranch = jest.fn().mockResolvedValueOnce({ status: 200, data: { commit: { sha: "testing" } } });
      octokit.rest.git.createRef = jest.fn().mockResolvedValueOnce({ status: 200 });
      octokit.rest.repos.getContent = jest.fn().mockResolvedValueOnce({ status: 200, data: { content: VALUES_ENCODED } });
      octokit.rest.repos.createOrUpdateFileContents = jest.fn().mockResolvedValueOnce({ status: 200 });
      octokit.rest.pulls.create = jest.fn().mockResolvedValueOnce({ status: 200, data: { url: 'http://example.com', number: 1 } });
      const outputArray: [string][] = [];
      const result = await argoRolloutChecksValues(logger, octokit, rolloutsConfig, false, 'test-repo', 'chart/values.qa.yaml', outputArray);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
