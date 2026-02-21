import tmi from "tmi.js";
import { db } from "./db.js";
import { ensureGuild, addTwitchGain, applyTwitchDaily, getOrCreateSettings } from "./economy.js";
import { ensureEventSubSubscriptions } from "./twitchEventSub.js";

const twitchClients = new Map();
const watchIntervals = new Map();

const getEnv = () => {
  const legacyMessage = Number(process.env.TWITCH_MESSAGE_GAIN || 1);
  const legacyWatch = Number(process.env.TWITCH_WATCH_GAIN || 2);
  return {
    clientId: process.env.TWITCH_CLIENT_ID || "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
    redirectUri: process.env.TWITCH_REDIRECT_URI || "",
    messageMin: Number(process.env.TWITCH_MESSAGE_MIN || legacyMessage),
    messageMax: Number(process.env.TWITCH_MESSAGE_MAX || legacyMessage),
    messageInterval: Number(process.env.TWITCH_MESSAGE_INTERVAL || 1),
    watchMin: Number(process.env.TWITCH_WATCH_MIN || legacyWatch),
    watchMax: Number(process.env.TWITCH_WATCH_MAX || legacyWatch),
    watchInterval: Number(process.env.TWITCH_WATCH_INTERVAL_MINUTES || 5)
  };
};

const CONFIG_TTL_MS = 15000;
const configCache = new Map();
const liveStatusCache = new Map();
const LIVE_TTL_MS = 30000;
const LIVE_MODE_TTL_MS = 30000;
const liveModeCache = new Map();

const normalizeLiveOnly = (value) => {
  if (value === undefined || value === null) return true;
  return Boolean(value);
};

const isDebugEnabled = () => String(process.env.TWITCH_DEBUG_LOGS || "").toLowerCase() === "1";
const debugLog = (...args) => {
  if (!isDebugEnabled()) return;
  console.log("[twitch]", ...args);
};

const randomInt = (min, max) => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const range = high - low + 1;
  if (range <= 1) return low;
  return Math.floor(Math.random() * range) + low;
};

const normalizeRule = (rule = {}, defaults) => {
  const enabled = Boolean(rule.enabled);
  const minGain = Number(rule.min_gain ?? defaults.min_gain ?? 0);
  const maxGain = Number(rule.max_gain ?? defaults.max_gain ?? 0);
  let interval = Number(rule.interval ?? defaults.interval ?? 1);
  if (enabled && interval <= 0) interval = 1;
  return {
    enabled,
    min_gain: minGain,
    max_gain: maxGain,
    interval
  };
};

const normalizeMultiplier = (entry = {}, defaults = {}) => {
  const enabled = Boolean(entry.enabled ?? defaults.enabled ?? false);
  const value = Number(entry.value ?? entry.multiplier ?? defaults.value ?? 1);
  return {
    enabled,
    value: Number.isFinite(value) ? value : 1
  };
};

const normalizeEvent = (entry = {}, defaults = {}) => {
  const enabled = Boolean(entry.enabled ?? defaults.enabled ?? false);
  const amount = Number(entry.amount ?? defaults.amount ?? 0);
  return {
    enabled,
    amount: Number.isFinite(amount) ? amount : 0
  };
};

export const getTwitchSettings = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  return trx("twitch_settings").where({ guild_id: guild.id }).first();
};

export const saveTwitchSettings = async (guildId, data, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const existing = await trx("twitch_settings").where({ guild_id: guild.id }).first();
  const liveOnly =
    typeof data.live_only === "boolean"
      ? data.live_only
      : normalizeLiveOnly(existing?.live_only);
  const payload = {
    guild_id: guild.id,
    twitch_broadcaster_id: data.twitch_broadcaster_id,
    twitch_login: data.twitch_login,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: data.token_expires_at,
    live_only: liveOnly,
    updated_at: new Date()
  };
  if (existing) {
    await trx("twitch_settings").where({ guild_id: guild.id }).update(payload);
  } else {
    await trx("twitch_settings").insert({ ...payload, created_at: new Date() });
  }
  liveModeCache.delete(String(guildId));
  const row = await trx("twitch_settings").where({ guild_id: guild.id }).first();
  void ensureEventSubSubscriptions(guildId);
  void syncCurrentSubs(guildId);
  return row;
};

export const deleteTwitchSettings = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  await trx("twitch_settings").where({ guild_id: guild.id }).del();
  liveModeCache.delete(String(guildId));
};

export const updateTwitchLiveMode = async (guildId, liveOnly, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const existing = await trx("twitch_settings").where({ guild_id: guild.id }).first();
  if (!existing) return null;
  await trx("twitch_settings")
    .where({ guild_id: guild.id })
    .update({ live_only: Boolean(liveOnly), updated_at: new Date() });
  liveModeCache.delete(String(guildId));
  return trx("twitch_settings").where({ guild_id: guild.id }).first();
};

export const getTwitchAutomationConfig = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const rules = await trx("twitch_rules").where({ guild_id: guild.id });
  const multipliersRows = await trx("twitch_sub_multipliers").where({ guild_id: guild.id });
  const eventRows = await trx("twitch_event_rules").where({ guild_id: guild.id });
  const { messageMin, messageMax, messageInterval, watchMin, watchMax, watchInterval } = getEnv();

  const messageRule = rules.find((r) => r.type === "message") || {};
  const watchRule = rules.find((r) => r.type === "watch") || {};

  const multipliers = {
    prime: normalizeMultiplier(multipliersRows.find((r) => r.tier === "prime"), { enabled: false, value: 1 }),
    t1: normalizeMultiplier(multipliersRows.find((r) => r.tier === "t1"), { enabled: false, value: 1 }),
    t2: normalizeMultiplier(multipliersRows.find((r) => r.tier === "t2"), { enabled: false, value: 1 }),
    t3: normalizeMultiplier(multipliersRows.find((r) => r.tier === "t3"), { enabled: false, value: 1 })
  };

  const events = {
    sub_t1: normalizeEvent(eventRows.find((r) => r.type === "sub_t1")),
    sub_t2: normalizeEvent(eventRows.find((r) => r.type === "sub_t2")),
    sub_t3: normalizeEvent(eventRows.find((r) => r.type === "sub_t3")),
    subgift_t1: normalizeEvent(eventRows.find((r) => r.type === "subgift_t1")),
    subgift_t2: normalizeEvent(eventRows.find((r) => r.type === "subgift_t2")),
    subgift_t3: normalizeEvent(eventRows.find((r) => r.type === "subgift_t3")),
    bits: normalizeEvent(eventRows.find((r) => r.type === "bits"))
  };

  return {
    rules: {
      message: normalizeRule(messageRule, {
        min_gain: messageMin,
        max_gain: messageMax,
        interval: messageInterval
      }),
      watch: normalizeRule(watchRule, {
        min_gain: watchMin,
        max_gain: watchMax,
        interval: watchInterval
      })
    },
    multipliers,
    events
  };
};

export const saveTwitchAutomationConfig = async (guildId, config = {}, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const messageRule = normalizeRule(config.rules?.message || {}, {});
  const watchRule = normalizeRule(config.rules?.watch || {}, {});
  const multipliers = {
    prime: normalizeMultiplier(config.multipliers?.prime || {}, { enabled: false, value: 1 }),
    t1: normalizeMultiplier(config.multipliers?.t1 || {}, { enabled: false, value: 1 }),
    t2: normalizeMultiplier(config.multipliers?.t2 || {}, { enabled: false, value: 1 }),
    t3: normalizeMultiplier(config.multipliers?.t3 || {}, { enabled: false, value: 1 })
  };
  const events = {
    sub_t1: normalizeEvent(config.events?.sub_t1 || {}),
    sub_t2: normalizeEvent(config.events?.sub_t2 || {}),
    sub_t3: normalizeEvent(config.events?.sub_t3 || {}),
    subgift_t1: normalizeEvent(config.events?.subgift_t1 || {}),
    subgift_t2: normalizeEvent(config.events?.subgift_t2 || {}),
    subgift_t3: normalizeEvent(config.events?.subgift_t3 || {}),
    bits: normalizeEvent(config.events?.bits || {})
  };

  await trx("twitch_rules").where({ guild_id: guild.id }).del();
  await trx("twitch_rules").insert([
    {
      guild_id: guild.id,
      type: "message",
      min_gain: messageRule.min_gain,
      max_gain: messageRule.max_gain,
      interval: messageRule.interval,
      enabled: messageRule.enabled
    },
    {
      guild_id: guild.id,
      type: "watch",
      min_gain: watchRule.min_gain,
      max_gain: watchRule.max_gain,
      interval: watchRule.interval,
      enabled: watchRule.enabled
    }
  ]);

  await trx("twitch_sub_multipliers").where({ guild_id: guild.id }).del();
  await trx("twitch_sub_multipliers").insert([
    {
      guild_id: guild.id,
      tier: "prime",
      multiplier: multipliers.prime.value,
      enabled: multipliers.prime.enabled
    },
    {
      guild_id: guild.id,
      tier: "t1",
      multiplier: multipliers.t1.value,
      enabled: multipliers.t1.enabled
    },
    {
      guild_id: guild.id,
      tier: "t2",
      multiplier: multipliers.t2.value,
      enabled: multipliers.t2.enabled
    },
    {
      guild_id: guild.id,
      tier: "t3",
      multiplier: multipliers.t3.value,
      enabled: multipliers.t3.enabled
    }
  ]);

  await trx("twitch_event_rules").where({ guild_id: guild.id }).del();
  await trx("twitch_event_rules").insert([
    { guild_id: guild.id, type: "sub_t1", amount: events.sub_t1.amount, enabled: events.sub_t1.enabled },
    { guild_id: guild.id, type: "sub_t2", amount: events.sub_t2.amount, enabled: events.sub_t2.enabled },
    { guild_id: guild.id, type: "sub_t3", amount: events.sub_t3.amount, enabled: events.sub_t3.enabled },
    { guild_id: guild.id, type: "subgift_t1", amount: events.subgift_t1.amount, enabled: events.subgift_t1.enabled },
    { guild_id: guild.id, type: "subgift_t2", amount: events.subgift_t2.amount, enabled: events.subgift_t2.enabled },
    { guild_id: guild.id, type: "subgift_t3", amount: events.subgift_t3.amount, enabled: events.subgift_t3.enabled },
    { guild_id: guild.id, type: "bits", amount: events.bits.amount, enabled: events.bits.enabled }
  ]);

  configCache.delete(String(guildId));
  return getTwitchAutomationConfig(guildId, trx);
};

const getCachedConfig = async (guildId) => {
  const key = String(guildId);
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.at < CONFIG_TTL_MS) return cached.config;
  const config = await getTwitchAutomationConfig(guildId);
  configCache.set(key, { config, at: Date.now() });
  return config;
};

const getOrCreateTwitchActivity = async (guildId, twitchLogin, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const login = String(twitchLogin).toLowerCase();
  const existing = await trx("twitch_activity")
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
  const [id] = await trx("twitch_activity").insert(row);
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

const getSubMultiplierForUser = async ({ guildId, twitchLogin, config }) => {
  const activity = await getOrCreateTwitchActivity(guildId, twitchLogin);
  const now = new Date();
  const expiresAt = activity.sub_tier_expires_at ? new Date(activity.sub_tier_expires_at) : null;
  if (expiresAt && expiresAt <= now) {
    await db("twitch_activity")
      .where({ id: activity.id })
      .update({ sub_tier: null, sub_tier_expires_at: null, updated_at: new Date() });
    return 1;
  }
  const tier = activity.sub_tier;
  if (!tier) return 1;
  const entry = config.multipliers?.[tier];
  if (!entry?.enabled) return 1;
  const value = Number(entry.value || 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

export const updateSubTier = async ({ guildId, twitchLogin, tier }) => {
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

const refreshTokenIfNeeded = async (settings) => {
  const { clientId, clientSecret } = getEnv();
  if (!clientId || !clientSecret) return settings;
  const expiresAt = settings.token_expires_at ? new Date(settings.token_expires_at) : null;
  if (expiresAt && expiresAt.getTime() > Date.now() + 60 * 1000) return settings;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: settings.refresh_token,
    client_id: clientId,
    client_secret: clientSecret
  });

  const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await res.json();
  if (!res.ok) return settings;

  const tokenExpiresAt = new Date(Date.now() + Number(data.expires_in || 0) * 1000);
  await db("twitch_settings").where({ id: settings.id }).update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || settings.refresh_token,
    token_expires_at: tokenExpiresAt,
    updated_at: new Date()
  });
  return {
    ...settings,
    access_token: data.access_token,
    refresh_token: data.refresh_token || settings.refresh_token,
    token_expires_at: tokenExpiresAt
  };
};

const fetchCurrentSubs = async (settings) => {
  const { clientId } = getEnv();
  if (!clientId) return [];
  const refreshed = await refreshTokenIfNeeded(settings);
  const broadcasterId = refreshed.twitch_broadcaster_id;
  if (!broadcasterId) return [];

  const subs = [];
  let cursor = "";
  for (let i = 0; i < 50; i += 1) {
    const params = new URLSearchParams({
      broadcaster_id: String(broadcasterId),
      first: "100"
    });
    if (cursor) params.set("after", cursor);
    const res = await fetch(`https://api.twitch.tv/helix/subscriptions?${params.toString()}`, {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${refreshed.access_token}`
      }
    });
    if (!res.ok) break;
    const data = await res.json();
    const rows = data?.data || [];
    rows.forEach((row) => {
      if (row?.user_login && row?.tier) subs.push({ login: row.user_login, tier: row.tier });
    });
    cursor = data?.pagination?.cursor || "";
    if (!cursor) break;
  }
  return subs;
};

export const syncCurrentSubs = async (guildId) => {
  const settings = await getTwitchSettings(guildId);
  if (!settings) return;
  try {
    const subs = await fetchCurrentSubs(settings);
    for (const sub of subs) {
      await updateSubTier({ guildId, twitchLogin: sub.login, tier: sub.tier });
    }
    debugLog("subs-sync", { guildId, count: subs.length });
  } catch (error) {
    debugLog("subs-sync-error", { guildId, error: error?.message || String(error) });
  }
};

const fetchChatters = async (settings) => {
  const { clientId } = getEnv();
  if (!clientId) return [];
  const refreshed = await refreshTokenIfNeeded(settings);
  const res = await fetch(
    `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${refreshed.twitch_broadcaster_id}&moderator_id=${refreshed.twitch_broadcaster_id}&first=1000`,
    {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${refreshed.access_token}`
      }
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data || [];
};

const fetchLiveStatus = async (settings) => {
  const { clientId } = getEnv();
  if (!clientId) return false;
  const refreshed = await refreshTokenIfNeeded(settings);
  const res = await fetch(
    `https://api.twitch.tv/helix/streams?user_id=${refreshed.twitch_broadcaster_id}`,
    {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${refreshed.access_token}`
      }
    }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return Array.isArray(data?.data) && data.data.length > 0;
};

const isLiveCached = async (guildId) => {
  const key = String(guildId);
  const cached = liveStatusCache.get(key);
  if (cached && Date.now() - cached.at < LIVE_TTL_MS) return cached.live;
  const settings = await getTwitchSettings(guildId);
  if (!settings) return false;
  const live = await fetchLiveStatus(settings);
  liveStatusCache.set(key, { live, at: Date.now() });
  return live;
};

export const getTwitchLiveStatus = async (guildId) => {
  return isLiveCached(guildId);
};

const isLiveOnlyEnabled = async (guildId) => {
  const key = String(guildId);
  const cached = liveModeCache.get(key);
  if (cached && Date.now() - cached.at < LIVE_MODE_TTL_MS) return cached.value;
  const settings = await getTwitchSettings(guildId);
  const value = settings ? normalizeLiveOnly(settings.live_only) : true;
  liveModeCache.set(key, { value, at: Date.now() });
  return value;
};

const maybeSetSubTierFromBadges = async ({ guildId, twitchLogin, badges }) => {
  if (!badges) return;
  const isPrime = Boolean(badges.premium || badges.prime);
  const hasSubscriberBadge = Boolean(badges.subscriber || badges.founder || isPrime);
  const activity = await getOrCreateTwitchActivity(guildId, twitchLogin);
  if (!hasSubscriberBadge) {
    if (activity.sub_tier) {
      await db("twitch_activity")
        .where({ id: activity.id })
        .update({
          sub_tier: null,
          sub_tier_expires_at: null,
          sub_tier_updated_at: new Date(),
          updated_at: new Date()
        });
    }
    return;
  }
  const now = new Date();
  const expired =
    activity.sub_tier_expires_at && new Date(activity.sub_tier_expires_at) <= now;
  if (activity.sub_tier && !expired) return;
  await updateSubTier({ guildId, twitchLogin, tier: isPrime ? "prime" : "1000" });
};

const awardMessageGain = async ({ guildId, twitchLogin }) => {
  const liveOnly = await isLiveOnlyEnabled(guildId);
  if (liveOnly) {
    const isLive = await isLiveCached(guildId);
    if (!isLive) {
      debugLog("message-skip", { guildId, twitchLogin, reason: "not_live" });
      return;
    }
  }
  const config = await getCachedConfig(guildId);
  const rule = config.rules?.message;
  if (!rule?.enabled) {
    debugLog("message-skip", { guildId, twitchLogin, reason: "disabled" });
    return;
  }
  if (rule.min_gain <= 0 && rule.max_gain <= 0) {
    debugLog("message-skip", { guildId, twitchLogin, reason: "zero_gain" });
    return;
  }

  const user = await db("users")
    .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
    .first();
  if (!user) {
    debugLog("message-skip", { guildId, twitchLogin, reason: "not_linked" });
    return { ok: false, reason: "not_linked" };
  }

  const activity = await getOrCreateTwitchActivity(guildId, twitchLogin);
  let count = Number(activity.message_count || 0) + 1;
  const interval = Number(rule.interval || 1);

  if (interval > 1 && count < interval) {
    await db("twitch_activity")
      .where({ id: activity.id })
      .update({ message_count: count, updated_at: new Date() });
    debugLog("message-skip", { guildId, twitchLogin, reason: "interval", count, interval });
    return { ok: false, reason: "interval_not_reached" };
  }

  const baseAmount = randomInt(rule.min_gain, rule.max_gain);
  const multiplier = await getSubMultiplierForUser({ guildId, twitchLogin, config });
  const amount = Math.floor(baseAmount * multiplier);
  const gainResult = await addTwitchGain({
    guildId,
    userId: user.discord_id,
    amount,
    source: "twitch_message",
    data: { twitch_tier: activity.sub_tier || null },
    baseAmount,
    multiplier
  });
  await db("twitch_activity")
    .where({ id: activity.id })
    .update({ message_count: 0, updated_at: new Date() });

  debugLog("message-award", { guildId, twitchLogin, amount, baseAmount, multiplier });

  return gainResult;
};

const awardWatchGain = async ({ guildId, twitchLogin }) => {
  const config = await getCachedConfig(guildId);
  const rule = config.rules?.watch;
  if (!rule?.enabled) return;
  if (rule.min_gain <= 0 && rule.max_gain <= 0) return;

  const user = await db("users")
    .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
    .first();
  if (!user) return { ok: false, reason: "not_linked" };

  const activity = await getOrCreateTwitchActivity(guildId, twitchLogin);
  const now = new Date();
  const last = activity.last_watch_reward_at ? new Date(activity.last_watch_reward_at) : null;
  const intervalMinutes = Number(rule.interval || 1);
  if (last) {
    const diffMinutes = (now.getTime() - last.getTime()) / 60000;
    if (diffMinutes < intervalMinutes) return { ok: false, reason: "interval_not_reached" };
  }

  const baseAmount = randomInt(rule.min_gain, rule.max_gain);
  const multiplier = await getSubMultiplierForUser({ guildId, twitchLogin, config });
  const amount = Math.floor(baseAmount * multiplier);
  const gainResult = await addTwitchGain({
    guildId,
    userId: user.discord_id,
    amount,
    source: "twitch_watch",
    data: { twitch_tier: activity.sub_tier || null },
    baseAmount,
    multiplier
  });
  await db("twitch_activity")
    .where({ id: activity.id })
    .update({ last_watch_reward_at: now, updated_at: new Date() });

  return gainResult;
};

const awardSubEvent = async ({ guildId, twitchLogin, tier, source, amount }) => {
  if (!amount || amount <= 0) return;
  const user = await db("users")
    .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
    .first();
  if (!user) return { ok: false, reason: "not_linked" };
  await updateSubTier({ guildId, twitchLogin, tier });
  const gainResult = await addTwitchGain({
    guildId,
    userId: user.discord_id,
    amount,
    source,
    data: { twitch_tier: normalizeSubTier(tier) || null },
    baseAmount: amount,
    multiplier: 1
  });
  return gainResult;
};

const awardBitsEvent = async ({ guildId, twitchLogin, bits, amountPer100 }) => {
  const count = Math.floor(Number(bits || 0) / 100);
  if (count <= 0 || amountPer100 <= 0) return;
  const amount = count * amountPer100;
  const user = await db("users")
    .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
    .first();
  if (!user) return { ok: false, reason: "not_linked" };
  const gainResult = await addTwitchGain({
    guildId,
    userId: user.discord_id,
    amount,
    source: "twitch_bits"
  });
  return gainResult;
};

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getPublicApiBase = () => {
  return (
    process.env.API_BASE ||
    process.env.BASE_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  );
};

const twitchI18n = {
  fr: {
    link: "Pour lier ton Discord et Twitch, connecte-toi ici : {link}",
    liveOnly: "Le !daily fonctionne que pendant le live.",
    alreadyWithRemaining: "Daily déjà récupéré. Reviens dans {remaining}.",
    alreadyToday: "Daily déjà récupéré aujourd'hui.",
    error: "Erreur daily.",
    success: "Daily Twitch reçu: +{amount} {currency}{bonusText} | Streak {streak} | Balance {balance}"
  },
  en: {
    link: "To link your Discord and Twitch, connect here: {link}",
    liveOnly: "The !daily only works during the live stream.",
    alreadyWithRemaining: "Daily already claimed. Come back in {remaining}.",
    alreadyToday: "Daily already claimed today.",
    error: "Daily error.",
    success: "Twitch daily received: +{amount} {currency}{bonusText} | Streak {streak} | Balance {balance}"
  },
  es: {
    link: "Para vincular tu Discord y Twitch, conéctate aquí: {link}",
    liveOnly: "El !daily solo funciona durante el directo.",
    alreadyWithRemaining: "Daily ya reclamado. Vuelve en {remaining}.",
    alreadyToday: "Daily ya reclamado hoy.",
    error: "Error de daily.",
    success: "Daily de Twitch recibido: +{amount} {currency}{bonusText} | Racha {streak} | Saldo {balance}"
  }
};

const getBotLanguage = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  const row = await db("bot_settings").where({ guild_id: guild.id }).first();
  const lang = String(row?.bot_language || "fr").toLowerCase();
  return twitchI18n[lang] ? lang : "fr";
};

const tTwitch = (lang, key, vars = {}) => {
  const dict = twitchI18n[lang] || twitchI18n.fr;
  let text = dict[key] || twitchI18n.fr[key] || "";
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
  });
  return text;
};

const handleDailyCommand = async ({ guildId, twitchLogin, client, channel }) => {
  const lang = await getBotLanguage(guildId);
  const user = await db("users")
    .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
    .first();
  if (!user) {
    const base = getPublicApiBase();
    const link = `${base}/auth/discord/twitch-link?guildId=${encodeURIComponent(
      guildId
    )}&twitchLogin=${encodeURIComponent(String(twitchLogin || ""))}`;
    await client.say(channel, tTwitch(lang, "link", { link }));
    return;
  }

  const liveOnly = await isLiveOnlyEnabled(guildId);
  if (liveOnly) {
    const live = await isLiveCached(guildId);
    if (!live) {
      await client.say(channel, tTwitch(lang, "liveOnly"));
      return;
    }
  }

  const economy = await getOrCreateSettings(guildId, db);
  const currencyName = economy?.name || "Economy";
  const currency = `🪙 ${currencyName}`;
  const result = await applyTwitchDaily({ guildId, userId: user.discord_id });

  if (!result.ok && result.reason === "already_claimed") {
    const nextAt = result.nextAt ? new Date(result.nextAt) : null;
    const remaining = nextAt ? formatDuration(nextAt.getTime() - Date.now()) : "";
    await client.say(
      channel,
      remaining
        ? tTwitch(lang, "alreadyWithRemaining", { remaining })
        : tTwitch(lang, "alreadyToday")
    );
    return;
  }

  if (!result.ok) {
    await client.say(channel, tTwitch(lang, "error"));
    return;
  }

  const bonusText = result.bonus > 0 ? ` (bonus +${result.bonus})` : "";
  await client.say(
    channel,
    tTwitch(lang, "success", {
      amount: result.amount,
      currency,
      bonusText,
      streak: result.streak,
      balance: result.balance
    })
  );
};

export const startTwitchListener = async (guildId) => {
  const settings = await getTwitchSettings(guildId);
  if (!settings) {
    debugLog("listener-skip", { guildId, reason: "no_settings" });
    return;
  }

  const refreshed = await refreshTokenIfNeeded(settings);
  const channel = String(refreshed.twitch_login || "");
  if (!channel) {
    debugLog("listener-skip", { guildId, reason: "missing_channel" });
    return;
  }

  if (!twitchClients.has(guildId)) {
    const client = new tmi.Client({
      options: { debug: isDebugEnabled() },
      identity: {
        username: channel,
        password: `oauth:${refreshed.access_token}`
      },
      channels: [channel]
    });

    client.on("connected", (addr, port) => {
      debugLog("connected", { guildId, addr, port, channel });
    });

    client.on("disconnected", (reason) => {
      debugLog("disconnected", { guildId, reason });
    });

    client.on("reconnect", () => {
      debugLog("reconnect", { guildId });
    });

    client.on("join", (_channel, username, self) => {
      if (!self) return;
      debugLog("join", { guildId, channel: _channel, username });
    });

    client.on("message", async (_channel, tags, message, self) => {
      if (self) return;
      const username = tags?.username;
      if (!username) return;

      debugLog("message-received", { guildId, username, message: String(message || "") });

      const trimmed = String(message || "").trim();
      if (trimmed.toLowerCase().startsWith("!daily")) {
        await handleDailyCommand({ guildId, twitchLogin: username, client, channel: _channel });
      }

      await maybeSetSubTierFromBadges({ guildId, twitchLogin: username, badges: tags?.badges });
      await awardMessageGain({ guildId, twitchLogin: username });
    });

    client.on("subscription", async (_channel, username, _methods, message, userstate) => {
      const plan = userstate?.["msg-param-sub-plan"];
      const tier = normalizeSubTier(plan);
      const config = await getCachedConfig(guildId);
      const eventTier = tier === "prime" ? "t1" : tier;
      const key = eventTier ? `sub_${eventTier}` : null;
      const amount = key && config.events?.[key]?.enabled ? config.events?.[key]?.amount : 0;
      debugLog("sub-event", { guildId, username, tier, amount, message: String(message || "") });
      if (!tier) return;
      await awardSubEvent({ guildId, twitchLogin: username, tier, source: "twitch_sub", amount });
    });

    client.on("resub", async (_channel, username, _months, message, userstate) => {
      const plan = userstate?.["msg-param-sub-plan"];
      const tier = normalizeSubTier(plan);
      const config = await getCachedConfig(guildId);
      const eventTier = tier === "prime" ? "t1" : tier;
      const key = eventTier ? `sub_${eventTier}` : null;
      const amount = key && config.events?.[key]?.enabled ? config.events?.[key]?.amount : 0;
      debugLog("resub-event", { guildId, username, tier, amount, message: String(message || "") });
      if (!tier) return;
      await awardSubEvent({ guildId, twitchLogin: username, tier, source: "twitch_sub", amount });
    });

    client.on("subgift", async (_channel, username, _streakMonths, recipient, _methods, userstate) => {
      const plan = userstate?.["msg-param-sub-plan"];
      const tier = normalizeSubTier(plan);
      const config = await getCachedConfig(guildId);
      const key = tier ? `subgift_${tier}` : null;
      const amount = key && config.events?.[key]?.enabled ? config.events?.[key]?.amount : 0;
      debugLog("subgift-event", { guildId, username, recipient, tier, amount });
      if (!tier) return;
      if (recipient) {
        await updateSubTier({ guildId, twitchLogin: recipient, tier });
      }
      await awardSubEvent({ guildId, twitchLogin: username, tier, source: "twitch_subgift", amount });
    });

    client.on("submysterygift", async (_channel, username, numOfSubs, _methods, userstate) => {
      const plan = userstate?.["msg-param-sub-plan"];
      const tier = normalizeSubTier(plan);
      const config = await getCachedConfig(guildId);
      const key = tier ? `subgift_${tier}` : null;
      const baseAmount = key && config.events?.[key]?.enabled ? config.events?.[key]?.amount : 0;
      const count = Number(numOfSubs || 0);
      const amount = count > 0 ? baseAmount * count : 0;
      debugLog("submysterygift-event", { guildId, username, tier, count, amount });
      if (!tier) return;
      await awardSubEvent({ guildId, twitchLogin: username, tier, source: "twitch_subgift", amount });
    });

    client.on("cheer", async (_channel, userstate, message) => {
      const username = userstate?.username;
      const bits = Number(userstate?.bits || 0);
      if (!username || !bits) return;
      const config = await getCachedConfig(guildId);
      const amountPer100 = config.events?.bits?.enabled ? Number(config.events?.bits?.amount || 0) : 0;
      debugLog("bits-event", { guildId, username, bits, amountPer100, message: String(message || "") });
      await awardBitsEvent({ guildId, twitchLogin: username, bits, amountPer100 });
    });

    try {
      await client.connect();
    } catch (error) {
      debugLog("connect-error", { guildId, error: error?.message || String(error) });
      return;
    }
    twitchClients.set(guildId, client);
  }

  if (!watchIntervals.has(guildId)) {
    const { watchInterval } = getEnv();
    const intervalMs = Math.max(1, watchInterval) * 60 * 1000;
    const timer = setInterval(async () => {
      try {
        const current = await getTwitchSettings(guildId);
        if (!current) return;
        const liveOnly = normalizeLiveOnly(current.live_only);
        if (liveOnly) {
          const live = await isLiveCached(guildId);
          if (!live) return;
        }
        const chatters = await fetchChatters(current);
        for (const chatter of chatters) {
          const login = chatter?.user_login;
          if (!login) continue;
          await awardWatchGain({ guildId, twitchLogin: login });
        }
      } catch {
        // ignore errors
      }
    }, intervalMs);
    watchIntervals.set(guildId, timer);
  }
};

export const stopTwitchListener = async (guildId) => {
  const client = twitchClients.get(guildId);
  if (client) {
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
    twitchClients.delete(guildId);
  }
  const timer = watchIntervals.get(guildId);
  if (timer) {
    clearInterval(timer);
    watchIntervals.delete(guildId);
  }
};

export const startAllTwitchListeners = async () => {
  const rows = await db("twitch_settings")
    .join("guilds", "twitch_settings.guild_id", "guilds.id")
    .select("guilds.discord_guild_id as discord_guild_id");
  for (const row of rows) {
    if (!row.discord_guild_id) continue;
    await startTwitchListener(row.discord_guild_id);
    void ensureEventSubSubscriptions(row.discord_guild_id);
    void syncCurrentSubs(row.discord_guild_id);
  }
};
