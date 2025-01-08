/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex =>
  knex.schema.createTable('requests', table => {
    table.uuid('id').primary().notNullable();
    table.jsonb('identity').notNullable();
    table.jsonb('request').notNullable();
    table.integer('response_status_code').nullable();
    table.timestamp('date').notNullable();
    table.timestamp('updated_at').nullable();
  });

exports.down = knex => knex.schema.dropTable('answer').dropTable('survey');
