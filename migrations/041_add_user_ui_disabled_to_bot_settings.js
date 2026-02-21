export async function up(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("bot_settings", "user_ui_disabled");
  if (!hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.boolean("user_ui_disabled").notNullable().defaultTo(false);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("bot_settings", "user_ui_disabled");
  if (hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.dropColumn("user_ui_disabled");
    });
  }
}
