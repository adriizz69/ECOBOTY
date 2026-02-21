export async function up(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasLanguage = await knex.schema.hasColumn("bot_settings", "bot_language");
  const hasTimezone = await knex.schema.hasColumn("bot_settings", "timezone");
  if (!hasLanguage || !hasTimezone) {
    await knex.schema.alterTable("bot_settings", (table) => {
      if (!hasLanguage) table.string("bot_language", 8).defaultTo("fr");
      if (!hasTimezone) table.string("timezone", 64).nullable();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasLanguage = await knex.schema.hasColumn("bot_settings", "bot_language");
  const hasTimezone = await knex.schema.hasColumn("bot_settings", "timezone");
  if (hasLanguage || hasTimezone) {
    await knex.schema.alterTable("bot_settings", (table) => {
      if (hasLanguage) table.dropColumn("bot_language");
      if (hasTimezone) table.dropColumn("timezone");
    });
  }
}
