import {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
  CatalogProcessorParser,
  LocationSpec,
} from '@backstage/plugin-catalog-backend';

export class EmptyProcessor implements CatalogProcessor {
  /**
   * This Mocks an processor to avoid errors like "No processor was able to handle reading of github-discovery"
   */
  process: string;
  constructor(process: string) {
    this.process = process;
  }

  getProcessorName(): string {
    return 'EmptyProcessor';
  }
  readLocation?(
    location: LocationSpec,
    optional: boolean,
    emit: CatalogProcessorEmit,
    parser: CatalogProcessorParser,
    cache: CatalogProcessorCache,
  ): Promise<boolean> {
    if (location.type !== this.process) {
      return Promise.resolve(false);
    }
    console.debug(location, optional, emit, parser, cache);
    return Promise.resolve(true);
  }
}
