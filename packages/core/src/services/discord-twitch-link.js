import { db } from "./db.js";
import { insertAdminLog } from "./admin.js";

export const normalizeTwitchLogin = (login) =>
  String(login || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 25);

const mapTwitchConnection = (connection) => {
  const id = String(connection?.id || "").trim();
  const login = normalizeTwitchLogin(connection?.name);
  if (!id || !login) return null;
  return {
    id,
    login,
    verified: Boolean(connection?.verified)
  };
};

export const mapDiscordTwitchConnections = (connections) => {
  const list = Array.isArray(connections) ? connections : [];
  const seen = new Set();
  const accounts = [];
  for (const row of list) {
    if (String(row?.type || "").toLowerCase() !== "twitch") continue;
    const mapped = mapTwitchConnection(row);
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    accounts.push(mapped);
  }
  return accounts;
};

/**
 * Bind a Discord user to a Twitch account. The Twitch id must not already belong
 * to another EcoBoty Discord user.
 */
export const bindUserTwitchLink = async (
  discordId,
  { twitchId, twitchLogin, reason = "user_bind" } = {}
) => {
  const userId = String(discordId || "").replace(/\D/g, "");
  const nextId = String(twitchId || "").trim();
  const nextLogin = normalizeTwitchLogin(twitchLogin);
  if (!userId || !nextId || !nextLogin) {
    return { ok: false, reason: "invalid_twitch" };
  }

  const existing = await db("users").where({ discord_id: userId }).first();
  if (!existing) return { ok: false, reason: "user_not_found" };

  const clash = await db("users")
    .where(function () {
      this.where({ twitch_id: nextId }).orWhereRaw("LOWER(twitch_login) = LOWER(?)", [nextLogin]);
    })
    .whereNot({ discord_id: userId })
    .first();
  if (clash) {
    return { ok: false, reason: "twitch_already_linked" };
  }

  const previousTwitchId = existing.twitch_id || null;
  const previousTwitchLogin = existing.twitch_login || null;
  const unchanged =
    String(previousTwitchId || "") === nextId &&
    normalizeTwitchLogin(previousTwitchLogin) === nextLogin;
  if (unchanged) {
    return {
      ok: true,
      changed: false,
      twitchId: nextId,
      twitchLogin: nextLogin
    };
  }

  await db("users").where({ discord_id: userId }).update({
    twitch_id: nextId,
    twitch_login: nextLogin
  });

  try {
    await insertAdminLog({
      adminId: userId,
      action: "twitch_linked",
      data: {
        discordId: userId,
        twitchId: nextId,
        twitchLogin: nextLogin,
        previousTwitchId,
        previousTwitchLogin,
        reason: String(reason || "user_bind")
      }
    });
  } catch {
    // ignore audit failures
  }

  return {
    ok: true,
    changed: true,
    twitchId: nextId,
    twitchLogin: nextLogin,
    previousTwitchId,
    previousTwitchLogin
  };
};

/**
 * Clear EcoBoty Twitch↔Discord binding for a user (global on users table).
 */
export const clearUserTwitchLink = async (discordId, { reason = "unlink" } = {}) => {
  const userId = String(discordId || "").replace(/\D/g, "");
  if (!userId) return { ok: false, reason: "invalid_user" };

  const existing = await db("users").where({ discord_id: userId }).first();
  if (!existing) return { ok: false, reason: "user_not_found" };

  const hadTwitch = Boolean(existing.twitch_id || existing.twitch_login);
  if (!hadTwitch) {
    return { ok: true, cleared: false, discordId: userId };
  }

  await db("users").where({ discord_id: userId }).update({
    twitch_id: null,
    twitch_login: null
  });

  try {
    await insertAdminLog({
      adminId: userId,
      action: "twitch_unlinked",
      data: {
        discordId: userId,
        previousTwitchId: existing.twitch_id || null,
        previousTwitchLogin: existing.twitch_login || null,
        reason: String(reason || "unlink")
      }
    });
  } catch {
    // ignore audit failures
  }

  return {
    ok: true,
    cleared: true,
    discordId: userId,
    previousTwitchId: existing.twitch_id || null,
    previousTwitchLogin: existing.twitch_login || null
  };
};

/**
 * If Discord Connections no longer include the linked Twitch account, clear EcoBoty link.
 * `connections` = raw Discord /users/@me/connections array (or prefiltered twitch rows).
 */
export const syncTwitchLinkFromDiscordConnections = async (
  discordId,
  connections,
  { connectionsFetched = true } = {}
) => {
  if (!connectionsFetched) {
    return { ok: true, action: "skipped_no_connections_scope" };
  }

  const userId = String(discordId || "").replace(/\D/g, "");
  if (!userId) return { ok: false, reason: "invalid_user" };

  const existing = await db("users").where({ discord_id: userId }).first();
  if (!existing?.twitch_id && !existing?.twitch_login) {
    return { ok: true, action: "noop_not_linked" };
  }

  const list = Array.isArray(connections) ? connections : [];
  const twitchRows = list.filter((c) => String(c?.type || "").toLowerCase() === "twitch");

  const linkedId = String(existing.twitch_id || "").trim();
  const linkedLogin = normalizeTwitchLogin(existing.twitch_login);

  const stillConnected = twitchRows.some((c) => {
    const id = String(c?.id || "").trim();
    const login = normalizeTwitchLogin(c?.name);
    if (linkedId && id && id === linkedId) return true;
    if (linkedLogin && login && login === linkedLogin) return true;
    return false;
  });

  if (stillConnected) {
    // Keep id binding; refresh login if Discord still has the same id with a new name.
    const match =
      twitchRows.find((c) => linkedId && String(c?.id || "").trim() === linkedId) ||
      twitchRows.find((c) => linkedLogin && normalizeTwitchLogin(c?.name) === linkedLogin);
    const nextLogin = normalizeTwitchLogin(match?.name);
    const nextId = String(match?.id || "").trim();
    const updates = {};
    if (nextLogin && nextLogin !== linkedLogin) updates.twitch_login = nextLogin;
    if (nextId && !linkedId) updates.twitch_id = nextId;
    if (Object.keys(updates).length) {
      await db("users").where({ discord_id: userId }).update(updates);
      return { ok: true, action: "synced_identity", updates };
    }
    return { ok: true, action: "still_connected" };
  }

  const cleared = await clearUserTwitchLink(userId, {
    reason: "discord_twitch_connection_removed"
  });
  return {
    ok: true,
    action: "cleared",
    cleared: Boolean(cleared.cleared),
    previousTwitchId: cleared.previousTwitchId || null,
    previousTwitchLogin: cleared.previousTwitchLogin || null
  };
};
