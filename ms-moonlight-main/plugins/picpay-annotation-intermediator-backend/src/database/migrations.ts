import { resolvePackagePath } from '@backstage/backend-common';
import { Knex } from 'knex';

const migrationsDir = resolvePackagePath(
  '@internal/plugin-picpay-annotation-intermediator-backend',
  'migrations',
);

export async function applyMigrations(client: Knex): Promise<void> {
  await client.migrate.latest({
    directory: migrationsDir,
  });
}
