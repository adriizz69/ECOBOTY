export const up = async (knex) => {
  const hasShops = await knex.schema.hasTable("shops");
  if (hasShops) {
    const hasOwner = await knex.schema.hasColumn("shops", "owner_discord_id");
    if (!hasOwner) {
      await knex.schema.alterTable("shops", (table) => {
        table.string("owner_discord_id").nullable();
        table.index(["guild_id", "owner_discord_id"], "shops_guild_owner_idx");
      });
    }
  }

  const hasBotSettings = await knex.schema.hasTable("bot_settings");
  if (hasBotSettings) {
    const hasEnabled = await knex.schema.hasColumn("bot_settings", "user_shops_enabled");
    if (!hasEnabled) {
      await knex.schema.alterTable("bot_settings", (table) => {
        table.boolean("user_shops_enabled").defaultTo(false);
      });
    }
    const hasTypes = await knex.schema.hasColumn("bot_settings", "user_shop_allowed_types");
    if (!hasTypes) {
      await knex.schema.alterTable("bot_settings", (table) => {
        table.text("user_shop_allowed_types").nullable();
      });
    }
  }
};

export const down = async (knex) => {
  const hasBotSettings = await knex.schema.hasTable("bot_settings");
  if (hasBotSettings) {
    const hasTypes = await knex.schema.hasColumn("bot_settings", "user_shop_allowed_types");
    if (hasTypes) {
      await knex.schema.alterTable("bot_settings", (table) => {
        table.dropColumn("user_shop_allowed_types");
      });
    }
    const hasEnabled = await knex.schema.hasColumn("bot_settings", "user_shops_enabled");
    if (hasEnabled) {
      await knex.schema.alterTable("bot_settings", (table) => {
        table.dropColumn("user_shops_enabled");
      });
    }
  }

  const hasShops = await knex.schema.hasTable("shops");
  if (hasShops) {
    const hasOwner = await knex.schema.hasColumn("shops", "owner_discord_id");
    if (hasOwner) {
      await knex.schema.alterTable("shops", (table) => {
        table.dropIndex(["guild_id", "owner_discord_id"], "shops_guild_owner_idx");
        table.dropColumn("owner_discord_id");
      });
    }
  }
};
