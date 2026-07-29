import { db } from "./db.js";
import { ensureGuild } from "./economy.js";
import { isPlatformAdminId as isPlatformAdminUser } from "./platform-admin.js";

const getBotToken = () => process.env.DISCORD_BOT_TOKEN;
const BOT_HEALTH_SERVICE = "discord_bot";

const toSafeString = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

const toSafeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
};

const toSafeInteger = (value, fallback = 0, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const toSafeDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getBotHealthTimeoutMs = () => {
  const rawSeconds = Number(process.env.BOT_HEALTH_TIMEOUT_SECONDS || 180);
  const safeSeconds = Number.isFinite(rawSeconds) ? Math.max(30, Math.floor(rawSeconds)) : 180;
  return safeSeconds * 1000;
};

let botGuildIdsProvider = null;
let botGuildsCache = { map: new Map(), expiresAt: 0 };
const BOT_GUILDS_CACHE_TTL_MS = 45_000;

export const setBotGuildIdsProvider = (provider) => {
  botGuildIdsProvider = typeof provider === "function" ? provider : null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchBotGuilds = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && botGuildsCache.expiresAt > now) {
    return { map: botGuildsCache.map, error: null, cached: true };
  }

  if (botGuildIdsProvider) {
    try {
      const ids = botGuildIdsProvider();
      if (ids instanceof Set) {
        const map = new Map([...ids].map((id) => [String(id), { id: String(id) }]));
        botGuildsCache = { map, expiresAt: now + BOT_GUILDS_CACHE_TTL_MS };
        return { map, error: null, source: "client" };
      }
    } catch {
      // fall through to REST
    }
  }

  const token = getBotToken();
  if (!token) {
    if (botGuildsCache.map.size > 0) {
      return { map: botGuildsCache.map, error: null, stale: true, cached: true };
    }
    return { map: new Map(), error: "missing_bot_token" };
  }

  let lastError = "bot_guilds_failed";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(350 * attempt);
    try {
      const res = await fetch("https://discord.com/api/users/@me/guilds?with_counts=true", {
        headers: { Authorization: `Bot ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const map = new Map((data || []).map((g) => [String(g.id), g]));
        botGuildsCache = { map, expiresAt: now + BOT_GUILDS_CACHE_TTL_MS };
        return { map, error: null, source: "rest" };
      }
      lastError = "bot_guilds_failed";
      if (res.status === 429 || res.status >= 500) continue;
      break;
    } catch {
      lastError = "bot_guilds_failed";
    }
  }

  if (botGuildsCache.map.size > 0) {
    return { map: botGuildsCache.map, error: null, stale: true, cached: true };
  }

  return { map: new Map(), error: lastError };
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
  const [hasBotLastSeen, hasBotRemovedAt] = await Promise.all([
    db.schema.hasColumn("guilds", "bot_last_seen_at"),
    db.schema.hasColumn("guilds", "bot_removed_at")
  ]);
  const existing = await getGuildByDiscordId(guildId, db);
  if (existing) {
    const now = new Date();
    const wasRemoved = Boolean(existing.bot_removed_at);
    const payload = {
      name: name || existing.name,
      icon: icon || existing.icon,
      owner_discord_id: ownerId || existing.owner_discord_id
    };
    if (hasBotLastSeen) payload.bot_last_seen_at = now;
    if (hasBotRemovedAt) payload.bot_removed_at = null;
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
    return {
      ...existing,
      ...payload,
      __meta: {
        isNew: false,
        rejoined: wasRemoved
      }
    };
  }

  const now = new Date();
  const payload = {
    discord_guild_id: String(guildId),
    name: name || "Unknown",
    icon: icon || null,
    owner_discord_id: ownerId || "unknown",
    added_by_discord_id: addedById ? String(addedById) : null,
    added_by_username: addedByUsername ? String(addedByUsername) : null,
    added_at: addedAt ? new Date(addedAt) : now
  };
  if (hasBotLastSeen) payload.bot_last_seen_at = now;
  if (hasBotRemovedAt) payload.bot_removed_at = null;
  const [id] = await db("guilds").insert(payload);
  return {
    id,
    ...payload,
    __meta: {
      isNew: true,
      rejoined: false
    }
  };
};

export const deleteGuildDataByDiscordId = async (guildId) => {
  const guild = await getGuildByDiscordId(guildId, db);
  if (!guild) return { ok: true, removed: false };
  const tables = [
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
  const hasBotRemovedAt = await db.schema.hasColumn("guilds", "bot_removed_at");
  if (hasBotRemovedAt) {
    await db("guilds").where({ id: guild.id }).update({
      bot_removed_at: new Date()
    });
  }
  return { ok: true, removed: true, keptGuild: true };
};

export const listGuilds = async ({ withBotPresence = false } = {}) => {
  const hasBotLastSeen = await db.schema.hasColumn("guilds", "bot_last_seen_at");
  const hasBotRemovedAt = await db.schema.hasColumn("guilds", "bot_removed_at");
  const query = db("guilds")
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
      "bot_settings.user_ui_disabled as user_ui_global_disabled",
      "bot_settings.timezone as timezone"
    )
    .orderBy("guilds.name", "asc");
  if (hasBotLastSeen) query.select("guilds.bot_last_seen_at as bot_last_seen_at");
  if (hasBotRemovedAt) query.select("guilds.bot_removed_at as bot_removed_at");
  const rows = await query;

  const mappedRows = rows.map((row) => ({
    ...row,
    bot_last_seen_at: hasBotLastSeen ? row.bot_last_seen_at || null : null,
    bot_removed_at: hasBotRemovedAt ? row.bot_removed_at || null : null
  }));
  if (!withBotPresence) return mappedRows;

  const { map: botGuilds } = await getBotGuildsSnapshot();
  return mappedRows.map((row) => {
    const botGuild = botGuilds.get(String(row.discord_guild_id));
    const memberCount = Number(
      botGuild?.approximate_member_count ?? botGuild?.member_count ?? row.member_count ?? 0
    );
    return {
      ...row,
      bot_present: Boolean(botGuild),
      bot_name: botGuild?.name || null,
      bot_icon: botGuild?.icon || null,
      bot_owner: botGuild?.owner || null,
      member_count: Number.isFinite(memberCount) ? memberCount : 0,
      presence_count: Number(botGuild?.approximate_presence_count || 0) || null
    };
  });
};

const hasBotHealthTable = async () => db.schema.hasTable("bot_health_status");

const getBotHealthRow = async () => {
  const hasTable = await hasBotHealthTable();
  if (!hasTable) return null;
  return db("bot_health_status").where({ service: BOT_HEALTH_SERVICE }).first();
};

const writeBotHealthRow = async (payload = {}) => {
  const hasTable = await hasBotHealthTable();
  if (!hasTable) return null;

  const existing = await getBotHealthRow();
  const now = new Date();
  if (existing) {
    await db("bot_health_status")
      .where({ id: existing.id })
      .update({ ...payload, updated_at: now });
    return db("bot_health_status").where({ id: existing.id }).first();
  }

  const insertPayload = {
    service: BOT_HEALTH_SERVICE,
    status: "offline",
    created_at: now,
    updated_at: now,
    ...payload
  };
  const [id] = await db("bot_health_status").insert(insertPayload);
  return db("bot_health_status").where({ id }).first();
};

const buildHealthSnapshot = (row) => {
  if (!row) {
    return {
      service: BOT_HEALTH_SERVICE,
      status: "unknown",
      is_inactive: false,
      timeout_seconds: Math.floor(getBotHealthTimeoutMs() / 1000),
      last_heartbeat_at: null,
      last_status_change_at: null,
      last_reason: "no_data",
      guild_count: null,
      uptime_seconds: null
    };
  }

  const timeoutMs = getBotHealthTimeoutMs();
  const now = Date.now();
  const lastHeartbeatTs = row?.last_heartbeat_at ? Date.parse(row.last_heartbeat_at) : NaN;
  const hasHeartbeat = Number.isFinite(lastHeartbeatTs);
  const stale = !hasHeartbeat || now - lastHeartbeatTs > timeoutMs;
  const status = stale ? "offline" : "online";
  return {
    service: BOT_HEALTH_SERVICE,
    status,
    is_inactive: status === "offline",
    timeout_seconds: Math.floor(timeoutMs / 1000),
    last_heartbeat_at: row?.last_heartbeat_at ? new Date(row.last_heartbeat_at).toISOString() : null,
    last_status_change_at: row?.last_status_change_at ? new Date(row.last_status_change_at).toISOString() : null,
    last_reason: row?.last_reason || null,
    guild_count: Number(row?.guild_count || 0) || null,
    uptime_seconds: Number(row?.uptime_seconds || 0) || null
  };
};

const resolveBotHealthState = async ({ mutate = false } = {}) => {
  const row = await getBotHealthRow();
  const snapshot = buildHealthSnapshot(row);

  if (!mutate || !row) return snapshot;

  if (snapshot.status === "offline" && row.status !== "offline") {
    const now = new Date();
    await writeBotHealthRow({
      status: "offline",
      last_status_change_at: now,
      last_reason: "heartbeat_timeout"
    });
    await insertAdminLog({
      adminId: "system",
      action: "bot_inactive",
      data: {
        service: BOT_HEALTH_SERVICE,
        reason: "heartbeat_timeout",
        timeoutSeconds: snapshot.timeout_seconds,
        lastHeartbeatAt: snapshot.last_heartbeat_at,
        checkedAt: now.toISOString()
      }
    });
    return {
      ...snapshot,
      status: "offline",
      is_inactive: true,
      last_status_change_at: now.toISOString(),
      last_reason: "heartbeat_timeout"
    };
  }

  return snapshot;
};

export const recordBotHeartbeat = async ({ guildCount = null, uptimeSeconds = null } = {}) => {
  const existing = await getBotHealthRow();
  const now = new Date();
  const wasOffline = existing ? existing.status === "offline" : false;

  await writeBotHealthRow({
    status: "online",
    last_heartbeat_at: now,
    last_status_change_at: wasOffline ? now : existing?.last_status_change_at || now,
    last_reason: null,
    guild_count: Number.isFinite(Number(guildCount)) ? Number(guildCount) : null,
    uptime_seconds: Number.isFinite(Number(uptimeSeconds)) ? Number(uptimeSeconds) : null
  });

  if (wasOffline) {
    await insertAdminLog({
      adminId: "system",
      action: "bot_recovered",
      data: {
        service: BOT_HEALTH_SERVICE,
        recoveredAt: now.toISOString(),
        guildCount: Number.isFinite(Number(guildCount)) ? Number(guildCount) : null,
        uptimeSeconds: Number.isFinite(Number(uptimeSeconds)) ? Number(uptimeSeconds) : null
      }
    });
  }

  return resolveBotHealthState({ mutate: false });
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

const parseLogPayload = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
};

const getBotGuildsSnapshot = async () => {
  const result = await fetchBotGuilds();
  if (!result?.error && result?.map instanceof Map) {
    return { map: result.map, error: null, cached: Boolean(result.cached), stale: Boolean(result.stale) };
  }
  if (result?.map instanceof Map && result.map.size > 0) {
    return { map: result.map, error: null, cached: true, stale: true };
  }
  return { map: new Map(), error: result?.error || "bot_guilds_failed", cached: false };
};

const toIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const mapNotificationFromLog = (log) => {
  const payload = parseLogPayload(log.data);
  const guildName = log.guild_name || payload.guildName || "Serveur inconnu";
  const guildId = log.guild_discord_id || payload.guildId || "—";
  const username = payload.username || payload.discordId || "Utilisateur";
  const discordId = payload.discordId || "—";

  if (log.action === "guild_joined") {
    return {
      id: `log-${log.id}`,
      readKey: `log-${log.id}`,
      kind: "guild_joined",
      icon: "i-lucide-server-cog",
      title: "Serveur rejoint",
      body: `${guildName} (${guildId})`,
      route: "/admin-v2/servers",
      created_at: toIso(log.created_at)
    };
  }

  if (log.action === "guild_left") {
    return {
      id: `log-${log.id}`,
      readKey: `log-${log.id}`,
      kind: "guild_left",
      icon: "i-lucide-server-off",
      title: "Serveur parti",
      body: `${guildName} (${guildId})`,
      route: "/admin-v2/servers",
      created_at: toIso(log.created_at)
    };
  }

  if (log.action === "user_joined") {
    return {
      id: `log-${log.id}`,
      readKey: `log-${log.id}`,
      kind: "user_joined",
      icon: "i-lucide-user-plus",
      title: "Utilisateur rejoint",
      body: `${username} (${discordId})`,
      route: "/admin-v2/users",
      created_at: toIso(log.created_at)
    };
  }

  if (log.action === "bot_inactive") {
    const reason = payload.reason ? ` (${payload.reason})` : "";
    return {
      id: `log-${log.id}`,
      readKey: `log-${log.id}`,
      kind: "bot_inactive",
      icon: "i-lucide-triangle-alert",
      title: "BOT inactif",
      body: `Heartbeat manquant${reason}`,
      route: "/admin-v2/stats",
      created_at: toIso(log.created_at)
    };
  }

  if (log.action === "bot_recovered") {
    return {
      id: `log-${log.id}`,
      readKey: `log-${log.id}`,
      kind: "bot_recovered",
      icon: "i-lucide-shield-check",
      title: "BOT rétabli",
      body: "Le heartbeat BOT/API a repris.",
      route: "/admin-v2/stats",
      created_at: toIso(log.created_at)
    };
  }

  return null;
};

const toUtcStartOfDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
const toUtcEndOfDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
const pad2 = (value) => String(value).padStart(2, "0");

const parseMonthInput = (value) => {
  const raw = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
};

const parseYearInput = (value) => {
  const raw = String(value || "").trim();
  const match = /^(\d{4})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return year;
};

const parseDateInput = (value, endOfDay = false) => {
  const raw = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return endOfDay
    ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

const resolveStatsRange = ({ preset = "month", month = null, year = null, start = null, end = null } = {}) => {
  const now = new Date();
  const safePreset = ["month", "year", "last_7_days", "last_15_days", "last_30_days", "custom"].includes(String(preset))
    ? String(preset)
    : "month";

  if (safePreset === "year") {
    const resolvedYear = parseYearInput(year) || now.getUTCFullYear();
    const startDate = new Date(Date.UTC(resolvedYear, 0, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(resolvedYear, 11, 31, 23, 59, 59, 999));
    return {
      preset: "year",
      month: null,
      year: String(resolvedYear),
      startDate,
      endDate
    };
  }

  if (safePreset === "custom") {
    const parsedStart = parseDateInput(start, false);
    const parsedEnd = parseDateInput(end, true);
    if (parsedStart && parsedEnd && parsedStart <= parsedEnd) {
      return {
        preset: safePreset,
        month: null,
        year: null,
        startDate: parsedStart,
        endDate: parsedEnd
      };
    }
  }

  if (safePreset === "last_7_days" || safePreset === "last_15_days" || safePreset === "last_30_days") {
    const endDate = toUtcEndOfDay(now);
    const startDate = toUtcStartOfDay(new Date(endDate));
    const days = safePreset === "last_7_days" ? 7 : safePreset === "last_15_days" ? 15 : 30;
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    return {
      preset: safePreset,
      month: null,
      year: null,
      startDate,
      endDate
    };
  }

  const parsedMonth = parseMonthInput(month) || {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1
  };
  const startDate = new Date(Date.UTC(parsedMonth.year, parsedMonth.month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(parsedMonth.year, parsedMonth.month, 0, 23, 59, 59, 999));
  return {
    preset: "month",
    month: `${parsedMonth.year}-${pad2(parsedMonth.month)}`,
    year: null,
    startDate,
    endDate
  };
};

const resolveGranularity = ({ granularity = "auto", startDate, endDate }) => {
  const safe = String(granularity || "auto");
  if (safe === "day" || safe === "month") return safe;
  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffMs / 86400000) + 1;
  return diffDays > 92 ? "month" : "day";
};

const buildBuckets = ({ startDate, endDate, granularity = "day", timeZone = "UTC" }) => {
  const buckets = [];

  if (granularity === "month") {
    let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1, 0, 0, 0, 0));
    const endCursor = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1, 0, 0, 0, 0));
    while (cursor <= endCursor) {
      const key = `${cursor.getUTCFullYear()}-${pad2(cursor.getUTCMonth() + 1)}`;
      const label = cursor.toLocaleDateString("fr-FR", { timeZone, month: "short", year: "numeric" });
      buckets.push({ key, label });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    }
    return buckets;
  }

  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    const label = cursor.toLocaleDateString("fr-FR", { timeZone, day: "2-digit", month: "2-digit" });
    buckets.push({ key, label });
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return buckets;
};

const bucketKeyForDate = (value, granularity = "day") => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (granularity === "month") return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
  return date.toISOString().slice(0, 10);
};

const mapGroupedItem = (row, type) => {
  const payload = parseLogPayload(row.data);
  if (type === "server") {
    return {
      id: `${type}-${row.id}`,
      label: row.guild_name || payload.guildName || "Serveur inconnu",
      value: row.guild_discord_id || payload.guildId || "—",
      created_at: toIso(row.created_at)
    };
  }
  if (type === "user") {
    return {
      id: `${type}-${row.id}`,
      label: payload.username || payload.discordId || "Utilisateur",
      value: payload.discordId || "—",
      created_at: toIso(row.created_at)
    };
  }
  return {
    id: `${type}-${row.id}`,
    label: payload.reason ? `Incident (${payload.reason})` : "Incident BOT",
    value: payload.lastHeartbeatAt || payload.recoveredAt || "—",
    created_at: toIso(row.created_at)
  };
};

export const listDashboardNotifications = async ({ limit = 50 } = {}) => {
  const health = await resolveBotHealthState({ mutate: true });
  const safeLimit = Math.max(5, Math.min(200, Number(limit) || 50));
  const logs = await db("admin_logs")
    .leftJoin("guilds", "admin_logs.guild_id", "guilds.id")
    .select(
      "admin_logs.id as id",
      "admin_logs.action as action",
      "admin_logs.data as data",
      "admin_logs.created_at as created_at",
      "guilds.discord_guild_id as guild_discord_id",
      "guilds.name as guild_name"
    )
    .whereIn("admin_logs.action", [
      "guild_joined",
      "guild_left",
      "user_joined",
      "bot_inactive",
      "bot_recovered"
    ])
    .orderBy("admin_logs.created_at", "desc")
    .limit(safeLimit * 3);

  const notifications = logs
    .map(mapNotificationFromLog)
    .filter(Boolean);

  const hasCurrentInactiveNotif = notifications.some((item) => item.kind === "bot_inactive");
  if (health.is_inactive && !hasCurrentInactiveNotif) {
    notifications.unshift({
      id: `bot-health-current-${health.last_status_change_at || "unknown"}`,
      readKey: `bot-health-current-${health.last_status_change_at || "unknown"}`,
      kind: "bot_inactive",
      icon: "i-lucide-triangle-alert",
      title: "BOT inactif",
      body: `Aucun heartbeat depuis ${health.last_heartbeat_at || "n/a"}`,
      route: "/admin-v2/stats",
      created_at: health.last_status_change_at || new Date().toISOString()
    });
  }

  const merged = notifications
    .sort((a, b) => {
      const aTs = Date.parse(a.created_at || "1970-01-01T00:00:00.000Z");
      const bTs = Date.parse(b.created_at || "1970-01-01T00:00:00.000Z");
      return bTs - aTs;
    })
    .slice(0, safeLimit);

  return merged;
};

export const getDashboardStats = async ({
  limit = 50,
  preset = "month",
  month = null,
  year = null,
  start = null,
  end = null,
  granularity = "auto",
  timeZone = "UTC"
} = {}) => {
  const health = await resolveBotHealthState({ mutate: true });
  const safeLimit = Math.max(5, Math.min(200, Number(limit) || 50));
  const range = resolveStatsRange({ preset, month, year, start, end });
  const safeGranularity = resolveGranularity({
    granularity,
    startDate: range.startDate,
    endDate: range.endDate
  });
  const [hasGuildAddedAt, hasGuildRemovedAt, hasUserCreatedAt] = await Promise.all([
    db.schema.hasColumn("guilds", "added_at"),
    db.schema.hasColumn("guilds", "bot_removed_at"),
    db.schema.hasColumn("users", "created_at")
  ]);
  const guildQuery = db("guilds").select("id", "discord_guild_id", "name");
  if (hasGuildAddedAt) guildQuery.select("added_at");
  if (hasGuildRemovedAt) guildQuery.select("bot_removed_at");

  const [{ map: botGuildMap, error: botGuildMapError }, allGuildRows] = await Promise.all([
    getBotGuildsSnapshot(),
    guildQuery
  ]);

  const knownGuildRows = Array.isArray(allGuildRows) ? allGuildRows : [];
  const totalGuildsCount = knownGuildRows.length;
  const fallbackActiveCount = hasGuildRemovedAt
    ? knownGuildRows.filter((row) => !row.bot_removed_at).length
    : totalGuildsCount;
  const fallbackLeftCount = hasGuildRemovedAt
    ? knownGuildRows.filter((row) => Boolean(row.bot_removed_at)).length
    : 0;

  const botGuildIds = new Set(
    Array.from((botGuildMap instanceof Map ? botGuildMap : new Map()).keys()).map((id) => String(id))
  );
  const canUsePresence = !botGuildMapError;
  const activeGuildRowsByPresence = canUsePresence
    ? knownGuildRows.filter((row) => botGuildIds.has(String(row.discord_guild_id)))
    : [];
  const absentGuildRowsByPresence = canUsePresence
    ? knownGuildRows.filter((row) => !botGuildIds.has(String(row.discord_guild_id)))
    : [];

  const activeGuildsCount = canUsePresence ? activeGuildRowsByPresence.length : fallbackActiveCount;
  const leftTotalCount = canUsePresence ? absentGuildRowsByPresence.length : fallbackLeftCount;

  const logs = await db("admin_logs")
    .leftJoin("guilds", "admin_logs.guild_id", "guilds.id")
    .select(
      "admin_logs.id as id",
      "admin_logs.action as action",
      "admin_logs.data as data",
      "admin_logs.created_at as created_at",
      "guilds.name as guild_name",
      "guilds.discord_guild_id as guild_discord_id"
    )
    .whereIn("admin_logs.action", ["guild_joined", "guild_left", "user_joined", "bot_inactive"])
    .andWhere("admin_logs.created_at", ">=", range.startDate)
    .andWhere("admin_logs.created_at", "<=", range.endDate)
    .orderBy("admin_logs.created_at", "asc")
    .limit(20000);

  const [joinedLogs, leftLogs, userLogs, botInactiveLogs] = [
    logs.filter((row) => row.action === "guild_joined"),
    logs.filter((row) => row.action === "guild_left"),
    logs.filter((row) => row.action === "user_joined"),
    logs.filter((row) => row.action === "bot_inactive")
  ];
  const [fallbackJoinedRangeRows, fallbackLeftRangeRows, fallbackUsersRangeRows] = await Promise.all([
    joinedLogs.length || !hasGuildAddedAt
      ? Promise.resolve([])
      : db("guilds")
          .select("id", "added_at as created_at")
          .whereNotNull("added_at")
          .andWhere("added_at", ">=", range.startDate)
          .andWhere("added_at", "<=", range.endDate)
          .orderBy("added_at", "asc")
          .limit(20000),

    leftLogs.length || !hasGuildRemovedAt
      ? Promise.resolve([])
      : db("guilds")
          .select("id", "bot_removed_at as created_at")
          .whereNotNull("bot_removed_at")
          .andWhere("bot_removed_at", ">=", range.startDate)
          .andWhere("bot_removed_at", "<=", range.endDate)
          .orderBy("bot_removed_at", "asc")
          .limit(20000),

    userLogs.length || !hasUserCreatedAt
      ? Promise.resolve([])
      : db("users")
          .select("id", "created_at")
          .whereNotNull("created_at")
          .andWhere("created_at", ">=", range.startDate)
          .andWhere("created_at", "<=", range.endDate)
          .orderBy("created_at", "asc")
          .limit(20000)
  ]);
  const joinedSeriesRows = joinedLogs.length
    ? joinedLogs
    : fallbackJoinedRangeRows.map((row) => ({ action: "guild_joined", created_at: row.created_at }));
  let leftSeriesRows = leftLogs.length
    ? leftLogs
    : fallbackLeftRangeRows.map((row) => ({ action: "guild_left", created_at: row.created_at }));
  const usersSeriesRows = userLogs.length
    ? userLogs
    : fallbackUsersRangeRows.map((row) => ({ action: "user_joined", created_at: row.created_at }));

  if (!leftSeriesRows.length && canUsePresence && absentGuildRowsByPresence.length) {
    leftSeriesRows = absentGuildRowsByPresence
      .filter((row) => {
        if (!row?.added_at) return true;
        const addedAt = new Date(row.added_at);
        return !Number.isNaN(addedAt.getTime()) && addedAt <= range.endDate;
      })
      .map((row) => ({
        id: `synthetic-left-${row.id}`,
        action: "guild_left",
        created_at: range.endDate,
        guild_discord_id: row.discord_guild_id,
        guild_name: row.name || "Serveur inconnu"
      }));
  }

  const [recentJoined, recentLeft, recentUsers, recentBotInactive] = await Promise.all([
    db("admin_logs")
      .leftJoin("guilds", "admin_logs.guild_id", "guilds.id")
      .select(
        "admin_logs.id as id",
        "admin_logs.data as data",
        "admin_logs.created_at as created_at",
        "guilds.name as guild_name",
        "guilds.discord_guild_id as guild_discord_id"
      )
      .where("admin_logs.action", "guild_joined")
      .orderBy("admin_logs.created_at", "desc")
      .limit(safeLimit),

    db("admin_logs")
      .leftJoin("guilds", "admin_logs.guild_id", "guilds.id")
      .select(
        "admin_logs.id as id",
        "admin_logs.data as data",
        "admin_logs.created_at as created_at",
        "guilds.name as guild_name",
        "guilds.discord_guild_id as guild_discord_id"
      )
      .where("admin_logs.action", "guild_left")
      .orderBy("admin_logs.created_at", "desc")
      .limit(safeLimit),

    db("admin_logs")
      .leftJoin("guilds", "admin_logs.guild_id", "guilds.id")
      .select(
        "admin_logs.id as id",
        "admin_logs.data as data",
        "admin_logs.created_at as created_at",
        "guilds.name as guild_name",
        "guilds.discord_guild_id as guild_discord_id"
      )
      .where("action", "user_joined")
      .orderBy("created_at", "desc")
      .limit(safeLimit),

    db("admin_logs")
      .select("id", "data", "created_at")
      .where("action", "bot_inactive")
      .orderBy("created_at", "desc")
      .limit(safeLimit)
  ]);
  const [fallbackRecentJoinedRows, fallbackRecentLeftRows, fallbackRecentUsersRows] = await Promise.all([
    recentJoined.length || !hasGuildAddedAt
      ? Promise.resolve([])
      : db("guilds")
          .select("id", "name", "discord_guild_id", "added_at as created_at")
          .whereNotNull("added_at")
          .orderBy("added_at", "desc")
          .limit(safeLimit),

    recentLeft.length || !hasGuildRemovedAt
      ? Promise.resolve([])
      : db("guilds")
          .select("id", "name", "discord_guild_id", "bot_removed_at as created_at")
          .whereNotNull("bot_removed_at")
          .orderBy("bot_removed_at", "desc")
          .limit(safeLimit),

    recentUsers.length || !hasUserCreatedAt
      ? Promise.resolve([])
      : db("users")
          .select("id", "username", "discord_id", "created_at")
          .whereNotNull("created_at")
          .orderBy("created_at", "desc")
          .limit(safeLimit)
  ]);
  const serversJoinedItems = recentJoined.length
    ? recentJoined.map((row) => mapGroupedItem(row, "server"))
    : fallbackRecentJoinedRows.map((row) => ({
        id: `server-fallback-joined-${row.id}`,
        label: row.name || "Serveur inconnu",
        value: row.discord_guild_id || "—",
        created_at: toIso(row.created_at)
      }));
  const serversLeftItems = canUsePresence && absentGuildRowsByPresence.length
    ? absentGuildRowsByPresence.slice(0, safeLimit).map((row) => ({
        id: `server-absent-${row.id}`,
        label: row.name || "Serveur inconnu",
        value: row.discord_guild_id || "—",
        created_at: toIso(row.bot_removed_at || range.endDate)
      }))
    : recentLeft.length
      ? recentLeft.map((row) => mapGroupedItem(row, "server"))
      : fallbackRecentLeftRows.map((row) => ({
          id: `server-fallback-left-${row.id}`,
          label: row.name || "Serveur inconnu",
          value: row.discord_guild_id || "—",
          created_at: toIso(row.created_at)
        }));
  const usersJoinedItems = recentUsers.length
    ? recentUsers.map((row) => mapGroupedItem(row, "user"))
    : fallbackRecentUsersRows.map((row) => ({
        id: `user-fallback-${row.id}`,
        label: row.username || row.discord_id || "Utilisateur",
        value: row.discord_id || "—",
        created_at: toIso(row.created_at)
      }));
  const activeGuildRows = canUsePresence
    ? activeGuildRowsByPresence
    : hasGuildRemovedAt
      ? knownGuildRows.filter((row) => !row.bot_removed_at)
      : knownGuildRows;

  const serversActiveItems = activeGuildRows.slice(0, safeLimit).map((row) => ({
    id: `server-active-${row.id}`,
    label: row.name || "Serveur inconnu",
    value: row.discord_guild_id || "—",
    created_at: toIso(row.added_at || null)
  }));
  const botInactiveItems = recentBotInactive.map((row) => mapGroupedItem(row, "bot"));

  if (health.is_inactive) {
    botInactiveItems.unshift({
      id: `bot-current-${health.last_status_change_at || "now"}`,
      label: "BOT actuellement inactif",
      value: health.last_heartbeat_at ? `Dernier heartbeat: ${health.last_heartbeat_at}` : "Aucun heartbeat reçu",
      created_at: health.last_status_change_at || new Date().toISOString()
    });
  } else if (!botInactiveItems.length) {
    botInactiveItems.unshift({
      id: `bot-current-ok-${range.startDate.toISOString()}`,
      label: "Aucun incident BOT",
      value: "Aucun heartbeat manquant détecté sur la période sélectionnée.",
      created_at: new Date().toISOString()
    });
  }
  const trimmedBotInactiveItems = botInactiveItems.slice(0, safeLimit);

  const buckets = buildBuckets({
    startDate: range.startDate,
    endDate: range.endDate,
    granularity: safeGranularity,
    timeZone: String(timeZone || "UTC")
  });
  const bucketIndexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));
  const datasets = {
    servers_joined: new Array(buckets.length).fill(0),
    servers_left: new Array(buckets.length).fill(0),
    users_joined: new Array(buckets.length).fill(0),
    bot_inactive: new Array(buckets.length).fill(0),
    servers_total: new Array(buckets.length).fill(0),
    servers_active: new Array(buckets.length).fill(0)
  };
  const seriesRows = [...joinedSeriesRows, ...leftSeriesRows, ...usersSeriesRows, ...botInactiveLogs];

  seriesRows.forEach((row) => {
    const key = bucketKeyForDate(row.created_at, safeGranularity);
    if (!key) return;
    const bucketIndex = bucketIndexByKey.get(key);
    if (bucketIndex === undefined) return;
    if (row.action === "guild_joined") datasets.servers_joined[bucketIndex] += 1;
    if (row.action === "guild_left") datasets.servers_left[bucketIndex] += 1;
    if (row.action === "user_joined") datasets.users_joined[bucketIndex] += 1;
    if (row.action === "bot_inactive") datasets.bot_inactive[bucketIndex] += 1;
  });

  const [joinedBeforeRow, leftBeforeRow, activeBeforeRow] = await Promise.all([
    hasGuildAddedAt
      ? db("guilds")
          .where((query) => {
            query.whereNull("added_at").orWhere("added_at", "<", range.startDate);
          })
          .count({ count: "*" })
          .first()
      : db("admin_logs")
          .where("action", "guild_joined")
          .andWhere("created_at", "<", range.startDate)
          .count({ count: "*" })
          .first(),

    hasGuildRemovedAt
      ? db("guilds")
          .whereNotNull("bot_removed_at")
          .andWhere("bot_removed_at", "<", range.startDate)
          .count({ count: "*" })
          .first()
      : db("admin_logs")
          .where("action", "guild_left")
          .andWhere("created_at", "<", range.startDate)
          .count({ count: "*" })
          .first(),

    hasGuildAddedAt && hasGuildRemovedAt
      ? db("guilds")
          .where((query) => {
            query.whereNull("added_at").orWhere("added_at", "<", range.startDate);
          })
          .andWhere((query) => {
            query.whereNull("bot_removed_at").orWhere("bot_removed_at", ">=", range.startDate);
          })
          .count({ count: "*" })
          .first()
      : Promise.resolve(null)
  ]);

  let runningTotal = Math.max(0, Number(joinedBeforeRow?.count || 0));
  let runningActive = hasGuildAddedAt && hasGuildRemovedAt
    ? Math.max(0, Number(activeBeforeRow?.count || 0))
    : Math.max(0, Number(joinedBeforeRow?.count || 0) - Number(leftBeforeRow?.count || 0));
  for (let index = 0; index < buckets.length; index += 1) {
    runningTotal += Number(datasets.servers_joined[index] || 0);
    runningActive += Number(datasets.servers_joined[index] || 0);
    runningActive -= Number(datasets.servers_left[index] || 0);
    if (runningActive < 0) runningActive = 0;
    datasets.servers_total[index] = runningTotal;
    datasets.servers_active[index] = runningActive;
  }

  return {
    counters: {
      servers_joined: joinedSeriesRows.length,
      servers_left: leftSeriesRows.length,
      servers_left_total: leftTotalCount,
      servers_total: totalGuildsCount,
      servers_active: activeGuildsCount,
      users_joined: usersSeriesRows.length,
      bot_inactive: health.is_inactive ? 1 : 0,
      bot_inactive_incidents: botInactiveLogs.length
    },
    groups: {
      servers_joined: serversJoinedItems,
      servers_left: serversLeftItems,
      servers_active: serversActiveItems,
      users_joined: usersJoinedItems,
      bot_inactive: trimmedBotInactiveItems
    },
    series: {
      labels: buckets.map((bucket) => bucket.label),
      datasets
    },
    filters: {
      preset: range.preset,
      month: range.month,
      year: range.year || null,
      start: range.startDate.toISOString(),
      end: range.endDate.toISOString(),
      granularity: safeGranularity,
      timezone: String(timeZone || "UTC")
    },
    health
  };
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
  const hasSensitiveCommandsRoleColumn = await db.schema.hasColumn("bot_settings", "sensitive_commands_role_id");
  const row = await db("bot_settings").where({ guild_id: guild.id }).first();
  const globalRow = row ? null : await db("bot_settings").orderBy("guild_id", "asc").first();
  return (
    row || {
      log_channel_id: null,
      user_ui_disabled: false,
      bot_language: "fr",
      timezone: null,
      sensitive_commands_role_id: hasSensitiveCommandsRoleColumn
        ? (globalRow?.sensitive_commands_role_id || null)
        : null,
      welcome_enabled: globalRow?.welcome_enabled !== false,
      welcome_message_fr: globalRow?.welcome_message_fr || null,
      welcome_message_en: globalRow?.welcome_message_en || null,
      welcome_message_es: globalRow?.welcome_message_es || null
    }
  );
};

export const saveBotSettings = async (guildId, data = {}) => {
  const guild = await ensureGuild(guildId, db);
  const hasSensitiveCommandsRoleColumn = await db.schema.hasColumn("bot_settings", "sensitive_commands_role_id");
  const hasLogChannel = Object.prototype.hasOwnProperty.call(data, "log_channel_id");
  const hasUserUi = Object.prototype.hasOwnProperty.call(data, "user_ui_disabled");
  const hasLanguage = Object.prototype.hasOwnProperty.call(data, "bot_language");
  const hasTimezone = Object.prototype.hasOwnProperty.call(data, "timezone");
  const hasSensitiveCommandsRole =
    hasSensitiveCommandsRoleColumn && Object.prototype.hasOwnProperty.call(data, "sensitive_commands_role_id");
  const hasWelcomeEnabled = Object.prototype.hasOwnProperty.call(data, "welcome_enabled");
  const hasWelcomeFr = Object.prototype.hasOwnProperty.call(data, "welcome_message_fr");
  const hasWelcomeEn = Object.prototype.hasOwnProperty.call(data, "welcome_message_en");
  const hasWelcomeEs = Object.prototype.hasOwnProperty.call(data, "welcome_message_es");
  const logChannelId = hasLogChannel ? (data.log_channel_id ? String(data.log_channel_id) : null) : undefined;
  const userUiDisabled = hasUserUi ? Boolean(data.user_ui_disabled) : undefined;
  const botLanguage = hasLanguage ? String(data.bot_language || "fr") : undefined;
  const timezone = hasTimezone ? (data.timezone ? String(data.timezone) : null) : undefined;
  const sensitiveCommandsRoleId = hasSensitiveCommandsRole
    ? (data.sensitive_commands_role_id ? String(data.sensitive_commands_role_id).trim() : null)
    : undefined;
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
  if (hasUserUi) payload.user_ui_disabled = userUiDisabled;
  if (hasLanguage) payload.bot_language = botLanguage;
  if (hasTimezone) payload.timezone = timezone;
  if (hasSensitiveCommandsRole && hasSensitiveCommandsRoleColumn) {
    payload.sensitive_commands_role_id = sensitiveCommandsRoleId || null;
  }
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
    if (hasSensitiveCommandsRoleColumn) {
      initialPayload.sensitive_commands_role_id = hasSensitiveCommandsRole ? (sensitiveCommandsRoleId || null) : null;
    }
    await db("bot_settings").insert({ ...initialPayload });
  }
  const row = await db("bot_settings").where({ guild_id: guild.id }).first();
  return {
    log_channel_id: row?.log_channel_id ?? null,
    user_ui_disabled: Boolean(row?.user_ui_disabled),
    bot_language: row?.bot_language || "fr",
    timezone: row?.timezone || null,
    sensitive_commands_role_id: row?.sensitive_commands_role_id || null,
    welcome_enabled: row?.welcome_enabled !== false,
    welcome_message_fr: row?.welcome_message_fr || null,
    welcome_message_en: row?.welcome_message_en || null,
    welcome_message_es: row?.welcome_message_es || null
  };
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
  const hasGuilds = await db.schema.hasTable("guilds");
  const hasGuildsBotRemovedAt = hasGuilds
    ? await db.schema.hasColumn("guilds", "bot_removed_at")
    : false;

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

  const ownerSet = new Set();
  if (ids.length && hasGuilds) {
    const ownerRows = await db("guilds")
      .whereIn("owner_discord_id", ids)
      .select("owner_discord_id", "discord_guild_id");
    const { map: botGuilds, error } = await getBotGuildsSnapshot();

    if (!error || botGuilds.size > 0) {
      ownerRows.forEach((row) => {
        if (botGuilds.has(String(row.discord_guild_id))) {
          ownerSet.add(String(row.owner_discord_id));
        }
      });
    } else if (hasGuildsBotRemovedAt) {
      const fallbackOwners = await db("guilds")
        .whereIn("owner_discord_id", ids)
        .whereNull("bot_removed_at")
        .select("owner_discord_id");
      fallbackOwners.forEach((row) => ownerSet.add(String(row.owner_discord_id)));
    } else {
      ownerRows.forEach((row) => ownerSet.add(String(row.owner_discord_id)));
    }
  }

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
    is_server_admin: ownerSet.has(String(user.discord_id)),
    guilds: guildMap.get(String(user.discord_id)) || []
  }));
};

export const countUsers = async ({ search = "", guildSearch = "" } = {}) => {
  const countQuery = db("users").countDistinct({ count: "users.discord_id" });
  applyUserFilters(countQuery, { search, guildSearch });
  const row = await countQuery.first();
  return Number(row?.count || 0);
};

const GUILD_PERM_ADMIN = 0x8n;
const GUILD_PERM_MANAGE_GUILD = 0x20n;
const GUILD_PERM_MODERATE_MEMBERS = 0x40n;
const GUILD_PERM_KICK = 0x2n;
const GUILD_PERM_BAN = 0x4n;
const GUILD_PERM_MANAGE_MESSAGES = 0x2000n;

const decodeUserGuildAccess = (owner, permissionsValue, botOwnerDiscordId, userId) => {
  const isBotRecordedOwner = botOwnerDiscordId && String(botOwnerDiscordId) === String(userId);
  if (owner || isBotRecordedOwner) {
    return {
      isOwner: true,
      canManage: true,
      canModerate: true,
      role: "owner",
      roleLabel: "Propriétaire",
      permissionLabels: ["Propriétaire"]
    };
  }

  let perms = 0n;
  try {
    perms = BigInt(String(permissionsValue || "0"));
  } catch {
    perms = 0n;
  }

  const isAdmin = (perms & GUILD_PERM_ADMIN) === GUILD_PERM_ADMIN;
  const canManageGuild = (perms & GUILD_PERM_MANAGE_GUILD) === GUILD_PERM_MANAGE_GUILD;
  const canModerate = (perms & GUILD_PERM_MODERATE_MEMBERS) === GUILD_PERM_MODERATE_MEMBERS;
  const canKick = (perms & GUILD_PERM_KICK) === GUILD_PERM_KICK;
  const canBan = (perms & GUILD_PERM_BAN) === GUILD_PERM_BAN;
  const canManageMessages = (perms & GUILD_PERM_MANAGE_MESSAGES) === GUILD_PERM_MANAGE_MESSAGES;

  const permissionLabels = [];
  if (isAdmin) permissionLabels.push("Administrateur");
  if (canManageGuild) permissionLabels.push("Gérer le serveur");
  if (canModerate) permissionLabels.push("Modérer les membres");
  if (canKick) permissionLabels.push("Expulser");
  if (canBan) permissionLabels.push("Bannir");
  if (canManageMessages) permissionLabels.push("Gérer les messages");

  let role = "member";
  let roleLabel = "Membre";
  if (isAdmin) {
    role = "admin";
    roleLabel = "Administrateur";
  } else if (canManageGuild) {
    role = "manager";
    roleLabel = "Gestionnaire";
  } else if (canModerate || canKick || canBan || canManageMessages) {
    role = "moderator";
    roleLabel = "Modération";
  }

  return {
    isOwner: false,
    canManage: isAdmin || canManageGuild,
    canModerate: isAdmin || canModerate || canKick || canBan || canManageMessages,
    role,
    roleLabel,
    permissionLabels
  };
};

const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"]);

export const getUserDetails = async (discordId) => {
  const userId = String(discordId);
  const user = await db("users").where({ discord_id: userId }).first();
  if (!user) return null;

  const userGuildRows = await db("user_guilds").where({ discord_id: userId }).select(
    "guild_id",
    "guild_name",
    "owner",
    "permissions",
    "permissions_new",
    "icon",
    "updated_at"
  );

  const oauthState = await db("user_oauth_state").where({ discord_id: userId }).first();
  const discordInfo = await fetchDiscordUser(userId);
  const { map: botGuilds } = await getBotGuildsSnapshot();

  const hasGuildsTable = await db.schema.hasTable("guilds");
  const hasBillingAccounts = await db.schema.hasTable("billing_accounts");
  const hasBillingSubscriptions = await db.schema.hasTable("billing_subscriptions");

  let ecobotyGuildRows = [];
  if (hasGuildsTable) {
    const hasBotRemovedAt = await db.schema.hasColumn("guilds", "bot_removed_at");
    const query = db("guilds").select(
      "discord_guild_id",
      "name",
      "icon",
      "owner_discord_id"
    );
    if (hasBotRemovedAt) query.whereNull("bot_removed_at");
    ecobotyGuildRows = await query;
  }

  const ecobotyGuildMap = new Map(
    ecobotyGuildRows
      .filter((row) => botGuilds.has(String(row.discord_guild_id)))
      .map((row) => [String(row.discord_guild_id), row])
  );

  const userGuildMap = new Map(userGuildRows.map((row) => [String(row.guild_id), row]));

  let payerAccounts = [];
  if (hasBillingAccounts) {
    payerAccounts = await db("billing_accounts").where({ payer_discord_id: userId });
  }

  const relatedEcobotyGuildIds = [
    ...new Set([
      ...[...ecobotyGuildMap.keys()].filter((guildId) => {
        const oauthGuild = userGuildMap.get(guildId);
        const ecobotyGuild = ecobotyGuildMap.get(guildId);
        return Boolean(oauthGuild) || String(ecobotyGuild?.owner_discord_id || "") === userId;
      }),
      ...payerAccounts.map((row) => String(row.guild_discord_id)).filter((guildId) => ecobotyGuildMap.has(guildId))
    ])
  ];

  let billingAccountMap = new Map();
  if (hasBillingAccounts) {
    const accountRows =
      relatedEcobotyGuildIds.length > 0
        ? await db("billing_accounts").whereIn("guild_discord_id", relatedEcobotyGuildIds)
        : [];
    [...payerAccounts, ...accountRows].forEach((row) => {
      billingAccountMap.set(String(row.guild_discord_id), row);
    });
  }

  let billingSubscriptionMap = new Map();
  if (hasBillingSubscriptions && relatedEcobotyGuildIds.length > 0) {
    const subscriptionRows = await db("billing_subscriptions")
      .whereIn("guild_discord_id", relatedEcobotyGuildIds)
      .orderBy("updated_at", "desc");
    subscriptionRows.forEach((row) => {
      billingSubscriptionMap.set(String(row.guild_discord_id), row);
    });
  }

  const ecobotyGuilds = relatedEcobotyGuildIds
    .map((guildId) => {
      const ecobotyGuild = ecobotyGuildMap.get(guildId);
      const oauthGuild = userGuildMap.get(guildId) || null;
      const access = decodeUserGuildAccess(
        oauthGuild?.owner,
        oauthGuild?.permissions_new || oauthGuild?.permissions || "0",
        ecobotyGuild?.owner_discord_id,
        userId
      );
      const billingAccount = billingAccountMap.get(guildId) || null;
      const billingSubscription = billingSubscriptionMap.get(guildId) || null;
      const billingStatus = String(billingSubscription?.status || "free").toLowerCase();
      const isPremium =
        ACTIVE_BILLING_STATUSES.has(billingStatus) &&
        String(billingSubscription?.plan_key || "") === "premium";
      const isPayer = String(billingAccount?.payer_discord_id || "") === userId;

      return {
        guild_id: guildId,
        guild_name: oauthGuild?.guild_name || ecobotyGuild?.name || guildId,
        icon: oauthGuild?.icon || ecobotyGuild?.icon || null,
        bot_present: botGuilds.has(guildId),
        in_oauth: Boolean(oauthGuild),
        is_owner: access.isOwner,
        can_manage: access.canManage,
        can_moderate: access.canModerate,
        role: access.role,
        role_label: access.roleLabel,
        permission_labels: access.permissionLabels,
        plan_key: isPremium ? "premium" : "free",
        billing_status: billingStatus,
        billing_interval: billingSubscription?.interval_key || null,
        billing_period_end: billingSubscription?.current_period_end || null,
        is_premium_purchaser: isPayer,
        stripe_customer_id: billingAccount?.stripe_customer_id || null,
        stripe_subscription_id: billingSubscription?.stripe_subscription_id || null
      };
    })
    .sort((a, b) => {
      const rank = (row) => {
        if (row.is_premium_purchaser) return 0;
        if (row.is_owner) return 1;
        if (row.can_manage) return 2;
        if (row.can_moderate) return 3;
        return 4;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return String(a.guild_name || "").localeCompare(String(b.guild_name || ""), "fr");
    });

  const payerStripeCustomerIds = Array.from(
    new Set(payerAccounts.map((row) => String(row.stripe_customer_id || "")).filter(Boolean))
  );

  const billingSubscriptions = payerAccounts.map((account) => {
    const guildId = String(account.guild_discord_id);
    const ecobotyGuild = ecobotyGuildMap.get(guildId) || null;
    const oauthGuild = userGuildMap.get(guildId) || null;
    const subscription = billingSubscriptionMap.get(guildId) || null;
    const status = String(subscription?.status || "free").toLowerCase();
    const isPremium =
      ACTIVE_BILLING_STATUSES.has(status) && String(subscription?.plan_key || "") === "premium";
    return {
      guild_id: guildId,
      guild_name: oauthGuild?.guild_name || ecobotyGuild?.name || guildId,
      plan_key: isPremium ? "premium" : "free",
      status,
      interval_key: subscription?.interval_key || null,
      current_period_end: subscription?.current_period_end || null,
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
      stripe_customer_id: account.stripe_customer_id || null,
      stripe_subscription_id: subscription?.stripe_subscription_id || null
    };
  });

  const isPlatformAdmin = await isPlatformAdminUser(userId);

  return {
    user,
    guilds: userGuildRows.map((row) => ({
      guild_id: row.guild_id,
      guild_name: row.guild_name
    })),
    ecoboty_guilds: ecobotyGuilds,
    billing: {
      is_premium_purchaser: payerAccounts.length > 0,
      premium_guilds_purchased: payerAccounts.length,
      active_premium_guilds: billingSubscriptions.filter((row) => row.plan_key === "premium").length,
      stripe_customer_ids: payerStripeCustomerIds,
      subscriptions: billingSubscriptions
    },
    flags: {
      is_platform_admin: isPlatformAdmin,
      is_server_owner: ecobotyGuilds.some((row) => row.is_owner),
      is_guild_manager: ecobotyGuilds.some((row) => row.can_manage),
      is_premium_purchaser: payerAccounts.length > 0
    },
    oauth: oauthState || null,
    discord: discordInfo.ok ? discordInfo.data : null
  };
};

const DISCORD_ROLE_PERMISSION_LABELS = Object.freeze([
  { bit: 3n, label: "Administrateur" },
  { bit: 5n, label: "Gérer le serveur" },
  { bit: 28n, label: "Gérer les rôles" },
  { bit: 4n, label: "Gérer les salons" },
  { bit: 1n, label: "Expulser" },
  { bit: 2n, label: "Bannir" },
  { bit: 40n, label: "Modérer les membres" },
  { bit: 13n, label: "Gérer les messages" },
  { bit: 17n, label: "Mention @everyone" },
  { bit: 16n, label: "Gérer les webhooks" }
]);

const decodeDiscordRolePermissions = (permissionsValue) => {
  let permissions = 0n;
  try {
    permissions = BigInt(String(permissionsValue || "0"));
  } catch {
    permissions = 0n;
  }
  const labels = DISCORD_ROLE_PERMISSION_LABELS.filter(({ bit }) => (permissions & (1n << bit)) !== 0n).map(
    (entry) => entry.label
  );
  return {
    raw: String(permissionsValue || "0"),
    isAdmin: (permissions & (1n << 3n)) !== 0n,
    labels
  };
};

const safeTableCount = async (tableName, where = {}) => {
  try {
    if (!(await db.schema.hasTable(tableName))) return 0;
    const row = await db(tableName).where(where).count({ count: "*" }).first();
    return Number(row?.count || 0);
  } catch {
    return 0;
  }
};

const safeTableFirst = async (tableName, where = {}) => {
  try {
    if (!(await db.schema.hasTable(tableName))) return null;
    return db(tableName).where(where).first();
  } catch {
    return null;
  }
};

export const getAdminGuildDetails = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").replace(/\D/g, "");
  if (!guildId) {
    const error = new Error("invalid_guild_id");
    error.status = 400;
    throw error;
  }

  const guildRow = await getGuildByDiscordId(guildId);
  if (!guildRow) {
    const error = new Error("guild_not_found");
    error.status = 404;
    throw error;
  }

  const token = getBotToken();
  const { map: botGuilds } = await getBotGuildsSnapshot();
  const botGuild = botGuilds.get(guildId) || null;

  let discordGuild = null;
  let roles = [];
  if (token) {
    try {
      const guildRes = await fetch(
        `https://discord.com/api/guilds/${guildId}?with_counts=true`,
        { headers: { Authorization: `Bot ${token}` } }
      );
      if (guildRes.ok) discordGuild = await guildRes.json();
    } catch {
      discordGuild = null;
    }

    try {
      const rolesRes = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${token}` }
      });
      if (rolesRes.ok) {
        const rawRoles = await rolesRes.json();
        roles = (Array.isArray(rawRoles) ? rawRoles : [])
          .map((role) => {
            const decoded = decodeDiscordRolePermissions(role.permissions);
            return {
              id: String(role.id),
              name: String(role.name || ""),
              color: Number(role.color || 0),
              position: Number(role.position || 0),
              managed: Boolean(role.managed),
              mentionable: Boolean(role.mentionable),
              hoist: Boolean(role.hoist),
              permissions: decoded.raw,
              permissionLabels: decoded.labels,
              isAdmin: decoded.isAdmin,
              isEveryone: String(role.name || "") === "@everyone"
            };
          })
          .sort((a, b) => Number(b.position || 0) - Number(a.position || 0));
      }
    } catch {
      roles = [];
    }
  }

  const internalId = guildRow.id;
  const botSettings = await safeTableFirst("bot_settings", { guild_id: internalId });
  const economySettings = await safeTableFirst("economy_settings", { guild_id: internalId });
  const gamesSettings = await safeTableFirst("games_settings", { guild_id: internalId });
  const twitchSettings = await safeTableFirst("twitch_settings", { guild_id: internalId });
  const birthdaySettings = await safeTableFirst("birthday_settings", { guild_id: internalId });
  const billingSubscription = await safeTableFirst("billing_subscriptions", {
    guild_discord_id: guildId
  });

  const [shopsCount, serverShopsCount, userShopsCount, itemsCount, balancesCount, achievementsCount] = await Promise.all([
    safeTableCount("shops", { guild_id: internalId }),
    (async () => {
      try {
        if (!(await db.schema.hasTable("shops"))) return 0;
        const row = await db("shops")
          .where({ guild_id: internalId })
          .whereNull("owner_discord_id")
          .count({ count: "*" })
          .first();
        return Number(row?.count || 0);
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        if (!(await db.schema.hasTable("shops"))) return 0;
        const row = await db("shops")
          .where({ guild_id: internalId })
          .whereNotNull("owner_discord_id")
          .count({ count: "*" })
          .first();
        return Number(row?.count || 0);
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        if (!(await db.schema.hasTable("shop_items")) || !(await db.schema.hasTable("shops"))) return 0;
        const row = await db("shop_items")
          .join("shops", "shop_items.shop_id", "shops.id")
          .where("shops.guild_id", internalId)
          .count({ count: "*" })
          .first();
        return Number(row?.count || 0);
      } catch {
        return 0;
      }
    })(),
    safeTableCount("balances", { guild_id: internalId }),
    (async () => {
      try {
        if (!(await db.schema.hasTable("achievement_definitions"))) return 0;
        const row = await db("achievement_definitions")
          .where({ guild_id: internalId })
          .count({ count: "*" })
          .first();
        return Number(row?.count || 0);
      } catch {
        return 0;
      }
    })()
  ]);

  const memberCount = Number(
    discordGuild?.approximate_member_count ??
      botGuild?.approximate_member_count ??
      discordGuild?.member_count ??
      botGuild?.member_count ??
      0
  );

  const icon = discordGuild?.icon || guildRow.icon || botGuild?.icon || null;
  const name = discordGuild?.name || guildRow.name || botGuild?.name || "Unknown";

  return {
    guild: {
      id: guildId,
      internalId,
      name,
      icon,
      iconUrl: icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png` : "",
      ownerDiscordId: discordGuild?.owner_id || guildRow.owner_discord_id || null,
      banned: Boolean(guildRow.banned),
      bannedReason: guildRow.banned_reason || null,
      bannedAt: guildRow.banned_at || null,
      userUiDisabled: Boolean(guildRow.user_ui_disabled),
      addedAt: guildRow.added_at || null,
      addedByDiscordId: guildRow.added_by_discord_id || null,
      addedByUsername: guildRow.added_by_username || null,
      botPresent: Boolean(botGuild),
      memberCount: Number.isFinite(memberCount) ? memberCount : 0,
      presenceCount: Number(
        discordGuild?.approximate_presence_count ?? botGuild?.approximate_presence_count ?? 0
      ) || null,
      preferredLocale: discordGuild?.preferred_locale || null,
      verificationLevel: discordGuild?.verification_level ?? null,
      premiumTier: discordGuild?.premium_tier ?? null,
      features: Array.isArray(discordGuild?.features) ? discordGuild.features : []
    },
    billing: billingSubscription
      ? {
          planKey: billingSubscription.plan_key || "free",
          status: billingSubscription.status || "free",
          intervalKey: billingSubscription.interval_key || null,
          currentPeriodEnd: billingSubscription.current_period_end || null,
          cancelAtPeriodEnd: Boolean(billingSubscription.cancel_at_period_end),
          stripeSubscriptionId: billingSubscription.stripe_subscription_id || null,
          isPremium: ["active", "trialing"].includes(String(billingSubscription.status || "").toLowerCase())
        }
      : {
          planKey: "free",
          status: "free",
          intervalKey: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: null,
          isPremium: false
        },
    config: {
      timezone: botSettings?.timezone || null,
      logChannelId: botSettings?.log_channel_id || null,
      currencyName: economySettings?.name || null,
      currencySymbol: economySettings?.emoji_symbol || null,
      economyEnabled: economySettings ? economySettings.enabled !== false && economySettings.enabled !== 0 : null,
      gamesConfigured: Boolean(gamesSettings),
      twitchConnected: Boolean(twitchSettings?.twitch_user_id || twitchSettings?.twitch_login),
      twitchLogin: twitchSettings?.twitch_login || null,
      birthdayEnabled: birthdaySettings ? Boolean(birthdaySettings.enabled) : null,
      shopsCount,
      serverShopsCount,
      userShopsCount,
      itemsCount,
      balancesCount,
      achievementsCount
    },
    roles
  };
};
