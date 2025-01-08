import { Write } from '../interfaces/Write';
import { Read } from '../interfaces/Read';
import type { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

export abstract class BaseRepository<T> implements Write<T>, Read<T> {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string,
  ) { }

  public get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async create(item: Partial<T>): Promise<T> {
    let data = item;

    if (!data?.hasOwnProperty('id')) {
      data = { ...item, id: uuid() };
    }

    let output: Promise<T>;

    if (['postgres', 'pg'].includes(this.knex.client.config.client)) {
      [output] = await this.qb.insert<T>(data).returning('*');
    } else {
      [output] = await this.qb.insert<T>(this.fixInput(data)).returning('*');
    }

    return output;
  }

  update(id: string, item: Partial<T>): Promise<boolean> {
    const data = { ...item, updated_at: new Date().toISOString() };

    if (['postgres', 'pg'].includes(this.knex.client.config.client)) {
      return this.qb.where('id', id).update(data);
    }
    const payload = this.fixInput(data);
    return this.qb.where('id', id).update(payload);
  }

  delete(id: string): Promise<boolean> {
    return this.qb.where('id', id).del();
  }

  find(item: Partial<T>): Promise<T[]> {
    return this.qb.where(item).select('*');
  }

  findOne(item: Partial<T>): Promise<T> {
    return this.qb.where(item).first();
  }

  findById(id: string): Promise<T[]> {
    return this.qb
      .where(`${this.tableName}.id`, id)
      .select()
      .then(rows => {
        if (['postgres', 'pg'].includes(this.knex.client.config.client))
          return rows;
        if (rows.length === 0) return [];
        for (let i = 0; i < rows.length; i++) {
          this.fixOutput(rows[i]);
        }
        return rows;
      });
  }

  findByUser(user: string, page: number = 1): Promise<T[]> {
    const query = this.qb.select();

    if (['postgres', 'pg'].includes(this.knex.client.config.client)) {
      query.whereRaw(`${this.tableName}.identity->>'userEntityRef' = ?`, user);
    } else {
      query.where(`${this.tableName}.identity`, `LIKE`, `%${user}%`);
    }

    return query.offset((page - 1) * 100).limit(100).then(rows => {
      if (['postgres', 'pg'].includes(this.knex.client.config.client))
        return rows;
      if (rows.length === 0) return [];
      for (let i = 0; i < rows.length; i++) {
        this.fixOutput(rows[i]);
      }
      return rows;
    });
  }

  findAll(page: number = 1): Promise<T[]> {
    return this.qb.select('*').offset((page - 1) * 100).limit(100).then(rows => {
      if (['postgres', 'pg'].includes(this.knex.client.config.client))
        return rows;
      if (rows.length === 0) return [];
      for (let i = 0; i < rows.length; i++) {
        this.fixOutput(rows[i]);
      }
      return rows;
    });
  }

  async getMaxCreatedAtByUser(user: string): Promise<T> {
    return this.qb
      .max('created_at', { as: 'created_at' })
      .where({ user })
      .first();
  }

  fixOutput(row: any) {
    if (typeof row.identity === 'string') {
      row.identity = JSON.parse(row.identity as unknown as string);
    }
    if (typeof row.request === 'string') {
      row.request = JSON.parse(row.request as unknown as string);
    }
  }

  fixInput(data: any) {
    const rawJson: { [k: string]: any } = {};
    Object.entries(data as any).forEach(([k, e]) => {
      if (typeof e === 'object') {
        rawJson[k] = JSON.stringify(e);
        return;
      }
      rawJson[k] = e;
    });

    return rawJson;
  }
}
