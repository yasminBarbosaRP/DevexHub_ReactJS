/**
 * @param { import("knex").Knex } knex
 */
exports.up = knex =>
  knex.schema.createTable('skipped_answers', table => {
    table.uuid('id').primary().notNullable();
    table
      .uuid('survey_id')
      .references('id')
      .inTable('surveys')
      .onDelete('CASCADE');
    table.string('user').notNullable();
    table.integer('postponed');
    table.timestamp('remember_in');
    table.timestamps(true, true, false);
  });

/**
 * @param { import("knex").Knex } knex
 */
exports.down = knex => knex.schema.dropTable('skipped_answers');
