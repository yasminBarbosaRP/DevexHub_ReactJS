import express from 'express';
import request from 'supertest';
import { createRouter, RouterOptions } from './router';
import { ConfigReader } from '@backstage/config';
import { Logger } from 'winston';

jest.mock('cross-fetch', () => jest.fn());
import fetch from 'cross-fetch';

const mockConfig = new ConfigReader({
  vision: {
    url: 'http://vision-api',
  },
});

const mockLogger = {
  error: jest.fn(),
} as unknown as Logger;

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const routerOptions: RouterOptions = {
      config: mockConfig,
      logger: mockLogger,
    };
    app = express().use(await createRouter(routerOptions));
  });

  beforeEach(() => {
    jest.resetAllMocks(); 
  });
  
  describe('GET /:id/score', () => {

  it('should return the score when fetch is successful', async () => {
    const mockResponse = {
      score: 85,
    };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await request(app).get('/3/score').query({ squads: ['squad-1', 'squad-2'] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ score: 85 });
    expect(fetch).toHaveBeenCalledWith('http://vision-api/source/3/score?squads=squad-1&squads=squad-2');
  });

  it('should return a 500 error when fetch fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const response = await request(app).get('/3/score').query({ squad: 'squad-1' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Erro ao buscar o score' });
  });

  it('should return a 500 error when an exception occurs', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    const response = await request(app).get('/3/score').query({ squad: 'squad-1' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Erro ao buscar o score' });
  });
  })

  describe('GET /:id/metrics/projects', () => {
    const mockMetricsResponse = {
      projects: [
        {
          name: "projeto-0",
          bu: "tech-core",
          squad: "Teste",
          metrics: [
            {
              name: "Qualquer",
              pass: false,
              data: {
                value: 95.98046277614746
              }
            },
            {
              name: "Teste2",
              pass: true,
              data: {
                value: 9.087087022795837
              }
            }
          ]
        },
        {
          name: "projeto-1",
          bu: "tech-core",
          squad: "Otro",
          metrics: [
            {
              name: "Qualquer",
              pass: false,
              data: {
                value: 4.736222062459894
              }
            },
            {
              name: "Teste2",
              pass: false,
              data: {
                value: 55.898057287660194
              }
            }
          ]
        }
      ],
      page: 1,
      limit: 10,
      nextPage: 2
    };
  
    it('should return metrics for single squad and metric', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse,
      });
  
      const response = await request(app)
        .get('/3/metrics/projects')
        .query({ squads: 'Teste', metrics: 'Qualquer' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMetricsResponse);
    });
  
    it('should return metrics for multiple squads and metrics', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse,
      });
  
      const response = await request(app)
        .get('/3/metrics/projects')
        .query({ squads: ['Teste', 'Otro'], metrics: ['Qualquer', 'Teste2'] });
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMetricsResponse);
    });
  
    it('should handle API error correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });
  
      const response = await request(app)
        .get('/3/metrics/projects')
        .query({ squads: 'Teste', metrics: 'Qualquer' });
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Falha ao buscar os detalhes das métricas' });
    });
  
    it('should handle network error correctly', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
  
      const response = await request(app)
        .get('/3/metrics/projects')
        .query({ squads: 'Teste', metrics: 'Qualquer' });
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Falha ao buscar os detalhes das métricas' });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  
    it('should construct correct URL with multiple parameters', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse,
      });
  
      await request(app)
        .get('/3/metrics/projects')
        .query({ squads: ['Teste', 'Otro'], metrics: ['Qualquer', 'Teste2'] });
  
      expect((fetch as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining('/3/metrics/projects?squads=Teste&squads=Otro&metrics=Qualquer&metrics=Teste2'),
      );
      });
  });
});