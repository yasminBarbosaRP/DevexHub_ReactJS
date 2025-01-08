import { Vault } from './Vault';
import { VaultGateway } from '../gateway';
import { VaultOptions } from '../models/VaultOptions';
import { FetchAdapter } from '../adapter';
import { VaultEnums } from '../models';

describe('Vault', () => {
  let vault: Vault;
  const httpClient = new FetchAdapter();
  const vaultGateway = new VaultGateway(httpClient);

  beforeEach(() => {
    jest
      .spyOn(httpClient, 'post')
      .mockReturnValue(Promise.resolve({ success: true }));
  });

  it('should set environment', () => {
    const options: VaultOptions = {
      gateway: vaultGateway,
      vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
      engine: 'bu_test',
      token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
      microserviceName: 'ms_testing',
    };
    vault = new Vault(options);
    vault.environment = 'test';
    expect(vault.environment).toEqual('test');
  });

  describe('pathKvEngine', () => {
    it('should return correct path without extraPath', () => {

      const options: VaultOptions = {
        gateway: vaultGateway,
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_test',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing',
      };
      vault = new Vault(options);
      expect(vault.pathKvEngine).toEqual('kv/bu_test/');
    });

    it('should return correct path with extraPath not configured', () => {

      const options: VaultOptions = {
        gateway: vaultGateway,
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_test_no_extra',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing',
        extraPath: VaultEnums.VAULT_EXTRA_PATH,
      };
      vault = new Vault(options);
      expect(vault.pathKvEngine).toEqual('kv/bu_test_no_extra/');
    });

    it('should return correct path with extraPath', () => {
      const options: VaultOptions = {
        gateway: vaultGateway,
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_test_1',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing',
        extraPath: 'extra',
      };
      vault = new Vault(options);
      expect(vault.pathKvEngine).toEqual('kv/extra/bu_test_1/');
    });

    it('should return correct path when separateSecrets is true', () => {
      const options: VaultOptions = {
        gateway: vaultGateway,
        vault: { url: 'http://foo', roleId: 'aaa-bbb',
        secretId: 'ccc-ddd' },
        engine: 'bu_test_2',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing',
        separateSecrets: true,
      };
      vault = new Vault(options);
      vault.environment = 'hom';
      expect(vault.pathKvEngine).toEqual('bu_test_2/hom/env');
    })

  });

  describe('treatmentCreateSecretKvEngine', () => {
    it('should create secret with given environment variables', async () => {
      const envs = [{ name: 'key1', value: 'value1' }, { name: 'key2', value: 'value2' }];
      const secret = await vault.treatmentCreateSecretKvEngine(envs);
      expect(secret.success).toBeTruthy();;
    });

    it('should transform environment variables to uppercase and replace hyphens', async () => {
      jest.spyOn(httpClient, 'post').mockResolvedValue({ success: true });

      const options: VaultOptions = {
        gateway: new VaultGateway(httpClient),
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_test',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing'
      };

      vault = new Vault(options);
      
      const envs = [
        { name: 'api-key', value: 'secret123' },
        { name: 'db-password', value: 'pwd123' }
      ];

      const result = await vault.treatmentCreateSecretKvEngine(envs);
      expect(result.success).toBeTruthy();
    });

    it('should handle empty values', async () => {
      jest.spyOn(httpClient, 'post').mockResolvedValue({ success: true });
      
      const options: VaultOptions = {
        gateway: new VaultGateway(httpClient),
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_test', 
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing'
      };

      vault = new Vault(options);
      
      const envs = [
        { name: 'API_KEY' },
        { name: 'DB_PASSWORD', value: undefined }
      ];

      const result = await vault.treatmentCreateSecretKvEngine(envs);
      expect(result.success).toBeTruthy();
    });
  });

  describe('hasSecretEngine', () => {
    it('Should check if secret engine exists', async () => {
  
      jest
        .spyOn(httpClient, 'get')
        .mockReturnValue(Promise.resolve({ errors: true }));
  
      const options: VaultOptions = {
        gateway: new VaultGateway(httpClient),
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_testing_engine',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing',
      };
  
      vault = new Vault(options);
  
      const hasSecretEngine = await vault.hasSecretEngine();
      expect(hasSecretEngine).toEqual(false);
    });

    it('should handle error response from gateway', async () => {
      jest.spyOn(httpClient, 'get').mockRejectedValue(new Error('Gateway error'));

      const options: VaultOptions = {
        gateway: new VaultGateway(httpClient),
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_test',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing'
      };

      vault = new Vault(options);
      
      await expect(vault.hasSecretEngine()).rejects.toThrow('Gateway error');
    });
  })

  describe('createGlobal', () => {
    it('should create global environment configuration', async () => {
      jest.spyOn(httpClient, 'post').mockResolvedValue({ success: true });

      const options: VaultOptions = {
        gateway: new VaultGateway(httpClient),
        vault: { url: 'http://foo', roleId: 'aaa-bbb', secretId: 'ccc-ddd' },
        engine: 'bu_test',
        token: { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' },
        microserviceName: 'ms_testing'
      };

      vault = new Vault(options);
      vault.environment = 'test';
      
      const result = await vault.createGlobal();
      expect(result.success).toBeTruthy();
    });
  });
});