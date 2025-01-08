/**
 * @param {import('knex').Knex} knex
 */
exports.up = knex =>
  knex.schema
    .createTable('surveys', table => {
      table.uuid('id').primary().notNullable();
      table.string('title').notNullable();
      table.string('route').notNullable();
      table.timestamp('start_date').notNullable();
      table.timestamp('end_date').notNullable();
      table.timestamps(true, true, false);
    })
    .createTable('answers', table => {
      table.uuid('id').primary().notNullable();
      table
        .uuid('survey_id')
        .references('id')
        .inTable('surveys')
        .onDelete('CASCADE');
      table.string('user').notNullable();
      table.integer('rating').notNullable();
      table.string('message').nullable();
      table.timestamps(true, true, false);
    });

exports.down = knex => knex.schema.dropTable('answer').dropTable('survey');
