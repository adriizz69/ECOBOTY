export async function up(knex) {
  const hasSettings = await knex.schema.hasTable("topgg_settings");
  if (!hasSettings) return;

  const hasSyncEnabled = await knex.schema.hasColumn("topgg_settings", "sync_enabled");
  if (!hasSyncEnabled) {
    await knex.schema.alterTable("topgg_settings", (table) => {
      table.boolean("sync_enabled").notNullable().defaultTo(true);
    });
    await knex("topgg_settings").update({
      sync_enabled: knex.raw("COALESCE(enabled, 1)")
    });
  }

  const hasRewardsEnabled = await knex.schema.hasColumn("topgg_settings", "rewards_enabled");
  if (!hasRewardsEnabled) {
    await knex.schema.alterTable("topgg_settings", (table) => {
      table.boolean("rewards_enabled").notNullable().defaultTo(true);
    });
    await knex("topgg_settings").update({
      rewards_enabled: knex.raw("COALESCE(enabled, 1)")
    });
  }
}

export async function down(knex) {
  const hasSettings = await knex.schema.hasTable("topgg_settings");
  if (!hasSettings) return;

  const hasSyncEnabled = await knex.schema.hasColumn("topgg_settings", "sync_enabled");
  if (hasSyncEnabled) {
    await knex.schema.alterTable("topgg_settings", (table) => {
      table.dropColumn("sync_enabled");
    });
  }

  const hasRewardsEnabled = await knex.schema.hasColumn("topgg_settings", "rewards_enabled");
  if (hasRewardsEnabled) {
    await knex.schema.alterTable("topgg_settings", (table) => {
      table.dropColumn("rewards_enabled");
    });
  }
}
