import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  VaultConfig,
  VaultOptions,
  FetchAdapter,
  VaultGateway,
  Vault,
  VaultAuth,
} from '@internal/plugin-picpay-vault-backend';
import { Config } from '@backstage/config';

export const createVaultAction = (config: Config) => {
  return createTemplateAction<{
    serviceName: string;
    bu: string;
    environments: string[];
    envs: { name: string; value?: string }[];
    vaultRegion: string;
    vaultExtraPath: string;
    separateSecrets: boolean;
  }>({
    id: 'moonlight:vault',
    schema: {
      input: {
        required: ['serviceName', 'bu', 'environments', 'envs'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'Service Name',
            description: 'Service Name',
          },
          bu: {
            type: 'string',
            title: 'BU`s Name',
            description: 'BU`s Name',
          },
          environments: {
            type: 'array',
            title: 'Environments',
            description: 'Environments to be deployed',
            minItems: 1,
            items: {
              type: 'string',
            },
          },
          envs: {
            type: 'array',
            title: 'Envs',
            description: 'Environment variables to be added',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  title: 'Name',
                  description:
                    'Variable name. If it already exists, only the new association will be made, otherwise it will be created.',
                },
                value: {
                  type: 'string',
                  title: 'Alias',
                  description: 'Variable value to be created.',
                },
              },
            },
            vaultRegion: {
              type: 'string',
              title: 'Vault Region',
              description: 'Vault Region',
            },
            vaultExtraPath: {
              type: 'string',
              title: 'Vault Extra Path',
              description: 'Vault Extra Path',
            },
            separateSecrets: {
              type: 'boolean',
              title: 'Separate Secrets',
              description: 'Separate Secrets',
            },
          },
        },
      },
    },
    async handler(ctx) {
      const {
        serviceName,
        environments,
        bu,
        envs,
        vaultRegion,
        vaultExtraPath,
        separateSecrets
      } = ctx.input;

      const vaultCfg = config.getConfig('vault');
      const vaultConfRegion = vaultCfg.getConfig(vaultRegion ?? 'vus');

      ctx.logger.info(`Vault Region: ${vaultRegion}`);
      ctx.logger.info(`Vault Extra Path: ${vaultExtraPath}`);
      ctx.logger.info(`Vault URL: ${vaultConfRegion.get('url')}`);
      ctx.logger.info(`Vault SeparateSecrets: ${separateSecrets.toString()}`);

      const url: string = `${vaultConfRegion.get('url')}/${vaultConfRegion.get(
        'apiVersion',
      )}`;
      const httpClient = new FetchAdapter();
      const gateway = new VaultGateway(httpClient);
      const vaultConfig: VaultConfig = {
        url,
        roleId: String(vaultConfRegion.get('role_id')),
        secretId: String(vaultConfRegion.get('secret_id')),
      };

      // auth
      const vautAuth = new VaultAuth(gateway, vaultConfig);
      await vautAuth.auth();

      const options: VaultOptions = {
        gateway: gateway,
        vault: vaultConfig,
        extraPath: vaultExtraPath,
        engine: bu,
        token: vautAuth.token,
        microserviceName: serviceName,
        separateSecrets,
      };

      const vault = new Vault(options);

      for await (const stage of environments) {
        try {
          vault.environment = stage;
          await vault.createGlobal();
          const hasSecretEngine = await vault.hasSecretEngine();

          if (!hasSecretEngine) {
            ctx.logger.warning(
              `This engine path does not exist, please looking the SEC Team to create path on Vault for ${bu} and ${stage} environment.`,
            );
            continue;
          }

          ctx.logger.info(
            `Creating secret path for ${serviceName}`,
          );

          vault.environment = stage;
          await vault.treatmentCreateSecretKvEngine(envs);
        } catch (e) {
          ctx.logger.info(e);
        }
      }
    },
  });
};
