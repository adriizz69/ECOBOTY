import { db } from "./db.js";
import { getDefaultPlan, getPlanByKey } from "./billing-catalog.js";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const parseJsonField = (value, fallback = {}) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

export const FEATURE_ALIASES = Object.freeze({
  twitch_integration: "twitch_module"
});

export const FREE_GAME_MODE_IDS = Object.freeze(["flip"]);

export const resolveFeatureKey = (featureKey) => {
  const key = String(featureKey || "").trim();
  return FEATURE_ALIASES[key] || key;
};

export const getGuildSubscriptionCache = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) return null;
  return db("billing_subscriptions").where({ guild_discord_id: guildId }).first();
};

export const isSubscriptionPremiumActive = (row) => {
  if (!row) return false;
  const status = String(row.status || "").toLowerCase();
  return ACTIVE_STATUSES.has(status) && String(row.plan_key || "") === "premium";
};

export const getEffectivePlanKeyForGuild = async (guildDiscordId) => {
  const cache = await getGuildSubscriptionCache(guildDiscordId);
  if (isSubscriptionPremiumActive(cache)) return "premium";
  return "free";
};

export const getGuildEntitlements = async (guildDiscordId) => {
  const planKey = await getEffectivePlanKeyForGuild(guildDiscordId);
  const plan = (await getPlanByKey(planKey)) || (await getDefaultPlan());
  const cache = await getGuildSubscriptionCache(guildDiscordId);

  return {
    guildId: String(guildDiscordId || ""),
    planKey: plan?.planKey || "free",
    isPremium: planKey === "premium",
    features: parseJsonField(plan?.features, {}),
    limits: parseJsonField(plan?.limits, {}),
    subscription: cache
      ? {
          status: cache.status,
          intervalKey: cache.interval_key,
          currentPeriodEnd: cache.current_period_end,
          cancelAtPeriodEnd: Boolean(cache.cancel_at_period_end)
        }
      : null
  };
};

export const isGuildFeatureEnabled = async (guildDiscordId, featureKey) => {
  const entitlements = await getGuildEntitlements(guildDiscordId);
  const key = resolveFeatureKey(featureKey);
  if (entitlements.features[key] === true) return true;
  if (key.endsWith("_module") && entitlements.isPremium) return true;
  return false;
};

export const getGuildLimit = async (guildDiscordId, limitKey) => {
  const entitlements = await getGuildEntitlements(guildDiscordId);
  const value = entitlements.limits[String(limitKey || "")];
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

export const checkGuildFeatureAccess = async ({ guildId, featureKey, context }) => {
  const enabled = await isGuildFeatureEnabled(guildId, featureKey);
  if (enabled) return { allowed: true };
  return {
    allowed: false,
    reason: "premium_feature_disabled",
    feature_key: resolveFeatureKey(featureKey),
    context: context || null
  };
};

export const assertGuildFeatureAccess = async ({ guildId, featureKey, context }) => {
  const result = await checkGuildFeatureAccess({ guildId, featureKey, context });
  if (!result.allowed) {
    const error = new Error(result.reason || "premium_feature_disabled");
    error.status = 403;
    error.expose = true;
    error.payload = result;
    throw error;
  }
  return result;
};

export const assertGuildLimit = async ({ guildId, limitKey, currentCount, context }) => {
  const max = await getGuildLimit(guildId, limitKey);
  if (max === null || max === undefined) return { allowed: true };
  const count = Number(currentCount || 0);
  if (count < max) return { allowed: true };
  const error = new Error("premium_limit_reached");
  error.status = 403;
  error.expose = true;
  error.payload = {
    reason: "premium_limit_reached",
    limit_key: limitKey,
    max,
    current: count,
    context: context || null
  };
  throw error;
};

export const buildPremiumGuardErrorPayload = (result = {}) => ({
  error: result.reason || "premium_feature_disabled",
  feature_key: result.feature_key || null,
  limit_key: result.limit_key || null,
  context: result.context || null
});

export const getGamesPremiumPolicy = async (guildId) => {
  const entitlements = await getGuildEntitlements(guildId);
  return {
    moduleEnabled: true,
    advancedModesEnabled: Boolean(entitlements.features.games_advanced_modes),
    freeModeIds: [...FREE_GAME_MODE_IDS],
    modesMax: entitlements.limits.games_modes_max ?? null
  };
};

export const getAchievementsPremiumPolicy = async (guildId) => {
  const entitlements = await getGuildEntitlements(guildId);

  if (entitlements.isPremium) {
    const rawUnique = entitlements.limits.achievements_max;
    const numericUnique = Number(rawUnique);
    return {
      moduleEnabled: true,
      tiersEnabled: true,
      badgeCustomizationEnabled: true,
      // Premium: at least 100 uniques (fiche tarifs), even if plan row is stale in DB.
      uniqueMax: Number.isFinite(numericUnique) && numericUnique >= 100 ? numericUnique : 100,
      tiersMax: null
    };
  }

  const rawTiersMax = entitlements.limits.achievement_tiers_max;
  return {
    moduleEnabled: true,
    tiersEnabled: Boolean(entitlements.features.achievements_tiers),
    badgeCustomizationEnabled: Boolean(entitlements.features.achievements_tiers),
    uniqueMax: entitlements.limits.achievements_max ?? 5,
    // null = unlimited. Only default to 1 when the key is missing (Free).
    tiersMax: rawTiersMax === undefined ? 1 : rawTiersMax
  };
};

export const getBirthdayPremiumPolicy = async (guildId) => {
  const entitlements = await getGuildEntitlements(guildId);
  return {
    moduleEnabled: entitlements.features.birthday_module !== false,
    roleAnnouncementsEnabled: entitlements.features.birthday_role_announcements !== false
  };
};

export const getTwitchPremiumPolicy = async (guildId) => {
  const entitlements = await getGuildEntitlements(guildId);
  const advanced = Boolean(entitlements.features.twitch_module);
  return {
    integrationEnabled: true,
    connectEnabled: true,
    messageGainsEnabled:
      entitlements.features.twitch_message_gains !== false || advanced || entitlements.isPremium,
    eventsAdvancedEnabled: advanced,
    watchEnabled: advanced,
    promoEnabled: advanced,
    multipliersEnabled: advanced,
    dailyEnabled: advanced,
    eventsRulesMax: entitlements.limits.twitch_events_rules_max ?? 0
  };
};

export const getShopPremiumPolicy = async (guildId) => {
  const entitlements = await getGuildEntitlements(guildId);
  return {
    multiShopsEnabled: Boolean(entitlements.features.economy_multi_shops),
    shopsMax: entitlements.limits.shops_max ?? 1,
    shopItemsMax: entitlements.limits.shop_items_max ?? 6,
    lootboxEnabled: Boolean(entitlements.features.economy_lootbox),
    marketplaceEnabled: Boolean(entitlements.features.economy_marketplace),
    inventoryAdvancedEnabled: Boolean(entitlements.features.economy_inventory_advanced),
    userShopsEnabled: Boolean(entitlements.features.economy_user_shops)
  };
};

export const getLogsPremiumPolicy = async (guildId) => {
  const entitlements = await getGuildEntitlements(guildId);
  return {
    extendedEnabled: Boolean(entitlements.features.community_logs_extended),
    historyDays: entitlements.limits.logs_history_days ?? 15,
    pagesMax: entitlements.limits.logs_pages_max ?? 3
  };
};

export const resolveLogsPolicyWindow = async ({ guildId, requestedLimit = 50, maxLimit = 10000 }) => {
  const policy = await getLogsPremiumPolicy(guildId);
  const safeRequested = Number(requestedLimit);
  const limit = Number.isFinite(safeRequested)
    ? Math.min(maxLimit, Math.max(1, Math.trunc(safeRequested)))
    : 50;
  const days = Number(policy.historyDays);
  let minCreatedAt = null;
  if (Number.isFinite(days) && days > 0) {
    minCreatedAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
  return {
    limit,
    minCreatedAt,
    historyDays: Number.isFinite(days) ? days : null,
    pagesMax: policy.pagesMax
  };
};

export const getGuildBillingSummary = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "");
  const entitlements = await getGuildEntitlements(guildId);
  const account = await db("billing_accounts").where({ guild_discord_id: guildId }).first();
  const guildRow = await db("guilds")
    .select("name", "icon")
    .where("discord_guild_id", guildId)
    .first();

  return {
    guildId,
    guildName: guildRow?.name || guildId,
    guildIcon: guildRow?.icon || null,
    planKey: entitlements.planKey,
    isPremium: entitlements.isPremium,
    features: entitlements.features,
    limits: entitlements.limits,
    subscription: entitlements.subscription,
    hasBillingAccount: Boolean(account),
    stripeCustomerId: account?.stripe_customer_id || null
  };
};
