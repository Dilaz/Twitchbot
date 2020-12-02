exports.up = function (knex) {
  return knex.schema.createTable('urls', (table) => {
    table.increments('id');

    table.string('url').unique().notNullable();
    table.boolean('spam').notNullable();

    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('urls');
};
