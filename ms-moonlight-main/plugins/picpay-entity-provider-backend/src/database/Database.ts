import { Knex } from 'knex';
import { ADDITIONAL_INFORMATION_TABLE, EVENTS_TABLE, MEMBERS_TABLE, MICROSOFT_AD_TABLE } from './tables';
import { AdditionalInformationRepository } from '../repositories/AdditionalInformationRepository';
import { MicrosoftADRepository } from '../repositories/MicrosoftADRepository';
import {
  PluginDatabaseManager,
  resolvePackagePath,
} from '@backstage/backend-common';
import { MembersRepository } from '../repositories/MembersRepository';
import { EventsRepository } from '../repositories/Events';
import RefreshStateRepository from '@internal/plugin-picpay-entity-refresh-status-backend';

const migrationsDir = resolvePackagePath(
  '@internal/plugin-picpay-entity-provider-backend',
  'migrations'
);

export class Database {
  private constructor(private readonly client: Knex, private readonly catalogDb: Knex) { }

  static async create(
    database: PluginDatabaseManager,
    catalogDb: PluginDatabaseManager
  ): Promise<Database> {
    const client = await database.getClient();

    if (!database.migrations?.skip) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new Database(client, await catalogDb.getClient());
  }

  public additionalInformationRepository() {
    return new AdditionalInformationRepository(
      this.client,
      ADDITIONAL_INFORMATION_TABLE
    );
  }

  public refreshStateRepository() {
    return new RefreshStateRepository(this.catalogDb);
  }

  public microsoftAD() {
    return new MicrosoftADRepository(this.client, MICROSOFT_AD_TABLE);
  }

  public members() {
    return new MembersRepository(this.client, MEMBERS_TABLE);
  }

  public events() {
    return new EventsRepository(this.client, EVENTS_TABLE);
  }
}
