export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_settings");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("twitch_settings", "live_only");
  if (!hasColumn) {
    await knex.schema.alterTable("twitch_settings", (table) => {
      table.boolean("live_only").notNullable().defaultTo(true);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_settings");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("twitch_settings", "live_only");
  if (hasColumn) {
    await knex.schema.alterTable("twitch_settings", (table) => {
      table.dropColumn("live_only");
    });
  }
}
