export async function up(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasEnabled = await knex.schema.hasColumn("bot_settings", "welcome_enabled");
  const hasFr = await knex.schema.hasColumn("bot_settings", "welcome_message_fr");
  const hasEn = await knex.schema.hasColumn("bot_settings", "welcome_message_en");
  const hasEs = await knex.schema.hasColumn("bot_settings", "welcome_message_es");
  if (!hasEnabled || !hasFr || !hasEn || !hasEs) {
    await knex.schema.alterTable("bot_settings", (table) => {
      if (!hasEnabled) table.boolean("welcome_enabled").defaultTo(true);
      if (!hasFr) table.text("welcome_message_fr").nullable();
      if (!hasEn) table.text("welcome_message_en").nullable();
      if (!hasEs) table.text("welcome_message_es").nullable();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasEnabled = await knex.schema.hasColumn("bot_settings", "welcome_enabled");
  const hasFr = await knex.schema.hasColumn("bot_settings", "welcome_message_fr");
  const hasEn = await knex.schema.hasColumn("bot_settings", "welcome_message_en");
  const hasEs = await knex.schema.hasColumn("bot_settings", "welcome_message_es");
  if (hasEnabled || hasFr || hasEn || hasEs) {
    await knex.schema.alterTable("bot_settings", (table) => {
      if (hasEnabled) table.dropColumn("welcome_enabled");
      if (hasFr) table.dropColumn("welcome_message_fr");
      if (hasEn) table.dropColumn("welcome_message_en");
      if (hasEs) table.dropColumn("welcome_message_es");
    });
  }
}
