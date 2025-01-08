import { ImmediateEntityProvider } from './ImmediateEntityProvider';
import { Logger } from 'winston';
import { EntityProviderConnection } from '@backstage/plugin-catalog-node';
import express from 'express';
import request from 'supertest';

describe('ImmediateEntityProvider', () => {
  let provider: ImmediateEntityProvider;
  let logger: Logger;
  let mockConnection: EntityProviderConnection;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    mockConnection = {
      applyMutation: jest.fn(),
      refresh: jest.fn(),
    };

    provider = new ImmediateEntityProvider({
      logger,
      handleEntity: jest.fn(),
    });
  });

  it('should instantiate correctly', () => {
    expect(provider).toBeDefined();
  });

  it('should return the correct provider name', () => {
    expect(provider.getProviderName()).toBe('ImmediateEntityProvider');
  });

  it('should connect correctly', async () => {
    await provider.connect(mockConnection);
    expect((provider as any).connection).toBe(mockConnection);
  });

  describe('getRouter', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use('/api/catalog/immediate', provider.getRouter());
    });

    it('should handle POST /entities successfully', async () => {
      await provider.connect(mockConnection);
      const yamlEntities = `
      apiVersion: backstage.io/v1alpha1
      kind: Component
      metadata:
        name: test-component
      spec:
        type: service
        owner: team-a
      `;
      
      const response = await request(app)
        .post('/api/catalog/immediate/entities/test')
        .set('Content-Type', 'application/yaml')
        .send(yamlEntities);
      
      expect(response.status).toBe(201);
      // Additional assertions can be made based on the implementation
    });

    it('should return error when POST /entities is called without connection', async () => {
      const yamlEntities = `
      apiVersion: backstage.io/v1alpha1
      kind: Component
      metadata:
        name: test-component
      spec:
        type: service
        owner: team-a
      `;
      
      const response = await request(app)
        .post('/api/catalog/immediate/entities/test')
        .set('Content-Type', 'application/yaml')
        .send(yamlEntities);
      
      expect(response.status).toBe(500);
      expect(response.text).toContain('Service is not yet initialized');
    });

    it('should handle PUT /entities successfully', async () => {
      await provider.connect(mockConnection);
      const yamlEntities = `
      apiVersion: backstage.io/v1alpha1
      kind: Component
      metadata:
        name: updated-component
      spec:
        type: library
        owner: team-b
      `;
      
      const response = await request(app)
        .put('/api/catalog/immediate/entities/test')
        .set('Content-Type', 'application/yaml')
        .send(yamlEntities);
      
      expect(response.status).toBe(201);
      // Additional assertions can be made based on the implementation
    });

    it('should handle PUT /entities successfully from a JSON as string', async () => {
      await provider.connect(mockConnection);
      const yamlEntities = `
      [
        {
          "apiVersion": "backstage.io/v1alpha1",
          "kind": "Component",
          "metadata": {
            "name": "updated-component"
          },
          "spec": {
            "type": "library",
            "owner": "team-b"
          }
        }
      ]
      `;
      
      const response = await request(app)
        .put('/api/catalog/immediate/entities/test')
        .set('Content-Type', 'application/yaml')
        .send(yamlEntities);
      
      expect(response.status).toBe(201);
      // Additional assertions can be made based on the implementation
    });

    it('should return error when PUT /entities is called without connection', async () => {
      const yamlEntities = `
      apiVersion: backstage.io/v1alpha1
      kind: Component
      metadata:
        name: updated-component
      spec:
        type: library
        owner: team-b
      `;
      
      const response = await request(app)
        .put('/api/catalog/immediate/entities/test')
        .set('Content-Type', 'application/yaml')
        .send(yamlEntities);
      
      expect(response.status).toBe(500);
      expect(response.text).toContain('Service is not yet initialized');
    });

    it('should return error for invalid YAML in POST /entities', async () => {
      await provider.connect(mockConnection);
      const invalidYaml = `invalid: yaml: : :`;
      
      const response = await request(app)
        .post('/api/catalog/immediate/entities/test')
        .set('Content-Type', 'application/yaml')
        .send(invalidYaml);
      
      expect(response.status).toBe(400);
      // Additional assertions based on error handling
    });

    it('should return error for invalid YAML in PUT /entities', async () => {
      await provider.connect(mockConnection);
      const invalidYaml = `invalid: yaml: : :`;
      
      const response = await request(app)
        .put('/api/catalog/immediate/entities/test')
        .set('Content-Type', 'application/yaml')
        .send(invalidYaml);
      
      expect(response.status).toBe(400);
      // Additional assertions based on error handling
    });
  });
});