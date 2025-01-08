/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex =>
  knex.schema.alterTable('microsoft_ad', table => {
    table.datetime('userLastFetchedAt').defaultTo(knex.fn.now());
    table.datetime('groupLastFetchedAt').defaultTo(knex.fn.now());
  });

exports.down = knex =>
  knex.schema.alterTable('microsoft_ad', table => {
    table.dropColumn('userLastFetchedAt');
    table.dropColumn('groupLastFetchedAt');
  });
