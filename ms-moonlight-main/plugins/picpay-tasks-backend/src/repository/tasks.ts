import { Knex } from 'knex';
import {
  SerializedTask,
  TaskStatus,
} from '@backstage/plugin-scaffolder-node';
import { DateTime } from 'luxon';
import { TaskRepository } from '../interfaces/Task';


const parseSqlDateToIsoString = <T>(input: T): T | string => {
  if (typeof input === 'string') {
    const parsed = DateTime.fromSQL(input, { zone: 'UTC' });
    if (!parsed.isValid) {
      throw new Error(
        `Failed to parse database timestamp '${input}', ${parsed.invalidReason}: ${parsed.invalidExplanation}`,
      );
    }
    return parsed.toISO()!;
  }

  return input;
};

export type RawDbTaskRow = {
  id: string;
  spec: string;
  status: TaskStatus;
  state?: string;
  last_heartbeat_at?: string;
  created_at: string;
  created_by: string | null;
  secrets?: string | null;
  workspace?: Buffer;
};

export default class TaskRepositoryImpl implements TaskRepository {
  /**
   *
   */
  constructor(private readonly db: Knex) { }

  async getTasks(
    entityRef?: string,
    from?: Date,
    to?: Date,
    limit?: number,
    status?: TaskStatus | undefined,
    page?: number,
  ): Promise<{ tasks: SerializedTask[] }> {
    let offset = page;
    if (!page || page <= 1) {
      offset = 0;
    }
    const queryBuilder = this.db('*').from('tasks')
      .select('*')
      .orderBy('created_at', 'desc')

    if (limit) {
      queryBuilder.limit(limit);

      if (offset) {
        queryBuilder.offset(offset * limit);
      }
    }

    if (status) {
      queryBuilder.where('status', status);
    }

    if (from && to) {
      queryBuilder.whereBetween('created_at', [from, to]);
    }

    if (entityRef) {
      if (entityRef.includes("template")) {
        if (['postgres', 'pg'].includes(this.db.client.config.client)) {
          queryBuilder.whereRaw("spec::jsonb->'templateInfo'->>'entityRef' = ?", [entityRef]);
        } else {
          queryBuilder.where('spec', 'LIKE', `%${entityRef}%`);
        }
      } else if (entityRef.includes("user")) {
        queryBuilder.where('created_by', entityRef);
      }
    }

    const results = await queryBuilder;

    const tasks = results.map(result => ({
      id: result.id,
      spec: JSON.parse(result.spec),
      status: result.status,
      createdBy: result.created_by ?? undefined,
      lastHeartbeatAt: parseSqlDateToIsoString(result.last_heartbeat_at),
      createdAt: parseSqlDateToIsoString(result.created_at),
    }));

    return { tasks };
  }
}
