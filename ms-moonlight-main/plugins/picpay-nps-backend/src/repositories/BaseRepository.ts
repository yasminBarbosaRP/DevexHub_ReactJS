import { Write } from '../interfaces/Write';
import { Read } from '../interfaces/Read';
import type { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

export abstract class BaseRepository<T> implements Write<T>, Read<T> {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string,
  ) {}

  public get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async create(item: Partial<T>): Promise<T> {
    let data = item;

    if (!data.hasOwnProperty('id')) {
      data = { ...item, id: uuid() };
    }
    const [output] = await this.qb.insert<T>(data).returning('*');

    return output as Promise<T>;
  }

  update(id: string, item: Partial<T>): Promise<boolean> {
    const data = { ...item, updated_at: new Date().toISOString() };

    return this.qb.where('id', id).update(data);
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
    return this.qb.where(`${this.tableName}.id`, id).select();
  }

  findAll(): Promise<T[]> {
    return this.qb.select('*');
  }

  async getMaxCreatedAtByUser(user: string): Promise<T> {
    return this.qb
      .max('created_at', { as: 'created_at' })
      .where({ user })
      .first();
  }
}
