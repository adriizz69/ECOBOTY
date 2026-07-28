const FREE_FEATURES = {
  economy_multi_shops: false,
  economy_marketplace: false,
  economy_inventory_advanced: false,
  economy_automation_advanced: false,
  economy_daily_bonus: false,
  economy_user_shops: false,
  community_leaderboard_advanced: false,
  community_logs_extended: false,
  community_message_sections: false,
  twitch_module: false,
  twitch_message_gains: true,
  games_advanced_modes: false,
  achievements_tiers: true,
  birthday_module: true,
  birthday_role_announcements: true,
  support_priority: true
};

const FREE_LIMITS = {
  shops_max: 1,
  shop_items_max: 25,
  achievements_max: 5,
  achievement_tiers_max: 1,
  logs_pages_max: 3,
  logs_history_days: 15,
  twitch_events_rules_max: 0,
  games_modes_max: 1
};

const PREMIUM_FEATURES = {
  economy_multi_shops: true,
  economy_marketplace: true,
  economy_inventory_advanced: true,
  economy_automation_advanced: true,
  economy_daily_bonus: true,
  economy_user_shops: true,
  community_leaderboard_advanced: true,
  community_logs_extended: true,
  community_message_sections: true,
  twitch_module: true,
  twitch_message_gains: true,
  games_advanced_modes: true,
  achievements_tiers: true,
  birthday_module: true,
  birthday_role_announcements: true,
  support_priority: true
};

const PREMIUM_LIMITS = {
  shops_max: 10,
  shop_items_max: 100,
  achievements_max: 100,
  achievement_tiers_max: null,
  logs_pages_max: 50,
  logs_history_days: 365,
  twitch_events_rules_max: 20,
  games_modes_max: null
};

const parseJson = (value, fallback = {}) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

export async function up(knex) {
  const hasPlans = await knex.schema.hasTable("billing_plan_definitions");
  if (hasPlans) {
    const free = await knex("billing_plan_definitions").where({ plan_key: "free" }).first();
    if (free) {
      await knex("billing_plan_definitions")
        .where({ plan_key: "free" })
        .update({
          features: JSON.stringify({ ...parseJson(free.features), ...FREE_FEATURES }),
          limits: JSON.stringify({ ...parseJson(free.limits), ...FREE_LIMITS }),
          description: "EcoBoty gratuit pour démarrer sur un petit serveur.",
          updated_at: knex.fn.now()
        });
    }

    const premium = await knex("billing_plan_definitions").where({ plan_key: "premium" }).first();
    if (premium) {
      await knex("billing_plan_definitions")
        .where({ plan_key: "premium" })
        .update({
          features: JSON.stringify({ ...parseJson(premium.features), ...PREMIUM_FEATURES }),
          limits: JSON.stringify({ ...parseJson(premium.limits), ...PREMIUM_LIMITS }),
          description: "Fonctionnalités avancées pour votre serveur Discord.",
          updated_at: knex.fn.now()
        });
    }
  }

  const hasCleanup = await knex.schema.hasTable("billing_downgrade_cleanup");
  if (!hasCleanup) {
    await knex.schema.createTable("billing_downgrade_cleanup", (table) => {
      table.increments("id").primary();
      table.string("guild_discord_id", 32).notNullable().unique();
      table.string("status", 32).notNullable().defaultTo("pending");
      table.string("trigger_reason", 64).nullable();
      table.dateTime("due_at").notNullable();
      table.dateTime("resolved_at").nullable();
      table.string("resolved_by", 32).nullable();
      table.string("resolution", 32).nullable();
      table.json("snapshot").nullable();
      table.json("selection").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
      table.index(["status", "due_at"], "billing_downgrade_cleanup_status_due_idx");
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("billing_downgrade_cleanup");
}
