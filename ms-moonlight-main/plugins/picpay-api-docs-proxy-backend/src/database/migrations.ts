import { resolvePackagePath } from '@backstage/backend-common';
import { Knex } from 'knex';

const migrationsDir = resolvePackagePath(
  '@internal/plugin-picpay-api-docs-proxy-backend',
  'migrations',
);

export async function applyMigrationsApiDocsProxy(client: Knex): Promise<void> {
  await client.migrate.latest({
    directory: migrationsDir,
  });
}
