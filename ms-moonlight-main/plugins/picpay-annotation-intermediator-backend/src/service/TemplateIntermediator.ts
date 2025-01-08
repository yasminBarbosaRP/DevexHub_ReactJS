import { Entity } from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import * as winston from 'winston';
import { EntityProcessorIntermediator } from '@internal/plugin-picpay-custom-entity-processor-backend';
import { ConfigApi } from '@backstage/core-plugin-api';
import { UrlReader } from '@backstage/backend-common';
import { ScmIntegrations } from '@backstage/integration';

export class TemplateIntermediator implements EntityProcessorIntermediator {
  /**
   *
   */

  constructor(
    private readonly logger: winston.Logger,
    private readonly integrations: ScmIntegrations,
    private readonly reader: UrlReader,
  ) {}

  urlRegex = /^(https?|ftp):\/\/([^\s/$.?#].[^\s]*)$/i;
  base64Regex = /^data:image\/(?:png|jpeg|jpg|gif);base64,[\w+/=]+$/;

  static async init(
    logger: winston.Logger,
    config: ConfigApi,
    reader: UrlReader,
  ): Promise<EntityProcessorIntermediator> {
    const integrations = ScmIntegrations.fromConfig(config);
    return new TemplateIntermediator(logger, integrations, reader);
  }

  getName(): string {
    return 'template-intermediator';
  }

  async preHandle(entity: Entity, location: LocationSpec): Promise<void> {
    if (process.env.TEMPLATE_INTERMEDIATOR_DISABLED === 'true') return
    if (!entity || entity.kind !== 'Template' || !entity.spec) {
      return;
    }

    const scmIntegration = this.integrations.byUrl(location.target);
    const image = entity.spec.image;

    if (!scmIntegration || !image) {
      return;
    }

    const imgStr = image.toString();

    if (this.urlRegex.test(imgStr)) {
      throw new Error('Image in spec.image must be a relative path');
    }

    if (this.base64Regex.test(imgStr)) {
      this.logger.debug(
        `Field spec.image is already a base64 at ${location.target}`,
      );
      return;
    }

    if (
      !imgStr.endsWith('.png') &&
      !imgStr.endsWith('.jpg') &&
      !imgStr.endsWith('.jpeg')
    ) {
      throw new Error('Image should end with either .png, .jpg or .jpeg');
    }

    const imageExtension = this.getFileExtension(imgStr);

    this.logger.debug(`Bundling Image specification from ${location.target}`);
    try {
      // const read(url)
      const read = async (sourceUrl: string, path: string): Promise<string> => {
        const url = `${sourceUrl}${path}`;
        const data = await this.reader.readUrl(url);
        const buffer = await data.buffer();

        const base64String = Buffer.from(buffer).toString('base64');
        const mimeType = `image/${imageExtension}`;
        const dataURI = `data:${mimeType};base64,${base64String}`;
        return dataURI;
      };
      const sourceUrl = scmIntegration?.resolveUrl({
        url: '/',
        base: location.target,
      });

      entity.spec = {
        ...entity.spec,
        imageData: await read(sourceUrl, imgStr),
      };
    } catch (error) {
      this.logger.error(`Unable to bundle Image specification`, error);
      throw error;
    }
  }

  private getFileExtension(filename: string): string | null {
    const lastDotIndex = filename.lastIndexOf('.');

    if (lastDotIndex === -1) {
      return null;
    }

    const extension = filename.slice(lastDotIndex + 1);
    return extension.toLowerCase(); // Optional: Convert to lowercase
  }
}
