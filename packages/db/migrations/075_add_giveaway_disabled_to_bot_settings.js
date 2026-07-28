export const up = async (knex) => {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn("bot_settings", "giveaway_disabled");
  if (!hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.boolean("giveaway_disabled").notNullable().defaultTo(false);
    });
  }
};

export const down = async (knex) => {
  const hasTable = await knex.schema.hasTable("bot_settings");
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn("bot_settings", "giveaway_disabled");
  if (hasColumn) {
    await knex.schema.alterTable("bot_settings", (table) => {
      table.dropColumn("giveaway_disabled");
    });
  }
};
