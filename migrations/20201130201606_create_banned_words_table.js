exports.up = function (knex) {
  return knex.schema.createTable('banned_words', (table) => {
    table.increments('id');

    table.string('str').notNullable();
    table.boolean('regex').notNullable().defaultTo(false);

    table.integer('channel_id')
      .nullable()
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');

    table.timestamps(true, true);

    table.unique(['str', 'channel_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('banned_words');
};
