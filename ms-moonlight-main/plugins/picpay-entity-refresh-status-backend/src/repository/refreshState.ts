import { Knex } from 'knex';
import { RefreshState } from '../interfaces/refreshState';

export default class RefreshStateRepository {
  /**
   *
   */
  constructor(private readonly database: Knex) {}

  async getEntityRefreshState(
    entity_ref: string,
    order: string = 'asc',
    limit: number = 10,
  ): Promise<RefreshState[]> {
    let result = this.database('*').from('refresh_state');
    if (entity_ref) {
      result = result.where('entity_ref', entity_ref);
    }
    result = result.limit(limit < 1 ? 10 : limit);
    result = result.orderBy(
      'next_update_at',
      ['asc', 'desc'].includes(order) ? order : 'asc',
    );
    return await result;
  }
  async forceRefresh(entityRef: string, refreshAt: Date): Promise<any[]> {
    const result = this.database('*')
      .from('refresh_state')
      .where('entity_ref', '=', entityRef)
      .update('next_update_at', refreshAt.toISOString());
    return await result.returning('*', { includeTriggerModifications: true });
  }
  async forceRefreshByLocationKey(locationKey: string, refreshAt: Date): Promise<any[]> {
    const result = this.database('*')
      .from('refresh_state')
      .where('location_key', '=', locationKey)
      .update('next_update_at', refreshAt.toISOString());
    return await result.returning('*', { includeTriggerModifications: true });
  }
}
