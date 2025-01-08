/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex =>
  knex.schema.createTable('repo_rules', table => {
    table.uuid('id').primary().notNullable();
    table.string('repository').notNullable();
    table.string('team').notNullable();
    table.date('until_date').notNullable();
  });

exports.down = knex => knex.schema.dropTable('repo_rules');
