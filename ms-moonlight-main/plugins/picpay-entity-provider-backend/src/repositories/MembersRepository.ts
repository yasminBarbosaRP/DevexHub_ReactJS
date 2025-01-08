import { Knex } from 'knex';
import { Members } from '../database/tables';

export class MembersRepository {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string
  ) { }

  private get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async save(item: Members): Promise<void> {
    const data: { [k: string]: any } = item;

    if (!['postgres', 'pg'].includes(this.knex.client.config.client)) {
      if (typeof data.content === 'object') {
        data.content = JSON.stringify(data.content);
      }
    }

    await this.qb.insert<Members>(data)
  }

  async removeMembers(additionalInformationId: string): Promise<void> {
    await this.qb.delete().where('additionalInformationId', additionalInformationId);
  }

  async removeFromGroup(entityRef: string, additionalInformationId: string): Promise<void> {
    await this.qb.delete().where('entityRef', entityRef).andWhere('additionalInformationId', additionalInformationId);
  }

  async remove(entityRef: string): Promise<void> {
    await this.qb.delete().where('entityRef', entityRef);
  }

  async get(entityRef: string): Promise<Members[] | undefined> {
    return await this.qb.select('*').where('entityRef', entityRef);
  }

  async getAll(): Promise<Members[] | undefined> {
    return await this.qb.select('*');
  }

  async getByAdditionalInformationId(id:string): Promise<Members[] | undefined> {
    return await this.qb.select('*').where('additionalInformationId', id);
  }
}
