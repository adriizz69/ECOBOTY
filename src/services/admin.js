import { db } from "./db.js";
import { ensureGuild } from "./economy.js";

const getBotToken = () => process.env.DISCORD_BOT_TOKEN;

export const fetchBotGuilds = async () => {
  const token = getBotToken();
  if (!token) return { map: new Map(), error: "missing_bot_token" };
  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bot ${token}` }
    });
    const data = await res.json();
    if (!res.ok) {
      return { map: new Map(), error: "bot_guilds_failed", details: data };
    }
    const map = new Map((data || []).map((g) => [String(g.id), g]));
    return { map, error: null };
  } catch (error) {
    return { map: new Map(), error: "bot_guilds_failed", details: error?.message };
  }
};

const fetchDiscordUser = async (discordId) => {
  const token = getBotToken();
  if (!token) return { ok: false, error: "missing_bot_token" };
  try {
    const res = await fetch(`https://discord.com/api/users/${discordId}`, {
      headers: { Authorization: `Bot ${token}` }
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: "discord_user_failed", details: data };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: "discord_user_failed", details: error?.message };
  }
};

export const getGuildByDiscordId = async (guildId, trx = db) => {
  return trx("guilds").where({ discord_guild_id: String(guildId) }).first();
};

export const getGuildStatus = async (guildId) => {
  const guild = await getGuildByDiscordId(guildId, db);
  if (!guild) return { banned: false, reason: "" };
  return {
    banned: Boolean(guild.banned),
    reason: guild.banned_reason || ""
  };
};

export const upsertGuildFromBot = async ({
  guildId,
  name,
  icon,
  ownerId,
  addedById = null,
  addedByUsername = null,
  addedAt = null
}) => {
  const existing = await getGuildByDiscordId(guildId, db);
  if (existing) {
    const payload = {
      name: name || existing.name,
      icon: icon || existing.icon,
      owner_discord_id: ownerId || existing.owner_discord_id
    };
    if (!existing.added_by_discord_id && addedById) {
      payload.added_by_discord_id = String(addedById);
    }
    if (!existing.added_by_username && addedByUsername) {
      payload.added_by_username = String(addedByUsername);
    }
    if (!existing.added_at && addedAt) {
      payload.added_at = new Date(addedAt);
    }
    await db("guilds").where({ id: existing.id }).update(payload);
    return { ...existing, ...payload };
  }

  const payload = {
    discord_guild_id: String(guildId),
    name: name || "Unknown",
    icon: icon || null,
    owner_discord_id: ownerId || "unknown",
    added_by_discord_id: addedById ? String(addedById) : null,
    added_by_username: addedByUsername ? String(addedByUsername) : null,
    added_at: addedAt ? new Date(addedAt) : new Date()
  };
  const [id] = await db("guilds").insert(payload);
  return { id, ...payload };
};

export const deleteGuildDataByDiscordId = async (guildId) => {
  const guild = await getGuildByDiscordId(guildId, db);
  if (!guild) return { ok: true, removed: false };
  const tables = [
    "admin_logs",
    "user_guilds",
    "guild_users",
    "economy_settings",
    "economy_rules",
    "role_modifiers",
    "channel_modifiers",
    "economy_blocked_roles",
    "economy_blocked_channels",
    "balances",
    "economy_activity",
    "economy_gain_logs",
    "economy_event_logs",
    "inventory",
    "inventory_sales",
    "shops",
    "shop_items",
    "games_settings",
    "leaderboard_post_settings",
    "guild_info_message_settings",
    "bot_settings",
    "twitch_settings",
    "twitch_rules",
    "twitch_sub_multipliers",
    "twitch_event_rules",
    "twitch_daily_settings",
    "twitch_daily_states",
    "twitch_activity",
    "temp_role_assignments"
  ];
  const tableFlags = {};
  await Promise.all(
    tables.map(async (name) => {
      tableFlags[name] = await db.schema.hasTable(name);
    })
  );
  await db.transaction(async (trx) => {
    if (tableFlags.admin_logs) {
      await trx("admin_logs").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.user_guilds) {
      await trx("user_guilds").where({ guild_id: String(guildId) }).del();
    }
    if (tableFlags.guild_users) {
      await trx("guild_users").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.economy_blocked_roles) {
      await trx("economy_blocked_roles").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.economy_blocked_channels) {
      await trx("economy_blocked_channels").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.role_modifiers) {
      await trx("role_modifiers").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.channel_modifiers) {
      await trx("channel_modifiers").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.economy_rules) {
      await trx("economy_rules").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.economy_settings) {
      await trx("economy_settings").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.economy_activity) {
      await trx("economy_activity").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.economy_gain_logs) {
      await trx("economy_gain_logs").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.economy_event_logs) {
      await trx("economy_event_logs").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.balances) {
      await trx("balances").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.inventory) {
      await trx("inventory").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.inventory_sales) {
      await trx("inventory_sales").where({ guild_id: guild.id }).del();
    }
    let shopIds = [];
    if (tableFlags.shops) {
      const rows = await trx("shops").select("id").where({ guild_id: guild.id });
      shopIds = rows.map((row) => row.id);
    }
    if (tableFlags.shop_items && shopIds.length) {
      await trx("shop_items").whereIn("shop_id", shopIds).del();
    }
    if (tableFlags.shops) {
      await trx("shops").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.games_settings) {
      await trx("games_settings").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.leaderboard_post_settings) {
      await trx("leaderboard_post_settings").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.guild_info_message_settings) {
      await trx("guild_info_message_settings").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.bot_settings) {
      await trx("bot_settings").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.twitch_activity) {
      await trx("twitch_activity").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.twitch_daily_states) {
      await trx("twitch_daily_states").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.twitch_daily_settings) {
      await trx("twitch_daily_settings").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.twitch_event_rules) {
      await trx("twitch_event_rules").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.twitch_sub_multipliers) {
      await trx("twitch_sub_multipliers").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.twitch_rules) {
      await trx("twitch_rules").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.twitch_settings) {
      await trx("twitch_settings").where({ guild_id: guild.id }).del();
    }
    if (tableFlags.temp_role_assignments) {
      await trx("temp_role_assignments").where({ guild_id: guild.id }).del();
    }
  });
  return { ok: true, removed: true, keptGuild: true };
};

export const listGuilds = async ({ withBotPresence = false } = {}) => {
  const rows = await db("guilds")
    .leftJoin("bot_settings", "guilds.id", "bot_settings.guild_id")
    .select(
      "guilds.id as internal_id",
      "guilds.discord_guild_id as discord_guild_id",
      "guilds.name as name",
      "guilds.icon as icon",
      "guilds.owner_discord_id as owner_discord_id",
      "guilds.added_by_discord_id as added_by_discord_id",
      "guilds.added_by_username as added_by_username",
      "guilds.added_at as added_at",
      "guilds.banned as banned",
      "guilds.banned_reason as banned_reason",
      "guilds.banned_at as banned_at",
      "guilds.banned_by_discord_id as banned_by_discord_id",
      "guilds.user_ui_disabled as user_ui_disabled",
      "bot_settings.log_channel_id as bot_log_channel_id",
      "bot_settings.api_tab_disabled as api_tab_disabled",
      "bot_settings.user_ui_disabled as user_ui_global_disabled",
      "bot_settings.timezone as timezone"
    )
    .orderBy("guilds.name", "asc");
  if (!withBotPresence) return rows;

  const { map: botGuilds } = await fetchBotGuilds();
  return rows.map((row) => {
    const botGuild = botGuilds.get(String(row.discord_guild_id));
    return {
      ...row,
      bot_present: Boolean(botGuild),
      bot_name: botGuild?.name || null,
      bot_icon: botGuild?.icon || null,
      bot_owner: botGuild?.owner || null
    };
  });
};

export const getSummary = async () => {
  const totalGuilds = await db("guilds").count({ count: "*" }).first();
  const bannedGuilds = await db("guilds").where({ banned: true }).count({ count: "*" }).first();
  const totalUsers = await db("users").count({ count: "*" }).first();
  return {
    totalGuilds: Number(totalGuilds?.count || 0),
    bannedGuilds: Number(bannedGuilds?.count || 0),
    totalUsers: Number(totalUsers?.count || 0)
  };
};

export const upsertTempRoleAssignment = async ({
  guildId,
  userId,
  roleId,
  expiresAt
}) => {
  const guild = await ensureGuild(guildId, db);
  if (!guild) return null;
  const existing = await db("temp_role_assignments")
    .where({
      guild_id: guild.id,
      user_discord_id: String(userId),
      role_id: String(roleId)
    })
    .first();
  if (existing) {
    const nextExpires = new Date(expiresAt);
    const currentExpires = existing.expires_at ? new Date(existing.expires_at) : null;
    const shouldUpdate = !currentExpires || nextExpires > currentExpires;
    if (shouldUpdate) {
      await db("temp_role_assignments")
        .where({ id: existing.id })
        .update({ expires_at: nextExpires, updated_at: new Date() });
      return { ...existing, expires_at: nextExpires };
    }
    return existing;
  }
  const payload = {
    guild_id: guild.id,
    user_discord_id: String(userId),
    role_id: String(roleId),
    expires_at: new Date(expiresAt)
  };
  const [id] = await db("temp_role_assignments").insert(payload);
  return { id, ...payload };
};

export const listExpiredTempRoles = async ({ limit = 50 } = {}) => {
  return db("temp_role_assignments")
    .leftJoin("guilds", "temp_role_assignments.guild_id", "guilds.id")
    .select(
      "temp_role_assignments.id",
      "temp_role_assignments.guild_id",
      "guilds.discord_guild_id as discord_guild_id",
      "temp_role_assignments.user_discord_id",
      "temp_role_assignments.role_id",
      "temp_role_assignments.expires_at"
    )
    .where("temp_role_assignments.expires_at", "<=", new Date())
    .orderBy("temp_role_assignments.expires_at", "asc")
    .limit(Math.max(1, Number(limit) || 50));
};

export const deleteTempRoleAssignment = async (id) => {
  if (!id) return false;
  const count = await db("temp_role_assignments").where({ id }).del();
  return count > 0;
};

export const createGuildInvite = async ({ guildId, maxAge = 3600, maxUses = 1 }) => {
  const token = getBotToken();
  if (!token) throw new Error("missing_bot_token");

  const channelsRes = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` }
  });
  const channels = await channelsRes.json();
  if (!channelsRes.ok) {
    throw new Error("channels_fetch_failed");
  }

  const candidates = (channels || []).filter((c) => c?.type === 0 || c?.type === 5);
  for (const channel of candidates) {
    try {
      const inviteRes = await fetch(`https://discord.com/api/channels/${channel.id}/invites`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          max_age: Math.max(0, Number(maxAge || 0)),
          max_uses: Math.max(0, Number(maxUses || 0)),
          unique: true
        })
      });
      const invite = await inviteRes.json();
      if (inviteRes.ok && invite?.code) {
        return { url: `https://discord.gg/${invite.code}` };
      }
    } catch {
      // try next channel
    }
  }
  throw new Error("invite_failed");
};

export const insertAdminLog = async ({ adminId, action, guildId = null, data = null }) => {
  let guild = null;
  if (guildId) {
    guild = await ensureGuild(guildId, db);
  }
  const payload = data
    ? typeof data === "string"
      ? data
      : JSON.stringify(data)
    : null;
  await db("admin_logs").insert({
    admin_discord_id: String(adminId),
    action,
    guild_id: guild ? guild.id : null,
    data: payload,
    created_at: new Date()
  });
};

export const listAdminLogs = async ({ limit = 200 } = {}) => {
  return db("admin_logs")
    .leftJoin("guilds", "admin_logs.guild_id", "guilds.id")
    .select(
      "admin_logs.id as id",
      "admin_logs.admin_discord_id as admin_discord_id",
      "admin_logs.action as action",
      "admin_logs.data as data",
      "admin_logs.created_at as created_at",
      "guilds.discord_guild_id as guild_discord_id",
      "guilds.name as guild_name"
    )
    .orderBy("admin_logs.created_at", "desc")
    .limit(limit);
};

export const setGuildBan = async ({ guildId, adminId, reason = "", banned = true }) => {
  const guild = await ensureGuild(guildId, db);
  const payload = banned
    ? {
        banned: true,
        banned_reason: reason || "Banni par l'administrateur",
        banned_at: new Date(),
        banned_by_discord_id: String(adminId)
      }
    : {
        banned: false,
        banned_reason: null,
        banned_at: null,
        banned_by_discord_id: null
      };

  await db("guilds").where({ id: guild.id }).update(payload);
  await insertAdminLog({
    adminId,
    action: banned ? "ban_guild" : "unban_guild",
    guildId,
    data: { reason: reason || "" }
  });
  return db("guilds").where({ id: guild.id }).first();
};

export const getBotSettings = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  const row = await db("bot_settings").where({ guild_id: guild.id }).first();
  const globalRow = row ? null : await db("bot_settings").orderBy("guild_id", "asc").first();
  return (
    row || {
      log_channel_id: null,
      api_tab_disabled: false,
      user_ui_disabled: false,
      bot_language: "fr",
      timezone: null,
      welcome_enabled: globalRow?.welcome_enabled !== false,
      welcome_message_fr: globalRow?.welcome_message_fr || null,
      welcome_message_en: globalRow?.welcome_message_en || null,
      welcome_message_es: globalRow?.welcome_message_es || null
    }
  );
};

export const saveBotSettings = async (guildId, data = {}) => {
  const guild = await ensureGuild(guildId, db);
  const hasLogChannel = Object.prototype.hasOwnProperty.call(data, "log_channel_id");
  const hasApiTab = Object.prototype.hasOwnProperty.call(data, "api_tab_disabled");
  const hasUserUi = Object.prototype.hasOwnProperty.call(data, "user_ui_disabled");
  const hasLanguage = Object.prototype.hasOwnProperty.call(data, "bot_language");
  const hasTimezone = Object.prototype.hasOwnProperty.call(data, "timezone");
  const hasWelcomeEnabled = Object.prototype.hasOwnProperty.call(data, "welcome_enabled");
  const hasWelcomeFr = Object.prototype.hasOwnProperty.call(data, "welcome_message_fr");
  const hasWelcomeEn = Object.prototype.hasOwnProperty.call(data, "welcome_message_en");
  const hasWelcomeEs = Object.prototype.hasOwnProperty.call(data, "welcome_message_es");
  const logChannelId = hasLogChannel ? (data.log_channel_id ? String(data.log_channel_id) : null) : undefined;
  const apiTabDisabled = hasApiTab ? Boolean(data.api_tab_disabled) : undefined;
  const userUiDisabled = hasUserUi ? Boolean(data.user_ui_disabled) : undefined;
  const botLanguage = hasLanguage ? String(data.bot_language || "fr") : undefined;
  const timezone = hasTimezone ? (data.timezone ? String(data.timezone) : null) : undefined;
  const welcomeEnabled = hasWelcomeEnabled ? Boolean(data.welcome_enabled) : undefined;
  const welcomeMessageFr = hasWelcomeFr
    ? (data.welcome_message_fr ? String(data.welcome_message_fr) : null)
    : undefined;
  const welcomeMessageEn = hasWelcomeEn
    ? (data.welcome_message_en ? String(data.welcome_message_en) : null)
    : undefined;
  const welcomeMessageEs = hasWelcomeEs
    ? (data.welcome_message_es ? String(data.welcome_message_es) : null)
    : undefined;
  const existing = await db("bot_settings").where({ guild_id: guild.id }).first();
  const payload = { updated_at: new Date() };
  if (hasLogChannel) payload.log_channel_id = logChannelId;
  if (hasApiTab) payload.api_tab_disabled = apiTabDisabled;
  if (hasUserUi) payload.user_ui_disabled = userUiDisabled;
  if (hasLanguage) payload.bot_language = botLanguage;
  if (hasTimezone) payload.timezone = timezone;
  if (hasWelcomeEnabled) payload.welcome_enabled = welcomeEnabled;
  if (hasWelcomeFr) payload.welcome_message_fr = welcomeMessageFr;
  if (hasWelcomeEn) payload.welcome_message_en = welcomeMessageEn;
  if (hasWelcomeEs) payload.welcome_message_es = welcomeMessageEs;
  if (existing) {
    await db("bot_settings").where({ guild_id: guild.id }).update(payload);
  } else {
    const initialPayload = {
      guild_id: guild.id,
      log_channel_id: hasLogChannel ? logChannelId : null,
      api_tab_disabled: hasApiTab ? apiTabDisabled : false,
      user_ui_disabled: hasUserUi ? userUiDisabled : false,
      bot_language: hasLanguage ? botLanguage : "fr",
      timezone: hasTimezone ? timezone : null,
      welcome_enabled: hasWelcomeEnabled ? welcomeEnabled : true,
      welcome_message_fr: hasWelcomeFr ? welcomeMessageFr : null,
      welcome_message_en: hasWelcomeEn ? welcomeMessageEn : null,
      welcome_message_es: hasWelcomeEs ? welcomeMessageEs : null,
      created_at: new Date(),
      updated_at: new Date()
    };
    await db("bot_settings").insert({
      ...initialPayload
    });
  }
  const row = await db("bot_settings").where({ guild_id: guild.id }).first();
  return {
    log_channel_id: row?.log_channel_id ?? null,
    api_tab_disabled: Boolean(row?.api_tab_disabled),
    user_ui_disabled: Boolean(row?.user_ui_disabled),
    bot_language: row?.bot_language || "fr",
    timezone: row?.timezone || null,
    welcome_enabled: row?.welcome_enabled !== false,
    welcome_message_fr: row?.welcome_message_fr || null,
    welcome_message_en: row?.welcome_message_en || null,
    welcome_message_es: row?.welcome_message_es || null
  };
};

export const setGlobalApiTabDisabled = async ({ disabled = false } = {}) => {
  const now = new Date();
  const missing = await db("guilds")
    .leftJoin("bot_settings", "guilds.id", "bot_settings.guild_id")
    .whereNull("bot_settings.guild_id")
    .select("guilds.id as guild_id");

  if (missing.length) {
    const rows = missing.map((row) => ({
      guild_id: row.guild_id,
      log_channel_id: null,
      api_tab_disabled: Boolean(disabled),
      created_at: now,
      updated_at: now
    }));
    await db("bot_settings").insert(rows);
  }

  await db("bot_settings").update({
    api_tab_disabled: Boolean(disabled),
    updated_at: now
  });

  const totalGuilds = await db("guilds").count({ count: "*" }).first();
  return { disabled: Boolean(disabled), totalGuilds: Number(totalGuilds?.count || 0) };
};

export const getGlobalWelcomeSettings = async () => {
  const row = await db("bot_settings").orderBy("guild_id", "asc").first();
  return {
    welcome_enabled: row?.welcome_enabled !== false,
    welcome_message_fr: row?.welcome_message_fr || "",
    welcome_message_en: row?.welcome_message_en || "",
    welcome_message_es: row?.welcome_message_es || ""
  };
};

export const setGlobalWelcomeSettings = async ({
  enabled = true,
  message_fr = "",
  message_en = "",
  message_es = ""
} = {}) => {
  const now = new Date();
  const missing = await db("guilds")
    .leftJoin("bot_settings", "guilds.id", "bot_settings.guild_id")
    .whereNull("bot_settings.guild_id")
    .select("guilds.id as guild_id");

  if (missing.length) {
    const rows = missing.map((row) => ({
      guild_id: row.guild_id,
      log_channel_id: null,
      api_tab_disabled: false,
      user_ui_disabled: false,
      bot_language: "fr",
      timezone: null,
      welcome_enabled: Boolean(enabled),
      welcome_message_fr: message_fr || null,
      welcome_message_en: message_en || null,
      welcome_message_es: message_es || null,
      created_at: now,
      updated_at: now
    }));
    await db("bot_settings").insert(rows);
  }

  await db("bot_settings").update({
    welcome_enabled: Boolean(enabled),
    welcome_message_fr: message_fr || null,
    welcome_message_en: message_en || null,
    welcome_message_es: message_es || null,
    updated_at: now
  });

  const totalGuilds = await db("guilds").count({ count: "*" }).first();
  return {
    welcome_enabled: Boolean(enabled),
    welcome_message_fr: message_fr || "",
    welcome_message_en: message_en || "",
    welcome_message_es: message_es || "",
    totalGuilds: Number(totalGuilds?.count || 0)
  };
};

export const setGlobalUserUiDisabled = async ({ disabled = false } = {}) => {
  const now = new Date();
  const missing = await db("guilds")
    .leftJoin("bot_settings", "guilds.id", "bot_settings.guild_id")
    .whereNull("bot_settings.guild_id")
    .select("guilds.id as guild_id");

  if (missing.length) {
    const rows = missing.map((row) => ({
      guild_id: row.guild_id,
      log_channel_id: null,
      api_tab_disabled: false,
      user_ui_disabled: Boolean(disabled),
      created_at: now,
      updated_at: now
    }));
    await db("bot_settings").insert(rows);
  }

  await db("bot_settings").update({
    user_ui_disabled: Boolean(disabled),
    updated_at: now
  });

  const totalGuilds = await db("guilds").count({ count: "*" }).first();
  return { disabled: Boolean(disabled), totalGuilds: Number(totalGuilds?.count || 0) };
};

export const setGuildUserUiDisabled = async ({ guildId, disabled = false } = {}) => {
  const guild = await ensureGuild(guildId, db);
  await db("guilds").where({ id: guild.id }).update({
    user_ui_disabled: Boolean(disabled)
  });
  return db("guilds").where({ id: guild.id }).first();
};

export const sendBotLogMessage = async ({ guildId, content }) => {
  const token = getBotToken();
  if (!token) return false;
  const guild = await getGuildByDiscordId(guildId, db);
  if (!guild) return false;
  const settings = await db("bot_settings").where({ guild_id: guild.id }).first();
  const channelId = settings?.log_channel_id;
  if (!channelId || !content) return false;

  try {
    const res = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const broadcastBotMessage = async ({ content, includeBanned = false }) => {
  if (!content) return { sent: 0, totalConfigured: 0, eligible: 0, failed: 0, skippedBanned: 0 };
  const rows = await db("guilds")
    .leftJoin("bot_settings", "guilds.id", "bot_settings.guild_id")
    .select(
      "guilds.discord_guild_id as discord_guild_id",
      "guilds.banned as banned",
      "bot_settings.log_channel_id as log_channel_id"
    )
    .whereNotNull("bot_settings.log_channel_id");

  const totalConfigured = rows.length;
  let eligible = 0;
  let skippedBanned = 0;
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    if (!includeBanned && row.banned) {
      skippedBanned += 1;
      continue;
    }
    eligible += 1;
    const ok = await sendBotLogMessage({ guildId: row.discord_guild_id, content });
    if (ok) sent += 1;
    else failed += 1;
  }

  return { sent, totalConfigured, eligible, failed, skippedBanned };
};

export const listBannedGuilds = async () => {
  return db("guilds")
    .where({ banned: true })
    .select(
      "discord_guild_id as guildId",
      "banned_reason as reason",
      "banned_at as banned_at"
    );
};

export const getDbInfo = async () => {
  const dbName = await db.raw("select database() as db");
  const name = dbName?.[0]?.[0]?.db || dbName?.rows?.[0]?.db || null;
  const tables = await Promise.all([
    db.schema.hasTable("user_oauth_state"),
    db.schema.hasTable("user_guilds"),
    db.schema.hasTable("users"),
    db.schema.hasTable("knex_migrations")
  ]);
  const [hasOauth, hasUserGuilds, hasUsers, hasMigrations] = tables;
  let latestMigration = null;
  if (hasMigrations) {
    const row = await db("knex_migrations").orderBy("id", "desc").first();
    latestMigration = row?.name || null;
  }
  return {
    database: name,
    hasUserOauthState: hasOauth,
    hasUserGuilds,
    hasUsers,
    latestMigration
  };
};

const applyUserFilters = (query, { search = "", guildSearch = "" } = {}) => {
  const term = String(search || "").trim().toLowerCase();
  if (term) {
    query.where((builder) => {
      builder
        .whereRaw("LOWER(users.username) LIKE ?", [`%${term}%`])
        .orWhereRaw("LOWER(users.twitch_login) LIKE ?", [`%${term}%`])
        .orWhere("users.discord_id", "like", `%${term}%`);
    });
  }

  const guildTerm = String(guildSearch || "").trim().toLowerCase();
  if (guildTerm) {
    query
      .join("user_guilds", "users.discord_id", "user_guilds.discord_id")
      .where((builder) => {
        builder
          .whereRaw("LOWER(user_guilds.guild_name) LIKE ?", [`%${guildTerm}%`])
          .orWhere("user_guilds.guild_id", "like", `%${guildTerm}%`);
      });
  }
  return query;
};

export const listUsers = async ({ limit = 200, offset = 0, search = "", guildSearch = "" } = {}) => {
  const baseQuery = db("users")
    .select(
      "users.discord_id",
      "users.username",
      "users.avatar",
      "users.twitch_id",
      "users.twitch_login",
      "users.created_at"
    )
    .distinct("users.discord_id");

  applyUserFilters(baseQuery, { search, guildSearch });

  const users = await baseQuery.orderBy("users.username", "asc").limit(limit).offset(offset);
  const ids = users.map((u) => String(u.discord_id));
  const guildRows = ids.length
    ? await db("user_guilds")
        .whereIn("user_guilds.discord_id", ids)
        .select(
          "user_guilds.discord_id as user_discord_id",
          "user_guilds.guild_id as guild_id",
          "user_guilds.guild_name as guild_name"
        )
    : [];
  const guildMap = new Map();
  guildRows.forEach((row) => {
    const key = String(row.user_discord_id);
    if (!guildMap.has(key)) guildMap.set(key, []);
    guildMap.get(key).push({
      guild_id: row.guild_id,
      guild_name: row.guild_name
    });
  });
  return users.map((user) => ({
    ...user,
    guilds: guildMap.get(String(user.discord_id)) || []
  }));
};

export const countUsers = async ({ search = "", guildSearch = "" } = {}) => {
  const countQuery = db("users").countDistinct({ count: "users.discord_id" });
  applyUserFilters(countQuery, { search, guildSearch });
  const row = await countQuery.first();
  return Number(row?.count || 0);
};

export const getUserDetails = async (discordId) => {
  const user = await db("users").where({ discord_id: String(discordId) }).first();
  if (!user) return null;
  const guilds = await db("user_guilds")
    .where({ discord_id: String(discordId) })
    .select(
      "guild_id",
      "guild_name"
    );
  const oauthState = await db("user_oauth_state")
    .where({ discord_id: String(discordId) })
    .first();
  const discordInfo = await fetchDiscordUser(String(discordId));
  return {
    user,
    guilds,
    oauth: oauthState || null,
    discord: discordInfo.ok ? discordInfo.data : null
  };
};
