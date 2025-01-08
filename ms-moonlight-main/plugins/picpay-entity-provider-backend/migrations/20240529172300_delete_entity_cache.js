/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex => knex.schema.dropTable('entity_cache');

exports.down = knex =>
  knex.schema.createTable('entity_cache', table => {
    table.text('cacheKey').notNullable().primary();
    table.jsonb('content').notNullable();
    table.timestamps(true, true, false);
  });
