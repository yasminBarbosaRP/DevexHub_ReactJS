import { Entity } from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import * as winston from 'winston';
import { EntityProcessorIntermediator } from '@internal/plugin-picpay-custom-entity-processor-backend';
import { ConfigApi } from '@backstage/core-plugin-api';
import { UrlReader } from '@backstage/backend-common';
import { ScmIntegrations } from '@backstage/integration';
import { parse, stringify } from 'yaml';

export class InfrastructureDefinitionIntermediator implements EntityProcessorIntermediator {
  /**
   *
   */

  constructor(
    private readonly logger: winston.Logger,
    private readonly integrations: ScmIntegrations,
    private readonly reader: UrlReader,
  ) { }

  static async init(
    logger: winston.Logger,
    config: ConfigApi,
    reader: UrlReader,
  ): Promise<EntityProcessorIntermediator> {
    const integrations = ScmIntegrations.fromConfig(config);
    return new InfrastructureDefinitionIntermediator(logger, integrations, reader);
  }

  getName(): string {
    return 'infrastructure-definition-intermediator';
  }

  async preHandle(entity: Entity, location: LocationSpec): Promise<void> {
    if (process.env.INFRASTRUCTURE_DEFINITION_INTERMEDIATOR_DISABLED === 'true') return
    if (!entity || entity.kind !== 'Resource' || !entity.spec || entity.spec.type !== 'infra') {
      return;
    }

    const scmIntegration = this.integrations.byUrl(location.target);

    if (!scmIntegration) {
      return;
    }

    this.logger.debug(`Bundling YAML specification from ${location.target}`);
    try {
      // const read(url)
      const read = async (sourceUrl: string, path: string): Promise<string | null> => {
        const maxRetries = 3;
        let retries = 0;
        let error;

        while (retries < maxRetries) {
          try {
            const url = `${sourceUrl}${path}`;
            const data = await this.reader.readUrl(url);
            const buffer = await data.buffer();

            return stringify(parse(Buffer.from(buffer).toString()));
          } catch (e: any) {
            if (e.response?.status === 404) {
              this.logger.debug(`File not found: ${path}`);
              return null;
            }
            error = e;
            retries++;
            this.logger.error(`Attempt ${retries} failed. Retrying...`);
          }
        }

        this.logger.error(`Unable to bundle yaml specification after ${maxRetries} retries`, error);
        return null;
      };
      const sourceUrl = scmIntegration?.resolveUrl({
        url: '/',
        base: location.target,
      });

      const homologDefinition = await read(sourceUrl, `./chart/values.qa.yaml`) ?? entity.spec.homologDefinition ?? "NotFound";
      const productionDefinition = await read(sourceUrl, `./chart/values.prod.yaml`) ?? entity.spec.productionDefinition ?? "NotFound";

      entity.spec = {
        ...entity.spec,
        homologDefinition,
        productionDefinition,
      };
    } catch (error) {
      this.logger.error(`Unable to bundle yaml specification`, error);
      throw error;
    }
  }
}
