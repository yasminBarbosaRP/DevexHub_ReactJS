import { Knex } from 'knex';

export class EventsRepository {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string
  ) { }

  private get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async save(method: string, url: string, status: number, payload: object | string): Promise<void> {
    const data: Record<string, any> = {
      method,
      status,
      url,
      payload,
      created_at: new Date()
    };

    if (!['postgres', 'pg'].includes(this.knex.client.config.client)) {
      if (typeof data.payload === 'object') {
        data.payload = JSON.stringify(data.payload);
      }
    }

    await this.qb.insert(data);
  }

  async cleanupOldEvents(): Promise<void> {
    const daysToKeep = 120;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);

    await this.qb
      .where('created_at', '<', dateThreshold)
      .del();
  }
}
