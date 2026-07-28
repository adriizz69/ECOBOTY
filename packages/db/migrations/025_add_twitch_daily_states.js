export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_daily_states");
  if (!hasTable) {
    await knex.schema.createTable("twitch_daily_states", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.integer("daily_streak").defaultTo(0);
      table.timestamp("last_daily");
      table.unique(["guild_id", "user_discord_id"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_daily_states");
  if (hasTable) {
    await knex.schema.dropTable("twitch_daily_states");
  }
}
