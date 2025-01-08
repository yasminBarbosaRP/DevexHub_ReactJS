/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex =>
  knex.schema
    .createTable('slack_notifications', table => {
      table.uuid('id').primary().notNullable();
      table.jsonb('receiver').notNullable();
      table.string('payload').notNullable();
      table.jsonb('callback_request').nullable();
      table.jsonb('callback_response').nullable();
      table.boolean('sent_to_receiver').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

exports.down = knex => knex.schema.dropTable('slack_notifications');
