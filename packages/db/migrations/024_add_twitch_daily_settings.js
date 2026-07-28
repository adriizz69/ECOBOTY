export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_daily_settings");
  if (!hasTable) {
    await knex.schema.createTable("twitch_daily_settings", (table) => {
      table.integer("guild_id").unsigned().primary().references("guilds.id").onDelete("CASCADE");
      table.integer("daily_amount").defaultTo(0);
      table.integer("streak_7_bonus_percent").defaultTo(0);
      table.integer("streak_14_bonus_percent").defaultTo(0);
      table.integer("streak_30_bonus_percent").defaultTo(0);
      table.boolean("enabled").defaultTo(true);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_daily_settings");
  if (hasTable) {
    await knex.schema.dropTable("twitch_daily_settings");
  }
}
