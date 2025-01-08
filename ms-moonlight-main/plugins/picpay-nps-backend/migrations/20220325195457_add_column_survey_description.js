/**
 * @param { import("knex").Knex } knex
 */
exports.up = knex =>
  knex.schema.alterTable('surveys', table => {
    table.text('description').nullable();
  });

/**
 * @param { import("knex").Knex } knex
 */
exports.down = knex =>
  knex.schema.alterTable('surveys', table => {
    table.dropColumn('description');
  });
