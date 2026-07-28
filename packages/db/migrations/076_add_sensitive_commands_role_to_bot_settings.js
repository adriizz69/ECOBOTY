export const up = async (knex) => {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn("bot_settings", "sensitive_commands_role_id");
  if (!hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.string("sensitive_commands_role_id", 64).nullable().after("timezone");
    });
  }
};

export const down = async (knex) => {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn("bot_settings", "sensitive_commands_role_id");
  if (hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.dropColumn("sensitive_commands_role_id");
    });
  }
};
