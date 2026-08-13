export async function up(knex) {
  const hasTable = await knex.schema.hasTable("guild_info_message_settings");
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn(
    "guild_info_message_settings",
    "include_everyone_ping"
  );
  if (!hasColumn) {
    await knex.schema.alterTable("guild_info_message_settings", (table) => {
      table.boolean("include_everyone_ping").defaultTo(true);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("guild_info_message_settings");
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn(
    "guild_info_message_settings",
    "include_everyone_ping"
  );
  if (hasColumn) {
    await knex.schema.alterTable("guild_info_message_settings", (table) => {
      table.dropColumn("include_everyone_ping");
    });
  }
}
