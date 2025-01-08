import { PicPayEntityProcessor } from './PicPayEntityProcessor';
import { Entity } from '@backstage/catalog-model';
import { CatalogProcessorEmit, CatalogProcessorCache } from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import * as winston from 'winston';

describe('CustomEntityProcessor', () => {
  let processor: PicPayEntityProcessor;
  let logger: winston.Logger;
  let intermediators: any[];
  let entity: Entity;
  let location: LocationSpec;
  let emit: CatalogProcessorEmit;
  let originLocation: LocationSpec;
  let cache: CatalogProcessorCache;

  beforeEach(() => {
    logger = {
      child: jest.fn().mockReturnThis(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
    } as any;
    intermediators = [];
    entity = {
      metadata: {
        name: 'TestEntity'
      }
    } as Entity;
    location = {} as LocationSpec;
    emit = jest.fn();
    originLocation = {} as LocationSpec;
    cache = {} as CatalogProcessorCache;

    processor = new PicPayEntityProcessor(logger, intermediators);
  });

  it('should call preProcessEntity', async () => {
    const intermediator = {
      preHandle: jest.fn(),
      getName: jest.fn().mockReturnValue('TestIntermediator')
    };
    intermediators.push(intermediator);

    const output = await processor.preProcessEntity(entity, location, emit, originLocation, cache);

    expect(output).toBe(entity);

    expect(intermediator.preHandle).toHaveBeenCalled();
  });

  it('should call postProcessEntity', async () => {
    const intermediator = {
      postHandle: jest.fn(),
      getName: jest.fn().mockReturnValue('TestIntermediator')
    };
    intermediators.push(intermediator);

    const output = await processor.postProcessEntity(entity, location, emit);

    expect(output).toBe(entity);

    expect(intermediator.postHandle).toHaveBeenCalled();
  });
});