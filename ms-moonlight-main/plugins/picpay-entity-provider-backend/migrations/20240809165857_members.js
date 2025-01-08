/**
 * @param { import("knex").Knex } knex
 */

exports.up = (knex) => {
  return knex.schema.createTable('members', table => {
    table.uuid('additionalInformationId').notNullable();
    table.foreign('additionalInformationId').references('id').inTable('additional_information');
    table.text('entityRef').notNullable();
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable('members');
};
