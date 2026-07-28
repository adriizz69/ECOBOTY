const DEFAULT_FREE_FEATURES = {
  economy_multi_shops: false,
  economy_marketplace: false,
  economy_inventory_advanced: false,
  economy_automation_advanced: false,
  economy_daily_bonus: false,
  community_leaderboard_advanced: false,
  community_logs_extended: false,
  twitch_module: false,
  games_advanced_modes: false,
  achievements_tiers: false,
  birthday_module: false,
  birthday_role_announcements: false,
  support_priority: false
};

const DEFAULT_FREE_LIMITS = {
  shops_max: 1,
  shop_items_max: 25,
  achievements_max: 10,
  achievement_tiers_max: 1,
  logs_pages_max: 3,
  logs_history_days: 14,
  twitch_events_rules_max: 0,
  games_modes_max: 3
};

const DEFAULT_PREMIUM_FEATURES = {
  economy_multi_shops: true,
  economy_marketplace: true,
  economy_inventory_advanced: true,
  economy_automation_advanced: true,
  economy_daily_bonus: true,
  community_leaderboard_advanced: true,
  community_logs_extended: true,
  twitch_module: true,
  games_advanced_modes: true,
  achievements_tiers: true,
  birthday_module: true,
  birthday_role_announcements: true,
  support_priority: true
};

const DEFAULT_PREMIUM_LIMITS = {
  shops_max: 10,
  shop_items_max: 100,
  achievements_max: 100,
  achievement_tiers_max: null,
  logs_pages_max: 50,
  logs_history_days: 365,
  twitch_events_rules_max: 20,
  games_modes_max: null
};

export async function up(knex) {
  const hasPlans = await knex.schema.hasTable("billing_plan_definitions");
  if (!hasPlans) {
    await knex.schema.createTable("billing_plan_definitions", (table) => {
      table.increments("id").primary();
      table.string("plan_key", 32).notNullable().unique();
      table.string("label", 128).notNullable();
      table.text("description").nullable();
      table.boolean("is_default").notNullable().defaultTo(false);
      table.boolean("is_public").notNullable().defaultTo(true);
      table.string("stripe_product_id", 64).nullable();
      table.string("stripe_price_monthly_id", 64).nullable();
      table.string("stripe_price_quarterly_id", 64).nullable();
      table.string("stripe_price_yearly_id", 64).nullable();
      table.json("features").notNullable();
      table.json("limits").notNullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasAccounts = await knex.schema.hasTable("billing_accounts");
  if (!hasAccounts) {
    await knex.schema.createTable("billing_accounts", (table) => {
      table.increments("id").primary();
      table.string("guild_discord_id", 32).notNullable().unique();
      table.string("payer_discord_id", 32).notNullable().index();
      table.string("stripe_customer_id", 64).notNullable().unique();
      table.boolean("waive_retraction_accepted").notNullable().defaultTo(false);
      table.dateTime("waive_retraction_accepted_at").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasSubs = await knex.schema.hasTable("billing_subscriptions");
  if (!hasSubs) {
    await knex.schema.createTable("billing_subscriptions", (table) => {
      table.increments("id").primary();
      table.string("guild_discord_id", 32).notNullable().unique();
      table.string("stripe_subscription_id", 64).nullable().unique();
      table.string("stripe_price_id", 64).nullable();
      table.string("plan_key", 32).notNullable().defaultTo("free");
      table.string("status", 32).notNullable().defaultTo("free");
      table.string("interval_key", 16).nullable();
      table.dateTime("current_period_start").nullable();
      table.dateTime("current_period_end").nullable();
      table.boolean("cancel_at_period_end").notNullable().defaultTo(false);
      table.dateTime("canceled_at").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasEvents = await knex.schema.hasTable("billing_event_log");
  if (!hasEvents) {
    await knex.schema.createTable("billing_event_log", (table) => {
      table.increments("id").primary();
      table.string("stripe_event_id", 64).notNullable().unique();
      table.string("event_type", 64).notNullable();
      table.string("guild_discord_id", 32).nullable().index();
      table.json("payload").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  const existingFree = await knex("billing_plan_definitions").where({ plan_key: "free" }).first();
  if (!existingFree) {
    await knex("billing_plan_definitions").insert({
      plan_key: "free",
      label: "Free",
      description: "EcoBoty gratuit pour démarrer sur un petit serveur.",
      is_default: true,
      is_public: true,
      features: JSON.stringify(DEFAULT_FREE_FEATURES),
      limits: JSON.stringify(DEFAULT_FREE_LIMITS)
    });
  }

  const existingPremium = await knex("billing_plan_definitions").where({ plan_key: "premium" }).first();
  if (!existingPremium) {
    await knex("billing_plan_definitions").insert({
      plan_key: "premium",
      label: "Premium",
      description: "Fonctionnalités avancées pour votre serveur Discord.",
      is_default: false,
      is_public: true,
      stripe_product_id: process.env.STRIPE_PRODUCT_PREMIUM_ID || "prod_UxcxdnouTh9O2k",
      stripe_price_monthly_id: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || "price_1TxhiPGxvxJvfv9CX2XVQzIg",
      stripe_price_quarterly_id: process.env.STRIPE_PRICE_PREMIUM_QUARTERLY || "price_1TxhiPGxvxJvfv9CtY4xyyO5",
      stripe_price_yearly_id: process.env.STRIPE_PRICE_PREMIUM_YEARLY || "price_1TxhiQGxvxJvfv9CmSvO4CRo",
      features: JSON.stringify(DEFAULT_PREMIUM_FEATURES),
      limits: JSON.stringify(DEFAULT_PREMIUM_LIMITS)
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("billing_event_log");
  await knex.schema.dropTableIfExists("billing_subscriptions");
  await knex.schema.dropTableIfExists("billing_accounts");
  await knex.schema.dropTableIfExists("billing_plan_definitions");
}
