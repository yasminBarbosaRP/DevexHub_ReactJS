import RefreshStateRepository from '@internal/plugin-picpay-entity-refresh-status-backend';
import { AdditionalInformationRepository } from '../repositories/AdditionalInformationRepository';
import { MicrosoftADRepository } from '../repositories/MicrosoftADRepository';
import { Database } from './Database';
import { PluginDatabaseManager } from '@backstage/backend-common';

describe('Database', () => {
  let database: PluginDatabaseManager;

  beforeAll(() => {
    database = {
      getClient: jest.fn().mockResolvedValue({}),
      migrations: {
        skip: true,
      },
    };
  });

  it('should create a new instance of Database', async () => {
    const db = await Database.create(database, database);
    expect(db).toBeInstanceOf(Database);
  });

  it('should create an instance of AdditionalInformationRepository', async () => {
    const db = await Database.create(database, database);
    const repository = db.additionalInformationRepository();

    expect(repository).toBeInstanceOf(AdditionalInformationRepository);
  });

  it('should create an instance of RefreshStateRepository', async () => {
    const db = await Database.create(database, database);
    const repository = db.refreshStateRepository();

    expect(repository).toBeInstanceOf(RefreshStateRepository);
  });

  it('should create an instance of MicrosoftADRepository', async () => {
    const db = await Database.create(database, database);
    const repository = db.microsoftAD();

    expect(repository).toBeInstanceOf(MicrosoftADRepository);
  });

  it('should run migrations', async () => {
    const latest = jest.fn().mockResolvedValue([]);

    const databaseWithMigrations = {
      getClient: jest.fn().mockResolvedValue({
        migrate: { latest },
      }),
      migrations: {
        skip: false,
      },
    };

    await Database.create(databaseWithMigrations, database);

    expect(latest).toHaveBeenCalledWith({ directory: expect.any(String) });
  });
});
