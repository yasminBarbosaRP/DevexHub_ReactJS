/**
 * @param {import('knex').Knex} knex
 */
exports.up = async knex => {
  return knex.schema.createTable('additional_annotations', table => {
    table.uuid('id').primary().notNullable();
    table.jsonb('filter').notNullable();
    table.string('filter_hash').notNullable();
    table.jsonb('annotation').notNullable();
    table.timestamps(true, true, false);
  });
};

exports.down = knex => {
  return knex.schema.dropTable('additional_annotations');
};
