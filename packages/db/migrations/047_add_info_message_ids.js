export async function up(knex) {
  const hasTable = await knex.schema.hasTable("guild_info_message_settings");
  if (!hasTable) return;
  const hasMessageIds = await knex.schema.hasColumn("guild_info_message_settings", "message_ids");
  if (!hasMessageIds) {
    await knex.schema.alterTable("guild_info_message_settings", (table) => {
      table.json("message_ids").nullable();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("guild_info_message_settings");
  if (!hasTable) return;
  const hasMessageIds = await knex.schema.hasColumn("guild_info_message_settings", "message_ids");
  if (hasMessageIds) {
    await knex.schema.alterTable("guild_info_message_settings", (table) => {
      table.dropColumn("message_ids");
    });
  }
}
