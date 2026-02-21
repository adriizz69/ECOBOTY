export async function up(knex) {
  const hasTable = await knex.schema.hasTable("economy_activity");
  if (!hasTable) {
    await knex.schema.createTable("economy_activity", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.integer("message_count").defaultTo(0);
      table.timestamp("last_voice_reward_at");
      table.unique(["guild_id", "user_discord_id"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("economy_activity");
  if (hasTable) {
    await knex.schema.dropTable("economy_activity");
  }
}
