import { JsonObject } from '@backstage/types';
import fetch from 'cross-fetch';
import HttpClient from '../interfaces/HttpClient';

export class FetchAdapter implements HttpClient {
  private async fetch(
    url: string,
    init?: RequestInit,
    headerOptions?: JsonObject,
  ): Promise<any> {
    const headers = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headerOptions,
      },
    };

    const response = await fetch(`${url}`, {
      ...headers,
      ...init,
    });

    if (!response.ok) {
      throw new Error(
        `Vault Fecth - Error! status: ${response.statusText} body: ${await response.text()}, 
         url: ${url}, 
         init: ${JSON.stringify(init) ?? ''}`,
      );
    }

    if (response.status !== 200) {
      return '';
    }

    return await response.json();
  }

  async get(url: string, headerOptions?: JsonObject): Promise<any> {
    const response = await this.fetch(url, { method: 'GET' }, headerOptions);

    return response;
  }

  async post(url: string, body: any, headerOptions?: JsonObject): Promise<any> {
    const response = await this.fetch(
      url,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      headerOptions,
    );

    return response;
  }
}
