import { db } from "./db.js";
import { ensureGuild } from "./economy.js";
const getTwitchSettingsByGuildId = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  return db("twitch_settings").where({ guild_id: guild.id }).first();
};

const EVENTSUB_TYPES = [
  { type: "channel.subscribe", version: "1" },
  { type: "channel.subscription.message", version: "1" },
  { type: "channel.subscription.gift", version: "1" },
  { type: "channel.subscription.end", version: "1" }
];

const getEventSubConfig = () => {
  const clientId = process.env.TWITCH_CLIENT_ID || "";
  const secret = process.env.TWITCH_EVENTSUB_SECRET || "";
  const callback = process.env.TWITCH_EVENTSUB_CALLBACK || "";
  if (!clientId || !secret || !callback) return null;
  return { clientId, secret, callback };
};

const getEventSubHeaders = (token) => {
  const { clientId } = getEventSubConfig() || {};
  return {
    "Client-Id": clientId,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
};

const createSubscription = async ({ token, callback, type, version, broadcasterId }) => {
  const payload = {
    type,
    version,
    condition: { broadcaster_user_id: String(broadcasterId) },
    transport: { method: "webhook", callback, secret: process.env.TWITCH_EVENTSUB_SECRET || "" }
  };
  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: getEventSubHeaders(token),
    body: JSON.stringify(payload)
  });
  if (res.status === 409) return;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eventsub_create_failed:${res.status}:${text}`);
  }
};

export const ensureEventSubSubscriptions = async (guildId) => {
  const config = getEventSubConfig();
  if (!config) return;
  const settings = await getTwitchSettingsByGuildId(guildId);
  if (!settings?.access_token || !settings?.twitch_broadcaster_id) return;
  const callback = config.callback.endsWith("/twitch/eventsub")
    ? config.callback
    : `${config.callback.replace(/\/$/, "")}/twitch/eventsub`;

  for (const sub of EVENTSUB_TYPES) {
    try {
      await createSubscription({
        token: settings.access_token,
        callback,
        type: sub.type,
        version: sub.version,
        broadcasterId: settings.twitch_broadcaster_id
      });
    } catch (error) {
      console.log("[twitch] eventsub error", error?.message || String(error));
    }
  }
};

const findGuildIdByBroadcaster = async (broadcasterId) => {
  if (!broadcasterId) return null;
  const row = await db("twitch_settings")
    .join("guilds", "twitch_settings.guild_id", "guilds.id")
    .where("twitch_settings.twitch_broadcaster_id", String(broadcasterId))
    .select("guilds.discord_guild_id as discord_guild_id")
    .first();
  return row?.discord_guild_id || null;
};

const getOrCreateTwitchActivity = async (guildId, twitchLogin) => {
  const guild = await ensureGuild(guildId, db);
  const login = String(twitchLogin).toLowerCase();
  const existing = await db("twitch_activity")
    .where({ guild_id: guild.id, twitch_login: login })
    .first();
  if (existing) return existing;
  const row = {
    guild_id: guild.id,
    twitch_login: login,
    message_count: 0,
    last_watch_reward_at: null,
    sub_tier: null,
    sub_tier_expires_at: null,
    sub_tier_updated_at: null,
    updated_at: new Date()
  };
  const [id] = await db("twitch_activity").insert(row);
  return { id, ...row };
};

const normalizeSubTier = (plan) => {
  const value = String(plan || "").toLowerCase();
  if (value === "prime") return "prime";
  if (value === "1000" || value === "tier1") return "t1";
  if (value === "2000" || value === "tier2") return "t2";
  if (value === "3000" || value === "tier3") return "t3";
  return null;
};

const updateSubTier = async ({ guildId, twitchLogin, tier }) => {
  const normalized = normalizeSubTier(tier);
  if (!normalized) return;
  const activity = await getOrCreateTwitchActivity(guildId, twitchLogin);
  const now = new Date();
  const currentExpiry = activity.sub_tier_expires_at ? new Date(activity.sub_tier_expires_at) : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db("twitch_activity")
    .where({ id: activity.id })
    .update({
      sub_tier: normalized,
      sub_tier_expires_at: expiresAt,
      sub_tier_updated_at: new Date(),
      updated_at: new Date()
    });
};

const clearSubTier = async ({ guildId, twitchLogin }) => {
  const guild = await ensureGuild(guildId, db);
  await db("twitch_activity")
    .where({ guild_id: guild.id })
    .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
    .update({
      sub_tier: null,
      sub_tier_expires_at: null,
      sub_tier_updated_at: new Date(),
      updated_at: new Date()
    });
};

export const handleEventSubNotification = async (payload) => {
  const subType = payload?.subscription?.type || "";
  const event = payload?.event || {};
  const broadcasterId = event?.broadcaster_user_id;
  const guildId = await findGuildIdByBroadcaster(broadcasterId);
  if (!guildId) return;

  if (subType === "channel.subscription.end") {
    const login = event?.user_login || event?.user_name;
    if (login) await clearSubTier({ guildId, twitchLogin: login });
    return;
  }

  if (subType === "channel.subscription.gift") {
    const recipient = event?.recipient_user_login || event?.recipient_user_name;
    if (recipient) {
      const tier = event?.tier;
      await updateSubTier({ guildId, twitchLogin: recipient, tier });
    }
    return;
  }

  if (subType === "channel.subscribe" || subType === "channel.subscription.message") {
    const login = event?.user_login || event?.user_name;
    if (login) {
      const tier = event?.is_prime ? "prime" : event?.tier;
      await updateSubTier({ guildId, twitchLogin: login, tier });
    }
  }
};
