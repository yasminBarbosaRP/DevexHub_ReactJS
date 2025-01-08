import { Write } from '../interfaces/Write';
import { Read } from '../interfaces/Read';
import type { Knex } from 'knex';

import { v4 as uuid } from 'uuid';

export abstract class BaseRepository<T, U> implements Write<U>, Read<T, U> {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string,
  ) {}

  public get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async create(item: Partial<U>): Promise<U> {
    let data: { [k: string]: any } = item;

    if (!data.hasOwnProperty('id')) {
      data = { ...item, id: uuid() };
    }

    if (this.knex.client.config.client !== 'postgres') {
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'object') {
          data[key] = JSON.stringify(data[key] as object);
        }
      }
    }

    const [output] = await this.qb
      .insert<T>(data)
      .returning('*')
      .then((res: any) => {
        if (typeof res.filter === 'string') {
          res.filter = JSON.parse(res.filter as unknown as string);
        }
        if (typeof res.annotation === 'string') {
          res.annotation = JSON.parse(res.annotation as unknown as string);
        }
        return res;
      });

    return output as Promise<U>;
  }

  update(id: string, item: Partial<U>): Promise<U[]> {
    const data: { [k: string]: {} } = {
      ...item,
      updated_at: new Date().toISOString(),
    };

    if (this.knex.client.config.client !== 'postgres') {
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'object') {
          data[key] = JSON.stringify(data[key] as object);
        }
      }
    }

    return this.qb
      .where('id', id)
      .update(data)
      .then(() => {
        return this.qb.where('id', id).select('*');
      });
  }

  delete(id: string): Promise<boolean> {
    return this.qb.where('id', id).del();
  }

  find(item: Partial<T>): Promise<U[]> {
    return this.qb.where(item).select('*');
  }

  findOne(item: Partial<T>): Promise<U> {
    return this.qb.where(item).first();
  }

  findById(id: string): Promise<U[]> {
    return this.qb.where(`${this.tableName}.id`, id).select();
  }

  findAll(): Promise<U[]> {
    return this.qb.select('*');
  }

  fixOutput(row: any) {
    if (typeof row.filter === 'string') {
      row.filter = JSON.parse(row.filter as unknown as string);
    }
    if (typeof row.annotation === 'string') {
      row.annotation = JSON.parse(row.annotation as unknown as string);
    }
  }
}
