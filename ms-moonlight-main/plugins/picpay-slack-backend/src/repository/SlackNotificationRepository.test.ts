import { SlackNotificationRepository, SlackNotification } from './SlackNotificationRepository'; // Update the path accordingly
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { Knex as KnexType } from 'knex';

describe('SlackNotificationRepository', () => {
  const databases = TestDatabases.create({
    ids: ['POSTGRES_13', 'POSTGRES_9', 'SQLITE_3'],
  });

  function createDatabaseManager(client: KnexType) {
    return {
      getClient: async () => client,
    };
  }

  async function createDatabaseHandler(databaseId: TestDatabaseId) {
    const knex = await databases.init(databaseId);
    const databaseManager = createDatabaseManager(knex);
    return {
      knex,
      repository: await SlackNotificationRepository.create(databaseManager),
    };
  }

  it.each(databases.eachSupportedId())(
    'should create and retrieve a Slack notification, %p',
    async databaseId => {
      const { knex, repository } = await createDatabaseHandler(databaseId);
      
      const notification: SlackNotification = {
        id: '1',
        receiver: 'user1',
        payload: 'Test payload',
        sent_to_receiver: false,
        created_at: new Date(),
      };

      await knex('slack_notifications').insert(notification);

      const res = await repository.getNotificationById('1');

      expect(res).toEqual(expect.objectContaining({
        id: '1',
        receiver: 'user1',
        payload: 'Test payload',
      }));
    },
    60_000,
  );

  it.each(databases.eachSupportedId())(
    'should update a Slack notification, %p',
    async databaseId => {
      const { knex, repository } = await createDatabaseHandler(databaseId);
      
      const notification: SlackNotification = {
        id: '1',
        receiver: 'user1',
        payload: 'Test payload',
        sent_to_receiver: false,
        created_at: new Date(),
      };

      await knex('slack_notifications').insert(notification);

      const updateData: Partial<SlackNotification> = {
        sent_to_receiver: true,
      };

      await repository.updateNotification('1', updateData);

      const res = await knex('slack_notifications').where({ id: '1' }).first();

      // Updated expectation to handle both boolean and number representations
      expect(!!res.sent_to_receiver).toBe(true);
    },
    60_000,
  );

  it.each(databases.eachSupportedId())(
    'should skip migrations if the skip option is true, %p',
    async databaseId => {
      const knex = await databases.init(databaseId);
      const databaseManager = createDatabaseManager(knex);
      const repository = await SlackNotificationRepository.create({
        ...databaseManager, migrations: { skip: true },
      });
      
      expect(repository).toBeInstanceOf(SlackNotificationRepository);
    },
    60_000,
  );

  it.each(databases.eachSupportedId())(
    'should create a new instance of SlackNotificationRepository, %p',
    async databaseId => {
      const { repository } = await createDatabaseHandler(databaseId);
      expect(repository).toBeInstanceOf(SlackNotificationRepository);
    },
    60_000,
  );
});
