import { resolvePackagePath } from '@backstage/backend-common';
import { Knex } from 'knex';

const migrationsDir = resolvePackagePath(
  '@internal/plugin-picpay-nps-backend',
  'migrations',
);

export async function applyMigrationsNPS(client: Knex): Promise<void> {
  await client.migrate.latest({
    directory: migrationsDir,
  });
}
