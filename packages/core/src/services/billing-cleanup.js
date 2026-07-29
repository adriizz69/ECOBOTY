import { db } from "./db.js";
import { ensureGuild } from "./economy.js";
import { sendLogMessage } from "./logs.js";
import {
  getAchievementsPremiumPolicy,
  getGamesPremiumPolicy,
  getGuildEntitlements,
  getShopPremiumPolicy,
  FREE_GAME_MODE_IDS
} from "./billing-entitlements.js";

const CLEANUP_TABLE = "billing_downgrade_cleanup";
const ACTIVE_CLEANUP_STATUSES = new Set(["pending", "awaiting_choice"]);

const parseJson = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

export const buildDowngradeExtrasSnapshot = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) return { extras: {}, counts: {} };

  const guild = await ensureGuild(guildId, db);
  const shopPolicy = await getShopPremiumPolicy(guildId);
  const achievementPolicy = await getAchievementsPremiumPolicy(guildId);
  const gamesPolicy = await getGamesPremiumPolicy(guildId);

  const serverShops = await db("shops")
    .where({ guild_id: guild.id })
    .whereNull("owner_discord_id")
    .orderBy("id", "asc");
  const userShops = await db("shops")
    .where({ guild_id: guild.id })
    .whereNotNull("owner_discord_id")
    .orderBy("id", "asc");

  const shopItems = [];
  for (const shop of serverShops) {
    const items = await db("shop_items").where({ shop_id: shop.id }).orderBy("id", "asc");
    shopItems.push(
      ...items.map((item) => ({
        id: Number(item.id),
        shopId: Number(shop.id),
        shopName: shop.name,
        name: item.name,
        hidden: Boolean(item.hidden)
      }))
    );
  }

  const achievements = await db("achievement_definitions")
    .where({ guild_id: guild.id })
    .orderBy("id", "asc");
  const uniqueAchievements = achievements
    .filter((row) => String(row.type || "") !== "tier")
    .map((row) => ({
      id: Number(row.id),
      title: row.title,
      type: "unique",
      enabled: Boolean(row.enabled)
    }));
  const tierAchievements = achievements
    .filter((row) => String(row.type || "") === "tier")
    .map((row) => ({
      id: Number(row.id),
      title: row.title,
      type: "tier",
      enabled: Boolean(row.enabled)
    }));

  const roleBoosters = await db("role_modifiers").where({ guild_id: guild.id });
  const channelBoosters = await db("channel_modifiers").where({ guild_id: guild.id });

  const gamesRow = await db("games_settings").where({ guild_id: guild.id }).first();
  let gamesConfig = {};
  if (gamesRow?.config) {
    gamesConfig =
      typeof gamesRow.config === "string" ? parseJson(gamesRow.config, {}) : gamesRow.config || {};
  }
  const enabledAdvancedGames = ["dice", "slot", "roulette", "higherLower", "crash", "double", "mystery"]
    .filter((gameId) => gamesConfig?.[gameId]?.enabled !== false)
    .map((gameId) => ({ id: gameId, label: gameId }));

  const shopsMax = shopPolicy.shopsMax ?? 1;
  const itemsMax = shopPolicy.shopItemsMax ?? 6;
  const uniqueMax = achievementPolicy.uniqueMax ?? 5;
  const tiersMax = achievementPolicy.tiersMax;
  const hasTierCap = tiersMax !== null && tiersMax !== undefined;

  const overShops = serverShops.length > shopsMax;
  const visibleItems = shopItems.filter((item) => !item.hidden);
  const overItems = visibleItems.length > itemsMax;
  const overUnique = uniqueAchievements.length > uniqueMax;
  const overTiers = hasTierCap && tierAchievements.length > Number(tiersMax);
  const hasUserShops = userShops.length > 0 && !shopPolicy.userShopsEnabled;
  const hasBoosters = roleBoosters.length > 0 || channelBoosters.length > 0;
  const hasAdvancedGames = !gamesPolicy.advancedModesEnabled && enabledAdvancedGames.length > 0;

  return {
    extras: {
      shops: overShops
        ? serverShops.map((shop, index) => ({
            id: Number(shop.id),
            name: shop.name,
            enabled: shop.enabled !== false,
            overLimit: index >= shopsMax
          }))
        : [],
      shopItems: overItems
        ? visibleItems.map((item, index) => ({
            ...item,
            overLimit: index >= itemsMax
          }))
        : [],
      uniqueAchievements: overUnique
        ? uniqueAchievements.map((item, index) => ({
            ...item,
            overLimit: index >= uniqueMax
          }))
        : [],
      tierAchievements: overTiers
        ? tierAchievements.map((item, index) => ({
            ...item,
            overLimit: index >= Number(tiersMax)
          }))
        : [],
      userShops: hasUserShops
        ? userShops.map((shop) => ({
            id: Number(shop.id),
            name: shop.name,
            ownerDiscordId: shop.owner_discord_id
          }))
        : [],
      roleBoosters: hasBoosters
        ? roleBoosters.map((row) => ({ id: Number(row.id), roleId: row.role_id }))
        : [],
      channelBoosters: hasBoosters
        ? channelBoosters.map((row) => ({ id: Number(row.id), channelId: row.channel_id }))
        : [],
      advancedGames: hasAdvancedGames ? enabledAdvancedGames : []
    },
    limits: {
      shopsMax,
      shopItemsMax: itemsMax,
      achievementsMax: uniqueMax,
      achievementTiersMax: tiersMax,
      freeGameIds: gamesPolicy.freeModeIds || [...FREE_GAME_MODE_IDS]
    },
    counts: {
      shops: serverShops.length,
      shopItems: visibleItems.length,
      uniqueAchievements: uniqueAchievements.length,
      tierAchievements: tierAchievements.length,
      userShops: userShops.length,
      roleBoosters: roleBoosters.length,
      channelBoosters: channelBoosters.length,
      advancedGames: enabledAdvancedGames.length
    }
  };
};

export const hasDowngradeExtras = (snapshot) => {
  const extras = snapshot?.extras || {};
  return Object.values(extras).some((list) => Array.isArray(list) && list.length > 0);
};

export const getLockedPremiumContent = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) return null;

  const entitlements = await getGuildEntitlements(guildId);
  if (entitlements.isPremium) return null;

  const snapshot = await buildDowngradeExtrasSnapshot(guildId);
  if (!hasDowngradeExtras(snapshot)) return null;

  return {
    guildDiscordId: guildId,
    snapshot
  };
};

/** @deprecated Use getLockedPremiumContent — kept for API compatibility */
export const getPendingDowngradeCleanup = async (guildDiscordId) => {
  const locked = await getLockedPremiumContent(guildDiscordId);
  if (!locked) return null;
  return {
    id: null,
    guildDiscordId: locked.guildDiscordId,
    status: "runtime_locked",
    triggerReason: "subscription_ended",
    dueAt: null,
    createdAt: null,
    snapshot: locked.snapshot
  };
};

export const upsertDowngradeCleanupJob = async ({
  guildDiscordId,
  triggerReason = "subscription_ended"
}) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) return null;

  const entitlements = await getGuildEntitlements(guildId);
  if (entitlements.isPremium) return null;

  const snapshot = await buildDowngradeExtrasSnapshot(guildId);
  const now = new Date();
  const existing = await db(CLEANUP_TABLE).where({ guild_discord_id: guildId }).first();
  const payload = {
    guild_discord_id: guildId,
    status: "resolved",
    trigger_reason: String(triggerReason || "subscription_ended"),
    due_at: now,
    resolved_at: now,
    resolved_by: null,
    resolution: hasDowngradeExtras(snapshot) ? "runtime_lock" : "no_extras",
    snapshot: JSON.stringify(snapshot),
    selection: null,
    updated_at: now
  };

  if (existing) {
    await db(CLEANUP_TABLE).where({ id: existing.id }).update(payload);
  } else {
    await db(CLEANUP_TABLE).insert({ ...payload, created_at: now });
  }

  if (hasDowngradeExtras(snapshot)) {
    await sendLogMessage({
      guildId,
      content:
        "🔒 Premium expiré — ton contenu existant est conservé mais verrouillé. Repasse en Premium pour tout réactiver."
    });
  }

  return null;
};

/** No-op: runtime locks replace destructive cleanup selection. */
export const applyDowngradeCleanupSelection = async () => ({ ok: true, runtimeLock: true });

export const applyRandomDowngradeCleanup = async () => ({ ok: true, skipped: true, runtimeLock: true });

export const notifyPaymentFailed = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) return;
  await sendLogMessage({
    guildId,
    content:
      "💳 Paiement Premium échoué — ton serveur est repassé en Free. Ton contenu existant reste sauvegardé mais verrouillé jusqu'au renouvellement Premium."
  });
  await upsertDowngradeCleanupJob({
    guildDiscordId: guildId,
    triggerReason: "payment_failed"
  });
};

export const processDueDowngradeCleanups = async () => [];

export const startBillingCleanupScheduler = () => {};
