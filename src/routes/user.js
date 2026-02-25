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
  useInventoryItem
} from "../services/shop.js";
import { getGamesSettings, playGame } from "../services/games.js";
import { fetchBotGuilds, getBotSettings } from "../services/admin.js";
import { getUserAchievements, recordAchievementEvent } from "../services/achievements.js";
import { getBirthdayForUser, upsertBirthdayEntry } from "../services/birthdays.js";

export const userRouter = Router();

const getActiveUser = (req) => req.user?.impersonated || req.user?.discord_id;
const getBotToken = () => process.env.DISCORD_BOT_TOKEN;

const hasUserUiDisabled = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  const globalRow = await db("bot_settings").orderBy("guild_id", "asc").first();
  if (globalRow?.user_ui_disabled) {
    return { disabled: true, reason: "global", guild };
  }
  const guildRow = await db("guilds").where({ id: guild.id }).first();
  if (guildRow?.user_ui_disabled) {
    return { disabled: true, reason: "guild", guild };
  }
  const settingsRow = await db("bot_settings").where({ guild_id: guild.id }).first();
  if (settingsRow?.user_ui_disabled) {
    return { disabled: true, reason: "global", guild };
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

userRouter.get("/servers", async (req, res) => {
  const userId = getActiveUser(req);
  if (!userId) return res.status(401).json({ error: "missing_user" });
  try {
    const global = await db("bot_settings").orderBy("guild_id", "asc").first();
    if (global?.user_ui_disabled) {
      return res.json({ disabled: true, reason: "global" });
    }

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

    const { map: botGuilds, error: botGuildsError } = await fetchBotGuilds();
    const filtered = botGuildsError
      ? servers
      : servers.filter((server) => botGuilds.has(String(server.guild_id)));
    return res.json({
      disabled: false,
      servers: filtered,
      bot_guilds_error: botGuildsError || null
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "user_servers_failed" });
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
      const allowed = required.length === 0 || required.every((id) => roles.includes(String(id)));
      return {
        ...shop,
        required_role_ids: required,
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
    const { roles } = await fetchMemberRoles({ guildId, userId });
    const required = parseRequiredRoles(shop);
    const allowed = required.length === 0 || required.every((id) => roles.includes(String(id)));
    if (!allowed) return res.status(403).json({ error: "missing_roles", required });
    const items = await listItems(shopId);
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
    const { roles } = await fetchMemberRoles({ guildId, userId });
    const required = parseRequiredRoles(shop);
    const allowed = required.length === 0 || required.every((id) => roles.includes(String(id)));
    if (!allowed) return res.status(403).json({ error: "missing_roles", required });
    const result = await purchaseItem({ guildId, userId, itemId });
    if (result?.ok) {
      await trackAchievementSafe({
        guildId,
        userId,
        eventKey: "economy_purchases",
        increment: 1
      });
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "purchase_failed" });
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
    const settings = await getGamesSettings(guildId);
    return res.json({ settings });
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
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
  if (!userId || !guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const guild = await ensureUserGuildAccess({ guildId, userId });
    const gains = await db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: String(userId) })
      .orderBy("created_at", "desc")
      .limit(limit);
    const events = await db("economy_event_logs")
      .where({ guild_id: guild.id, user_discord_id: String(userId) })
      .orderBy("created_at", "desc")
      .limit(limit);
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
