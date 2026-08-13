import { db } from "./db.js";
import { insertAdminLog } from "./admin.js";

const normalizeTwitchLogin = (login) =>
  String(login || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 25);

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
