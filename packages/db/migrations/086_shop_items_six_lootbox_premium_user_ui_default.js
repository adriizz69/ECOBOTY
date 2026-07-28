const FREE_FEATURES_PATCH = {
  economy_lootbox: false
};

const PREMIUM_FEATURES_PATCH = {
  economy_lootbox: true
};

const FREE_LIMITS_PATCH = {
  shop_items_max: 6
};

const PREMIUM_LIMITS_PATCH = {
  shop_items_max: 6
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
          features: JSON.stringify({ ...parseJson(free.features), ...FREE_FEATURES_PATCH }),
          limits: JSON.stringify({ ...parseJson(free.limits), ...FREE_LIMITS_PATCH }),
          updated_at: knex.fn.now()
        });
    }
    const premium = await knex("billing_plan_definitions").where({ plan_key: "premium" }).first();
    if (premium) {
      await knex("billing_plan_definitions")
        .where({ plan_key: "premium" })
        .update({
          features: JSON.stringify({ ...parseJson(premium.features), ...PREMIUM_FEATURES_PATCH }),
          limits: JSON.stringify({ ...parseJson(premium.limits), ...PREMIUM_LIMITS_PATCH }),
          updated_at: knex.fn.now()
        });
    }
  }

  const hasGuilds = await knex.schema.hasTable("guilds");
  if (hasGuilds && (await knex.schema.hasColumn("guilds", "user_ui_disabled"))) {
    await knex("guilds").update({ user_ui_disabled: false });
  }

  const hasBotSettings = await knex.schema.hasTable("bot_settings");
  if (hasBotSettings && (await knex.schema.hasColumn("bot_settings", "user_ui_disabled"))) {
    await knex("bot_settings").update({ user_ui_disabled: false });
  }
}

export async function down(knex) {
  const hasPlans = await knex.schema.hasTable("billing_plan_definitions");
  if (!hasPlans) return;

  const free = await knex("billing_plan_definitions").where({ plan_key: "free" }).first();
  if (free) {
    const features = parseJson(free.features);
    delete features.economy_lootbox;
    const limits = { ...parseJson(free.limits), shop_items_max: 25 };
    await knex("billing_plan_definitions")
      .where({ plan_key: "free" })
      .update({
        features: JSON.stringify(features),
        limits: JSON.stringify(limits),
        updated_at: knex.fn.now()
      });
  }

  const premium = await knex("billing_plan_definitions").where({ plan_key: "premium" }).first();
  if (premium) {
    const features = parseJson(premium.features);
    delete features.economy_lootbox;
    const limits = { ...parseJson(premium.limits), shop_items_max: 100 };
    await knex("billing_plan_definitions")
      .where({ plan_key: "premium" })
      .update({
        features: JSON.stringify(features),
        limits: JSON.stringify(limits),
        updated_at: knex.fn.now()
      });
  }
}
