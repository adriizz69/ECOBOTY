import { db } from "./db.js";
import { ensureGuild, getOrCreateBalance, getOrCreateSettings } from "./economy.js";
import { insertEventLog, sendLogMessage } from "./logs.js";
import { upsertTempRoleAssignment } from "./admin.js";

const readCountValue = (row = {}) => {
  const firstValue = Object.values(row || {})[0];
  const numeric = Number(
    row?.count
    ?? row?.["count(*)"]
    ?? row?.["count(`id`)"]
    ?? row?.["count(id)"]
    ?? firstValue
    ?? 0
  );
  return Number.isFinite(numeric) ? numeric : 0;
};

const applyRuntimeShopLocks = async ({ guildId, shops = [], bypassPremiumLocks = false } = {}) => {
  if (bypassPremiumLocks) {
    return (Array.isArray(shops) ? shops : []).map((shop) => ({
      ...shop,
      premium_locked: false,
      premium_lock_reason: null
    }));
  }
  const policy = await getShopPremiumPolicy(guildId);
  const shopsMax = policy.shopsMax ?? 1;
  return (Array.isArray(shops) ? shops : []).map((shop, index) => {
    const locked = !policy.multiShopsEnabled && index > 0;
    const overLimit = shopsMax !== null && index >= shopsMax;
    const premiumLocked = locked || overLimit;
    return {
      ...shop,
      premium_locked: premiumLocked,
      premium_lock_reason: premiumLocked ? "premium_feature_disabled" : null
    };
  });
};

const assertShopRuntimeAccess = async ({
  guildId,
  guildInternalId,
  shopId = null,
  context = "shop.runtime",
  bypassPremiumLocks = false
}) => {
  if (bypassPremiumLocks) return;
  const policy = await getShopPremiumPolicy(guildId);
  if (shopId) {
    const shops = await db("shops")
      .where({ guild_id: guildInternalId })
      .orderBy("id", "asc");
    const index = shops.findIndex((row) => Number(row.id) === Number(shopId));
    if (index > 0 && !policy.multiShopsEnabled) {
      await assertGuildFeatureAccess({
        guildId,
        featureKey: "economy_multi_shops",
        context
      });
    }
    if (policy.shopsMax !== null && index >= policy.shopsMax) {
      await assertGuildLimit({
        guildId,
        limitKey: "shops_max",
        currentCount: index + 1,
        context
      });
    }
    return;
  }

  const shopCount = await db("shops").where({ guild_id: guildInternalId }).count("* as count").first();
  const count = readCountValue(shopCount);
  if (count >= 1 && !policy.multiShopsEnabled) {
    await assertGuildFeatureAccess({
      guildId,
      featureKey: "economy_multi_shops",
      context
    });
  }
  await assertGuildLimit({
    guildId,
    limitKey: "shops_max",
    currentCount: count,
    context
  });
};

import {
  assertGuildFeatureAccess,
  assertGuildLimit,
  getShopPremiumPolicy
} from "./billing-entitlements.js";
import {
  applyRuntimeItemLocks,
  applyRuntimeUserShopLocks,
  resolveItemLockOffset
} from "./billing-runtime-locks.js";

const USER_SHOP_TYPE_ALLOWLIST = Object.freeze(["inventory", "irl"]);

const assertUserShopsFeature = async (guildId, context = "shop.user") => {
  const policy = await getShopPremiumPolicy(guildId);
  if (policy.userShopsEnabled) return;
  await assertGuildFeatureAccess({
    guildId,
    featureKey: "economy_user_shops",
    context
  });
};

const parseJsonMaybe = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

export const normalizeUserShopAllowedTypes = (value) => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? parseJsonMaybe(value, [])
      : [];
  const list = (Array.isArray(raw) ? raw : [])
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter((entry) => USER_SHOP_TYPE_ALLOWLIST.includes(entry));
  return list.length ? Array.from(new Set(list)) : ["inventory", "irl"];
};

export const getUserShopsSettings = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const hasEnabled = await trx.schema.hasColumn("bot_settings", "user_shops_enabled");
  const hasTypes = await trx.schema.hasColumn("bot_settings", "user_shop_allowed_types");
  if (!hasEnabled && !hasTypes) {
    return { enabled: false, allowedTypes: ["inventory"] };
  }
  const row = await trx("bot_settings").where({ guild_id: guild.id }).first();
  return {
    enabled: hasEnabled ? Boolean(row?.user_shops_enabled) : false,
    allowedTypes: hasTypes
      ? normalizeUserShopAllowedTypes(row?.user_shop_allowed_types)
      : ["inventory"]
  };
};

export const saveUserShopsSettings = async (guildId, data = {}) => {
  if (data.enabled !== false) {
    await assertUserShopsFeature(guildId, "shop.user.settings");
  }
  const guild = await ensureGuild(guildId, db);
  const hasEnabled = await db.schema.hasColumn("bot_settings", "user_shops_enabled");
  const hasTypes = await db.schema.hasColumn("bot_settings", "user_shop_allowed_types");
  if (!hasEnabled && !hasTypes) {
    throw new Error("user_shops_not_migrated");
  }

  const payload = { updated_at: new Date() };
  if (hasEnabled && Object.prototype.hasOwnProperty.call(data, "enabled")) {
    payload.user_shops_enabled = data.enabled === false ? false : true;
  }
  if (hasTypes && Object.prototype.hasOwnProperty.call(data, "allowedTypes")) {
    payload.user_shop_allowed_types = JSON.stringify(normalizeUserShopAllowedTypes(data.allowedTypes));
  }

  const existing = await db("bot_settings").where({ guild_id: guild.id }).first();
  if (existing) {
    await db("bot_settings").where({ guild_id: guild.id }).update(payload);
  } else {
    await db("bot_settings").insert({
      guild_id: guild.id,
      log_channel_id: null,
      user_ui_disabled: false,
      bot_language: "fr",
      timezone: null,
      welcome_enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...(hasEnabled
        ? { user_shops_enabled: Object.prototype.hasOwnProperty.call(payload, "user_shops_enabled")
            ? payload.user_shops_enabled
            : false }
        : {}),
      ...(hasTypes
        ? {
            user_shop_allowed_types: Object.prototype.hasOwnProperty.call(payload, "user_shop_allowed_types")
              ? payload.user_shop_allowed_types
              : JSON.stringify(["inventory"])
          }
        : {})
    });
  }
  return getUserShopsSettings(guildId);
};

const isServerShopRow = (shop) => !shop?.owner_discord_id;

export const listShops = async (guildId, options = {}) => {
  const guild = await ensureGuild(guildId, db);
  const query = db("shops").where({ guild_id: guild.id });
  const scope = String(options.scope || "server").toLowerCase();
  const bypassPremiumLocks = Boolean(options.bypassPremiumLocks);
  if (scope === "server") {
    query.whereNull("owner_discord_id");
  } else if (scope === "user") {
    query.whereNotNull("owner_discord_id");
  }
  if (options.ownerId) {
    query.andWhere({ owner_discord_id: String(options.ownerId) });
  }
  const rows = await query.orderBy("id", "asc");
  let withLocks =
    scope === "user"
      ? rows.map((shop) => ({ ...shop, premium_locked: false, premium_lock_reason: null }))
      : await applyRuntimeShopLocks({
          guildId: String(guildId),
          shops: rows.filter(isServerShopRow),
          bypassPremiumLocks
        });

  if (scope === "user" && withLocks.length) {
    withLocks = await applyRuntimeUserShopLocks(String(guildId), withLocks);
    const ownerIds = Array.from(
      new Set(withLocks.map((shop) => String(shop.owner_discord_id || "")).filter(Boolean))
    );
    if (ownerIds.length) {
      const owners = await db("users")
        .whereIn("discord_id", ownerIds)
        .select("discord_id", "username", "avatar");
      const byId = Object.fromEntries(
        owners.map((entry) => [String(entry.discord_id), entry])
      );
      withLocks = withLocks.map((shop) => {
        const owner = byId[String(shop.owner_discord_id)] || null;
        return {
          ...shop,
          owner_username: owner?.username || null,
          owner_avatar: owner?.avatar || null
        };
      });
    }
  }

  if (options.enabledOnly) {
    return withLocks.filter((shop) => shop.enabled !== false && !shop.premium_locked);
  }
  return withLocks;
};

const SHOP_AVAILABILITY_MAX_YEARS = 5;

const normalizeDateTime = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value);
  const normalized = raw.includes("T") ? raw.replace("T", " ") : raw;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  return normalized;
};

const parseAvailabilityDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(raw)) {
    throw new Error("invalid_availability_date");
  }
  const normalized = raw.includes("T") ? raw.replace("T", " ") : raw;
  const withSeconds = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)
    ? `${normalized}:00`
    : normalized;
  const date = new Date(withSeconds.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) throw new Error("invalid_availability_date");
  const year = date.getFullYear();
  if (year < 2000 || year > 2100) throw new Error("invalid_availability_date");
  return date;
};

const assertShopAvailabilityDates = (from, to) => {
  const now = new Date();
  now.setSeconds(0, 0);
  const maxDate = new Date(now);
  maxDate.setFullYear(maxDate.getFullYear() + SHOP_AVAILABILITY_MAX_YEARS);

  const fromDate = parseAvailabilityDate(from);
  const toDate = parseAvailabilityDate(to);

  if (fromDate) {
    if (fromDate < now) throw new Error("availability_from_past");
    if (fromDate > maxDate) throw new Error("availability_date_too_far");
  }
  if (toDate) {
    if (toDate < now) throw new Error("availability_to_past");
    if (toDate > maxDate) throw new Error("availability_date_too_far");
  }
  if (fromDate && toDate && fromDate > toDate) {
    throw new Error("availability_range_invalid");
  }
};

const normalizeRequiredRolesMode = (value) => {
  const mode = String(value || "").trim().toLowerCase();
  return mode === "any" ? "any" : "all";
};

export const createShop = async (guildId, data, options = {}) => {
  const guild = await ensureGuild(guildId, db);

  await assertShopRuntimeAccess({
    guildId: String(guildId),
    guildInternalId: guild.id,
    context: "shop.runtime.create",
    bypassPremiumLocks: Boolean(options.bypassPremiumLocks)
  });

  const roleIds = Array.isArray(data.required_role_ids)
    ? data.required_role_ids.filter(Boolean)
    : null;
  const payload = {
    guild_id: guild.id,
    name: data.name,
    owner_discord_id: null,
    required_role_id: data.required_role_id || null,
    required_role_ids: roleIds ? JSON.stringify(roleIds) : null,
    required_roles_mode: normalizeRequiredRolesMode(data.required_roles_mode),
    discount_percent: Number(data.discount_percent || 0),
    enabled: data.enabled === false ? false : true,
    image_url: data.image_url || null,
    description: data.description || null
  };
  const [id] = await db("shops").insert(payload);
  return db("shops").where({ id }).first();
};

export const updateShop = async (guildId, shopId, data, options = {}) => {
  const guild = await ensureGuild(guildId, db);
  const shop = await db("shops").where({ id: shopId, guild_id: guild.id }).first();
  if (!shop) throw new Error("shop_not_found");

  await assertShopRuntimeAccess({
    guildId: String(guildId),
    guildInternalId: guild.id,
    shopId: shop.id,
    context: "shop.runtime.update",
    bypassPremiumLocks: Boolean(options.bypassPremiumLocks)
  });

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(data, "name")) payload.name = data.name;
  if (Object.prototype.hasOwnProperty.call(data, "required_role_id")) {
    payload.required_role_id = data.required_role_id || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "required_role_ids")) {
    const roleIds = Array.isArray(data.required_role_ids)
      ? data.required_role_ids.filter(Boolean)
      : null;
    payload.required_role_ids = roleIds ? JSON.stringify(roleIds) : null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "required_roles_mode")) {
    payload.required_roles_mode = normalizeRequiredRolesMode(data.required_roles_mode);
  }
  if (Object.prototype.hasOwnProperty.call(data, "discount_percent")) {
    payload.discount_percent = Number(data.discount_percent || 0);
  }
  if (Object.prototype.hasOwnProperty.call(data, "enabled")) {
    payload.enabled = data.enabled === false ? false : true;
  }
  if (Object.prototype.hasOwnProperty.call(data, "image_url")) {
    payload.image_url = data.image_url || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    payload.description = data.description || null;
  }
  if (Object.keys(payload).length > 0) {
    await db("shops").where({ id: shop.id, guild_id: guild.id }).update(payload);
  }
  return db("shops").where({ id: shop.id }).first();
};

export const listItems = async (shopId, options = {}) => {
  const shop = await db("shops").where({ id: shopId }).first();
  if (!shop) return [];
  const guildInternalId = Number(shop.guild_id || 0) || null;
  if (options.enforceShopAccess !== false && guildInternalId) {
    const guildRow = await db("guilds")
      .select("discord_guild_id")
      .where({ id: guildInternalId })
      .first();
    const guildDiscordId = String(guildRow?.discord_guild_id || "").trim();
    if (guildDiscordId) {
      await assertShopRuntimeAccess({
        guildId: guildDiscordId,
        guildInternalId,
        shopId: shop.id,
        context: "shop.runtime.list_items"
      });
    }
  }

  const query = db("shop_items").where({ shop_id: shopId });
  if (!options.includeHidden) {
    query.andWhere((builder) => builder.where({ hidden: false }).orWhereNull("hidden"));
  }
  if (!options.includeUnavailable) {
    const now = new Date();
    query.andWhere((builder) =>
      builder.whereNull("available_from").orWhere("available_from", "<=", now)
    );
    query.andWhere((builder) =>
      builder.whereNull("available_to").orWhere("available_to", ">=", now)
    );
  }
  const items = await query.orderBy("id", "asc");
  if (!items.length) return [];

  let guildDiscordId = options.guildDiscordId || null;
  if (!guildDiscordId && guildInternalId) {
    const guildRow = await db("guilds")
      .select("discord_guild_id")
      .where({ id: guildInternalId })
      .first();
    guildDiscordId = String(guildRow?.discord_guild_id || "").trim() || null;
  }

  const itemIndexOffset =
    options.itemIndexOffset !== undefined
      ? Number(options.itemIndexOffset)
      : guildDiscordId
        ? await resolveItemLockOffset(shop)
        : 0;

  const mapWithLocks = async (mappedItems) => {
    if (!guildDiscordId) {
      return mappedItems.map((item) => ({
        ...item,
        premium_locked: false,
        premium_lock_reason: null
      }));
    }
    return applyRuntimeItemLocks({
      guildDiscordId,
      items: mappedItems,
      itemIndexOffset
    });
  };

  const lootboxRewardIds = new Set();
  for (const item of items) {
    if (item.type !== "lootbox") continue;
    let data = item.data || null;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = null;
      }
    }
    const dataObj = data && typeof data === "object" ? data : {};
    const rawEntries = Array.isArray(dataObj.lootbox)
      ? dataObj.lootbox
      : Array.isArray(dataObj.lootbox_items)
      ? dataObj.lootbox_items
      : Array.isArray(dataObj.rewards)
      ? dataObj.rewards
      : [];
    for (const entry of rawEntries) {
      if (!entry || typeof entry !== "object") continue;
      const entryId = entry.item_id ?? entry.itemId ?? null;
      if (entryId) lootboxRewardIds.add(String(entryId));
    }
  }
  if (!options.withInventoryCounts) {
    const mapped = items.map((item) => ({
      ...item,
      lootbox_reward: lootboxRewardIds.has(String(item.id))
    }));
    const withLocks = await mapWithLocks(mapped);
    if (options.availableOnly) {
      return withLocks.filter((item) => !item.premium_locked);
    }
    return withLocks;
  }

  let guildId = options.guildId;
  if (!guildId) {
    guildId = shop?.guild_id || null;
  }
  if (!items.length) return [];

  const ids = items.map((item) => item.id);
  if (!guildId || !ids.length) {
    const mapped = items.map((item) => ({ ...item, inventory_quantity: 0 }));
    return mapWithLocks(mapped);
  }

  const totals = await db("inventory")
    .where({ guild_id: guildId })
    .whereIn("item_id", ids)
    .groupBy("item_id")
    .sum({ quantity: "quantity" });

  const totalMap = new Map(
    (totals || []).map((row) => [String(row.item_id), Number(row.quantity || 0)])
  );

  const mapped = items.map((item) => ({
    ...item,
    lootbox_reward: lootboxRewardIds.has(String(item.id)),
    inventory_quantity: totalMap.get(String(item.id)) || 0
  }));
  return mapWithLocks(mapped);
};

export const listInventory = async ({ guildId, userId }) => {
  const guild = await ensureGuild(guildId, db);
  return db("inventory")
    .where({ guild_id: guild.id, user_discord_id: String(userId) })
    .andWhere("quantity", ">", 0)
    .join("shop_items", "inventory.item_id", "shop_items.id")
    .whereIn("shop_items.type", ["inventory", "lootbox", "role", "temp_role", "irl"])
    .select(
      "inventory.item_id as item_id",
      "inventory.quantity as quantity",
      "shop_items.name as name",
      "shop_items.type as type",
      "shop_items.description as description",
      "shop_items.data as data",
      "shop_items.image_url as image_url"
    )
    .orderBy("shop_items.id", "asc");
};

export const listSales = async ({ guildId }) => {
  const guild = await ensureGuild(guildId, db);
  return db("inventory_sales")
    .where({ guild_id: guild.id })
    .join("shop_items", "inventory_sales.item_id", "shop_items.id")
    .leftJoin("users", "inventory_sales.seller_discord_id", "users.discord_id")
    .select(
      "inventory_sales.id as id",
      "inventory_sales.item_id as item_id",
      "inventory_sales.price as price",
      "inventory_sales.quantity as quantity",
      "inventory_sales.seller_discord_id as seller_discord_id",
      "inventory_sales.created_at as created_at",
      "shop_items.name as name",
      "shop_items.type as type",
      "shop_items.description as description",
      "shop_items.image_url as image_url",
      "users.username as seller_username",
      "users.avatar as seller_avatar"
    )
    .orderBy("inventory_sales.created_at", "desc");
};

export const createSale = async ({ guildId, userId, itemId, price, quantity }) => {
  const guild = await ensureGuild(guildId, db);
  const priceValue = Math.max(0, Number(price || 0));
  const quantityValue = Math.max(1, Math.floor(Number(quantity || 1)));
  if (priceValue <= 0) throw new Error("invalid_price");

  return db.transaction(async (trx) => {
    const item = await trx("shop_items").where({ id: itemId }).first();
    if (!item) throw new Error("item_not_found");
    if (item.type !== "inventory") throw new Error("invalid_item_type");

    const inventoryRow = await trx("inventory")
      .where({ guild_id: guild.id, user_discord_id: String(userId), item_id: itemId })
      .first();
    if (!inventoryRow || Number(inventoryRow.quantity || 0) <= 0) throw new Error("no_item");
    if (Number(inventoryRow.quantity || 0) < quantityValue) throw new Error("insufficient_quantity");

    if (Number(inventoryRow.quantity) > quantityValue) {
      await trx("inventory")
        .where({ id: inventoryRow.id })
        .update({ quantity: Number(inventoryRow.quantity) - quantityValue });
    } else {
      await trx("inventory").where({ id: inventoryRow.id }).del();
    }

    const [saleId] = await trx("inventory_sales").insert({
      guild_id: guild.id,
      seller_discord_id: String(userId),
      item_id: Number(itemId),
      quantity: quantityValue,
      price: priceValue
    });

    return { id: saleId, item, price: priceValue, quantity: quantityValue };
  });
};

export const buySale = async ({ guildId, buyerId, saleId }) => {
  const guild = await ensureGuild(guildId, db);
  let logInfo = null;
  const result = await db.transaction(async (trx) => {
    const sale = await trx("inventory_sales").where({ id: saleId, guild_id: guild.id }).first();
    if (!sale) throw new Error("sale_not_found");

    const item = await trx("shop_items").where({ id: sale.item_id }).first();
    if (!item) throw new Error("item_not_found");

    const isSelfBuy = String(sale.seller_discord_id) === String(buyerId);
    if (isSelfBuy) {
      if (Number(sale.quantity || 0) > 1) {
        await trx("inventory_sales")
          .where({ id: sale.id })
          .update({ quantity: Number(sale.quantity || 0) - 1 });
      } else {
        await trx("inventory_sales").where({ id: sale.id }).del();
      }
      const existing = await trx("inventory")
        .where({ guild_id: guild.id, user_discord_id: String(buyerId), item_id: sale.item_id })
        .first();
      if (existing) {
        await trx("inventory")
          .where({ id: existing.id })
          .update({ quantity: Number(existing.quantity || 0) + 1 });
      } else {
        await trx("inventory").insert({
          guild_id: guild.id,
          user_discord_id: String(buyerId),
          item_id: sale.item_id,
          quantity: 1
        });
      }
      return {
        ok: true,
        item,
        price: Number(sale.price || 0),
        sellerId: String(sale.seller_discord_id),
        selfBuy: true
      };
    }

    const settings = await getOrCreateSettings(guildId, trx);
    if (settings && settings.enabled === false) throw new Error("economy_disabled");

    const buyerBalance = await getOrCreateBalance(guildId, String(buyerId), settings.start_balance || 0, trx);
    if (Number(buyerBalance.balance || 0) < Number(sale.price || 0)) throw new Error("insufficient_funds");

    const sellerBalance = await getOrCreateBalance(
      guildId,
      String(sale.seller_discord_id),
      settings.start_balance || 0,
      trx
    );

    const buyerNext = Math.max(0, Number(buyerBalance.balance || 0) - Number(sale.price || 0));
    const maxBalance = Number(settings.max_balance || 0);
    const sellerNext = maxBalance > 0
      ? Math.min(Number(sellerBalance.balance || 0) + Number(sale.price || 0), maxBalance)
      : Number(sellerBalance.balance || 0) + Number(sale.price || 0);

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: String(buyerId) })
      .update({ balance: buyerNext });

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: String(sale.seller_discord_id) })
      .update({ balance: sellerNext });

    if (Number(sale.quantity || 0) > 1) {
      await trx("inventory_sales")
        .where({ id: sale.id })
        .update({ quantity: Number(sale.quantity || 0) - 1 });
    } else {
      await trx("inventory_sales").where({ id: sale.id }).del();
    }

    const existing = await trx("inventory")
      .where({ guild_id: guild.id, user_discord_id: String(buyerId), item_id: sale.item_id })
      .first();
    if (existing) {
      await trx("inventory")
        .where({ id: existing.id })
        .update({ quantity: Number(existing.quantity || 0) + 1 });
    } else {
      await trx("inventory").insert({
        guild_id: guild.id,
        user_discord_id: String(buyerId),
        item_id: sale.item_id,
        quantity: 1
      });
    }

    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: String(buyerId),
      source: "purchase",
      base_amount: -Number(sale.price || 0),
      multiplier: 1,
      bonus_amount: 0,
      total_amount: -Number(sale.price || 0),
      created_at: new Date()
    });

    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: String(sale.seller_discord_id),
      source: "sale",
      base_amount: Number(sale.price || 0),
      multiplier: 1,
      bonus_amount: 0,
      total_amount: Number(sale.price || 0),
      created_at: new Date()
    });

    await insertEventLog({
      trx,
      guildId,
      category: "transaction",
      type: "sale_purchase",
      userId: buyerId,
      amount: Number(sale.price || 0),
      data: {
        sale_id: sale.id,
        item_id: item.id,
        item_name: item.name,
        price: Number(sale.price || 0),
        quantity: 1,
        seller_id: String(sale.seller_discord_id),
        buyer_id: String(buyerId)
      }
    });

    logInfo = {
      guildId,
      buyerId: String(buyerId),
      sellerId: String(sale.seller_discord_id),
      itemName: item.name,
      price: Number(sale.price || 0),
      currency: settings?.emoji_symbol || "💰"
    };

    return {
      ok: true,
      item,
      price: Number(sale.price || 0),
      sellerId: String(sale.seller_discord_id),
      buyerBalance: buyerNext
    };
  });
  if (logInfo) {
    const amountLabel = `${logInfo.price} ${logInfo.currency}`;
    await sendLogMessage({
      guildId: logInfo.guildId,
      content: `🔁 Revente — <@${logInfo.buyerId}> a acheté **${logInfo.itemName}** à <@${logInfo.sellerId}> pour ${amountLabel}.`
    });
  }
  return result;
};

const countVisibleServerShopItems = async (guildInternalId) => {
  const shops = await db("shops")
    .where({ guild_id: guildInternalId })
    .whereNull("owner_discord_id");
  if (!shops.length) return 0;
  const shopIds = shops.map((shop) => shop.id);
  const row = await db("shop_items")
    .whereIn("shop_id", shopIds)
    .andWhere((builder) => builder.where({ hidden: false }).orWhereNull("hidden"))
    .count("* as count")
    .first();
  return Number(row?.count || row?.["count(*)"] || 0);
};

export const createItem = async (shopId, data) => {
  const shop = await db("shops").where({ id: shopId }).first();
  if (!shop) throw new Error("shop_not_found");

  const isUserShop = Boolean(shop.owner_discord_id);
  if (isUserShop && String(data.type || "inventory").toLowerCase() === "lootbox") {
    throw new Error("lootbox_forbidden");
  }

  const guildRow = await db("guilds")
    .select("discord_guild_id")
    .where({ id: shop.guild_id })
    .first();
  const guildDiscordId = String(guildRow?.discord_guild_id || "").trim();

  if (isUserShop && guildDiscordId) {
    const settings = await getUserShopsSettings(guildDiscordId);
    if (!settings.enabled) throw new Error("user_shops_disabled");
    const itemType = String(data.type || "inventory").toLowerCase();
    if (!USER_SHOP_TYPE_ALLOWLIST.includes(itemType)) {
      throw new Error("item_type_not_allowed");
    }
    if (!settings.allowedTypes.includes(itemType)) {
      throw new Error("item_type_not_allowed");
    }
  }

  if (!isUserShop && guildDiscordId) {
    const itemType = String(data.type || "inventory").toLowerCase();
    if (itemType === "lootbox") {
      await assertGuildFeatureAccess({
        guildId: guildDiscordId,
        featureKey: "economy_lootbox",
        context: "shop.lootbox.create"
      });
    }
    if (!data.hidden) {
      const visibleCount = await countVisibleServerShopItems(Number(shop.guild_id || 0));
      await assertGuildLimit({
        guildId: guildDiscordId,
        limitKey: "shop_items_max",
        currentCount: visibleCount + 1,
        context: "shop.items.create"
      });
    }
  }

  assertShopAvailabilityDates(data.available_from, data.available_to);

  const payload = {
    shop_id: shopId,
    name: data.name,
    type: data.type || "inventory",
    price: Number(data.price || 0),
    stock: data.stock === null || data.stock === undefined || data.stock === "" ? null : Number(data.stock),
    data: data.data ? JSON.stringify(data.data) : null,
    discount_percent: Number(data.discount_percent || 0),
    description: data.description || null,
    send_dm: data.send_dm ? true : false,
    image_url: data.image_url || null,
    hidden: data.hidden ? true : false,
    available_from: normalizeDateTime(data.available_from),
    available_to: normalizeDateTime(data.available_to)
  };
  const [id] = await db("shop_items").insert(payload);
  return db("shop_items").where({ id }).first();
};

export const updateItem = async (shopId, itemId, data) => {
  const shop = await db("shops").where({ id: shopId }).first();
  if (!shop) throw new Error("shop_not_found");

  if (shop.owner_discord_id && Object.prototype.hasOwnProperty.call(data, "type")) {
    if (String(data.type || "").toLowerCase() === "lootbox") {
      throw new Error("lootbox_forbidden");
    }
  }

  const guildRow = await db("guilds")
    .select("discord_guild_id")
    .where({ id: shop.guild_id })
    .first();
  const guildDiscordId = String(guildRow?.discord_guild_id || "").trim();
  if (guildDiscordId && !shop.owner_discord_id) {
    await assertShopRuntimeAccess({
      guildId: guildDiscordId,
      guildInternalId: Number(shop.guild_id || 0),
      shopId: shop.id,
      context: "shop.runtime.item_update"
    });
    if (Object.prototype.hasOwnProperty.call(data, "type")) {
      const nextType = String(data.type || "").toLowerCase();
      if (nextType === "lootbox") {
        await assertGuildFeatureAccess({
          guildId: guildDiscordId,
          featureKey: "economy_lootbox",
          context: "shop.lootbox.update"
        });
      }
    }
  }

  const item = await db("shop_items").where({ id: itemId, shop_id: shopId }).first();
  if (!item) throw new Error("item_not_found");

  const payload = {};
  const purgeItemIds = Array.isArray(data?.purge_item_ids)
    ? data.purge_item_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];
  if (Object.prototype.hasOwnProperty.call(data, "name")) payload.name = data.name;
  if (Object.prototype.hasOwnProperty.call(data, "type")) payload.type = data.type || "inventory";
  if (Object.prototype.hasOwnProperty.call(data, "price")) payload.price = Number(data.price || 0);
  if (Object.prototype.hasOwnProperty.call(data, "stock")) {
    payload.stock = data.stock === null || data.stock === undefined || data.stock === "" ? null : Number(data.stock);
  }
  if (Object.prototype.hasOwnProperty.call(data, "data")) {
    payload.data = data.data ? JSON.stringify(data.data) : null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "discount_percent")) {
    payload.discount_percent = Number(data.discount_percent || 0);
  }
  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    payload.description = data.description || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "send_dm")) {
    payload.send_dm = data.send_dm ? true : false;
  }
  if (Object.prototype.hasOwnProperty.call(data, "image_url")) {
    payload.image_url = data.image_url || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "hidden")) {
    payload.hidden = data.hidden ? true : false;
  }
  const nextAvailableFrom = Object.prototype.hasOwnProperty.call(data, "available_from")
    ? data.available_from
    : item.available_from;
  const nextAvailableTo = Object.prototype.hasOwnProperty.call(data, "available_to")
    ? data.available_to
    : item.available_to;
  if (
    Object.prototype.hasOwnProperty.call(data, "available_from") ||
    Object.prototype.hasOwnProperty.call(data, "available_to")
  ) {
    assertShopAvailabilityDates(nextAvailableFrom, nextAvailableTo);
  }
  if (Object.prototype.hasOwnProperty.call(data, "available_from")) {
    payload.available_from = normalizeDateTime(data.available_from);
  }
  if (Object.prototype.hasOwnProperty.call(data, "available_to")) {
    payload.available_to = normalizeDateTime(data.available_to);
  }
  if (Object.keys(payload).length > 0) {
    await db("shop_items").where({ id: itemId, shop_id: shopId }).update(payload);
  }
  const uniquePurgeIds = Array.from(new Set(purgeItemIds));
  if (uniquePurgeIds.length) {
    const shop = await db("shops").where({ id: shopId }).first();
    if (shop?.guild_id) {
      await db("inventory")
        .where({ guild_id: shop.guild_id })
        .whereIn("item_id", uniquePurgeIds)
        .del();
    } else {
      await db("inventory").whereIn("item_id", uniquePurgeIds).del();
    }
  }
  return db("shop_items").where({ id: itemId }).first();
};

const getLootboxRewardItemIds = (rawData) => {
  let data = rawData || null;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  const dataObj = data && typeof data === "object" ? data : {};
  const entries = Array.isArray(dataObj.lootbox)
    ? dataObj.lootbox
    : Array.isArray(dataObj.lootbox_items)
    ? dataObj.lootbox_items
    : Array.isArray(dataObj.rewards)
    ? dataObj.rewards
    : [];
  const ids = entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const type = String(entry.type || "inventory");
      if (type !== "inventory") return null;
      const itemId = Number(entry.item_id ?? entry.itemId ?? entry.id ?? NaN);
      return Number.isFinite(itemId) ? itemId : null;
    })
    .filter((value) => value !== null);
  return Array.from(new Set(ids));
};

export const deleteItem = async (shopId, itemId, options = {}) => {
  const mode = options.mode || "hard";
  if (mode === "soft") {
    await db("shop_items").where({ id: itemId, shop_id: shopId }).update({ hidden: true });
    return;
  }
  const item = await db("shop_items").where({ id: itemId, shop_id: shopId }).first();
  if (!item) return;
  if (options.purgeRewards && item.type === "lootbox") {
    const rewardIds = getLootboxRewardItemIds(item.data);
    if (rewardIds.length) {
      await db("inventory").whereIn("item_id", rewardIds).del();
    }
  }
  await db("inventory").where({ item_id: itemId }).del();
  await db("shop_items").where({ id: itemId, shop_id: shopId }).del();
};

export const listGuildInventories = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  const rows = await db("inventory")
    .where({ "inventory.guild_id": guild.id })
    .andWhere("inventory.quantity", ">", 0)
    .join("shop_items", "inventory.item_id", "shop_items.id")
    .leftJoin("users", "inventory.user_discord_id", "users.discord_id")
    .select(
      "inventory.user_discord_id as user_id",
      "inventory.item_id as item_id",
      "inventory.quantity as quantity",
      "shop_items.name as item_name",
      "shop_items.type as item_type",
      "shop_items.image_url as item_image_url",
      "shop_items.hidden as item_hidden",
      "users.username as username",
      "users.avatar as avatar"
    )
    .orderBy("users.username", "asc")
    .orderBy("shop_items.name", "asc");

  const grouped = new Map();
  for (const row of rows) {
    const userId = String(row.user_id);
    if (!grouped.has(userId)) {
      grouped.set(userId, {
        userId,
        username: row.username || "",
        avatar: row.avatar || "",
        totalQuantity: 0,
        items: []
      });
    }
    const entry = grouped.get(userId);
    entry.totalQuantity += Number(row.quantity || 0);
    entry.items.push({
      itemId: row.item_id,
      name: row.item_name,
      type: row.item_type,
      image_url: row.item_image_url || "",
      hidden: Boolean(row.item_hidden),
      quantity: Number(row.quantity || 0)
    });
  }

  return Array.from(grouped.values()).filter((entry) => entry.items.length > 0);
};

export const removeInventoryItem = async ({ guildId, userId, itemId, quantity }) => {
  const guild = await ensureGuild(guildId, db);
  const qty = Math.max(1, Math.floor(Number(quantity || 1)));
  const row = await db("inventory")
    .where({
      guild_id: guild.id,
      user_discord_id: String(userId),
      item_id: itemId
    })
    .first();
  if (!row) return;
  const nextQty = Number(row.quantity || 0) - qty;
  if (nextQty > 0) {
    await db("inventory").where({ id: row.id }).update({ quantity: nextQty });
    return;
  }
  await db("inventory").where({ id: row.id }).del();
};

const getBotToken = () => process.env.DISCORD_BOT_TOKEN;

const assignRolesToMember = async ({ guildId, userId, roleIds }) => {
  const token = getBotToken();
  if (!token) throw new Error("missing_bot_token");
  const roles = roleIds.filter(Boolean).map(String);
  for (const roleId of roles) {
    const res = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${token}` }
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const reason = data?.message || "role_assign_failed";
      throw new Error(reason);
    }
  }
};

export const useInventoryItem = async ({ guildId, userId, itemId }) => {
  const guild = await ensureGuild(guildId, db);
  const item = await db("shop_items").where({ id: itemId }).first();
  if (!item) throw new Error("item_not_found");
  if (!["role", "temp_role"].includes(item.type)) throw new Error("invalid_item_type");
  const shop = await db("shops").where({ id: item.shop_id, guild_id: guild.id }).first();
  if (!shop) throw new Error("shop_not_found");
  await assertShopRuntimeAccess({
    guildId,
    guildInternalId: guild.id,
    shopId: shop.id,
    context: "shop.runtime.inventory_use",
    trx: db
  });

  const inventoryRow = await db("inventory")
    .where({ guild_id: guild.id, user_discord_id: String(userId), item_id: item.id })
    .first();
  if (!inventoryRow || Number(inventoryRow.quantity || 0) <= 0) throw new Error("no_item");

  let data = item.data || null;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  const roleIds = Array.isArray(data?.role_ids)
    ? data.role_ids
    : data?.role_id
    ? [data.role_id]
    : [];
  if (!roleIds.length) throw new Error("missing_roles");

  const durationSeconds = Number(data?.duration_seconds || data?.role_duration_seconds || 0);
  if (item.type === "temp_role" && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
    throw new Error("missing_duration");
  }

  await assignRolesToMember({ guildId, userId, roleIds });

  await db.transaction(async (trx) => {
    if (Number(inventoryRow.quantity || 0) > 1) {
      await trx("inventory")
        .where({ id: inventoryRow.id })
        .update({ quantity: Number(inventoryRow.quantity || 0) - 1 });
    } else {
      await trx("inventory").where({ id: inventoryRow.id }).del();
    }
  });

  if (item.type === "temp_role" && durationSeconds > 0) {
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);
    await Promise.all(
      roleIds.map((roleId) =>
        upsertTempRoleAssignment({
          guildId,
          userId,
          roleId,
          expiresAt
        })
      )
    );
  }

  const roleList = roleIds.map((roleId) => `<@&${roleId}>`).join(", ");
  const durationLabel = durationSeconds > 0 ? ` (${durationSeconds}s)` : "";
  await sendLogMessage({
    guildId,
    content: `🎯 Utilisation inventaire — <@${userId}> a utilisé **${item.name}** → ${roleList}${durationLabel}.`
  });

  return {
    ok: true,
    item: { id: item.id, name: item.name, type: item.type },
    roleIds,
    durationSeconds
  };
};

export const deleteShop = async (guildId, shopId) => {
  const guild = await ensureGuild(guildId, db);
  const itemIds = await db("shop_items").where({ shop_id: shopId }).pluck("id");
  if (itemIds.length) {
    await db("inventory").whereIn("item_id", itemIds).del();
    await db("shop_items").whereIn("id", itemIds).del();
  }
  await db("shops").where({ id: shopId, guild_id: guild.id }).del();
};

export const getShopById = async (shopId) => {
  return db("shops").where({ id: shopId }).first();
};

export const getItemById = async (itemId) => {
  return db("shop_items").where({ id: itemId }).first();
};

export const listUserShops = async (guildId, options = {}) => {
  return listShops(guildId, {
    scope: "user",
    enabledOnly: options.enabledOnly,
    ownerId: options.ownerId || null
  });
};

export const getUserShopByOwner = async (guildId, ownerDiscordId) => {
  const guild = await ensureGuild(guildId, db);
  return db("shops")
    .where({ guild_id: guild.id, owner_discord_id: String(ownerDiscordId) })
    .first();
};

export const createUserShop = async ({ guildId, ownerDiscordId, data = {} }) => {
  await assertUserShopsFeature(guildId, "shop.user.create");
  const settings = await getUserShopsSettings(guildId);
  if (!settings.enabled) throw new Error("user_shops_disabled");

  const ownerId = String(ownerDiscordId || "").trim();
  if (!ownerId) throw new Error("missing_owner");

  const guild = await ensureGuild(guildId, db);
  const existing = await db("shops")
    .where({ guild_id: guild.id, owner_discord_id: ownerId })
    .first();
  if (existing) throw new Error("user_shop_exists");

  const name = String(data.name || "").trim();
  if (!name) throw new Error("missing_name");

  const [id] = await db("shops").insert({
    guild_id: guild.id,
    name,
    owner_discord_id: ownerId,
    required_role_id: null,
    required_role_ids: null,
    required_roles_mode: "all",
    discount_percent: 0,
    enabled: data.enabled === false ? false : true,
    image_url: data.image_url || null,
    description: data.description || null
  });
  return db("shops").where({ id }).first();
};

export const updateUserShop = async ({ guildId, ownerDiscordId, shopId, data = {} }) => {
  await assertUserShopsFeature(guildId, "shop.user.update");
  const settings = await getUserShopsSettings(guildId);
  if (!settings.enabled) throw new Error("user_shops_disabled");

  const guild = await ensureGuild(guildId, db);
  const shop = await db("shops")
    .where({ id: shopId, guild_id: guild.id, owner_discord_id: String(ownerDiscordId) })
    .first();
  if (!shop) throw new Error("shop_not_found");

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(data, "name")) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("missing_name");
    payload.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(data, "image_url")) {
    payload.image_url = data.image_url || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    payload.description = data.description || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "enabled")) {
    payload.enabled = data.enabled === false ? false : true;
  }
  if (Object.keys(payload).length) {
    await db("shops").where({ id: shop.id }).update(payload);
  }
  return db("shops").where({ id: shop.id }).first();
};

export const deleteUserShop = async ({ guildId, ownerDiscordId = null, shopId, asAdmin = false }) => {
  const guild = await ensureGuild(guildId, db);
  const query = db("shops").where({ id: shopId, guild_id: guild.id }).whereNotNull("owner_discord_id");
  if (!asAdmin) {
    if (!ownerDiscordId) throw new Error("missing_owner");
    query.andWhere({ owner_discord_id: String(ownerDiscordId) });
  }
  const shop = await query.first();
  if (!shop) throw new Error("shop_not_found");
  await deleteShop(guildId, shop.id);
  return { ok: true };
};

export const createUserShopItem = async ({ guildId, ownerDiscordId, shopId, data = {} }) => {
  await assertUserShopsFeature(guildId, "shop.user.item_create");
  const settings = await getUserShopsSettings(guildId);
  if (!settings.enabled) throw new Error("user_shops_disabled");

  const guild = await ensureGuild(guildId, db);
  const shop = await db("shops")
    .where({ id: shopId, guild_id: guild.id, owner_discord_id: String(ownerDiscordId) })
    .first();
  if (!shop) throw new Error("shop_not_found");

  const itemType = String(data.type || "inventory").toLowerCase();
  if (!USER_SHOP_TYPE_ALLOWLIST.includes(itemType)) throw new Error("item_type_not_allowed");
  if (!settings.allowedTypes.includes(itemType)) throw new Error("item_type_not_allowed");

  const name = String(data.name || "").trim();
  if (!name) throw new Error("missing_name");
  const price = Math.max(0, Number(data.price || 0));
  if (!Number.isFinite(price) || price <= 0) throw new Error("invalid_price");

  return createItem(shop.id, {
    name,
    type: itemType,
    price,
    stock: data.stock,
    description: data.description || null,
    image_url: data.image_url || null,
    data: data.data || null,
    discount_percent: 0,
    send_dm: false,
    hidden: false
  });
};

export const updateUserShopItem = async () => {
  throw new Error("user_shop_item_readonly");
};

export const deleteUserShopItem = async ({
  guildId,
  ownerDiscordId = null,
  shopId,
  itemId,
  asAdmin = false
}) => {
  const guild = await ensureGuild(guildId, db);
  const query = db("shops").where({ id: shopId, guild_id: guild.id }).whereNotNull("owner_discord_id");
  if (!asAdmin) {
    if (!ownerDiscordId) throw new Error("missing_owner");
    query.andWhere({ owner_discord_id: String(ownerDiscordId) });
  }
  const shop = await query.first();
  if (!shop) throw new Error("shop_not_found");
  await deleteItem(shop.id, itemId, { purgeRewards: false });
  return { ok: true };
};

export const deleteUserShopsForOwner = async ({ guildId, ownerDiscordId }) => {
  const guild = await ensureGuild(guildId, db);
  const shops = await db("shops")
    .where({ guild_id: guild.id, owner_discord_id: String(ownerDiscordId) })
    .select("id");
  for (const shop of shops) {
    await deleteShop(guildId, shop.id);
  }
  return { ok: true, deleted: shops.length };
};

export const purchaseItem = async ({ guildId, userId, itemId }) => {
  let logInfo = null;
  const result = await db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const item = await trx("shop_items").where({ id: itemId }).first();
    if (!item) throw new Error("item_not_found");
    if (item.hidden) throw new Error("item_unavailable");
    const now = new Date();
    if (item.available_from && new Date(item.available_from) > now) {
      throw new Error("item_unavailable");
    }
    if (item.available_to && new Date(item.available_to) < now) {
      throw new Error("item_unavailable");
    }

    const shop = await trx("shops").where({ id: item.shop_id }).first();
    if (!shop) throw new Error("shop_not_found");

    const ownerId = shop.owner_discord_id ? String(shop.owner_discord_id) : null;
    const isUserShop = Boolean(ownerId);

    if (isUserShop) {
      const userShopSettings = await getUserShopsSettings(guildId, trx);
      if (!userShopSettings.enabled) throw new Error("user_shops_disabled");
      if (String(item.type || "").toLowerCase() === "lootbox") throw new Error("lootbox_forbidden");
      if (String(ownerId) === String(userId)) throw new Error("self_purchase_forbidden");
    } else {
      await assertShopRuntimeAccess({
        guildId,
        guildInternalId: guild.id,
        shopId: shop.id,
        context: "shop.runtime.purchase",
        trx
      });
      if (String(item.type || "").toLowerCase() === "lootbox") {
        await assertGuildFeatureAccess({
          guildId: String(guildId),
          featureKey: "economy_lootbox",
          context: "shop.lootbox.purchase"
        });
      }
    }

    if (shop.enabled === false) throw new Error("shop_inactive");

    if (!isUserShop) {
      const visibleItems = await trx("shop_items")
        .where({ shop_id: shop.id })
        .andWhere((builder) => builder.where({ hidden: false }).orWhereNull("hidden"))
        .orderBy("id", "asc");
      const itemIndex = visibleItems.findIndex((row) => Number(row.id) === Number(itemId));
      if (itemIndex >= 0) {
        const offset = await resolveItemLockOffset(shop);
        const [checked] = await applyRuntimeItemLocks({
          guildDiscordId: String(guildId),
          items: [item],
          itemIndexOffset: offset + itemIndex
        });
        if (checked?.premium_locked) throw new Error("premium_feature_disabled");
      }
    } else {
      const [checkedShop] = await applyRuntimeUserShopLocks(String(guildId), [shop]);
      if (checkedShop?.premium_locked) throw new Error("premium_feature_disabled");
    }

    const settings = await trx("economy_settings").where({ guild_id: guild.id }).first();
    if (!settings || !settings.enabled) throw new Error("economy_disabled");

    const discount = Number(shop.discount_percent || 0) + Number(item.discount_percent || 0);
    const price = Math.max(0, Math.floor(item.price - (item.price * discount) / 100));

    if (isUserShop) {
      const buyerBalance = await getOrCreateBalance(guildId, String(userId), settings.start_balance || 0, trx);
      if (Number(buyerBalance.balance || 0) < price) throw new Error("insufficient_funds");

      const sellerBalance = await getOrCreateBalance(guildId, ownerId, settings.start_balance || 0, trx);
      const buyerNext = Math.max(0, Number(buyerBalance.balance || 0) - price);
      const maxBalance = Number(settings.max_balance || 0);
      const sellerNext =
        maxBalance > 0
          ? Math.min(Number(sellerBalance.balance || 0) + price, maxBalance)
          : Number(sellerBalance.balance || 0) + price;

      if (item.stock !== null && item.stock !== undefined) {
        if (item.stock <= 0) throw new Error("out_of_stock");
        await trx("shop_items").where({ id: item.id }).update({ stock: item.stock - 1 });
      }

      await trx("balances")
        .where({ guild_id: guild.id, user_discord_id: String(userId) })
        .update({ balance: buyerNext });
      await trx("balances")
        .where({ guild_id: guild.id, user_discord_id: ownerId })
        .update({ balance: sellerNext });
    } else {
      const balance = await trx("balances")
        .where({ guild_id: guild.id, user_discord_id: userId })
        .first();
      if (!balance) throw new Error("no_balance");
      if (balance.balance < price) throw new Error("insufficient_funds");

      if (item.stock !== null && item.stock !== undefined) {
        if (item.stock <= 0) throw new Error("out_of_stock");
        await trx("shop_items").where({ id: item.id }).update({ stock: item.stock - 1 });
      }

      await trx("balances")
        .where({ guild_id: guild.id, user_discord_id: userId })
        .update({ balance: balance.balance - price });
    }

    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: String(userId),
      source: "purchase",
      base_amount: -price,
      multiplier: 1,
      bonus_amount: 0,
      total_amount: -price,
      created_at: new Date()
    });

    if (isUserShop && price > 0) {
      await trx("economy_gain_logs").insert({
        guild_id: guild.id,
        user_discord_id: ownerId,
        source: "purchase",
        base_amount: price,
        multiplier: 1,
        bonus_amount: 0,
        total_amount: price,
        created_at: new Date()
      });
    }

    if (item.type === "inventory" || item.type === "lootbox") {
      const existing = await trx("inventory")
        .where({ guild_id: guild.id, user_discord_id: userId, item_id: item.id })
        .first();
      if (existing) {
        await trx("inventory")
          .where({ id: existing.id })
          .update({ quantity: existing.quantity + 1 });
      } else {
        await trx("inventory").insert({
          guild_id: guild.id,
          user_discord_id: userId,
          item_id: item.id,
          quantity: 1
        });
      }
    }

    await insertEventLog({
      trx,
      guildId,
      category: "transaction",
      type: "shop_purchase",
      userId,
      amount: price,
      data: {
        item_id: item.id,
        item_name: item.name,
        item_type: item.type,
        shop_id: shop.id,
        shop_name: shop.name,
        price,
        seller_id: ownerId,
        owner_shop: isUserShop
      }
    });

    logInfo = {
      guildId,
      userId: String(userId),
      sellerId: ownerId,
      itemName: item.name,
      shopName: shop.name,
      price,
      currency: settings?.emoji_symbol || "💰",
      ownerShop: isUserShop
    };

    return { ok: true, price, itemId: item.id, type: item.type, sellerId: ownerId };
  });
  if (logInfo) {
    const amountLabel = `${logInfo.price} ${logInfo.currency}`;
    const shopLabel = logInfo.shopName ? ` dans **${logInfo.shopName}**` : "";
    if (logInfo.ownerShop && logInfo.sellerId) {
      await sendLogMessage({
        guildId: logInfo.guildId,
        content: `🛒 Boutique membre — <@${logInfo.userId}> a acheté **${logInfo.itemName}**${shopLabel} à <@${logInfo.sellerId}> pour ${amountLabel}.`
      });
    } else {
      await sendLogMessage({
        guildId: logInfo.guildId,
        content: `🛒 Achat boutique — <@${logInfo.userId}> a acheté **${logInfo.itemName}**${shopLabel} pour ${amountLabel}.`
      });
    }
  }
  return result;
};

export const openLootbox = async ({ guildId, userId, itemId }) => {
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const settings = await getOrCreateSettings(guildId, trx);
    const lootboxItem = await trx("shop_items").where({ id: itemId }).first();
    if (!lootboxItem || lootboxItem.type !== "lootbox") throw new Error("lootbox_not_found");

    const shop = await trx("shops").where({ id: lootboxItem.shop_id, guild_id: guild.id }).first();
    if (!shop) throw new Error("shop_not_found");
    await assertShopRuntimeAccess({
      guildId,
      guildInternalId: guild.id,
      shopId: shop.id,
      context: "shop.runtime.lootbox_open",
      trx
    });
    await assertGuildFeatureAccess({
      guildId,
      featureKey: "economy_lootbox",
      context: "shop.lootbox.open"
    });

    const inventoryRow = await trx("inventory")
      .where({ guild_id: guild.id, user_discord_id: String(userId), item_id: lootboxItem.id })
      .first();
    if (!inventoryRow || Number(inventoryRow.quantity || 0) <= 0) throw new Error("no_lootbox");

    let data = lootboxItem.data || null;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = null;
      }
    }
    const dataObj = data && typeof data === "object" ? data : {};
    const rawEntries = Array.isArray(dataObj.lootbox) ? dataObj.lootbox : [];
    const available = rawEntries
      .map((entry, index) => (entry && typeof entry === "object" ? { entry, index } : null))
      .filter((item) => item && !item.entry?.hidden);
    if (!available.length) throw new Error("lootbox_empty");

    const weighted = available
      .map((item) => {
        const chanceValue = Number(item.entry?.chance ?? item.entry?.probability ?? item.entry?.weight ?? 0);
        return {
          ...item,
          chance: Number.isFinite(chanceValue) ? Math.max(0, chanceValue) : 0
        };
      })
      .filter((item) => item);
    const totalChance = weighted.reduce((sum, item) => sum + item.chance, 0);
    let picked = null;
    if (totalChance > 0) {
      let roll = Math.random() * totalChance;
      for (const item of weighted) {
        roll -= item.chance;
        if (roll <= 0) {
          picked = item;
          break;
        }
      }
      if (!picked) picked = weighted[weighted.length - 1];
    } else {
      picked = available[Math.floor(Math.random() * available.length)];
    }
    const entryIndex = picked.index;
    const entry = { ...picked.entry };
    const rewardType = String(entry.type || "inventory");
    if (rewardType === "lootbox") throw new Error("lootbox_invalid");

    const rewardName = String(entry.name || "Récompense");
    const rewardDescription = String(entry.description || "");
    const rewardImageUrl = entry.image_url || null;
    let rewardData = entry.data ?? null;
    if (typeof rewardData === "string") {
      try {
        rewardData = JSON.parse(rewardData);
      } catch {
        rewardData = null;
      }
    }
    if (!rewardData && (entry.role_ids || entry.role_id)) {
      const roleIds = Array.isArray(entry.role_ids)
        ? entry.role_ids
        : entry.role_id
        ? [entry.role_id]
        : [];
      rewardData = { role_ids: roleIds, role_id: roleIds[0] || "" };
    }
    if (rewardType === "temp_role") {
      const duration = entry.duration_seconds ?? entry.role_duration_seconds ?? null;
      if (rewardData && duration && !rewardData.duration_seconds) {
        rewardData = { ...rewardData, duration_seconds: Number(duration) };
      }
    }

    let rewardItemId = entry.item_id ?? entry.itemId ?? null;
    const givesInventory = ["inventory", "irl", "role", "temp_role"].includes(rewardType);

    if (givesInventory) {
      if (!rewardItemId) {
      let nextRewardData = rewardData;
      if (!nextRewardData || typeof nextRewardData !== "object") {
        nextRewardData = { lootbox_generated: true };
      } else {
        nextRewardData = { ...nextRewardData, lootbox_generated: true };
      }
      const payload = {
        shop_id: lootboxItem.shop_id,
        name: rewardName,
        type: rewardType,
        price: 0,
        stock: null,
        data: JSON.stringify(nextRewardData),
        discount_percent: 0,
        description: rewardDescription || null,
        send_dm: false,
        image_url: entry.image_url || null,
        hidden: true
      };
        const [createdId] = await trx("shop_items").insert(payload);
        rewardItemId = createdId;
        rawEntries[entryIndex] = { ...entry, item_id: createdId };
        const nextData = { ...dataObj, lootbox: rawEntries };
        await trx("shop_items")
          .where({ id: lootboxItem.id })
          .update({ data: JSON.stringify(nextData) });
      }

      const existingReward = await trx("inventory")
        .where({ guild_id: guild.id, user_discord_id: String(userId), item_id: rewardItemId })
        .first();
      if (existingReward) {
        await trx("inventory")
          .where({ id: existingReward.id })
          .update({ quantity: Number(existingReward.quantity || 0) + 1 });
      } else {
        await trx("inventory").insert({
          guild_id: guild.id,
          user_discord_id: String(userId),
          item_id: rewardItemId,
          quantity: 1
        });
      }
    }
    let currencyAmount = null;
    if (rewardType === "currency") {
      const amountRaw = entry.amount ?? rewardData?.amount ?? rewardData?.value ?? 0;
      const amount = Math.max(0, Math.floor(Number(amountRaw || 0)));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("lootbox_invalid");
      currencyAmount = amount;
      const balance = await trx("balances")
        .where({ guild_id: guild.id, user_discord_id: String(userId) })
        .first();
      if (!balance) throw new Error("no_balance");
      await trx("balances")
        .where({ id: balance.id })
        .update({ balance: Number(balance.balance || 0) + amount });
      await trx("economy_gain_logs").insert({
        guild_id: guild.id,
        user_discord_id: String(userId),
        source: "lootbox",
        base_amount: amount,
        multiplier: 1,
        bonus_amount: 0,
        total_amount: amount,
        created_at: new Date(),
        data: JSON.stringify({ lootbox: lootboxItem.name || "Lootbox" })
      });
      await insertEventLog({
        trx,
        guildId,
        category: "transactions",
        type: "lootbox_currency",
        userId,
        amount,
        data: { lootbox: lootboxItem.name || "Lootbox" }
      });
      rewardItemId = null;
      if (!rewardData || typeof rewardData !== "object") {
        rewardData = { amount };
      } else {
        rewardData = { ...rewardData, amount };
      }
    }

    if (Number(inventoryRow.quantity || 0) > 1) {
      await trx("inventory")
        .where({ id: inventoryRow.id })
        .update({ quantity: Number(inventoryRow.quantity || 0) - 1 });
    } else {
      await trx("inventory").where({ id: inventoryRow.id }).del();
    }

    return {
      ok: true,
      lootbox: {
        id: lootboxItem.id,
        name: lootboxItem.name,
        send_dm: Boolean(lootboxItem.send_dm)
      },
      reward: {
        type: rewardType,
        name:
          rewardType === "currency"
            ? `${currencyAmount || 0} ${settings?.emoji_symbol || "💰"}`
            : rewardName,
        description: rewardDescription,
        image_url: rewardImageUrl,
        data: rewardData,
        item_id: rewardItemId
      }
    };
  });
};
