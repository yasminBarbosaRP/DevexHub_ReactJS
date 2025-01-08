/**
 * @param {import('knex').Knex} knex
 */
exports.up = async knex =>
  knex.schema.alterTable('additional_annotations', table => {
    table.jsonb('extraFields').nullable();
    table.string('error').nullable();
  });

exports.down = knex =>
  knex.schema.alterTable('additional_annotations', table => {
    table.dropColumn('extraFields');
    table.dropColumn('error');
  });
