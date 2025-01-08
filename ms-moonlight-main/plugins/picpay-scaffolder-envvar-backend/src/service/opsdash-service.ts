import got, { HTTPError } from 'got';
import { Logger } from 'winston';

const ssoHost = 'sso2.picpay.com';
const baseUrl = process.env.OPSDASH_BASE_URL;
const clientId = process.env.KEYCLOAK_CLIENT_ID;
const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

/**
 * @deprecated This function will be removed in a future release
 */
export async function createAndAssocieteEnvs(
  opsdash: OpsdashHelper,
  logger: Logger,
  serviceName: string,
  stage: string,
  envs: { name: string; alias: string; value?: string }[],
) {
  for await (const env of envs) {
    const svcEnvName = env.name.toUpperCase().replace(/-/g, '_');
    const svcEnvAlias = env.alias.toUpperCase();
    const envExist = await opsdash.checkIfEnvExists(stage, svcEnvName);

    logger.info(
      `Criando e associando env ${svcEnvName} ao serviço ${serviceName} com alias ${svcEnvAlias} feita com sucesso.`,
    );

    if (env.value === undefined) {
      if (envExist) {
        await opsdash.associateEnv(stage, serviceName, svcEnvName, svcEnvAlias);
        logger.info(
          `Associação entre env ${svcEnvName} e serviço ${serviceName} feita com sucesso.`,
        );
        continue;
      }

      logger.info(
        `Não é possível criar a variável ${env.name} pois não foi informado um valor para a mesma.`,
      );
      continue;
    }

    if (!envExist) {
      logger.info(`Variável ${svcEnvName} não existe no OpsDash, será criada.`);
      await opsdash.createEnv(stage, svcEnvName);
    }
    await opsdash.setValue(stage, svcEnvName, env.value);
    await opsdash.associateEnv(stage, serviceName, svcEnvName, svcEnvAlias);
    logger.info(
      `Associação entre env ${svcEnvName} e serviço ${serviceName} feita com sucesso.`,
    );
  }
}

export class OpsdashHelper {
  constructor(
    private logger: Logger,
    private token: string | null = null,
  ) {}

  async checkIfEnvExists(stage: string, name: string) {
    const token = await this.getToken();
    try {
      await got.get(`${baseUrl}/env-vars/${name}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Stage': stage,
        },
      });
    } catch (e: any) {
      if (e instanceof HTTPError && e.response.statusCode === 404) {
        return false;
      }
      throw e;
    }
    return true;
  }

  async createEnv(stage: string, name: string) {
    const token = await this.getToken();
    try {
      await got.post(`${baseUrl}/env-vars`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Stage': stage,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: name,
        }),
      });
    } catch (e) {
      if (e instanceof HTTPError) {
        if (e.response.statusCode === 409) {
          this.logger.info(`Variável ${name} já existe, pulando criação.`);
          return;
        }
      }
      throw e;
    }
  }

  async setValue(
    stage: string,
    name: string,
    value: string,
    secret: boolean = false,
  ) {
    const token = await this.getToken();
    await got.post(`${baseUrl}/env-vars/${name}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Stage': stage,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value,
        type: secret ? 'SECRET' : 'PLAIN',
      }),
    });
  }

  async associateEnv(
    stage: string,
    serviceName: string,
    name: string,
    alias: string,
  ) {
    const token = await this.getToken();
    try {
      await got.put(`${baseUrl}/services/${serviceName}/env-vars`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Stage': stage,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: name,
          alias,
        }),
      });
    } catch (e) {
      if (e instanceof HTTPError) {
        if (e.response.statusCode === 409) {
          this.logger.info(
            `Variável ${name} já está associada ao serviço ${serviceName}, pulando.`,
          );
          return;
        }
      }
    }
  }

  async getToken(): Promise<string> {
    if (this.token !== null) {
      return this.token;
    }
    const request = await got.post(
      `https://${ssoHost}/auth/realms/internal-sso/protocol/openid-connect/token`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'openid',
        },
      },
    );
    const response = JSON.parse(request.body);
    this.token = response.access_token;
    return response.access_token;
  }
}
