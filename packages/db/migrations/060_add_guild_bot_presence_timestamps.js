export async function up(knex) {
  const hasGuilds = await knex.schema.hasTable("guilds");
  if (!hasGuilds) return;

  const hasLastSeen = await knex.schema.hasColumn("guilds", "bot_last_seen_at");
  const hasRemovedAt = await knex.schema.hasColumn("guilds", "bot_removed_at");

  if (!hasLastSeen || !hasRemovedAt) {
    await knex.schema.alterTable("guilds", (table) => {
      if (!hasLastSeen) table.timestamp("bot_last_seen_at").nullable();
      if (!hasRemovedAt) table.timestamp("bot_removed_at").nullable();
    });
  }
}

export async function down(knex) {
  const hasGuilds = await knex.schema.hasTable("guilds");
  if (!hasGuilds) return;

  const hasLastSeen = await knex.schema.hasColumn("guilds", "bot_last_seen_at");
  const hasRemovedAt = await knex.schema.hasColumn("guilds", "bot_removed_at");

  if (hasLastSeen || hasRemovedAt) {
    await knex.schema.alterTable("guilds", (table) => {
      if (hasLastSeen) table.dropColumn("bot_last_seen_at");
      if (hasRemovedAt) table.dropColumn("bot_removed_at");
    });
  }
}
