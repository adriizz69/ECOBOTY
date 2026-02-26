import { Router } from "express";
import { requireNotBannedByItem, requireNotBannedByShop } from "../middleware/ban.js";
import {
  applyDaily,
  getLeaderboard,
  getBalance,
  getOrCreateSettings,
  getAutomationConfig,
  applyAutoGain,
  getLeaderboardPostSettings,
  saveLeaderboardPostSettings
} from "../services/economy.js";
import { getGamesSettings, playGame } from "../services/games.js";
import {
  listShops,
  listItems,
  purchaseItem,
  getShopById,
  getItemById,
  listInventory,
  listSales,
  createSale,
  buySale,
  openLootbox,
  useInventoryItem
} from "../services/shop.js";
import {
  listBannedGuilds,
  upsertGuildFromBot,
  getBotSettings,
  deleteGuildDataByDiscordId,
  upsertTempRoleAssignment,
  listExpiredTempRoles,
  deleteTempRoleAssignment
} from "../services/admin.js";
import { stopTwitchListener } from "../services/twitch.js";
import { sendLogMessage } from "../services/logs.js";
import { getUserAchievementsPage, recordAchievementEvent } from "../services/achievements.js";
import {
  getOrCreateBirthdaySettings,
  getBirthdayForUser,
  upsertBirthdayEntry,
  getUpcomingBirthdays,
  parseBirthdayDateFromText,
  normalizeBirthdayDateForStorage
} from "../services/birthdays.js";

export const botRouter = Router();

const autoGainLogState = new Map();
const shouldLogAutoGain = (guildId) => {
  const now = Date.now();
  const last = autoGainLogState.get(guildId) || 0;
  if (now - last < 30000) return false;
  autoGainLogState.set(guildId, now);
  return true;
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
    // do not block feature flow on achievements errors
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

botRouter.use((req, res, next) => {
  const token = req.headers["x-api-key"];
  if (!token || token !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return next();
});

botRouter.use("/shops/:id/items", requireNotBannedByShop);
botRouter.use("/shops/item/:itemId", requireNotBannedByItem);

botRouter.get("/guilds/banned", async (_req, res) => {
  try {
    const banned = await listBannedGuilds();
    return res.json({ banned });
  } catch (error) {
    return res.status(500).json({ error: "banned_fetch_failed" });
  }
});

botRouter.post("/guilds/sync", async (req, res) => {
  const {
    guildId,
    name,
    icon,
    ownerId,
    addedById,
    addedByUsername,
    addedAt
  } = req.body || {};
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const guild = await upsertGuildFromBot({
      guildId,
      name,
      icon,
      ownerId,
      addedById,
      addedByUsername,
      addedAt
    });
    return res.json({ guild });
  } catch (error) {
    return res.status(400).json({ error: error.message || "guild_sync_failed" });
  }
});

botRouter.post("/guilds/remove", async (req, res) => {
  const { guildId } = req.body || {};
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    await stopTwitchListener(String(guildId));
    const result = await deleteGuildDataByDiscordId(String(guildId));
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message || "guild_remove_failed" });
  }
});

botRouter.post("/temp-roles", async (req, res) => {
  const { guildId, userId, roleId, durationSeconds } = req.body || {};
  if (!guildId || !userId || !roleId || !durationSeconds) {
    return res.status(400).json({ error: "missing_params" });
  }
  const seconds = Number(durationSeconds || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return res.status(400).json({ error: "invalid_duration" });
  }
  try {
    const expiresAt = new Date(Date.now() + seconds * 1000);
    const entry = await upsertTempRoleAssignment({
      guildId,
      userId,
      roleId,
      expiresAt
    });
    return res.json({ ok: true, entry });
  } catch (error) {
    return res.status(400).json({ error: error.message || "temp_role_failed" });
  }
});

botRouter.get("/temp-roles/expired", async (req, res) => {
  const limit = Number(req.query.limit || 50);
  try {
    const rows = await listExpiredTempRoles({ limit });
    return res.json({ rows });
  } catch (error) {
    return res.status(500).json({ error: "temp_role_list_failed" });
  }
});

botRouter.post("/temp-roles/mark-removed", async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "missing_params" });
  try {
    const ok = await deleteTempRoleAssignment(id);
    return res.json({ ok });
  } catch (error) {
    return res.status(400).json({ error: error.message || "temp_role_remove_failed" });
  }
});

botRouter.post("/logs", async (req, res) => {
  const { guildId, content } = req.body || {};
  if (!guildId || !content) return res.status(400).json({ error: "missing_params" });
  try {
    await sendLogMessage({ guildId: String(guildId), content: String(content) });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "log_send_failed" });
  }
});

botRouter.post("/economy/daily", async (req, res) => {
  const { guildId, userId } = req.body || {};
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
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
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "daily_failed" });
  }
});

botRouter.get("/economy/leaderboard", async (req, res) => {
  const guildId = req.query.guildId;
  const limit = Number(req.query.limit || 10);
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const rows = await getLeaderboard({ guildId, limit });
    return res.json({ leaderboard: rows });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_failed" });
  }
});

botRouter.get("/economy/balance", async (req, res) => {
  const guildId = req.query.guildId;
  const userId = req.query.userId;
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const balance = await getBalance({ guildId, userId });
    return res.json({ balance });
  } catch (error) {
    return res.status(400).json({ error: error.message || "balance_failed" });
  }
});

botRouter.get("/economy/settings", async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const settings = await getOrCreateSettings(guildId);
    return res.json({
      name: settings.name,
      emoji: settings.emoji_symbol || "💰"
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "settings_failed" });
  }
});

botRouter.get("/settings", async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const settings = await getBotSettings(guildId);
    return res.json({
      language: settings.bot_language || "fr",
      timezone: settings.timezone || null,
      welcome_enabled: settings.welcome_enabled !== false,
      welcome_message_fr: settings.welcome_message_fr || null,
      welcome_message_en: settings.welcome_message_en || null,
      welcome_message_es: settings.welcome_message_es || null
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "bot_settings_failed" });
  }
});

botRouter.get("/games/settings", async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const settings = await getGamesSettings(guildId);
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "games_settings_failed" });
  }
});

botRouter.post("/games/play", async (req, res) => {
  const { guildId, userId, gameId, bet, choice, cashout } = req.body || {};
  if (!guildId || !userId || !gameId || !bet) return res.status(400).json({ error: "missing_params" });
  try {
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

botRouter.post("/achievements/event", async (req, res) => {
  const { guildId, userId, eventKey, increment, metadata } = req.body || {};
  if (!guildId || !userId || !eventKey) return res.status(400).json({ error: "missing_params" });
  try {
    const result = await recordAchievementEvent({
      guildId: String(guildId),
      userId: String(userId),
      eventKey: String(eventKey),
      increment: Number.isFinite(Number(increment)) ? Number(increment) : 1,
      metadata: metadata && typeof metadata === "object" ? metadata : {}
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "achievement_event_failed" });
  }
});

botRouter.get("/achievements/user", async (req, res) => {
  const guildId = req.query.guildId;
  const userId = req.query.userId;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 8);
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const data = await getUserAchievementsPage({
      guildId: String(guildId),
      userId: String(userId),
      page,
      limit
    });
    return res.json(data);
  } catch (error) {
    return res.status(400).json({ error: error.message || "achievements_user_failed" });
  }
});

botRouter.get("/birthdays/settings", async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const settings = await getOrCreateBirthdaySettings(String(guildId));
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthday_settings_failed" });
  }
});

botRouter.get("/birthdays/self", async (req, res) => {
  const guildId = req.query.guildId;
  const userId = req.query.userId;
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const payload = await getBirthdayForUser({
      guildId: String(guildId),
      userId: String(userId)
    });
    return res.json(payload);
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthday_self_failed" });
  }
});

botRouter.post("/birthdays/self", async (req, res) => {
  const guildId = req.body?.guildId;
  const userId = req.body?.userId;
  const format = String(req.body?.format || "dmy").toLowerCase();
  const birthDateText = String(req.body?.birthDateText || req.body?.birthDate || "").trim();
  if (!guildId || !userId || !birthDateText) return res.status(400).json({ error: "missing_params" });
  try {
    const current = await getBirthdayForUser({
      guildId: String(guildId),
      userId: String(userId)
    });
    if (!current?.settings?.enabled) {
      return res.status(400).json({ error: "birthday_disabled" });
    }
    if (current?.entry) {
      return res.status(400).json({ error: "birthday_user_locked" });
    }

    const normalizedFromIso = normalizeBirthdayDateForStorage(birthDateText);
    const normalizedFromText = parseBirthdayDateFromText(birthDateText, format === "ymd" ? "ymd" : "dmy");
    const birthDate = normalizedFromIso || normalizedFromText || "";
    if (!birthDate) {
      return res.status(400).json({ error: "birthday_invalid_date" });
    }

    const result = await upsertBirthdayEntry({
      guildId: String(guildId),
      userId: String(userId),
      birthDate,
      source: "command",
      actorUserId: String(userId),
      triggerAchievement: true,
      logChange: true
    });
    const payload = await getBirthdayForUser({
      guildId: String(guildId),
      userId: String(userId)
    });
    return res.json({ ok: true, result, ...payload });
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthday_save_failed" });
  }
});

botRouter.get("/birthdays/upcoming", async (req, res) => {
  const guildId = req.query.guildId;
  const limit = Number(req.query.limit || 10);
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const payload = await getUpcomingBirthdays({
      guildId: String(guildId),
      limit
    });
    return res.json(payload);
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthday_upcoming_failed" });
  }
});

botRouter.get("/economy/automation", async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const config = await getAutomationConfig(guildId);
    return res.json({ config });
  } catch (error) {
    return res.status(400).json({ error: error.message || "automation_failed" });
  }
});

botRouter.post("/economy/auto-gain", async (req, res) => {
  const { guildId, userId, type, channelId, roleIds } = req.body || {};
  if (!guildId || !userId || !type) {
    console.warn("[auto-gain] missing_params", {
      hasGuildId: Boolean(guildId),
      hasUserId: Boolean(userId),
      hasType: Boolean(type),
      contentType: req.headers["content-type"],
      hasApiKey: Boolean(req.headers["x-api-key"]),
      bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body) : null
    });
    return res.status(400).json({ error: "missing_params" });
  }
  try {
    const result = await applyAutoGain({
      guildId,
      userId,
      type,
      channelId,
      roleIds: Array.isArray(roleIds) ? roleIds : []
    });
    if (result?.ok) {
      await trackBalanceAchievementSafe({
        guildId,
        userId,
        balance: result.balance,
        metadata: { source: type }
      });
    }
    if (result.ok && shouldLogAutoGain(guildId)) {
      console.log(
        `[auto-gain] guild=${guildId} type=${type} amount=${result.amount} base=${result.base} mult=${result.multiplier}`
      );
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "auto_gain_failed" });
  }
});

botRouter.get("/economy/leaderboard-post", async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const settings = await getLeaderboardPostSettings(guildId);
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_post_failed" });
  }
});

botRouter.post("/economy/leaderboard-post", async (req, res) => {
  const { guildId } = req.body || {};
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const settings = await saveLeaderboardPostSettings(guildId, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_post_failed" });
  }
});

botRouter.get("/shops", async (req, res) => {
  const guildId = req.query.guildId;
  const userId = req.query.userId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const shops = await listShops(guildId, { enabledOnly: true });
    if (userId) {
      await trackAchievementSafe({
        guildId,
        userId,
        eventKey: "shop_views",
        increment: 1,
        metadata: { source: "discord" }
      });
    }
    return res.json({ shops });
  } catch (error) {
    return res.status(400).json({ error: error.message || "shops_failed" });
  }
});

botRouter.get("/shops/:id/items", async (req, res) => {
  try {
    const items = await listItems(req.params.id);
    return res.json({ items });
  } catch (error) {
    return res.status(400).json({ error: error.message || "items_failed" });
  }
});

botRouter.get("/shops/item/:itemId", async (req, res) => {
  try {
    const item = await getItemById(req.params.itemId);
    if (!item) return res.status(404).json({ error: "item_not_found" });
    const shop = await getShopById(item.shop_id);
    return res.json({ item, shop });
  } catch (error) {
    return res.status(400).json({ error: error.message || "item_failed" });
  }
});

botRouter.post("/shops/:id/purchase", async (req, res) => {
  const { guildId, userId, itemId } = req.body || {};
  if (!guildId || !userId || !itemId) return res.status(400).json({ error: "missing_params" });
  try {
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

botRouter.get("/inventory", async (req, res) => {
  const guildId = req.query.guildId;
  const userId = req.query.userId;
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const items = await listInventory({ guildId, userId });
    return res.json({ items });
  } catch (error) {
    return res.status(400).json({ error: error.message || "inventory_failed" });
  }
});

botRouter.get("/inventory/sales", async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const sales = await listSales({ guildId });
    return res.json({ sales });
  } catch (error) {
    return res.status(400).json({ error: error.message || "sales_failed" });
  }
});

botRouter.post("/inventory/sell", async (req, res) => {
  const { guildId, userId, itemId, price, quantity } = req.body || {};
  if (!guildId || !userId || !itemId || !price) return res.status(400).json({ error: "missing_params" });
  try {
    const result = await createSale({ guildId, userId, itemId, price, quantity });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "sale_create_failed" });
  }
});

botRouter.post("/inventory/open", async (req, res) => {
  const { guildId, userId, itemId } = req.body || {};
  if (!guildId || !userId || !itemId) return res.status(400).json({ error: "missing_params" });
  try {
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

botRouter.post("/inventory/use", async (req, res) => {
  const { guildId, userId, itemId } = req.body || {};
  if (!guildId || !userId || !itemId) return res.status(400).json({ error: "missing_params" });
  try {
    const result = await useInventoryItem({ guildId, userId, itemId });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "inventory_use_failed" });
  }
});

botRouter.post("/inventory/buy", async (req, res) => {
  const { guildId, userId, saleId } = req.body || {};
  if (!guildId || !userId || !saleId) return res.status(400).json({ error: "missing_params" });
  try {
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
