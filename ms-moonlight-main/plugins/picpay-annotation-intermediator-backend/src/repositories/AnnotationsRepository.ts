import { BaseRepository } from './BaseRepository';
import { DB_TABLE, RawDbAnnotationRow } from '../database/tables';
import { hashify } from '../helpers/hash';

import { v4 as uuid } from 'uuid';

export class AnnotationsRepository extends BaseRepository<
  Record<string, string>,
  RawDbAnnotationRow
> {
  async countOf(): Promise<number> {
    return this.qb.count(DB_TABLE);
  }

  async update(
    id: string,
    item: Partial<RawDbAnnotationRow>,
  ): Promise<RawDbAnnotationRow[]> {
    const data: { [key: string]: any } = {
      ...item,
      updated_at: new Date().toISOString(),
    };

    if (!['postgres', 'pg'].includes(this.knex.client.config.client)) {
      if (typeof data.filter === 'object') {
        data.filter = JSON.stringify(data.filter);
      }
      if (typeof data.annotation === 'object') {
        data.annotation = JSON.stringify(data.annotation);
      }
    }

    return this.qb
      .where('id', id)
      .update(data)
      .then(() => {
        return this.qb
          .where('id', id)
          .select('*')
          .then((rows: any[]) => this.fixMultipleRows(rows));
      });
  }

  async create(item: Partial<RawDbAnnotationRow>): Promise<RawDbAnnotationRow> {
    let data: { [k: string]: any } = item;

    if (!data.hasOwnProperty('id')) {
      data = { ...item, id: uuid() };
    }

    if (!['postgres', 'pg'].includes(this.knex.client.config.client)) {
      if (typeof data.filter === 'object') {
        data.filter = JSON.stringify(data.filter);
      }
      if (typeof data.annotation === 'object') {
        data.annotation = JSON.stringify(data.annotation);
      }
      if (typeof data.extraFields === 'object') {
        data.extraFields = JSON.stringify(data.extraFields);
      }
    }

    const [output] = await this.qb
      .insert<RawDbAnnotationRow>(data)
      .returning('*')
      .then((res: any[]) => this.fixMultipleRows(res));

    return output as Promise<RawDbAnnotationRow>;
  }

  async find(filter: Record<string, string>): Promise<RawDbAnnotationRow[]> {
    const columns = [
      `${DB_TABLE}.id`,
      `${DB_TABLE}.filter`,
      `${DB_TABLE}.annotation`,
      `${DB_TABLE}.extraFields`,
      `${DB_TABLE}.error`,
      `${DB_TABLE}.created_at`,
      `${DB_TABLE}.updated_at`,
    ];

    const query = this.qb.select(columns);

    if (Object.keys(filter).length === 0) return query;

    if (['postgres', 'pg'].includes(this.knex.client.config.client)) {
      Object.keys(filter).forEach((k, idx) => {
        if (idx > 0) {
          query.andWhereRaw(`${DB_TABLE}.filter->>'${k}' = ? `, filter[k]);
        } else {
          query.whereRaw(`${DB_TABLE}.filter->>'${k}' = ?`, filter[k]);
        }
      });
    } else {
      query.where(`${DB_TABLE}.filter_hash`, `=`, hashify(filter));
    }

    return query.then(rows => {
      if (['postgres', 'pg'].includes(this.knex.client.config.client))
        return rows;
      if (rows.length === 0) return [];
      for (let i = 0; i < rows.length; i++) {
        this.fixOutput(rows[i]);
      }
      return rows;
    });
  }

  fixMultipleRows(res: any[]): any[] {
    for (let i = 0; i < res.length; i++) {
      if (this.knex.client.config.client === 'postgres') return res;
      if (typeof res[i].filter === 'string') {
        res[i].filter = JSON.parse(res[i].filter as unknown as string);
      }
      if (typeof res[i].annotation === 'string') {
        res[i].annotation = JSON.parse(res[i].annotation as unknown as string);
      }
      if (typeof res[i].extraFields === 'string') {
        res[i].extraFields = JSON.parse(
          res[i].extraFields as unknown as string,
        );
      }
    }
    return res;
  }
}
