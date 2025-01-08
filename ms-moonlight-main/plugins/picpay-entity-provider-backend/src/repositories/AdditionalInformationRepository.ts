import { Knex } from 'knex';
import { AdditionalInformation } from '../database/tables';
import { QueryBuilder } from '@internal/plugin-picpay-core-components';
import { v4 as uuid } from 'uuid';

export class AdditionalInformationRepository {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string
  ) {
  }

  private get isPg(): boolean {
    return ['postgres', 'pg'].includes(this.knex.client.config.client);
  }

  private get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  private fixOutput(row: any) {
    if (typeof row.content === 'string') {
      row.content = JSON.parse(row.content as unknown as string);
    }
  }

  async save(item: Partial<AdditionalInformation>, id?: string): Promise<string> {
    const data: { [k: string]: any } = item;

    if (!this.isPg) {
      if (typeof data.content === 'object') {
        data.content = JSON.stringify(data.content);
      }
    }

    if (id) {
      await this.qb.update<AdditionalInformation>(data).where('id', id);
      return Promise.resolve(id);
    }
    data.id = uuid();
    await this.qb
      .insert<AdditionalInformation>(data)
      .returning('id');
    return data.id;

  }

  async get(entityRef: string, orphan: boolean = false): Promise<AdditionalInformation[]> {
    let orphanValue: boolean | number = orphan;

    if (this.isPg) {
      orphanValue = orphan ? 1 : 0;
    }

    const rows = await this.qb.select('*').where('entityRef', entityRef).andWhere('orphan', orphanValue) ?? [];
    if (!this.isPg) {
      for (let i = 0; i < rows.length; i++) {
        this.fixOutput(rows[i]);
      }
    }
    return rows;
  }

  async getById(id: string): Promise<AdditionalInformation | undefined> {
    const data = await this.qb.select('*').where('id', id).first();
    if (!this.isPg) {
      this.fixOutput(data);
    }
    return data;
  }

  async query(query: { [k: string]: any }): Promise<AdditionalInformation[] | undefined> {
    const q = this.qb.select();
    if (this.isPg) {
      q.whereRaw(QueryBuilder.buildJsonbQuery(query));
    } else {
      q.whereRaw(QueryBuilder.buildJsonLikeQuery(query));
    }

    return q.then(rows => {
      if (this.isPg)
        return rows;
      if (rows.length === 0) return [];
      for (let i = 0; i < rows.length; i++) {
        this.fixOutput(rows[i]);
      }
      return rows;
    });
  }

  async getAll(): Promise<AdditionalInformation[] | undefined> {
    return (await this.qb.select('*')).map((row: any) => {
      if (!this.isPg) {
        this.fixOutput(row);
      }
      return row
    });
  }

  async getOrphans(): Promise<AdditionalInformation[] | undefined> {
    const orphanValue = this.isPg ? true : 1;
    return (await this.qb.select('*').where('orphan', orphanValue)).map((row: any) => {
      if (!this.isPg) {
        this.fixOutput(row);
      }
      return row
    });
  }

  async getNonOrphans(): Promise<AdditionalInformation[] | undefined> {
    return (await this.qb.select('*').where('orphan', false)).map((row: any) => {
      if (!this.isPg) {
        this.fixOutput(row);
      }
      return row
    });
  }

  async makeItOrphan(entityRef: string): Promise<boolean> {
    const result = await this.qb.update({ orphan: true }).where('entityRef', entityRef);
    return result > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.qb.delete('*').where('id', id);
    return result.length > 0;
  }
}
