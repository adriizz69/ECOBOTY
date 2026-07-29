import { db } from "./db.js";
import { getAchievementsPremiumPolicy, getShopPremiumPolicy } from "./billing-entitlements.js";

export const applyRuntimeAchievementLocks = async (guildDiscordId, achievements = []) => {
  const guildId = String(guildDiscordId || "").trim();
  const list = Array.isArray(achievements) ? achievements : [];
  if (!guildId || !list.length) {
    return list.map((item) => ({ ...item, premium_locked: false, premium_lock_reason: null }));
  }

  const policy = await getAchievementsPremiumPolicy(guildId);
  const uniqueMax = policy.uniqueMax ?? 5;
  const tiersMax = policy.tiersMax;

  const uniqueOrdered = list
    .filter((item) => String(item.type || "") !== "tier")
    .sort((a, b) => Number(a.id) - Number(b.id));
  const tierOrdered = list
    .filter((item) => String(item.type || "") === "tier")
    .sort((a, b) => Number(a.id) - Number(b.id));

  const lockedIds = new Set();
  uniqueOrdered.forEach((item, index) => {
    if (uniqueMax !== null && uniqueMax !== undefined && index >= Number(uniqueMax)) {
      lockedIds.add(Number(item.id));
    }
  });
  tierOrdered.forEach((item, index) => {
    if (tiersMax !== null && tiersMax !== undefined && index >= Number(tiersMax)) {
      lockedIds.add(Number(item.id));
    }
  });

  return list.map((item) => {
    const premiumLocked = lockedIds.has(Number(item.id));
    return {
      ...item,
      premium_locked: premiumLocked,
      premium_lock_reason: premiumLocked ? "premium_limit_exceeded" : null
    };
  });
};

export const getRuntimeLockedAchievementIds = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) return new Set();

  const guild = await db("guilds").where({ discord_guild_id: guildId }).first();
  if (!guild) return new Set();

  const rows = await db("achievement_definitions")
    .where({ guild_id: guild.id })
    .orderBy("id", "asc");
  const withLocks = await applyRuntimeAchievementLocks(
    guildId,
    rows.map((row) => ({
      id: Number(row.id),
      type: row.type === "tier" ? "tier" : "unique"
    }))
  );
  return new Set(
    withLocks.filter((item) => item.premium_locked).map((item) => Number(item.id))
  );
};

const countVisibleServerItemsBeforeShop = async (guildInternalId, shopId) => {
  const shops = await db("shops")
    .where({ guild_id: guildInternalId })
    .whereNull("owner_discord_id")
    .orderBy("id", "asc");
  let count = 0;
  for (const shop of shops) {
    if (Number(shop.id) >= Number(shopId)) break;
    const row = await db("shop_items")
      .where({ shop_id: shop.id })
      .andWhere((builder) => builder.where({ hidden: false }).orWhereNull("hidden"))
      .count("* as count")
      .first();
    count += Number(row?.count || row?.["count(*)"] || 0);
  }
  return count;
};

export const applyRuntimeItemLocks = async ({
  guildDiscordId,
  items = [],
  itemIndexOffset = 0
} = {}) => {
  const guildId = String(guildDiscordId || "").trim();
  const list = Array.isArray(items) ? items : [];
  if (!guildId || !list.length) {
    return list.map((item) => ({ ...item, premium_locked: false, premium_lock_reason: null }));
  }

  const policy = await getShopPremiumPolicy(guildId);
  const itemsMax = policy.shopItemsMax ?? 6;

  return list.map((item, index) => {
    const globalIndex = itemIndexOffset + index;
    const overLimit = itemsMax !== null && globalIndex >= itemsMax;
    const lootboxLocked =
      !policy.lootboxEnabled && String(item.type || "").toLowerCase() === "lootbox";
    const premiumLocked = overLimit || lootboxLocked;
    return {
      ...item,
      premium_locked: premiumLocked,
      premium_lock_reason: lootboxLocked
        ? "premium_feature_disabled"
        : premiumLocked
          ? "premium_limit_exceeded"
          : null
    };
  });
};

export const resolveItemLockOffset = async (shopRow) => {
  if (!shopRow?.guild_id || !shopRow?.id) return 0;
  return countVisibleServerItemsBeforeShop(Number(shopRow.guild_id), Number(shopRow.id));
};

export const applyRuntimeUserShopLocks = async (guildDiscordId, shops = []) => {
  const guildId = String(guildDiscordId || "").trim();
  const list = Array.isArray(shops) ? shops : [];
  if (!guildId || !list.length) {
    return list.map((shop) => ({ ...shop, premium_locked: false, premium_lock_reason: null }));
  }

  const policy = await getShopPremiumPolicy(guildId);
  const locked = !policy.userShopsEnabled && list.length > 0;
  return list.map((shop) => ({
    ...shop,
    premium_locked: locked,
    premium_lock_reason: locked ? "premium_feature_disabled" : null
  }));
};
