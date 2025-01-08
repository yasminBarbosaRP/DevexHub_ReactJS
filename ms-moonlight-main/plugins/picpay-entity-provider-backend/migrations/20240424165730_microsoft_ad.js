/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex =>
  knex.schema.createTable('microsoft_ad', table => {
    table.text('id').notNullable().primary();
    table.jsonb('content').nullable();
  });

exports.down = knex => knex.schema.dropTable('microsoft_ad');
