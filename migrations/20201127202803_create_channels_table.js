
exports.up = function (knex) {
  return knex.schema.createTable('channels', (table) => {
    table.increments('id');
    table.string('name').unique().notNullable();
    table.json('settings');

    table.timestamps(true, true);
  })
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('channels');
};
