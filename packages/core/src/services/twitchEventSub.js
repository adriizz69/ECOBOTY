import { db } from "./db.js";
import { ensureGuild } from "./economy.js";

const EVENTSUB_TYPES = [
  { type: "channel.subscribe", version: "1" },
  { type: "channel.subscription.message", version: "1" },
  { type: "channel.subscription.gift", version: "1" },
  { type: "channel.subscription.end", version: "1" },
  { type: "channel.cheer", version: "1" },
  { type: "channel.follow", version: "2", needsModerator: true }
];

const getTwitchSettingsByGuildId = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  return db("twitch_settings").where({ guild_id: guild.id }).first();
};

const getEventSubConfig = () => {
  const clientId = process.env.TWITCH_CLIENT_ID || "";
  const clientSecret = process.env.TWITCH_CLIENT_SECRET || "";
  const secret = process.env.TWITCH_EVENTSUB_SECRET || "";
  const callback = process.env.TWITCH_EVENTSUB_CALLBACK || "";
  if (!clientId || !clientSecret || !secret || !callback) return null;
  return { clientId, clientSecret, secret, callback };
};

let cachedAppToken = null;
let cachedAppTokenExpiresAt = 0;

const getAppAccessToken = async () => {
  const config = getEventSubConfig();
  if (!config) return null;
  if (cachedAppToken && Date.now() < cachedAppTokenExpiresAt - 60_000) {
    return cachedAppToken;
  }
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials"
  });
  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: "POST"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    throw new Error(`eventsub_app_token_failed:${res.status}:${data?.message || ""}`);
  }
  cachedAppToken = String(data.access_token);
  cachedAppTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAppToken;
};

const getEventSubHeaders = (token) => {
  const { clientId } = getEventSubConfig() || {};
  return {
    "Client-Id": clientId,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
};

const createSubscription = async ({
  token,
  callback,
  type,
  version,
  broadcasterId,
  moderatorId = null
}) => {
  const condition = { broadcaster_user_id: String(broadcasterId) };
  if (moderatorId) {
    condition.moderator_user_id = String(moderatorId);
  }
  const payload = {
    type,
    version,
    condition,
    transport: {
      method: "webhook",
      callback,
      secret: process.env.TWITCH_EVENTSUB_SECRET || ""
    }
  };
  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: getEventSubHeaders(token),
    body: JSON.stringify(payload)
  });
  if (res.status === 409) return;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eventsub_create_failed:${type}:${res.status}:${text}`);
  }
};

export const ensureEventSubSubscriptions = async (guildId) => {
  const config = getEventSubConfig();
  if (!config) return;
  const settings = await getTwitchSettingsByGuildId(guildId);
  if (!settings?.twitch_broadcaster_id) return;
  const callback = config.callback.endsWith("/twitch/eventsub")
    ? config.callback
    : `${config.callback.replace(/\/$/, "")}/twitch/eventsub`;

  let token;
  try {
    token = await getAppAccessToken();
  } catch (error) {
    console.log("[twitch] eventsub app token error", error?.message || String(error));
    return;
  }
  if (!token) return;

  const broadcasterId = settings.twitch_broadcaster_id;
  // Broadcaster acts as moderator for their own channel (follow v2).
  const moderatorId = broadcasterId;

  for (const sub of EVENTSUB_TYPES) {
    try {
      await createSubscription({
        token,
        callback,
        type: sub.type,
        version: sub.version,
        broadcasterId,
        moderatorId: sub.needsModerator ? moderatorId : null
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
  if (value === "1000" || value === "tier1" || value === "t1") return "t1";
  if (value === "2000" || value === "tier2" || value === "t2") return "t2";
  if (value === "3000" || value === "tier3" || value === "t3") return "t3";
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

export const handleEventSubNotification = async (payload, meta = {}) => {
  const subType = payload?.subscription?.type || "";
  const event = payload?.event || {};
  const broadcasterId = event?.broadcaster_user_id;
  const guildId = await findGuildIdByBroadcaster(broadcasterId);
  if (!guildId) return;

  const messageId = String(meta.messageId || "").trim();
  const {
    processTwitchCheerReward,
    processTwitchSubReward,
    handleTwitchPromoOnFollow
  } = await import("./twitch.js");

  if (subType === "channel.follow") {
    const login = event?.user_login || event?.user_name;
    if (!login) return;
    await handleTwitchPromoOnFollow({
      guildId,
      twitchLogin: login,
      displayName: event?.user_name || login
    });
    return;
  }

  if (subType === "channel.cheer") {
    const login = event?.user_login || event?.user_name;
    const bits = Number(event?.bits || 0);
    if (!login || bits <= 0) return;
    await processTwitchCheerReward({
      guildId,
      twitchLogin: login,
      bits,
      dedupeKey: messageId ? `eventsub-cheer:${messageId}` : `eventsub-cheer:${guildId}:${login}:${bits}`
    });
    return;
  }

  if (subType === "channel.subscription.end") {
    const login = event?.user_login || event?.user_name;
    if (login) await clearSubTier({ guildId, twitchLogin: login });
    return;
  }

  if (subType === "channel.subscription.gift") {
    const gifter = event?.is_anonymous ? "" : event?.user_login || event?.user_name;
    const total = Math.max(1, Math.floor(Number(event?.total || 1)));
    const tier = event?.tier;
    const recipient = event?.recipient_user_login || event?.recipient_user_name || "";
    if (recipient) {
      await updateSubTier({ guildId, twitchLogin: recipient, tier });
    }
    if (gifter) {
      await processTwitchSubReward({
        guildId,
        twitchLogin: gifter,
        planOrTier: tier,
        source: "twitch_subgift",
        giftCount: total,
        recipientLogin: recipient,
        dedupeKey: messageId
          ? `eventsub-subgift:${messageId}`
          : `eventsub-subgift:${guildId}:${gifter}:${tier}:${total}`
      });
    }
    return;
  }

  if (subType === "channel.subscribe" || subType === "channel.subscription.message") {
    const login = event?.user_login || event?.user_name;
    if (!login) return;
    const tier = event?.is_prime ? "prime" : event?.tier;
    await updateSubTier({ guildId, twitchLogin: login, tier });
    // Gifted recipients still get the sub reward when Twitch emits subscribe with is_gift.
    await processTwitchSubReward({
      guildId,
      twitchLogin: login,
      planOrTier: tier,
      source: "twitch_sub",
      dedupeKey: messageId
        ? `eventsub-sub:${messageId}`
        : `eventsub-sub:${guildId}:${login}:${tier}:${subType}`
    });
  }
};
