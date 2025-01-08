/**
 * @param { import("knex").Knex } knex
 */

exports.up = (knex) => {
  return knex.schema.createTable('events', table => {
    table.string('url');
    table.string('method');
    table.integer('status');
    table.jsonb('payload');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable('events');
};
