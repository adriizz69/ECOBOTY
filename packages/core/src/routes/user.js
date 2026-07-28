import { Router } from "express";
import { db } from "../services/db.js";
import { applyDaily, ensureGuild, getDailyStatus, getOrCreateSettings, getBalance } from "../services/economy.js";
import {
  listShops,
  listItems,
  purchaseItem,
  listInventory,
  listSales,
  createSale,
  buySale,
  openLootbox,
  getShopById,
  useInventoryItem,
  getUserShopsSettings,
  listUserShops,
  getUserShopByOwner,
  createUserShop,
  updateUserShop,
  deleteUserShop,
  createUserShopItem,
  deleteUserShopItem
} from "../services/shop.js";
import { getGamesSettings, playGame } from "../services/games.js";
import { fetchBotGuilds, getBotSettings } from "../services/admin.js";
import { getUserAchievements, recordAchievementEvent } from "../services/achievements.js";
import { getBirthdayForUser, upsertBirthdayEntry } from "../services/birthdays.js";
import {
  createUserBillingPortalSession,
  getUserBillingOverview
} from "../services/billing-checkout.js";
import { resolveLogsPolicyWindow, getGuildEntitlements, FREE_GAME_MODE_IDS } from "../services/billing-entitlements.js";

export const userRouter = Router();

const getActiveUser = (req) => req.user?.impersonated || req.user?.discord_id;
const getBotToken = () => process.env.DISCORD_BOT_TOKEN;

const hasUserUiDisabled = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  const guildRow = await db("guilds").where({ id: guild.id }).first();
  if (guildRow?.user_ui_disabled) {
    return { disabled: true, reason: "guild", guild };
  }
  const settingsRow = await db("bot_settings").where({ guild_id: guild.id }).first();
  if (settingsRow?.user_ui_disabled) {
    return { disabled: true, reason: "settings", guild };
  }
  return { disabled: false, guild };
};

const ensureUserGuildAccess = async ({ guildId, userId }) => {
  const state = await hasUserUiDisabled(guildId);
  if (state.disabled) {
    const error = new Error("user_ui_disabled");
    error.reason = state.reason;
    throw error;
  }
  const membership = await db("user_guilds")
    .where({ discord_id: String(userId), guild_id: String(guildId) })
    .first();
  if (!membership) {
    const error = new Error("not_member");
    throw error;
  }
  const { map: botGuilds, error: botGuildsError } = await fetchBotGuilds();
  if (!botGuildsError && !botGuilds.has(String(guildId))) {
    const error = new Error("bot_absent");
    throw error;
  }
  return state.guild;
};

const toSafePositiveInteger = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const getUserLogsPolicy = async ({ guildId, requestedLimit = 50 } = {}) => {
  if (!guildId) {
    const safeRequestedLimit = toSafePositiveInteger(requestedLimit, 50, { min: 1, max: 200 });
    return { limit: safeRequestedLimit, minCreatedAt: null };
  }
  return resolveLogsPolicyWindow({ guildId, requestedLimit, maxLimit: 200 });
};

const parseRequiredRoles = (shop) => {
  if (!shop) return [];
  const raw = shop.required_role_ids || shop.required_role_id || null;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [String(raw)];
    }
  }
  return [String(raw)];
};

const parseRequiredRolesMode = (shop) => {
  const mode = String(shop?.required_roles_mode || "").trim().toLowerCase();
  return mode === "any" ? "any" : "all";
};

const isShopAllowedForRoles = ({ requiredRoles = [], requiredRolesMode = "all", memberRoles = [] } = {}) => {
  const required = Array.isArray(requiredRoles) ? requiredRoles.map(String).filter(Boolean) : [];
  if (!required.length) return true;
  const rolesSet = new Set((memberRoles || []).map(String));
  if (requiredRolesMode === "any") {
    return required.some((id) => rolesSet.has(id));
  }
  return required.every((id) => rolesSet.has(id));
};

const fetchMemberRoles = async ({ guildId, userId }) => {
  const token = getBotToken();
  if (!token) return { roles: [], error: "bot_token_missing" };
  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${token}` }
    });
    if (!res.ok) {
      return { roles: [], error: "member_fetch_failed" };
    }
    const data = await res.json();
    return { roles: Array.isArray(data?.roles) ? data.roles.map(String) : [], error: null };
  } catch {
    return { roles: [], error: "member_fetch_failed" };
  }
};

const trackAchievementSafe = async ({
  guildId,
  userId,
  eventKey,
  increment = 1,
  metadata = {}
}) => {
  try {
    await recordAchievementEvent({
      guildId: String(guildId),
      userId: String(userId),
      eventKey,
      increment,
      metadata
    });
  } catch {
    // ignore
  }
};

const trackBalanceAchievementSafe = async ({ guildId, userId, balance, metadata = {} }) => {
  const numericBalance = Number(balance);
  if (!Number.isFinite(numericBalance) || numericBalance < 0) return;
  await trackAchievementSafe({
    guildId,
    userId,
    eventKey: "economy_balance_reached",
    increment: Math.floor(numericBalance),
    metadata: {
      currentBalance: Math.floor(numericBalance),
      ...metadata
    }
  });
};

userRouter.get("/servers", async (req, res) => {
  const userId = getActiveUser(req);
  if (!userId) return res.status(401).json({ error: "missing_user" });
  try {
    const servers = await db("user_guilds")
      .join("guilds", "user_guilds.guild_id", "guilds.discord_guild_id")
      .leftJoin("bot_settings", "guilds.id", "bot_settings.guild_id")
      .where({ "user_guilds.discord_id": String(userId) })
      .where({ "guilds.user_ui_disabled": false })
      .where((builder) =>
        builder.where({ "bot_settings.user_ui_disabled": false }).orWhereNull("bot_settings.user_ui_disabled")
      )
      .select(
        "guilds.discord_guild_id as guild_id",
        "guilds.name as guild_name",
        "guilds.icon as icon",
        "guilds.owner_discord_id as owner_id",
        "bot_settings.user_ui_disabled as user_ui_disabled"
      )
      .orderBy("guilds.name", "asc");

    const { map: botGuilds, error: botGuildsError, stale } = await fetchBotGuilds();
    const canFilter = !botGuildsError || stale;
    const filtered = canFilter
      ? servers.filter((server) => botGuilds.has(String(server.guild_id)))
      : servers;
    return res.json({
      disabled: false,
      servers: filtered,
      bot_guilds_error: botGuildsError && !stale ? botGuildsError : null
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "user_servers_failed" });
  }
});

userRouter.get("/billing", async (req, res) => {
  const userId = getActiveUser(req);
  if (!userId) return res.status(401).json({ error: "missing_user" });
  try {
    const overview = await getUserBillingOverview({ payerDiscordId: userId });
    return res.json(overview);
  } catch (error) {
    const status = Number(error?.status || 400);
    return res.status(status).json({ error: error.message || "user_billing_failed" });
  }
});

userRouter.post("/billing/portal", async (req, res) => {
  const userId = getActiveUser(req);
  if (!userId) return res.status(401).json({ error: "missing_user" });
  try {
    const result = await createUserBillingPortalSession({
      payerDiscordId: userId,
      returnUrl: req.body?.returnUrl
    });
    return res.json(result);
  } catch (error) {
    const status = Number(error?.status || 400);
    return res.status(status).json({ error: error.message || "user_billing_portal_failed" });
  }
});

userRouter.get("/guilds/:id/summary", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    const guild = await ensureUserGuildAccess({ guildId, userId });
    const settings = await getOrCreateSettings(guildId, db);
    let botTimeZone = "UTC";
    try {
      const botSettings = await getBotSettings(guildId);
      botTimeZone = botSettings?.timezone || "UTC";
    } catch {
      botTimeZone = "UTC";
    }
    const balance = await getBalance({ guildId, userId });
    return res.json({
      guild: { id: guild.discord_guild_id, name: guild.name, icon: guild.icon },
      economy: {
        name: settings?.name || "Monnaie",
        emoji: settings?.emoji_symbol || "💰",
        enabled: Boolean(settings?.enabled)
      },
      bot: {
        timezone: botTimeZone
      },
      balance
    });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "summary_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.get("/guilds/:id/shops", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const shops = await listShops(guildId, { enabledOnly: true });
    await trackAchievementSafe({
      guildId,
      userId,
      eventKey: "shop_views",
      increment: 1,
      metadata: { source: "web" }
    });
    const { roles } = await fetchMemberRoles({ guildId, userId });
    const normalized = shops.map((shop) => {
      const required = parseRequiredRoles(shop);
      const requiredMode = parseRequiredRolesMode(shop);
      const allowed = isShopAllowedForRoles({
        requiredRoles: required,
        requiredRolesMode: requiredMode,
        memberRoles: roles
      });
      return {
        ...shop,
        required_role_ids: required,
        required_roles_mode: requiredMode,
        allowed
      };
    });
    return res.json({ shops: normalized });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "shops_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.get("/guilds/:id/daily", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const daily = await getDailyStatus({ guildId, userId });
    return res.json({ daily });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "daily_status_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.post("/guilds/:id/daily/claim", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const status = await getDailyStatus({ guildId, userId });
    if (!status.enabled) return res.status(400).json({ error: "daily_disabled" });
    const result = await applyDaily({ guildId, userId });
    if (result?.ok) {
      await trackAchievementSafe({
        guildId,
        userId,
        eventKey: "daily_claims",
        increment: 1
      });
      await trackBalanceAchievementSafe({
        guildId,
        userId,
        balance: result.balance,
        metadata: { source: "daily" }
      });
    }
    const daily = await getDailyStatus({ guildId, userId });
    return res.json({ ok: true, result, daily });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "daily_claim_failed" };
    if (reason) payload.reason = reason;
    return res.status(400).json(payload);
  }
});

userRouter.get("/guilds/:id/shops/:shopId/items", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const shopId = req.params.shopId;
  if (!userId || !guildId || !shopId) return res.status(401).json({ error: "missing_params" });
  try {
    const guild = await ensureUserGuildAccess({ guildId, userId });
    const shop = await getShopById(shopId);
    if (!shop) return res.status(404).json({ error: "shop_not_found" });
    if (String(shop.guild_id) !== String(guild.id)) {
      return res.status(403).json({ error: "shop_not_found" });
    }

    if (shop.owner_discord_id) {
      const userShopSettings = await getUserShopsSettings(guildId);
      if (!userShopSettings.enabled) return res.status(403).json({ error: "user_shops_disabled" });
      if (shop.enabled === false) return res.status(403).json({ error: "shop_inactive" });
    } else {
      const { roles } = await fetchMemberRoles({ guildId, userId });
      const required = parseRequiredRoles(shop);
      const requiredMode = parseRequiredRolesMode(shop);
      const allowed = isShopAllowedForRoles({
        requiredRoles: required,
        requiredRolesMode: requiredMode,
        memberRoles: roles
      });
      if (!allowed) {
        return res.status(403).json({ error: "missing_roles", required, required_roles_mode: requiredMode });
      }
      const visibleShops = await listShops(guildId, { enabledOnly: true });
      const visibleShopIds = new Set((visibleShops || []).map((entry) => String(entry.id)));
      if (!visibleShopIds.has(String(shop.id))) {
        return res.status(403).json({ error: "shop_not_found" });
      }
    }

    const items = await listItems(shopId, { enforceShopAccess: false });
    const discount = Number(shop.discount_percent || 0);
    const normalized = items.map((item) => {
      const totalDiscount = discount + Number(item.discount_percent || 0);
      const finalPrice = Math.max(0, Math.floor(item.price - (item.price * totalDiscount) / 100));
      return {
        ...item,
        final_price: finalPrice
      };
    });
    return res.json({ shop, items: normalized });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "items_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.post("/guilds/:id/shops/:shopId/purchase", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const { itemId } = req.body || {};
  if (!userId || !guildId || !itemId) return res.status(400).json({ error: "missing_params" });
  try {
    const guild = await ensureUserGuildAccess({ guildId, userId });
    const item = await db("shop_items").where({ id: itemId }).first();
    if (!item) return res.status(404).json({ error: "item_not_found" });
    const shop = await db("shops").where({ id: item.shop_id }).first();
    if (!shop) return res.status(404).json({ error: "shop_not_found" });
    if (String(shop.guild_id) !== String(guild.id)) {
      return res.status(403).json({ error: "shop_not_found" });
    }
    if (shop.owner_discord_id) {
      const userShopSettings = await getUserShopsSettings(guildId);
      if (!userShopSettings.enabled) return res.status(403).json({ error: "user_shops_disabled" });
    } else {
      const { roles } = await fetchMemberRoles({ guildId, userId });
      const required = parseRequiredRoles(shop);
      const requiredMode = parseRequiredRolesMode(shop);
      const allowed = isShopAllowedForRoles({
        requiredRoles: required,
        requiredRolesMode: requiredMode,
        memberRoles: roles
      });
      if (!allowed) {
        return res.status(403).json({ error: "missing_roles", required, required_roles_mode: requiredMode });
      }
    }
    const result = await purchaseItem({ guildId, userId, itemId });
    if (result?.ok) {
      await trackAchievementSafe({
        guildId,
        userId,
        eventKey: "economy_purchases",
        increment: 1
      });
      const currentBalance = await getBalance({ guildId, userId });
      await trackBalanceAchievementSafe({
        guildId,
        userId,
        balance: currentBalance,
        metadata: { source: "purchase" }
      });
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "purchase_failed" });
  }
});

userRouter.get("/guilds/:id/user-shops/settings", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const [settings, entitlements] = await Promise.all([
      getUserShopsSettings(guildId),
      getGuildEntitlements(guildId)
    ]);
    return res.json({
      settings,
      features: entitlements.features || {},
      isPremium: Boolean(entitlements.isPremium)
    });
  } catch (error) {
    return res.status(403).json({ error: error.message || "user_shops_settings_failed" });
  }
});

userRouter.get("/guilds/:id/user-shops", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const settings = await getUserShopsSettings(guildId);
    if (!settings.enabled) return res.json({ settings, shops: [] });
    const shops = await listUserShops(guildId, { enabledOnly: true });
    return res.json({ settings, shops });
  } catch (error) {
    return res.status(403).json({ error: error.message || "user_shops_failed" });
  }
});

userRouter.get("/guilds/:id/user-shops/mine", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const settings = await getUserShopsSettings(guildId);
    const shop = await getUserShopByOwner(guildId, userId);
    let items = [];
    if (shop) {
      items = await listItems(shop.id, {
        includeHidden: true,
        includeUnavailable: true,
        enforceShopAccess: false
      });
    }
    return res.json({ settings, shop: shop || null, items });
  } catch (error) {
    return res.status(403).json({ error: error.message || "my_shop_failed" });
  }
});

userRouter.post("/guilds/:id/user-shops/mine", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const shop = await createUserShop({
      guildId,
      ownerDiscordId: userId,
      data: req.body || {}
    });
    return res.json({ shop });
  } catch (error) {
    return res.status(400).json({ error: error.message || "my_shop_create_failed" });
  }
});

userRouter.put("/guilds/:id/user-shops/mine", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const existing = await getUserShopByOwner(guildId, userId);
    if (!existing) return res.status(404).json({ error: "shop_not_found" });
    const shop = await updateUserShop({
      guildId,
      ownerDiscordId: userId,
      shopId: existing.id,
      data: req.body || {}
    });
    return res.json({ shop });
  } catch (error) {
    return res.status(400).json({ error: error.message || "my_shop_update_failed" });
  }
});

userRouter.delete("/guilds/:id/user-shops/mine", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const existing = await getUserShopByOwner(guildId, userId);
    if (!existing) return res.status(404).json({ error: "shop_not_found" });
    await deleteUserShop({
      guildId,
      ownerDiscordId: userId,
      shopId: existing.id
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "my_shop_delete_failed" });
  }
});

userRouter.post("/guilds/:id/user-shops/mine/items", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const existing = await getUserShopByOwner(guildId, userId);
    if (!existing) return res.status(404).json({ error: "shop_not_found" });
    const item = await createUserShopItem({
      guildId,
      ownerDiscordId: userId,
      shopId: existing.id,
      data: req.body || {}
    });
    return res.json({ item });
  } catch (error) {
    return res.status(400).json({ error: error.message || "my_shop_item_create_failed" });
  }
});

userRouter.put("/guilds/:id/user-shops/mine/items/:itemId", async (_req, res) => {
  return res.status(403).json({ error: "user_shop_item_readonly" });
});

userRouter.delete("/guilds/:id/user-shops/mine/items/:itemId", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const itemId = req.params.itemId;
  if (!userId || !guildId || !itemId) return res.status(401).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const existing = await getUserShopByOwner(guildId, userId);
    if (!existing) return res.status(404).json({ error: "shop_not_found" });
    await deleteUserShopItem({
      guildId,
      ownerDiscordId: userId,
      shopId: existing.id,
      itemId
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "my_shop_item_delete_failed" });
  }
});

userRouter.get("/guilds/:id/inventory", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const items = await listInventory({ guildId, userId });
    return res.json({ items });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "inventory_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.get("/guilds/:id/sales", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const sales = await listSales({ guildId });
    return res.json({ sales });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "sales_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.post("/guilds/:id/sales", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const { itemId, price, quantity } = req.body || {};
  if (!userId || !guildId || !itemId || !price) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const result = await createSale({ guildId, userId, itemId, price, quantity });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "sale_create_failed" });
  }
});

userRouter.post("/guilds/:id/sales/:saleId/buy", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const saleId = req.params.saleId;
  if (!userId || !guildId || !saleId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const result = await buySale({ guildId, buyerId: userId, saleId });
    if (result?.ok) {
      await trackBalanceAchievementSafe({
        guildId,
        userId,
        balance: result.buyerBalance,
        metadata: { source: "sale_buy" }
      });
      if (!result.selfBuy && result.sellerId) {
        await trackAchievementSafe({
          guildId,
          userId: result.sellerId,
          eventKey: "economy_sales_count",
          increment: 1,
          metadata: { buyerId: userId, source: "sale_buy" }
        });
        const sellerBalance = await getBalance({ guildId, userId: result.sellerId });
        await trackBalanceAchievementSafe({
          guildId,
          userId: result.sellerId,
          balance: sellerBalance,
          metadata: { source: "sale_sell" }
        });
      }
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "sale_buy_failed" });
  }
});

userRouter.post("/guilds/:id/inventory/:itemId/open", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const itemId = req.params.itemId;
  if (!userId || !guildId || !itemId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const result = await openLootbox({ guildId, userId, itemId });
    if (result?.ok) {
      await trackAchievementSafe({
        guildId,
        userId,
        eventKey: "lootboxes_opened",
        increment: 1
      });
      if (String(result?.reward?.type || "") === "currency") {
        const currentBalance = await getBalance({ guildId, userId });
        await trackBalanceAchievementSafe({
          guildId,
          userId,
          balance: currentBalance,
          metadata: { source: "lootbox" }
        });
      }
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "lootbox_open_failed" });
  }
});

userRouter.post("/guilds/:id/inventory/:itemId/use", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const itemId = req.params.itemId;
  if (!userId || !guildId || !itemId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const result = await useInventoryItem({ guildId, userId, itemId });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "inventory_use_failed" });
  }
});

userRouter.get("/guilds/:id/games/settings", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const [settings, entitlements] = await Promise.all([
      getGamesSettings(guildId),
      getGuildEntitlements(guildId)
    ]);
    return res.json({
      settings,
      features: entitlements.features || {},
      isPremium: Boolean(entitlements.isPremium),
      allowedGameIds: entitlements.isPremium || entitlements.features?.games_advanced_modes
        ? null
        : [...FREE_GAME_MODE_IDS]
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "games_settings_failed" });
  }
});

userRouter.post("/guilds/:id/games/play", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const { gameId, bet, choice, cashout } = req.body || {};
  if (!userId || !guildId || !gameId || !bet) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const result = await playGame({ guildId, userId, gameId, bet, choice, cashout });
    if (result?.ok) {
      await trackAchievementSafe({
        guildId,
        userId,
        eventKey: "games_played",
        increment: 1,
        metadata: { gameId }
      });
      if (result.win) {
        await trackAchievementSafe({
          guildId,
          userId,
          eventKey: "games_won",
          increment: 1,
          metadata: { gameId }
        });
      }
      await trackBalanceAchievementSafe({
        guildId,
        userId,
        balance: result.balance,
        metadata: { source: "game", gameId }
      });
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "game_failed" });
  }
});

userRouter.get("/guilds/:id/achievements", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const data = await getUserAchievements({ guildId, userId });
    return res.json(data);
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "achievements_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.get("/guilds/:id/birthday", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const payload = await getBirthdayForUser({ guildId, userId });
    return res.json(payload);
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "birthday_fetch_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});

userRouter.post("/guilds/:id/birthday", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const birthDate = String(req.body?.birthDate || req.body?.birth_date || "").trim();
  if (!userId || !guildId || !birthDate) return res.status(400).json({ error: "missing_params" });
  try {
    await ensureUserGuildAccess({ guildId, userId });
    const existing = await getBirthdayForUser({ guildId, userId });
    if (!existing?.settings?.enabled) {
      return res.status(400).json({ error: "birthday_disabled" });
    }
    if (existing?.entry) {
      return res.status(400).json({ error: "birthday_user_locked" });
    }
    const result = await upsertBirthdayEntry({
      guildId,
      userId,
      birthDate,
      source: "user",
      actorUserId: userId,
      triggerAchievement: true,
      logChange: true
    });
    const payload = await getBirthdayForUser({ guildId, userId });
    return res.json({ ok: true, result, ...payload });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "birthday_save_failed" };
    if (reason) payload.reason = reason;
    return res.status(400).json(payload);
  }
});

userRouter.delete("/guilds/:id/birthday", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  return res.status(400).json({ error: "birthday_user_locked" });
});

userRouter.get("/guilds/:id/logs", async (req, res) => {
  const userId = getActiveUser(req);
  const guildId = req.params.id;
  const requestedLimit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const logsPolicy = await getUserLogsPolicy({ guildId, requestedLimit });
    const guild = await ensureUserGuildAccess({ guildId, userId });
    const gainsQuery = db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: String(userId) })
      .orderBy("created_at", "desc")
      .limit(logsPolicy.limit);
    const eventsQuery = db("economy_event_logs")
      .where({ guild_id: guild.id, user_discord_id: String(userId) })
      .orderBy("created_at", "desc")
      .limit(logsPolicy.limit);
    if (logsPolicy.minCreatedAt) {
      gainsQuery.andWhere("created_at", ">=", logsPolicy.minCreatedAt);
      eventsQuery.andWhere("created_at", ">=", logsPolicy.minCreatedAt);
    }
    const [gains, events] = await Promise.all([gainsQuery, eventsQuery]);
    let timeZone = "UTC";
    try {
      const botSettings = await getBotSettings(guildId);
      timeZone = botSettings?.timezone || "UTC";
    } catch {
      timeZone = "UTC";
    }
    return res.json({ gains, events, timeZone });
  } catch (error) {
    const reason = error?.reason;
    const payload = { error: error.message || "logs_failed" };
    if (reason) payload.reason = reason;
    return res.status(403).json(payload);
  }
});
