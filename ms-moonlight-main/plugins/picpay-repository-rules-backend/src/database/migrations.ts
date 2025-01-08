import { resolvePackagePath } from '@backstage/backend-plugin-api';
import { Knex } from 'knex';

const migrationsDir = resolvePackagePath(
  '@internal/plugin-picpay-repository-rules-backend',
  'migrations',
);

export async function applyMigrations(client: Knex): Promise<void> {
  await client.migrate.latest({
    directory: migrationsDir,
  });
}
