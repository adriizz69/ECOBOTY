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
  getDbInfo,
  saveBotSettings,
  getGlobalWelcomeSettings,
  setGlobalWelcomeSettings,
  setGlobalApiTabDisabled,
  setGlobalUserUiDisabled,
  setGuildUserUiDisabled,
  setGuildBan,
  insertAdminLog
} from "../services/admin.js";

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

adminRouter.post("/guilds/:id/api-tab", async (req, res) => {
  const guildId = req.params.id;
  const disabled = Boolean(req.body?.disabled);
  try {
    const settings = await saveBotSettings(guildId, { api_tab_disabled: disabled });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: disabled ? "api_tab_disabled" : "api_tab_enabled",
      guildId,
      data: { disabled }
    });
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "api_tab_failed" });
  }
});

adminRouter.post("/api-tab/global", async (req, res) => {
  const disabled = Boolean(req.body?.disabled);
  try {
    const result = await setGlobalApiTabDisabled({ disabled });
    await insertAdminLog({
      adminId: req.user?.discord_id,
      action: disabled ? "api_tab_disabled_all" : "api_tab_enabled_all",
      data: { disabled, totalGuilds: result.totalGuilds }
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message || "api_tab_global_failed" });
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
