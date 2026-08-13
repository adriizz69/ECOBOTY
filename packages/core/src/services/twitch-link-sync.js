import { db } from "./db.js";
import {
  clearUserTwitchLink,
  syncTwitchLinkFromDiscordConnections
} from "./discord-twitch-link.js";

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_MIN_CHECK_MS = 10 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 40;

let schedulerTimer = null;
let batchRunning = false;

const getIntervalMs = () => {
  const raw = Number(process.env.TWITCH_LINK_SYNC_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_INTERVAL_MS;
};

const getMinCheckMs = () => {
  const raw = Number(process.env.TWITCH_LINK_SYNC_MIN_CHECK_MS || DEFAULT_MIN_CHECK_MS);
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_MIN_CHECK_MS;
};

const getBatchSize = () => {
  const raw = Number(process.env.TWITCH_LINK_SYNC_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  return Number.isFinite(raw) && raw >= 1 ? Math.min(200, Math.floor(raw)) : DEFAULT_BATCH_SIZE;
};

const hasConnectionsScope = (scopes) => {
  const raw = String(scopes || "");
  return raw.split(/\s+/).includes("connections");
};

const refreshDiscordOAuthToken = async (refreshToken) => {
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || "",
      client_secret: process.env.DISCORD_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: String(refreshToken || "")
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(String(data?.error || "discord_token_refresh_failed"));
    err.code = String(data?.error || "discord_token_refresh_failed");
    throw err;
  }
  return data;
};

const fetchDiscordConnections = async (accessToken) => {
  const res = await fetch("https://discord.com/api/users/@me/connections", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 401) {
    return { ok: false, unauthorized: true };
  }
  if (!res.ok) {
    return { ok: false, error: `status_${res.status}` };
  }
  const connections = await res.json().catch(() => []);
  return { ok: true, connections: Array.isArray(connections) ? connections : [] };
};

const markTwitchLinkChecked = async (discordId, { error = null } = {}) => {
  const userId = String(discordId || "").replace(/\D/g, "");
  if (!userId) return;
  const payload = {
    twitch_link_checked_at: new Date(),
    updated_at: new Date()
  };
  if (error) payload.guilds_error = String(error).slice(0, 255);
  const existing = await db("user_oauth_state").where({ discord_id: userId }).first();
  if (existing) {
    await db("user_oauth_state").where({ discord_id: userId }).update(payload);
  } else {
    await db("user_oauth_state").insert({
      discord_id: userId,
      ...payload
    });
  }
};

const revokeStoredOAuth = async (discordId) => {
  const userId = String(discordId || "").replace(/\D/g, "");
  if (!userId) return;
  await db("user_oauth_state").where({ discord_id: userId }).update({
    discord_refresh_token: null,
    updated_at: new Date()
  });
};

export const saveDiscordOAuthRefreshToken = async (discordId, refreshToken) => {
  const userId = String(discordId || "").replace(/\D/g, "");
  const token = String(refreshToken || "").trim();
  if (!userId || !token) return;
  const existing = await db("user_oauth_state").where({ discord_id: userId }).first();
  if (existing) {
    await db("user_oauth_state").where({ discord_id: userId }).update({
      discord_refresh_token: token,
      updated_at: new Date()
    });
  } else {
    await db("user_oauth_state").insert({
      discord_id: userId,
      discord_refresh_token: token,
      updated_at: new Date()
    });
  }
};

/**
 * Re-check Discord Connections vs EcoBoty Twitch link.
 * Uses session tokens when available, else stored refresh token.
 */
export const verifyTwitchLinkForDiscordUser = async (
  discordId,
  { accessToken = "", refreshToken = "", force = false, minIntervalMs = getMinCheckMs() } = {}
) => {
  const userId = String(discordId || "").replace(/\D/g, "");
  if (!userId) return { ok: false, reason: "invalid_user" };

  const user = await db("users").where({ discord_id: userId }).first();
  if (!user?.twitch_id && !user?.twitch_login) {
    return { ok: true, action: "noop_not_linked" };
  }

  const oauthState = await db("user_oauth_state").where({ discord_id: userId }).first();
  if (!force && oauthState?.twitch_link_checked_at) {
    const age = Date.now() - new Date(oauthState.twitch_link_checked_at).getTime();
    if (age >= 0 && age < minIntervalMs) {
      return { ok: true, action: "skipped_recent_check" };
    }
  }

  if (!hasConnectionsScope(oauthState?.scopes) && !accessToken && !refreshToken && !oauthState?.discord_refresh_token) {
    await markTwitchLinkChecked(userId);
    return { ok: true, action: "skipped_no_token" };
  }

  let token = String(accessToken || "").trim();
  let nextRefresh = String(refreshToken || oauthState?.discord_refresh_token || "").trim();

  if (!token && nextRefresh) {
    try {
      const refreshed = await refreshDiscordOAuthToken(nextRefresh);
      token = String(refreshed.access_token || "").trim();
      if (refreshed.refresh_token) {
        nextRefresh = String(refreshed.refresh_token);
        await saveDiscordOAuthRefreshToken(userId, nextRefresh);
      }
    } catch (error) {
      const code = String(error?.code || error?.message || "");
      if (code === "invalid_grant") {
        await clearUserTwitchLink(userId, { reason: "discord_oauth_revoked" });
        await revokeStoredOAuth(userId);
        return { ok: true, action: "cleared_oauth_revoked" };
      }
      await markTwitchLinkChecked(userId, { error: code || "refresh_failed" });
      return { ok: false, reason: code || "refresh_failed" };
    }
  }

  if (!token) {
    await markTwitchLinkChecked(userId);
    return { ok: true, action: "skipped_no_access_token" };
  }

  const connectionsRes = await fetchDiscordConnections(token);
  if (connectionsRes.unauthorized) {
    if (nextRefresh && nextRefresh !== String(refreshToken || oauthState?.discord_refresh_token || "")) {
      // already retried refresh above; token still invalid
    } else if (oauthState?.discord_refresh_token && !refreshToken && !accessToken) {
      return verifyTwitchLinkForDiscordUser(userId, {
        refreshToken: oauthState.discord_refresh_token,
        force: true,
        minIntervalMs: 0
      });
    }
    await clearUserTwitchLink(userId, { reason: "discord_connections_unauthorized" });
    await revokeStoredOAuth(userId);
    return { ok: true, action: "cleared_unauthorized" };
  }

  if (!connectionsRes.ok) {
    await markTwitchLinkChecked(userId, { error: connectionsRes.error || "connections_failed" });
    return { ok: false, reason: connectionsRes.error || "connections_failed" };
  }

  const twitchConnections = (connectionsRes.connections || []).filter(
    (c) => String(c?.type || "").toLowerCase() === "twitch"
  );
  const result = await syncTwitchLinkFromDiscordConnections(userId, twitchConnections, {
    connectionsFetched: true
  });
  await markTwitchLinkChecked(userId);
  return { ok: true, ...result };
};

export const maybeRefreshTwitchLinkFromSession = async (req, options = {}) => {
  const discordId = String(req.user?.discord_id || req.user?.id || "").replace(/\D/g, "");
  if (!discordId) return null;
  return verifyTwitchLinkForDiscordUser(discordId, {
    accessToken: req.user?.access_token || "",
    refreshToken: req.user?.refresh_token || "",
    ...options
  });
};

export const runTwitchLinkSyncBatch = async () => {
  if (batchRunning) return { ok: true, skipped: true, reason: "already_running" };
  batchRunning = true;
  try {
    const minCheckMs = getMinCheckMs();
    const staleBefore = new Date(Date.now() - minCheckMs);
    const batchSize = getBatchSize();

    const rows = await db("users")
      .join("user_oauth_state", "users.discord_id", "user_oauth_state.discord_id")
      .where(function () {
        this.whereNotNull("users.twitch_id").orWhereNotNull("users.twitch_login");
      })
      .whereNotNull("user_oauth_state.discord_refresh_token")
      .where(function () {
        this.whereNull("user_oauth_state.twitch_link_checked_at").orWhere(
          "user_oauth_state.twitch_link_checked_at",
          "<",
          staleBefore
        );
      })
      .select("users.discord_id")
      .orderBy("user_oauth_state.twitch_link_checked_at", "asc")
      .limit(batchSize);

    let cleared = 0;
    let checked = 0;
    for (const row of rows) {
      const result = await verifyTwitchLinkForDiscordUser(row.discord_id, { force: true, minIntervalMs: 0 });
      checked += 1;
      if (result?.action === "cleared" || String(result?.action || "").startsWith("cleared_")) {
        cleared += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (checked > 0) {
      console.log("[twitch-link-sync] batch", { checked, cleared });
    }
    return { ok: true, checked, cleared };
  } finally {
    batchRunning = false;
  }
};

export const startTwitchLinkSyncScheduler = () => {
  if (schedulerTimer) return;
  const intervalMs = getIntervalMs();
  schedulerTimer = setInterval(() => {
    void runTwitchLinkSyncBatch().catch((error) => {
      console.warn("[twitch-link-sync]", error?.message || error);
    });
  }, intervalMs);
  setTimeout(() => {
    void runTwitchLinkSyncBatch().catch((error) => {
      console.warn("[twitch-link-sync] initial", error?.message || error);
    });
  }, 45_000);
  console.log(`[twitch-link-sync] scheduler every ${Math.round(intervalMs / 1000)}s`);
};
