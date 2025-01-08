import { BaseRepository } from './BaseRepository';
import { DB_API_PROXY_TABLE, RawDbApiProxyRow } from '../database/tables';

export class ApiProxyRepository extends BaseRepository<RawDbApiProxyRow> {
  async countOf(): Promise<number> {
    return this.qb.count(DB_API_PROXY_TABLE);
  }
}
