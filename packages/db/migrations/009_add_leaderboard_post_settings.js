export async function up(knex) {
  const hasTable = await knex.schema.hasTable("leaderboard_post_settings");
  if (!hasTable) {
    await knex.schema.createTable("leaderboard_post_settings", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("channel_id").notNullable();
      table.integer("limit").defaultTo(10);
      table.string("message_id");
      table.boolean("enabled").defaultTo(true);
      table.unique(["guild_id"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("leaderboard_post_settings");
  if (hasTable) {
    await knex.schema.dropTable("leaderboard_post_settings");
  }
}
