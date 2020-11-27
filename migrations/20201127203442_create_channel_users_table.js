
exports.up = function (knex) {
  return knex.schema.createTable('channel_users', (table) => {
    table.increments('id');
    table.timestamp('last_seen_at');

    table.integer('channel_id')
      .unsigned()
      .references('id')
      .inTable('channels')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');

    table.integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');

    table.timestamps(true, true);
  })
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('channel_users');
};
