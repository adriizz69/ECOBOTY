export async function up(knex) {
  const hasTable = await knex.schema.hasTable("games_settings");
  if (!hasTable) {
    await knex.schema.createTable("games_settings", (table) => {
      table.integer("guild_id").unsigned().primary().references("guilds.id").onDelete("CASCADE");
      table.json("config").notNullable();
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("games_settings");
  if (hasTable) {
    await knex.schema.dropTable("games_settings");
  }
}
