export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_activity");
  if (!hasTable) {
    await knex.schema.createTable("twitch_activity", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("twitch_login").notNullable();
      table.integer("message_count").defaultTo(0);
      table.timestamp("last_watch_reward_at");
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["guild_id", "twitch_login"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_activity");
  if (hasTable) {
    await knex.schema.dropTable("twitch_activity");
  }
}
