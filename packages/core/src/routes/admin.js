import { Router } from "express";
import { SignJWT } from "jose";
import { db } from "../services/db.js";
import {
  broadcastBotMessage,
  createGuildInvite,
  getSummary,
  listAdminLogs,
  listGuilds,
  listUsers,
  countUsers,
  getUserDetails,
  getAdminGuildDetails,
  getDbInfo,
  getGlobalWelcomeSettings,
  setGlobalWelcomeSettings,
  setGlobalUserUiDisabled,
  setGuildUserUiDisabled,
  setGuildBan,
  insertAdminLog,
  listDashboardNotifications,
  getDashboardStats
} from "../services/admin.js";
import {
  getTopggAdminOverview,
  listTopggVotes,
  postTopggServerCount,
  saveTopggSettings
} from "../services/topgg.js";
import {
  getBillingCatalogAdminOverview,
  syncStripeCatalog,
  recreateStripeCatalogZeroTax
} from "../services/billing-catalog.js";
import {
  cancelAdminGuildSubscription,
  createAdminPromoCode,
  deactivateAdminPromoCode,
  getBillingDashboardOverview,
  getAdminGuildRefundQuote,
  listAdminBillingAccounts,
  listAdminBillingWebhookEvents,
  listAdminPromoCodes,
  refundAdminGuildSubscription
} from "../services/billing-admin.js";
import { getGuildBillingSummary } from "../services/billing-entitlements.js";
import { syncGuildBillingFromStripe } from "../services/billing-webhook.js";

export const adminRouter = Router();

adminRouter.get("/summary", async (_req, res) => {
  try {
    const summary = await getSummary();
    return res.json({ summary });
  } catch (error) {
    return res.status(500).json({ error: "summary_failed" });
  }
});

adminRouter.get("/overview", async (req, res) => {
  try {
    const logsLimit = Number(req.query.logsLimit || 200);
    const [summary, guilds, logs] = await Promise.all([
      getSummary(),
      listGuilds({ withBotPresence: true }),
      listAdminLogs({ limit: logsLimit })
    ]);
    return res.json({ summary, guilds, logs });
  } catch (error) {
    return res.status(500).json({ error: "overview_failed" });
  }
});

adminRouter.get("/guilds", async (_req, res) => {
  try {
    const guilds = await listGuilds({ withBotPresence: true });
    return res.json({ guilds });
  } catch (error) {
    return res.status(500).json({ error: "guilds_failed" });
  }
});

adminRouter.get("/guilds/:id/details", async (req, res) => {
  try {
    const details = await getAdminGuildDetails(req.params.id);
    return res.json({ details });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "guild_details_failed" });
  }
});

adminRouter.post("/guilds/:id/ban", async (req, res) => {
  const guildId = req.params.id;
  const reason = String(req.body?.reason || "").trim();
  try {
    const guild = await setGuildBan({
      guildId,
      adminId: req.user?.discord_id,
      reason,
      banned: true
    });
    return res.json({ guild });
  } catch (error) {
    return res.status(400).json({ error: error.message || "ban_failed" });
  }
});

adminRouter.post("/guilds/:id/unban", async (req, res) => {
  const guildId = req.params.id;
  try {
    const guild = await setGuildBan({
      guildId,
      adminId: req.user?.discord_id,
      reason: "",
      banned: false
    });
    return res.json({ guild });
  } catch (error) {
    return res.status(400).json({ error: error.message || "unban_failed" });
  }
});

adminRouter.post("/broadcast", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const includeBanned = Boolean(req.body?.includeBanned);
  if (!message) return res.status(400).json({ error: "missing_message" });
  if (message.length > 2000) return res.status(400).json({ error: "message_too_long" });

  try {
    const result = await broadcastBotMessage({ content: message, includeBanned });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "broadcast",
      data: {
        message,
        includeBanned,
        sent: result.sent,
        totalConfigured: result.totalConfigured,
        eligible: result.eligible,
        failed: result.failed,
        skippedBanned: result.skippedBanned
      }
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: "broadcast_failed" });
  }
});

adminRouter.get("/welcome-message", async (_req, res) => {
  try {
    const settings = await getGlobalWelcomeSettings();
    return res.json({ settings });
  } catch (error) {
    return res.status(500).json({ error: "welcome_settings_failed" });
  }
});

adminRouter.post("/welcome-message", async (req, res) => {
  const enabled = Boolean(req.body?.welcome_enabled);
  const message_fr = String(req.body?.welcome_message_fr || "").trim();
  const message_en = String(req.body?.welcome_message_en || "").trim();
  const message_es = String(req.body?.welcome_message_es || "").trim();
  try {
    const settings = await setGlobalWelcomeSettings({
      enabled,
      message_fr,
      message_en,
      message_es
    });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "welcome_message_updated",
      data: { enabled }
    });
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "welcome_settings_failed" });
  }
});

adminRouter.get("/logs", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 200);
    const logs = await listAdminLogs({ limit });
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: "logs_failed" });
  }
});

adminRouter.get("/notifications", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const notifications = await listDashboardNotifications({ limit });
    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ error: "notifications_failed" });
  }
});

adminRouter.get("/stats", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const stats = await getDashboardStats({
      limit,
      preset: String(req.query.preset || "month"),
      month: req.query.month ? String(req.query.month) : null,
      year: req.query.year ? String(req.query.year) : null,
      start: req.query.start ? String(req.query.start) : null,
      end: req.query.end ? String(req.query.end) : null,
      granularity: String(req.query.granularity || "auto"),
      timeZone: String(req.query.timeZone || "UTC")
    });
    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ error: "stats_failed" });
  }
});

adminRouter.get("/users", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 200);
    const offset = Number(req.query.offset || 0);
    const search = String(req.query.search || "");
    const guildSearch = String(req.query.guildSearch || "");
    const [users, total] = await Promise.all([
      listUsers({ limit, offset, search, guildSearch }),
      countUsers({ search, guildSearch })
    ]);
    return res.json({ users, total, limit, offset });
  } catch (error) {
    return res.status(500).json({ error: "users_failed" });
  }
});

adminRouter.get("/users/:id", async (req, res) => {
  try {
    const details = await getUserDetails(req.params.id);
    if (!details) return res.status(404).json({ error: "user_not_found" });
    return res.json({ details });
  } catch (error) {
    return res.status(500).json({ error: "user_details_failed" });
  }
});

adminRouter.post("/impersonate/:id", async (req, res) => {
  const targetId = req.params.id;
  const adminId = req.user?.discord_id;
  if (!targetId || !adminId) return res.status(400).json({ error: "missing_params" });
  const rawSecret = process.env.API_SECRET_KEY || "";
  if (!rawSecret) return res.status(500).json({ error: "missing_api_secret" });
  try {
    const user = await db("users").where({ discord_id: String(targetId) }).first();
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const jwt = await new SignJWT({
      discord_id: String(adminId),
      username: req.user?.username || "admin",
      avatar: req.user?.avatar || null,
      impersonated: String(targetId),
      impersonated_username: user.username || null
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(rawSecret));

    await insertAdminLog({
      adminId: String(adminId),
      action: "impersonate_user",
      data: { target_id: String(targetId), target_username: user.username || "" }
    });

    return res.json({ token: jwt, user: { discord_id: user.discord_id, username: user.username } });
  } catch (error) {
    return res.status(500).json({ error: "impersonate_failed" });
  }
});

adminRouter.get("/db-info", async (_req, res) => {
  try {
    const info = await getDbInfo();
    return res.json({ info });
  } catch (error) {
    return res.status(500).json({ error: "db_info_failed" });
  }
});

adminRouter.post("/guilds/:id/invite", async (req, res) => {
  const guildId = req.params.id;
  const maxAge = Number(req.body?.maxAge || 3600);
  const maxUses = Number(req.body?.maxUses || 1);
  try {
    const invite = await createGuildInvite({ guildId, maxAge, maxUses });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "create_invite",
      guildId,
      data: { maxAge, maxUses }
    });
    return res.json({ invite });
  } catch (error) {
    return res.status(400).json({ error: error.message || "invite_failed" });
  }
});

adminRouter.post("/user-ui/global", async (req, res) => {
  const disabled = Boolean(req.body?.disabled);
  try {
    const result = await setGlobalUserUiDisabled({ disabled });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: disabled ? "user_ui_disabled_all" : "user_ui_enabled_all",
      data: { disabled, totalGuilds: result.totalGuilds }
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message || "user_ui_global_failed" });
  }
});

adminRouter.post("/guilds/:id/user-ui", async (req, res) => {
  const guildId = req.params.id;
  const disabled = Boolean(req.body?.disabled);
  try {
    const guild = await setGuildUserUiDisabled({ guildId, disabled });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: disabled ? "user_ui_disabled" : "user_ui_enabled",
      guildId,
      data: { disabled }
    });
    return res.json({ guild });
  } catch (error) {
    return res.status(400).json({ error: error.message || "user_ui_failed" });
  }
});

adminRouter.get("/topgg", async (_req, res) => {
  try {
    const overview = await getTopggAdminOverview();
    return res.json(overview);
  } catch (error) {
    return res.status(500).json({ error: error.message || "topgg_overview_failed" });
  }
});

adminRouter.post("/topgg/settings", async (req, res) => {
  try {
    const settings = await saveTopggSettings({
      enabled: req.body?.enabled,
      syncEnabled: req.body?.syncEnabled ?? req.body?.sync_enabled,
      rewardsEnabled: req.body?.rewardsEnabled ?? req.body?.rewards_enabled,
      rewardAmount: req.body?.rewardAmount ?? req.body?.reward_amount
    });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "topgg_settings_updated",
      data: {
        enabled: settings.enabled,
        sync_enabled: settings.sync_enabled,
        rewards_enabled: settings.rewards_enabled,
        reward_amount: settings.reward_amount
      }
    });
    return res.json({ ok: true, settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "topgg_settings_failed" });
  }
});

adminRouter.post("/topgg/sync", async (_req, res) => {
  try {
    const health = await db("bot_health_status").orderBy("id", "asc").first();
    const serverCount = Number(health?.guild_count || 0);
    const result = await postTopggServerCount(serverCount, { force: true, origin: "manual" });
    await insertAdminLog({
      adminId: _req.user?.discord_id,
      action: "topgg_metrics_sync",
      data: result
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "topgg_sync_failed" });
  }
});

adminRouter.get("/topgg/votes", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const votes = await listTopggVotes({ limit });
    return res.json({ votes });
  } catch (error) {
    return res.status(500).json({ error: error.message || "topgg_votes_failed" });
  }
});

adminRouter.get("/billing/overview", async (_req, res) => {
  try {
    const overview = await getBillingDashboardOverview();
    return res.json(overview);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_overview_failed" });
  }
});

adminRouter.get("/billing/accounts", async (_req, res) => {
  try {
    const accounts = await listAdminBillingAccounts();
    return res.json({ accounts });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_accounts_failed" });
  }
});

adminRouter.get("/billing/promo-codes", async (_req, res) => {
  try {
    const promoCodes = await listAdminPromoCodes();
    return res.json({ promoCodes });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_promo_codes_failed" });
  }
});

adminRouter.post("/billing/promo-codes", async (req, res) => {
  try {
    const promoCode = await createAdminPromoCode({
      code: req.body?.code,
      label: req.body?.label,
      intervalKey: req.body?.intervalKey || req.body?.interval,
      discountType: req.body?.discountType,
      value: req.body?.value,
      maxRedemptions: req.body?.maxRedemptions,
      expiresAt: req.body?.expiresAt
    });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "billing_promo_created",
      data: promoCode
    });
    return res.json({ promoCode });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_promo_create_failed" });
  }
});

adminRouter.post("/billing/promo-codes/:id/deactivate", async (req, res) => {
  try {
    const promoCode = await deactivateAdminPromoCode(req.params.id);
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "billing_promo_deactivated",
      data: promoCode
    });
    return res.json({ promoCode });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_promo_deactivate_failed" });
  }
});

adminRouter.post("/billing/guilds/:guildId/cancel", async (req, res) => {
  try {
    const guildId = String(req.params.guildId || "").replace(/\D/g, "");
    const result = await cancelAdminGuildSubscription({
      guildDiscordId: guildId,
      immediate: req.body?.immediate !== false,
      atPeriodEnd: req.body?.atPeriodEnd === true
    });
    const billing = await getGuildBillingSummary(guildId);
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "billing_guild_cancel",
      guildId,
      data: result
    });
    return res.json({ ...result, billing });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_guild_cancel_failed" });
  }
});

adminRouter.get("/billing/guilds/:guildId/refund-quote", async (req, res) => {
  try {
    const guildId = String(req.params.guildId || "").replace(/\D/g, "");
    const quote = await getAdminGuildRefundQuote(guildId);
    return res.json({ quote });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_guild_refund_quote_failed" });
  }
});

adminRouter.post("/billing/guilds/:guildId/refund", async (req, res) => {
  try {
    const guildId = String(req.params.guildId || "").replace(/\D/g, "");
    const result = await refundAdminGuildSubscription({
      guildDiscordId: guildId,
      mode: req.body?.mode,
      amountCents: req.body?.amountCents,
      cancelSubscription: req.body?.cancelSubscription === true,
      internalNote: req.body?.internalNote
    });
    const billing = await getGuildBillingSummary(guildId);
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "billing_guild_refund",
      guildId,
      data: result
    });
    return res.json({ ...result, billing });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error.message || "billing_guild_refund_failed" });
  }
});

adminRouter.get("/billing/webhooks", async (req, res) => {
  try {
    const events = await listAdminBillingWebhookEvents({ limit: req.query.limit });
    return res.json({ events });
  } catch (error) {
    return res.status(500).json({ error: error.message || "billing_webhooks_failed" });
  }
});

adminRouter.get("/billing/catalog", async (_req, res) => {
  try {
    const overview = await getBillingCatalogAdminOverview();
    return res.json(overview);
  } catch (error) {
    return res.status(500).json({ error: error.message || "billing_catalog_overview_failed" });
  }
});

adminRouter.post("/billing/catalog/sync", async (req, res) => {
  try {
    const result = await syncStripeCatalog({ source: "admin" });
    if (!result.ok) {
      return res.status(result.reason === "stripe_not_configured" ? 503 : 400).json(result);
    }
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "billing_catalog_sync",
      data: result
    });
    const overview = await getBillingCatalogAdminOverview();
    return res.json({ ...result, overview });
  } catch (error) {
    return res.status(400).json({ error: error.message || "billing_catalog_sync_failed" });
  }
});

adminRouter.post("/billing/catalog/recreate-zero-tax", async (req, res) => {
  try {
    const result = await recreateStripeCatalogZeroTax({ source: "admin_recreate_zero_tax" });
    if (!result.ok) {
      return res.status(result.reason === "stripe_not_configured" ? 503 : 400).json(result);
    }
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "billing_catalog_recreate_zero_tax",
      data: result
    });
    const overview = await getBillingCatalogAdminOverview();
    return res.json({ ...result, overview });
  } catch (error) {
    return res.status(400).json({ error: error.message || "billing_catalog_recreate_failed" });
  }
});

adminRouter.post("/billing/guilds/:guildId/sync", async (req, res) => {
  try {
    const guildId = String(req.params.guildId || "").replace(/\D/g, "");
    if (!guildId) {
      return res.status(400).json({ error: "invalid_guild_id" });
    }

    const result = await syncGuildBillingFromStripe(guildId);
    const billing = await getGuildBillingSummary(guildId);
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: "billing_guild_sync",
      guildId,
      data: { ...result, isPremium: billing.isPremium }
    });
    return res.json({ ...result, billing });
  } catch (error) {
    return res.status(400).json({ error: error.message || "billing_guild_sync_failed" });
  }
});

