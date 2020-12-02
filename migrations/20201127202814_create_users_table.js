
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('name').unique().notNullable();
    table.json('settings');
    table.boolean('is_bot').notNullable().defaultTo(false);
    table.timestamp('last_seen_at').notNullable();

    table.timestamps(true, true);
  })
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};