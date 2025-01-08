import { Knex } from 'knex';
import { MicrosoftAD } from '../database/tables';
import _ from 'lodash';
import { PicPayGroup, PicPayUser } from '../provider/Record';

const groupQuery = `select
  ad.id as id,
  ad.content ->> 'userName' as email,
  ad.content ->> 'displayName' as name,
  ad.content -> 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User' ->> 'manager' as parent_email,
  ad.content -> 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User' ->> 'manager' as department
from microsoft_ad ad
where exists(
  select * from microsoft_ad ad2
  where ad2.content -> 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User' ->> 'manager' = ad.content ->> 'userName'
)
and (ad.content ->> 'active')::bool
ORDER BY ad.id ASC
limit ?
offset ?
`;

const userQuery = `select
  ad.id as id,
  ad.content ->> 'userName' as email,
  ad.content ->> 'displayName' as name,
  ad.content ->> 'title' as job_name,
  ad.content -> 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User' ->> 'manager' as lead_email,
  ad.content ->> 'active' as active,
  (select count(*) > 1 from microsoft_ad ad2 where ad2.content -> 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User' ->> 'manager' = ad.content ->> 'userName') as is_lead
from microsoft_ad ad
ORDER BY ad.id ASC
limit ?
offset ?`;

interface ListLimit {
  perPage?: number;
  page?: number;
}

const limits = ({ perPage, page }: ListLimit) => {
  let limit = perPage || 1000;

  if (limit > 1000) {
    limit = 1000;
  } else if (limit < 20) {
    limit = 20;
  }

  const offset = ((!page || page < 1 ? 1 : page) - 1) * limit;

  return { limit, offset };
};

export class MicrosoftADRepository {
  public constructor(
    public readonly knex: Knex,
    public readonly tableName: string
  ) { }

  private get qb(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async create(item: MicrosoftAD): Promise<void> {
    const data: { [k: string]: any } = item;

    if (!['postgres', 'pg'].includes(this.knex.client.config.client)) {
      if (typeof data.content === 'object') {
        data.content = JSON.stringify(data.content);
      }
    }

    await this.qb.insert<MicrosoftAD>(data).onConflict('id').merge();
  }

  async update(id: string, content: any): Promise<void> {
    const data = { content };

    if (!['postgres', 'pg'].includes(this.knex.client.config.client)) {
      if (typeof data.content === 'object') {
        data.content = JSON.stringify(data.content);
      }
    }

    await this.qb.where('id', id).update(data);
  }

  async get(id: string): Promise<MicrosoftAD | undefined> {
    const result = await this.qb.select('*').where('id', id).first()
    if (typeof result?.content === 'string') {
      result.content = JSON.parse(result.content);
    }
    return result;
  }

  async listGroups(args: ListLimit): Promise<PicPayGroup[]> {
    const { limit, offset } = limits(args);
    // gets all leads
    const result = await this.knex.raw(groupQuery, [limit, offset]);

    await this.qb
      .whereIn(
        'id',
        result.rows.map((i: any) => i.id),
      )
      .update({
        groupLastFetchedAt: new Date(),
      });

    return result.rows;
  }

  async listUsers(args: ListLimit): Promise<PicPayUser[]> {
    const { limit, offset } = limits(args);

    const result = await this.knex.raw(userQuery, [limit, offset]);

    await this.qb
      .whereIn(
        'id',
        result.rows.map((i: any) => i.id),
      )
      .update({
        userLastFetchedAt: new Date(),
      });

    return result.rows;
  }
}
