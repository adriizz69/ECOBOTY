const TABLES = {
  settings: "achievement_settings",
  definitions: "achievement_definitions",
  tiers: "achievement_tiers",
  progress: "achievement_progress",
  marks: "achievement_event_marks",
  shopCooldowns: "achievement_shop_view_cooldowns"
};

const dropIfExists = async (knex, name) => {
  const exists = await knex.schema.hasTable(name);
  if (exists) {
    await knex.schema.dropTable(name);
  }
};

export async function up(knex) {
  const hasGuilds = await knex.schema.hasTable("guilds");
  if (!hasGuilds) return;

  const hasSettings = await knex.schema.hasTable(TABLES.settings);
  if (!hasSettings) {
    await knex.schema.createTable(TABLES.settings, (table) => {
      table.integer("guild_id").unsigned().primary().references("guilds.id").onDelete("CASCADE");
      table.boolean("enabled").notNullable().defaultTo(false);
      table.string("announce_channel_id").nullable();
      table.integer("web_shop_view_cooldown_seconds").notNullable().defaultTo(60);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasDefinitions = await knex.schema.hasTable(TABLES.definitions);
  if (!hasDefinitions) {
    await knex.schema.createTable(TABLES.definitions, (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.enum("type", ["unique", "tier"]).notNullable().defaultTo("unique");
      table.string("event_key").notNullable();
      table.string("title").notNullable();
      table.text("description").nullable();
      table.boolean("enabled").notNullable().defaultTo(true);
      table.dateTime("expires_at").nullable();
      table.bigInteger("threshold").notNullable().defaultTo(1);

      table.string("badge_shape").notNullable().defaultTo("hexagon");
      table.string("badge_color").notNullable().defaultTo("purple");
      table.string("badge_icon").notNullable().defaultTo("trophy");

      table.boolean("notify_progress_enabled").notNullable().defaultTo(false);
      table.integer("notify_progress_percent").notNullable().defaultTo(75);
      table.boolean("notify_unlock_enabled").notNullable().defaultTo(true);

      table.boolean("reward_add_roles_enabled").notNullable().defaultTo(false);
      table.json("reward_add_role_ids").nullable();
      table.boolean("reward_remove_roles_enabled").notNullable().defaultTo(false);
      table.json("reward_remove_role_ids").nullable();
      table.boolean("reward_currency_enabled").notNullable().defaultTo(false);
      table.bigInteger("reward_currency_amount").notNullable().defaultTo(0);

      table.boolean("completion_reward_add_roles_enabled").notNullable().defaultTo(false);
      table.json("completion_reward_add_role_ids").nullable();
      table.boolean("completion_reward_remove_roles_enabled").notNullable().defaultTo(false);
      table.json("completion_reward_remove_role_ids").nullable();
      table.boolean("completion_reward_currency_enabled").notNullable().defaultTo(false);
      table.bigInteger("completion_reward_currency_amount").notNullable().defaultTo(0);

      table.integer("sort_order").notNullable().defaultTo(0);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
      table.index(["guild_id", "enabled"], "achievement_definitions_guild_enabled_idx");
      table.index(["guild_id", "event_key"], "achievement_definitions_guild_event_idx");
    });
  }

  const hasTiers = await knex.schema.hasTable(TABLES.tiers);
  if (!hasTiers) {
    await knex.schema.createTable(TABLES.tiers, (table) => {
      table.increments("id").primary();
      table
        .integer("achievement_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable(TABLES.definitions)
        .onDelete("CASCADE");
      table.enum("tier_key", ["bronze", "silver", "gold", "diamond"]).notNullable();
      table.string("title").notNullable();
      table.bigInteger("threshold").notNullable().defaultTo(1);
      table.boolean("enabled").notNullable().defaultTo(false);

      table.string("badge_shape").notNullable().defaultTo("hexagon");
      table.string("badge_color").notNullable().defaultTo("purple");
      table.string("badge_icon").notNullable().defaultTo("trophy");

      table.boolean("notify_progress_enabled").notNullable().defaultTo(false);
      table.integer("notify_progress_percent").notNullable().defaultTo(75);
      table.boolean("notify_unlock_enabled").notNullable().defaultTo(true);

      table.boolean("reward_add_roles_enabled").notNullable().defaultTo(false);
      table.json("reward_add_role_ids").nullable();
      table.boolean("reward_remove_roles_enabled").notNullable().defaultTo(false);
      table.json("reward_remove_role_ids").nullable();
      table.boolean("reward_currency_enabled").notNullable().defaultTo(false);
      table.bigInteger("reward_currency_amount").notNullable().defaultTo(0);

      table.integer("sort_order").notNullable().defaultTo(0);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
      table.unique(["achievement_id", "tier_key"], "achievement_tiers_unique_key");
    });
  }

  const hasProgress = await knex.schema.hasTable(TABLES.progress);
  if (!hasProgress) {
    await knex.schema.createTable(TABLES.progress, (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table
        .integer("achievement_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable(TABLES.definitions)
        .onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.enum("scope_type", ["unique", "tier", "completion"]).notNullable().defaultTo("unique");
      table.integer("scope_id").unsigned().notNullable().defaultTo(0);
      table.bigInteger("progress_count").notNullable().defaultTo(0);
      table.boolean("progress_notified").notNullable().defaultTo(false);
      table.dateTime("completed_at").nullable();
      table.boolean("reward_applied").notNullable().defaultTo(false);
      table.boolean("unlock_notified").notNullable().defaultTo(false);
      table.boolean("announced").notNullable().defaultTo(false);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
      table.unique(
        ["guild_id", "achievement_id", "user_discord_id", "scope_type", "scope_id"],
        "achievement_progress_unique_scope"
      );
      table.index(["guild_id", "user_discord_id"], "achievement_progress_user_idx");
    });
  }

  const hasMarks = await knex.schema.hasTable(TABLES.marks);
  if (!hasMarks) {
    await knex.schema.createTable(TABLES.marks, (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.string("mark_key").notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.unique(["guild_id", "user_discord_id", "mark_key"], "achievement_marks_unique");
    });
  }

  const hasCooldowns = await knex.schema.hasTable(TABLES.shopCooldowns);
  if (!hasCooldowns) {
    await knex.schema.createTable(TABLES.shopCooldowns, (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.enum("source", ["web", "discord"]).notNullable().defaultTo("web");
      table.dateTime("last_counted_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
      table.unique(
        ["guild_id", "user_discord_id", "source"],
        "achievement_shop_view_cooldowns_unique_source"
      );
    });
  }
}

export async function down(knex) {
  await dropIfExists(knex, TABLES.shopCooldowns);
  await dropIfExists(knex, TABLES.marks);
  await dropIfExists(knex, TABLES.progress);
  await dropIfExists(knex, TABLES.tiers);
  await dropIfExists(knex, TABLES.definitions);
  await dropIfExists(knex, TABLES.settings);
}
