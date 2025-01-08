/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex =>
  knex.schema.createTable('additional_information', table => {
    table.uuid('id').primary().notNullable();
    table.boolean('orphan').notNullable().defaultTo(false);
    table.text('entityRef').notNullable();
    table.jsonb('content').nullable();
  });

exports.down = knex => knex.schema.dropTable('additional_information');
