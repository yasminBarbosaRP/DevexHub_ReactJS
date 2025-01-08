import { Knex } from 'knex';
import { RepoRules as Table} from '../database/tables';

export class RepoRules {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string
  ) { }

  private get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async save(item: Table): Promise<Table> {
    const data: { [k: string]: any } = item;
    const [output] = await this.qb.insert<Table>(data).returning('*');
    
    return output as Promise<Table>;
  }

  async deleteByRepository(respository: string): Promise<void> {
    await this.qb.delete().where('repository', respository);
  }

  async getByRepository(repoName: string): Promise<Table> {
    return this.qb.where({'repository': repoName}).first();
  }

  async findAll(): Promise<Table[]> {
    return this.qb.select('*');
  }
}

