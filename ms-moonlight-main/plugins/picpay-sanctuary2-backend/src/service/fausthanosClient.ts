import { Config } from '@backstage/config';
import { Logger } from 'winston';
import { FausthanosAction } from './../model/FausthanosAction';
import fetch from 'cross-fetch';

export interface ModelFausthanos {
  has_next_page?: boolean;
  limit?: number;
  error?: boolean;
  message?: string;
  data?: FausthanosAction;
}

interface DeleteRequest {
  type: string;
  name: string;
  owner: string;
  requestedBy: number;
  reason: string;
}

interface PatchRequest {
  scheduleReminderEnabled?: boolean;
}

export type Fausthanos = {
  getAll(): Promise<FausthanosAction[]>;
  getStatus(componentId: string): Promise<ModelFausthanos>;
  createAction(request: DeleteRequest): Promise<FausthanosAction>;
  reviewApprove(id: string, email: string): Promise<void>;
  reviewReject(id: string, email: string): Promise<void>;
  retryFailure(id: string): Promise<void>;
  delete(id: string): Promise<void>;
};

type Options = {
  config: Config;
  logger: Logger;
};

const statusSuccessful = 200;

export class FausthanosClient implements Fausthanos {
  config: Config;
  logger: Logger;
  token: string | undefined;

  constructor(options: Options) {
    this.config = options.config;
    this.logger = options.logger;
  }

  private apiFausthanos(): string {
    const cfg = this.config.getConfig('fausthanos');
    return `${cfg.get('url')}`;
  }

  private async fetch<T = any>(input?: string, init?: RequestInit): Promise<T> {
    const url = this.apiFausthanos();
    const cfg = this.config.getConfig('fausthanos');

    const response = await fetch(`${url}${input}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.get('token')}`,
      },
      ...init,
    });

    if (response.status !== statusSuccessful) {
      return JSON.parse(await response.text());
    }

    return response.json();
  }

  private async fetchPaginateAll<T = any>(input?: string): Promise<T[]> {
    let result: T[] = [];

    for (let page = 1; page < 1000; page++) {
      const actions = await await this.fetch(
        `${input}?page=${page}&&limit=100`,
      );

      result = result.concat(actions);

      if (!actions || actions?.length < 100) {
        break;
      }
    }

    return result;
  }

  async getAll(): Promise<FausthanosAction[]> {
    return await this.fetchPaginateAll<FausthanosAction>('/actions');
  }
  async getStatus(componentId: string): Promise<ModelFausthanos> {
    return await this.fetch<ModelFausthanos>(`/action/${componentId}`);
  }

  async getStatusByID(statusId: string): Promise<ModelFausthanos> {
    return await this.fetch<ModelFausthanos>(`/action/${statusId}`);
  }

  async createAction(request: DeleteRequest): Promise<FausthanosAction> {
    return await this.fetch<FausthanosAction>('/action', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async patchRequest(id: string, request: PatchRequest): Promise<void> {
    return await this.fetch<void>(`/action/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
  }

  async retryFailure(id: string): Promise<void> {
    return await this.fetch<void>(`/action/${id}/retry`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async reviewApprove(id: string, email: string): Promise<void> {
    return await this.fetch<void>(`/action/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    });
  }

  async reviewReject(id: string, email: string): Promise<void> {
    return await this.fetch<void>(`/action/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    });
  }

  async delete(id: string): Promise<void> {
    return await this.fetch<void>(`/action/${id}`, {
      method: 'DELETE',
    });
  }
}
