export async function up(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("bot_settings", "api_tab_disabled");
  if (!hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.boolean("api_tab_disabled").defaultTo(false);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("bot_settings", "api_tab_disabled");
  if (hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.dropColumn("api_tab_disabled");
    });
  }
}
