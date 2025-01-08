/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex => {
  return knex.schema.createTable('repository_setting_histories', table => {
    table.uuid('id').primary().notNullable();
    table.string('user').notNullable();
    table.string('repository').notNullable();
    table.integer('require_approvals').notNullable();
    table.boolean('require_code_owner_reviews').notNullable();
    table.boolean('delete_branch_on_merge').notNullable();
    table.string('visibility').notNullable();
    table.string('error');
    table.string('status').notNullable();
    table.timestamps(true, true, false);
  });
};

exports.down = knex => {
  return knex.schema.dropTable('repository_setting_histories');
};
