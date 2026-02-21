import { db } from "./db.js";
import { ensureGuild, getOrCreateBalance, getOrCreateSettings } from "./economy.js";
import { insertEventLog, sendLogMessage } from "./logs.js";
import { upsertTempRoleAssignment } from "./admin.js";

const normalizeDateTime = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value);
  const normalized = raw.includes("T") ? raw.replace("T", " ") : raw;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  return normalized;
};

export const listShops = async (guildId, options = {}) => {
  const guild = await ensureGuild(guildId, db);
  const query = db("shops").where({ guild_id: guild.id });
  if (options.enabledOnly) query.andWhere({ enabled: true });
  return query.orderBy("id", "asc");
};

export const createShop = async (guildId, data) => {
  const guild = await ensureGuild(guildId, db);
  const roleIds = Array.isArray(data.required_role_ids)
    ? data.required_role_ids.filter(Boolean)
    : null;
  const payload = {
    guild_id: guild.id,
    name: data.name,
    required_role_id: data.required_role_id || null,
    required_role_ids: roleIds ? JSON.stringify(roleIds) : null,
    discount_percent: Number(data.discount_percent || 0),
    enabled: data.enabled === false ? false : true,
    image_url: data.image_url || null,
    description: data.description || null
  };
  const [id] = await db("shops").insert(payload);
  return db("shops").where({ id }).first();
};

export const updateShop = async (guildId, shopId, data) => {
  const guild = await ensureGuild(guildId, db);
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
    await db("shops").where({ id: shopId, guild_id: guild.id }).update(payload);
  }
  return db("shops").where({ id: shopId }).first();
};

export const listItems = async (shopId, options = {}) => {
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
    return items.map((item) => ({
      ...item,
      lootbox_reward: lootboxRewardIds.has(String(item.id))
    }));
  }

  let guildId = options.guildId;
  if (!guildId) {
    const shop = await db("shops").where({ id: shopId }).first();
    guildId = shop?.guild_id || null;
  }
  if (!items.length) return [];

  const ids = items.map((item) => item.id);
  if (!guildId || !ids.length) {
    return items.map((item) => ({ ...item, inventory_quantity: 0 }));
  }

  const totals = await db("inventory")
    .where({ guild_id: guildId })
    .whereIn("item_id", ids)
    .groupBy("item_id")
    .sum({ quantity: "quantity" });

  const totalMap = new Map(
    (totals || []).map((row) => [String(row.item_id), Number(row.quantity || 0)])
  );

  return items.map((item) => ({
    ...item,
    lootbox_reward: lootboxRewardIds.has(String(item.id)),
    inventory_quantity: totalMap.get(String(item.id)) || 0
  }));
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

export const createItem = async (shopId, data) => {
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
    if (shop.enabled === false) throw new Error("shop_inactive");

    const settings = await trx("economy_settings").where({ guild_id: guild.id }).first();
    if (!settings || !settings.enabled) throw new Error("economy_disabled");

    const balance = await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userId })
      .first();
    if (!balance) throw new Error("no_balance");

    const discount = Number(shop.discount_percent || 0) + Number(item.discount_percent || 0);
    const price = Math.max(0, Math.floor(item.price - (item.price * discount) / 100));

    if (balance.balance < price) throw new Error("insufficient_funds");

    if (item.stock !== null && item.stock !== undefined) {
      if (item.stock <= 0) throw new Error("out_of_stock");
      await trx("shop_items").where({ id: item.id }).update({ stock: item.stock - 1 });
    }

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userId })
      .update({ balance: balance.balance - price });

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
        price
      }
    });

    logInfo = {
      guildId,
      userId: String(userId),
      itemName: item.name,
      shopName: shop.name,
      price,
      currency: settings?.emoji_symbol || "💰"
    };

    return { ok: true, price, itemId: item.id, type: item.type };
  });
  if (logInfo) {
    const amountLabel = `${logInfo.price} ${logInfo.currency}`;
    const shopLabel = logInfo.shopName ? ` dans **${logInfo.shopName}**` : "";
    await sendLogMessage({
      guildId: logInfo.guildId,
      content: `🛒 Achat boutique — <@${logInfo.userId}> a acheté **${logInfo.itemName}**${shopLabel} pour ${amountLabel}.`
    });
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
