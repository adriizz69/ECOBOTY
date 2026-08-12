import tmi from "tmi.js";
import { db } from "./db.js";
import { ensureGuild, addTwitchGain, applyTwitchDaily, getOrCreateSettings } from "./economy.js";
import { ensureEventSubSubscriptions } from "./twitchEventSub.js";
import { recordAchievementEvent } from "./achievements.js";

const twitchClients = new Map();
const twitchClientTokens = new Map();
const watchIntervals = new Map();
const reconnectTimers = new Map();
const manualStopGuilds = new Set();

const clearReconnectTimer = (guildId) => {
  const timer = reconnectTimers.get(guildId);
  if (timer) clearTimeout(timer);
  reconnectTimers.delete(guildId);
};

const markManualStop = (guildId, holdMs = 5000) => {
  const key = String(guildId || "");
  if (!key) return;
  manualStopGuilds.add(key);
  setTimeout(() => {
    manualStopGuilds.delete(key);
  }, Math.max(500, Number(holdMs || 0)));
};

const scheduleListenerReconnect = (guildId, reason = "unknown", delayMs = 5000) => {
  const key = String(guildId || "");
  if (!key) return;
  if (manualStopGuilds.has(key)) return;
  if (reconnectTimers.has(key)) return;
  const waitMs = Math.max(1000, Number(delayMs || 0));
  const timer = setTimeout(async () => {
    reconnectTimers.delete(key);
    if (manualStopGuilds.has(key)) return;
    if (twitchClients.has(key)) return;
    debugLog("reconnect-attempt", { guildId: key, reason });
    try {
      await startTwitchListener(key);
    } catch (error) {
      debugLog("reconnect-failed", { guildId: key, reason, error: error?.message || String(error) });
      scheduleListenerReconnect(key, "retry_after_failure", 10000);
    }
  }, waitMs);
  reconnectTimers.set(key, timer);
};

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

import { getTwitchPremiumPolicy } from "./billing-entitlements.js";

const randomInt = (min, max) => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const range = high - low + 1;
  if (range <= 1) return low;
  return Math.floor(Math.random() * range) + low;
};

const findLinkedDiscordUserByTwitchLogin = async (twitchLogin) => {
  const login = String(twitchLogin || "").trim();
  if (!login) return null;
  return db("users")
    .whereRaw("LOWER(twitch_login) = LOWER(?)", [login])
    .first();
};

const trackTwitchAchievementByDiscordUser = async ({
  guildId,
  discordUserId,
  eventKey,
  increment = 1,
  metadata = {}
}) => {
  const policy = await getTwitchPremiumPolicy(guildId);
  if (!policy.integrationEnabled) {
    return { ok: false, reason: "premium_feature_disabled" };
  }
  const numericIncrement = Number(increment || 0);
  if (!Number.isFinite(numericIncrement) || numericIncrement <= 0) {
    return { ok: false, reason: "invalid_increment" };
  }
  const userId = String(discordUserId || "").trim();
  if (!userId) return { ok: false, reason: "not_linked" };
  try {
    await recordAchievementEvent({
      guildId: String(guildId),
      userId,
      eventKey: String(eventKey),
      increment: Math.floor(numericIncrement),
      metadata
    });
    return { ok: true };
  } catch (error) {
    debugLog("achievement-track-failed", {
      guildId,
      discordUserId: userId,
      eventKey,
      message: error?.message || String(error)
    });
    return { ok: false, reason: "achievement_failed" };
  }
};

const trackTwitchAchievementByLogin = async ({
  guildId,
  twitchLogin,
  eventKey,
  increment = 1,
  metadata = {}
}) => {
  const numericIncrement = Number(increment || 0);
  if (!Number.isFinite(numericIncrement) || numericIncrement <= 0) {
    return { ok: false, reason: "invalid_increment" };
  }
  try {
    const user = await findLinkedDiscordUserByTwitchLogin(twitchLogin);
    if (!user?.discord_id) return { ok: false, reason: "not_linked" };
    return trackTwitchAchievementByDiscordUser({
      guildId: String(guildId),
      discordUserId: String(user.discord_id),
      eventKey: String(eventKey),
      increment: numericIncrement,
      metadata
    });
  } catch (error) {
    debugLog("achievement-track-failed", {
      guildId,
      twitchLogin,
      eventKey,
      message: error?.message || String(error)
    });
    return { ok: false, reason: "achievement_failed" };
  }
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

const maskAutomationConfigByPolicy = (config = {}, policy = {}) => {
  const safeConfig = config && typeof config === "object" ? config : {};
  const integrationEnabled = policy?.integrationEnabled !== false;
  const eventsAdvancedEnabled = policy?.eventsAdvancedEnabled !== false;

  const messageRule = normalizeRule(safeConfig.rules?.message || {}, {});
  const watchRule = normalizeRule(safeConfig.rules?.watch || {}, {});
  const multipliers = {
    prime: normalizeMultiplier(safeConfig.multipliers?.prime || {}, { enabled: false, value: 1 }),
    t1: normalizeMultiplier(safeConfig.multipliers?.t1 || {}, { enabled: false, value: 1 }),
    t2: normalizeMultiplier(safeConfig.multipliers?.t2 || {}, { enabled: false, value: 1 }),
    t3: normalizeMultiplier(safeConfig.multipliers?.t3 || {}, { enabled: false, value: 1 })
  };
  const events = {
    sub_t1: normalizeEvent(safeConfig.events?.sub_t1 || {}),
    sub_t2: normalizeEvent(safeConfig.events?.sub_t2 || {}),
    sub_t3: normalizeEvent(safeConfig.events?.sub_t3 || {}),
    subgift_t1: normalizeEvent(safeConfig.events?.subgift_t1 || {}),
    subgift_t2: normalizeEvent(safeConfig.events?.subgift_t2 || {}),
    subgift_t3: normalizeEvent(safeConfig.events?.subgift_t3 || {}),
    bits: normalizeEvent(safeConfig.events?.bits || {})
  };

  if (!integrationEnabled) {
    return {
      rules: {
        message: { ...messageRule, enabled: false },
        watch: { ...watchRule, enabled: false }
      },
      multipliers: {
        prime: { ...multipliers.prime, enabled: false },
        t1: { ...multipliers.t1, enabled: false },
        t2: { ...multipliers.t2, enabled: false },
        t3: { ...multipliers.t3, enabled: false }
      },
      events: {
        sub_t1: { ...events.sub_t1, enabled: false, amount: 0 },
        sub_t2: { ...events.sub_t2, enabled: false, amount: 0 },
        sub_t3: { ...events.sub_t3, enabled: false, amount: 0 },
        subgift_t1: { ...events.subgift_t1, enabled: false, amount: 0 },
        subgift_t2: { ...events.subgift_t2, enabled: false, amount: 0 },
        subgift_t3: { ...events.subgift_t3, enabled: false, amount: 0 },
        bits: { ...events.bits, enabled: false, amount: 0 }
      }
    };
  }

  if (!eventsAdvancedEnabled) {
    return {
      rules: {
        message: messageRule,
        watch: { ...watchRule, enabled: false }
      },
      multipliers: {
        prime: { ...multipliers.prime, enabled: false },
        t1: { ...multipliers.t1, enabled: false },
        t2: { ...multipliers.t2, enabled: false },
        t3: { ...multipliers.t3, enabled: false }
      },
      events: {
        sub_t1: { ...events.sub_t1, enabled: false, amount: 0 },
        sub_t2: { ...events.sub_t2, enabled: false, amount: 0 },
        sub_t3: { ...events.sub_t3, enabled: false, amount: 0 },
        subgift_t1: { ...events.subgift_t1, enabled: false, amount: 0 },
        subgift_t2: { ...events.subgift_t2, enabled: false, amount: 0 },
        subgift_t3: { ...events.subgift_t3, enabled: false, amount: 0 },
        bits: { ...events.bits, enabled: false, amount: 0 }
      }
    };
  }

  return {
    rules: {
      message: messageRule,
      watch: watchRule
    },
    multipliers,
    events
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

const TWITCH_CHAT_MAX_CHARS = 500;

const DEFAULT_PROMO_TEMPLATE =
  "Hey @{user} ! Rejoins le Discord : {discord} pour gagner des {currency} et plein d'avantages. Un seul lien pour lier ton compte : {link} — puis tape !daily dans le tchat. Subs, bits et subgifts = des {currency} ! {stop}";

const PROMO_STOP_PHRASE =
  "Plus intéressé ? Tape !stop pour ne plus recevoir ce message.";

/** Older defaults still stored in DB — replace with the one-link template. */
const LEGACY_PROMO_TEMPLATES = [
  "@{user} Rejoins le Discord : {discord} pour gagner des {currency} et débloquer plein d'avantages ! Tape !daily dans le chat pour lier ton Discord, ou passe par ce lien : {link} — à chaque sub, bits ou subgift tu pourras gagner des {currency}.",
  "@{user} Rejoins le Discord : {discord} pour gagner des {currency} et débloquer plein d'avantages ! Tape !daily dans le chat pour lier ton Discord, ou passe par ce lien : {link} — à chaque sub, bits ou subgift tu pourras gagner des {currency}. {stop}",
  "Hey @{user} ! Rejoins le Discord {discord} pour gagner des {currency} et plein d'avantages. Lie ton compte ici : {link} — puis tape !daily dans le tchat. Subs, bits et subgifts = des {currency} !",
  "Hey @{user} ! Rejoins le Discord {discord} pour gagner des {currency} et plein d'avantages. Lie ton compte ici : {link} — puis tape !daily dans le tchat. Subs, bits et subgifts = des {currency} ! {stop}"
];

const normalizePromoTemplateText = (raw) => String(raw || "").replace(/\s+/g, " ").trim();

const resolvePromoTemplate = (raw) => {
  const template = normalizePromoTemplateText(raw);
  if (!template) return DEFAULT_PROMO_TEMPLATE;
  const legacy = LEGACY_PROMO_TEMPLATES.some(
    (item) => normalizePromoTemplateText(item) === template
  );
  return legacy ? DEFAULT_PROMO_TEMPLATE : template;
};

/** MySQL returns TINYINT 0/1 — never use `!== false` (0 !== false is true). */
const asBool = (value, fallback = false) => {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  if (value == null) return fallback;
  return Boolean(value);
};

const clampTwitchChatMessage = (text) => {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= TWITCH_CHAT_MAX_CHARS) return value;
  return `${value.slice(0, TWITCH_CHAT_MAX_CHARS - 3).trim()}...`;
};

const normalizePromoSettings = (row = {}) => {
  const template = resolvePromoTemplate(row.promo_template);
  return {
    enabled: asBool(row.promo_enabled, false),
    template,
    discordUrl: String(row.promo_discord_url || "").trim(),
    onFollow: asBool(row.promo_on_follow, true),
    onFirstMessage: asBool(row.promo_on_first_message, true),
    remindUnlinked: asBool(row.promo_remind_unlinked, true),
    stopEnabled: asBool(row.promo_stop_enabled, true),
    maxChars: TWITCH_CHAT_MAX_CHARS
  };
};

/** Shared Chat: ignore messages that originated in another channel. */
export const isForeignSharedChatMessage = (tags = {}) => {
  const sourceRoomId = String(tags?.["source-room-id"] || "").trim();
  if (!sourceRoomId) return false;
  const roomId = String(tags?.["room-id"] || "").trim();
  if (!roomId) return false;
  return sourceRoomId !== roomId;
};

export const slugifyGuildName = (name) => {
  const base = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "serveur";
};

export const ensureGuildLinkSlug = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const existingSlug = String(guild.link_slug || "").trim();
  if (existingSlug) return existingSlug;

  const hasColumn = await trx.schema.hasColumn("guilds", "link_slug");
  if (!hasColumn) return String(guild.discord_guild_id || guildId);

  let base = slugifyGuildName(guild.name);
  let slug = base;
  let n = 0;
  for (;;) {
    const clash = await trx("guilds").where({ link_slug: slug }).whereNot({ id: guild.id }).first();
    if (!clash) break;
    n += 1;
    slug = `${base}-${n}`.slice(0, 64);
  }
  await trx("guilds").where({ id: guild.id }).update({ link_slug: slug });
  guild.link_slug = slug;
  return slug;
};

export const resolveGuildByLinkSlug = async (slug, trx = db) => {
  const safe = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
  if (!safe) return null;
  const hasColumn = await trx.schema.hasColumn("guilds", "link_slug");
  if (!hasColumn) return null;
  return trx("guilds").where({ link_slug: safe }).first();
};

export const getTwitchPromoSettings = async (guildId, trx = db) => {
  const settings = await getTwitchSettings(guildId, trx);
  if (!settings) {
    return {
      connected: false,
      ...normalizePromoSettings({}),
      placeholders: [
        { tag: "{user}", label: "Pseudo Twitch de la personne concernée (login, pas Discord)" },
        { tag: "{pseudo}", label: "Identique à {user}" },
        { tag: "{discord}", label: "Lien d’invitation Discord" },
        { tag: "{invite}", label: "Identique à {discord}" },
        { tag: "{currency}", label: "Nom de la monnaie du serveur" },
        { tag: "{money}", label: "Identique à {currency}" },
        { tag: "{link}", label: "Lien court d’onboarding EcoBoty (/link/serveur/pseudo)" },
        { tag: "{channel}", label: "Pseudo de la chaîne Twitch connectée" },
        { tag: "{stop}", label: "Phrase !stop (vide si l’option est désactivée)" }
      ],
      defaultTemplate: DEFAULT_PROMO_TEMPLATE,
      stopPhrase: PROMO_STOP_PHRASE
    };
  }
  return {
    connected: true,
    ...normalizePromoSettings(settings),
    placeholders: [
      { tag: "{user}", label: "Pseudo Twitch de la personne concernée (login, pas Discord)" },
      { tag: "{pseudo}", label: "Identique à {user}" },
      { tag: "{discord}", label: "Lien d’invitation Discord" },
      { tag: "{invite}", label: "Identique à {discord}" },
      { tag: "{currency}", label: "Nom de la monnaie du serveur" },
      { tag: "{money}", label: "Identique à {currency}" },
      { tag: "{link}", label: "Lien court d’onboarding EcoBoty (/link/serveur/pseudo)" },
      { tag: "{channel}", label: "Pseudo de la chaîne Twitch connectée" },
      { tag: "{stop}", label: "Phrase !stop (vide si l’option est désactivée)" }
    ],
    defaultTemplate: DEFAULT_PROMO_TEMPLATE,
    stopPhrase: PROMO_STOP_PHRASE
  };
};

export const saveTwitchPromoSettings = async (guildId, data = {}, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const existing = await trx("twitch_settings").where({ guild_id: guild.id }).first();
  if (!existing) throw new Error("twitch_not_connected");

  const hasEnabled = await trx.schema.hasColumn("twitch_settings", "promo_enabled");
  if (!hasEnabled) throw new Error("twitch_promo_not_migrated");

  const templateRaw = Object.prototype.hasOwnProperty.call(data, "template")
    ? String(data.template || "").trim()
    : String(existing.promo_template || "").trim();
  const discordUrl = Object.prototype.hasOwnProperty.call(data, "discordUrl")
    ? String(data.discordUrl || "").trim().slice(0, 500)
    : String(existing.promo_discord_url || "").trim();

  // Reject oversized rendered messages so chat never truncates mid-sentence.
  if (Object.prototype.hasOwnProperty.call(data, "template")) {
    const previewSettings = {
      ...existing,
      promo_template: templateRaw || DEFAULT_PROMO_TEMPLATE,
      promo_discord_url: discordUrl,
      promo_stop_enabled: Object.prototype.hasOwnProperty.call(data, "stopEnabled")
        ? Boolean(data.stopEnabled)
        : existing.promo_stop_enabled
    };
    const promo = normalizePromoSettings(previewSettings);
    const economy = await getOrCreateSettings(guildId, trx);
    const currencyName = String(economy?.name || "Economy").trim() || "Economy";
    const discord =
      promo.discordUrl ||
      String(process.env.DISCORD_INVITE_URL || process.env.PUBLIC_DISCORD_INVITE || "").trim() ||
      "https://discord.gg/";
    const link = await buildTwitchLinkUrl(guildId, "viewer");
    const stopText = promo.stopEnabled ? PROMO_STOP_PHRASE : "";
    let check = String(promo.template || DEFAULT_PROMO_TEMPLATE);
    const vars = {
      user: "Viewer",
      pseudo: "Viewer",
      discord,
      invite: discord,
      currency: currencyName,
      money: currencyName,
      link,
      channel: String(existing.twitch_login || "channel").replace(/^@/, ""),
      stop: stopText
    };
    Object.entries(vars).forEach(([name, value]) => {
      check = check.replace(new RegExp(`\\{${name}\\}`, "gi"), String(value));
    });
    if (promo.stopEnabled && !/\{stop\}/i.test(String(promo.template || "")) && !/!stop/i.test(check)) {
      check = `${check} ${PROMO_STOP_PHRASE}`.trim();
    }
    check = check.replace(/\s{2,}/g, " ").trim();
    if (check.length > TWITCH_CHAT_MAX_CHARS) {
      const error = new Error(`promo_template_too_long:${check.length}/${TWITCH_CHAT_MAX_CHARS}`);
      error.status = 400;
      throw error;
    }
  }

  const hasStopCol = await trx.schema.hasColumn("twitch_settings", "promo_stop_enabled");
  const templateToStore = resolvePromoTemplate(templateRaw);
  await trx("twitch_settings")
    .where({ guild_id: guild.id })
    .update({
      promo_enabled: Object.prototype.hasOwnProperty.call(data, "enabled")
        ? Boolean(data.enabled)
        : asBool(existing.promo_enabled, false),
      promo_template: templateToStore || null,
      promo_discord_url: discordUrl || null,
      promo_on_follow: Object.prototype.hasOwnProperty.call(data, "onFollow")
        ? Boolean(data.onFollow)
        : asBool(existing.promo_on_follow, true),
      promo_on_first_message: Object.prototype.hasOwnProperty.call(data, "onFirstMessage")
        ? Boolean(data.onFirstMessage)
        : asBool(existing.promo_on_first_message, true),
      promo_remind_unlinked: Object.prototype.hasOwnProperty.call(data, "remindUnlinked")
        ? Boolean(data.remindUnlinked)
        : asBool(existing.promo_remind_unlinked, true),
      ...(hasStopCol
        ? {
            promo_stop_enabled: Object.prototype.hasOwnProperty.call(data, "stopEnabled")
              ? Boolean(data.stopEnabled)
              : asBool(existing.promo_stop_enabled, true)
          }
        : {}),
      updated_at: new Date()
    });

  void ensureEventSubSubscriptions(guildId);
  return getTwitchPromoSettings(guildId, trx);
};

const findLinkedUserByTwitchLogin = async (twitchLogin, trx = db) => {
  const login = String(twitchLogin || "").trim();
  if (!login) return null;
  return trx("users").whereRaw("LOWER(twitch_login) = LOWER(?)", [login]).first();
};

const buildTwitchLinkUrl = async (guildId, twitchLogin) => {
  const base = String(getPublicSiteBase() || "").replace(/\/$/, "");
  const safeLogin = String(twitchLogin || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 25);
  try {
    const slug = await ensureGuildLinkSlug(guildId);
    if (slug && safeLogin) {
      return `${base}/link/${encodeURIComponent(slug)}/${encodeURIComponent(safeLogin)}`;
    }
    if (slug) {
      return `${base}/link/${encodeURIComponent(slug)}`;
    }
  } catch {
    // fall through to legacy
  }
  const safeGuild = String(guildId || "").replace(/\D/g, "");
  if (!safeGuild || !safeLogin) {
    return `${base}/auth/discord/twitch-link`;
  }
  return `${base}/l/${safeGuild}/${safeLogin}`;
};

export const renderTwitchPromoMessage = async ({
  guildId,
  twitchLogin,
  displayName = "",
  settings = null
} = {}) => {
  const currentSettings = settings || (await getTwitchSettings(guildId));
  if (!currentSettings) return "";
  const promo = normalizePromoSettings(currentSettings);
  const economy = await getOrCreateSettings(guildId, db);
  const currencyName = String(economy?.name || "Economy").trim() || "Economy";
  const discordUrl =
    promo.discordUrl ||
    String(process.env.DISCORD_INVITE_URL || process.env.PUBLIC_DISCORD_INVITE || "").trim() ||
    "https://discord.gg/";
  const twitchName = String(twitchLogin || displayName || "viewer").replace(/^@/, "");
  const channelName = String(currentSettings.twitch_login || "").replace(/^@/, "");
  const link = await buildTwitchLinkUrl(guildId, twitchLogin);
  const stopText = promo.stopEnabled ? PROMO_STOP_PHRASE : "";
  const vars = {
    user: twitchName,
    pseudo: twitchName,
    discord: discordUrl,
    invite: discordUrl,
    currency: currencyName,
    money: currencyName,
    link,
    channel: channelName,
    stop: stopText
  };
  let text = String(promo.template || DEFAULT_PROMO_TEMPLATE);
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\\{${name}\\}`, "gi"), String(value));
  });
  // If stop is enabled but template has no {stop}, append the phrase once.
  if (promo.stopEnabled && !/\{stop\}/i.test(String(promo.template || "")) && !/!stop/i.test(text)) {
    text = `${text} ${PROMO_STOP_PHRASE}`.trim();
  }
  // Clean leftover spaces when {stop} was emptied.
  text = text.replace(/\s{2,}/g, " ").trim();
  return clampTwitchChatMessage(text);
};

export const sayTwitchChat = async (guildId, message, { channel = "" } = {}) => {
  const text = clampTwitchChatMessage(message);
  if (!text) return false;
  const client = twitchClients.get(String(guildId));
  if (!client) {
    debugLog("promo-say-skip", { guildId, reason: "no_client" });
    return false;
  }
  let target = String(channel || "").trim();
  if (!target) {
    const settings = await getTwitchSettings(guildId);
    const login = String(settings?.twitch_login || "").trim();
    if (!login) return false;
    target = login.startsWith("#") ? login : `#${login}`;
  }
  await client.say(target, text);
  return true;
};

const markPromoActivity = async (activityId, patch = {}) => {
  if (!activityId) return;
  await db("twitch_activity")
    .where({ id: activityId })
    .update({
      ...patch,
      updated_at: new Date()
    });
};

/** In-memory EventSub follow promo dedupe (retries / duplicate deliveries). */
const recentFollowPromoKeys = new Map();

let promoActivityColumnsReady = null;
const ensurePromoActivityColumns = async () => {
  if (promoActivityColumnsReady !== null) return promoActivityColumnsReady;
  promoActivityColumnsReady = await db.schema.hasColumn("twitch_activity", "promo_first_message_sent");
  return promoActivityColumnsReady;
};

let promoOptOutColumnReady = null;
const ensurePromoOptOutColumn = async () => {
  if (promoOptOutColumnReady !== null) return promoOptOutColumnReady;
  promoOptOutColumnReady = await db.schema.hasColumn("twitch_activity", "promo_opted_out");
  return promoOptOutColumnReady;
};

const isPromoOptedOut = async (guildId, twitchLogin) => {
  if (!(await ensurePromoOptOutColumn())) return false;
  const activity = await getOrCreateTwitchActivity(guildId, twitchLogin);
  return asBool(activity.promo_opted_out, false);
};

export const handleTwitchPromoStopCommand = async ({
  guildId,
  twitchLogin,
  client = null,
  channel = ""
} = {}) => {
  try {
    const login = String(twitchLogin || "").trim();
    if (!login) return false;
    const settings = await getTwitchSettings(guildId);
    if (!settings) return false;
    const promo = normalizePromoSettings(settings);
    if (!promo.enabled || !promo.stopEnabled) return false;

    if (!(await ensurePromoOptOutColumn())) return false;
    const activity = await getOrCreateTwitchActivity(guildId, login);
    if (asBool(activity.promo_opted_out, false)) {
      const lang = await getBotLanguage(guildId);
      const text = tTwitch(lang, "promoStopAlready");
      if (client && channel) await client.say(channel, text);
      else await sayTwitchChat(guildId, text, { channel });
      return true;
    }

    await markPromoActivity(activity.id, { promo_opted_out: true });
    const lang = await getBotLanguage(guildId);
    const text = tTwitch(lang, "promoStopOk");
    if (client && channel) await client.say(channel, text);
    else await sayTwitchChat(guildId, text, { channel });
    debugLog("promo-stop", { guildId, login });
    return true;
  } catch (error) {
    debugLog("promo-stop-failed", {
      guildId,
      twitchLogin,
      error: error?.message || String(error)
    });
    return false;
  }
};

export const handleTwitchPromoOnFollow = async ({
  guildId,
  twitchLogin,
  displayName = "",
  dedupeKey = ""
} = {}) => {
  try {
    const login = String(twitchLogin || "").trim();
    if (!login) return false;
    const settings = await getTwitchSettings(guildId);
    if (!settings) return false;
    const promo = normalizePromoSettings(settings);
    if (!promo.enabled || !promo.onFollow) return false;
    if (String(settings.twitch_login || "").toLowerCase() === login.toLowerCase()) return false;

    const linked = await findLinkedUserByTwitchLogin(login);
    if (linked) return false;

    if (await isPromoOptedOut(guildId, login)) {
      debugLog("promo-follow-skipped-optout", { guildId, login });
      return false;
    }

    const key = String(dedupeKey || `${guildId}:${login}`).trim();
    if (key) {
      const now = Date.now();
      for (const [k, ts] of recentFollowPromoKeys) {
        if (now - ts > 15 * 60 * 1000) recentFollowPromoKeys.delete(k);
      }
      if (recentFollowPromoKeys.has(key)) {
        debugLog("promo-follow-deduped", { guildId, login, key });
        return false;
      }
      recentFollowPromoKeys.set(key, now);
    }

    const text = await renderTwitchPromoMessage({
      guildId,
      twitchLogin: login,
      displayName,
      settings
    });
    if (!text) return false;
    const ok = await sayTwitchChat(guildId, text);
    debugLog("promo-follow", { guildId, login, ok });
    return ok;
  } catch (error) {
    debugLog("promo-follow-failed", {
      guildId,
      twitchLogin,
      error: error?.message || String(error)
    });
    return false;
  }
};

export const handleTwitchPromoOnChat = async ({
  guildId,
  twitchLogin,
  displayName = "",
  client = null,
  channel = "",
  tags = null
} = {}) => {
  try {
    if (isForeignSharedChatMessage(tags)) {
      debugLog("promo-chat-skip-shared", { guildId, twitchLogin });
      return false;
    }

    const login = String(twitchLogin || "").trim();
    if (!login) return false;
    const settings = await getTwitchSettings(guildId);
    if (!settings) return false;
    const promo = normalizePromoSettings(settings);
    if (!promo.enabled) return false;
    if (!promo.onFirstMessage && !promo.remindUnlinked) return false;
    if (String(settings.twitch_login || "").toLowerCase() === login.toLowerCase()) return false;

    const linked = await findLinkedUserByTwitchLogin(login);
    if (linked) return false;

    if (await isPromoOptedOut(guildId, login)) {
      debugLog("promo-chat-skipped-optout", { guildId, login });
      return false;
    }

    if (!(await ensurePromoActivityColumns())) return false;

    const activity = await getOrCreateTwitchActivity(guildId, login);
    const claimed = {};
    let shouldSend = false;

    // Claim flags BEFORE sending to prevent race duplicates on rapid messages.
    if (promo.onFirstMessage && !asBool(activity.promo_first_message_sent, false)) {
      const updated = await db("twitch_activity")
        .where({ id: activity.id })
        .andWhere((qb) => {
          qb.where("promo_first_message_sent", false)
            .orWhere("promo_first_message_sent", 0)
            .orWhereNull("promo_first_message_sent");
        })
        .update({
          promo_first_message_sent: true,
          updated_at: new Date()
        });
      if (updated) {
        shouldSend = true;
        claimed.firstMessage = true;
        activity.promo_first_message_sent = true;
      }
    }

    if (promo.remindUnlinked) {
      const liveInfo = await getLiveStreamInfoCached(guildId);
      const streamId = liveInfo.streamId || null;
      if (liveInfo.live && streamId && String(activity.promo_remind_stream_id || "") !== String(streamId)) {
        const updated = await db("twitch_activity")
          .where({ id: activity.id })
          .andWhere((qb) => {
            qb.whereNot("promo_remind_stream_id", String(streamId)).orWhereNull("promo_remind_stream_id");
          })
          .update({
            promo_remind_stream_id: String(streamId),
            updated_at: new Date()
          });
        if (updated) {
          shouldSend = true;
          claimed.remind = true;
          activity.promo_remind_stream_id = String(streamId);
        }
      }
    }

    if (!shouldSend) return false;

    const text = await renderTwitchPromoMessage({
      guildId,
      twitchLogin: login,
      displayName,
      settings
    });
    if (!text) return false;

    if (client && channel) {
      await client.say(channel, text);
    } else {
      const ok = await sayTwitchChat(guildId, text, { channel });
      if (!ok) return false;
    }

    debugLog("promo-chat", { guildId, login, claimed });
    return true;
  } catch (error) {
    debugLog("promo-chat-failed", {
      guildId,
      twitchLogin,
      error: error?.message || String(error)
    });
    return false;
  }
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

  const config = {
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
  const policy = await getTwitchPremiumPolicy(guildId);
  return maskAutomationConfigByPolicy(config, policy);
};

export const saveTwitchAutomationConfig = async (guildId, config = {}, trx = db) => {
  const policy = await getTwitchPremiumPolicy(guildId, { forceRefresh: true });
  if (!policy.integrationEnabled) {
    return getTwitchAutomationConfig(guildId, trx);
  }
  const guild = await ensureGuild(guildId, trx);
  const messageRule = normalizeRule(config.rules?.message || {}, {});
  let watchRule = normalizeRule(config.rules?.watch || {}, {});
  if (!policy.eventsAdvancedEnabled) {
    watchRule = { ...watchRule, enabled: false };
  }
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

  if (policy.eventsAdvancedEnabled) {
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
  }

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
  if (value === "1000" || value === "tier1" || value === "t1") return "t1";
  if (value === "2000" || value === "tier2" || value === "t2") return "t2";
  if (value === "3000" || value === "tier3" || value === "t3") return "t3";
  return null;
};

const eventRuleTierKey = (tier) => {
  const normalized = normalizeSubTier(tier);
  if (!normalized) return null;
  // Event payout rules only exist for t1/t2/t3 (Prime uses t1 amounts).
  return normalized === "prime" ? "t1" : normalized;
};

const recentTwitchAwards = new Map();
const claimTwitchAwardOnce = (key, ttlMs = 20000) => {
  const awardKey = String(key || "").trim();
  if (!awardKey) return true;
  const now = Date.now();
  if (recentTwitchAwards.size > 2000) {
    for (const [entryKey, at] of recentTwitchAwards.entries()) {
      if (now - at > ttlMs) recentTwitchAwards.delete(entryKey);
    }
  }
  const previous = recentTwitchAwards.get(awardKey);
  if (previous && now - previous < ttlMs) return false;
  recentTwitchAwards.set(awardKey, now);
  return true;
};

const getSubMultiplierForUser = async ({ guildId, twitchLogin, config }) => {
  const policy = await getTwitchPremiumPolicy(guildId);
  if (!policy.multipliersEnabled) return 1;
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
  const policy = await getTwitchPremiumPolicy(guildId);
  if (!policy.integrationEnabled || !policy.eventsAdvancedEnabled) return null;
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

export const refreshTokenIfNeeded = async (settings) => {
  const { clientId, clientSecret } = getEnv();
  if (!clientId || !clientSecret) return settings;
  const expiresAt = settings.token_expires_at ? new Date(settings.token_expires_at) : null;
  const refreshSkewMs = 30 * 60 * 1000;
  if (expiresAt && expiresAt.getTime() > Date.now() + refreshSkewMs) return settings;

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

const fetchStreamInfo = async (settings) => {
  const { clientId } = getEnv();
  if (!clientId || !settings?.twitch_broadcaster_id) {
    return { live: false, streamId: null };
  }
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
  if (!res.ok) return { live: false, streamId: null };
  const data = await res.json().catch(() => ({}));
  const stream = Array.isArray(data?.data) ? data.data[0] : null;
  if (!stream) return { live: false, streamId: null };
  return { live: true, streamId: String(stream.id || "").trim() || null };
};

const fetchLiveStatus = async (settings) => {
  const info = await fetchStreamInfo(settings);
  return Boolean(info.live);
};

const isLiveCached = async (guildId) => {
  const key = String(guildId);
  const cached = liveStatusCache.get(key);
  if (cached && Date.now() - cached.at < LIVE_TTL_MS) return cached.live;
  const settings = await getTwitchSettings(guildId);
  if (!settings) return false;
  const info = await fetchStreamInfo(settings);
  liveStatusCache.set(key, { live: info.live, streamId: info.streamId, at: Date.now() });
  return info.live;
};

const getLiveStreamInfoCached = async (guildId, { forceRefresh = false } = {}) => {
  const key = String(guildId);
  const cached = liveStatusCache.get(key);
  if (!forceRefresh && cached && Date.now() - cached.at < LIVE_TTL_MS) {
    return { live: Boolean(cached.live), streamId: cached.streamId || null };
  }
  const settings = await getTwitchSettings(guildId);
  if (!settings) {
    liveStatusCache.set(key, { live: false, streamId: null, at: Date.now() });
    return { live: false, streamId: null };
  }
  const info = await fetchStreamInfo(settings);
  liveStatusCache.set(key, { live: info.live, streamId: info.streamId, at: Date.now() });
  return info;
};

const fetchLiveStatusFresh = async (guildId, settings = null) => {
  const key = String(guildId);
  const currentSettings = settings || (await getTwitchSettings(guildId));
  if (!currentSettings) {
    liveStatusCache.set(key, { live: false, streamId: null, at: Date.now() });
    return false;
  }
  const info = await fetchStreamInfo(currentSettings);
  liveStatusCache.set(key, { live: info.live, streamId: info.streamId, at: Date.now() });
  return info.live;
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

  const user = await findLinkedDiscordUserByTwitchLogin(twitchLogin);
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

  if (gainResult?.ok) {
    await trackTwitchAchievementByDiscordUser({
      guildId,
      discordUserId: user.discord_id,
      eventKey: "economy_balance_reached",
      increment: Number(gainResult.balance || 0),
      metadata: { source: "twitch_message", currentBalance: Number(gainResult.balance || 0) }
    });
  }

  debugLog("message-award", { guildId, twitchLogin, amount, baseAmount, multiplier });

  return gainResult;
};

const awardWatchGain = async ({
  guildId,
  twitchLogin,
  trackedMinutes = 0,
  streamIsLive
}) => {
  const policy = await getTwitchPremiumPolicy(guildId);
  if (!policy.watchEnabled) return { ok: false, reason: "premium_feature_disabled" };
  const config = await getCachedConfig(guildId);
  const rule = config.rules?.watch;

  const user = await findLinkedDiscordUserByTwitchLogin(twitchLogin);
  if (!user) return { ok: false, reason: "not_linked" };

  const watchMinutes = Math.max(1, Math.floor(Number(trackedMinutes || 0)));
  const liveNow = typeof streamIsLive === "boolean" ? streamIsLive : await isLiveCached(guildId);
  if (liveNow) {
    await trackTwitchAchievementByDiscordUser({
      guildId,
      discordUserId: user.discord_id,
      eventKey: "twitch_watch_live_minutes",
      increment: watchMinutes,
      metadata: { source: "twitch_listener", event: "watch_tick" }
    });
  } else {
    debugLog("watch-achievement-skip", { guildId, twitchLogin, reason: "not_live" });
  }

  if (!rule?.enabled) return;
  if (rule.min_gain <= 0 && rule.max_gain <= 0) return;

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

  if (gainResult?.ok) {
    await trackTwitchAchievementByDiscordUser({
      guildId,
      discordUserId: user.discord_id,
      eventKey: "economy_balance_reached",
      increment: Number(gainResult.balance || 0),
      metadata: { source: "twitch_watch", currentBalance: Number(gainResult.balance || 0) }
    });
  }

  return gainResult;
};

const awardSubEvent = async ({ guildId, twitchLogin, tier, source, amount }) => {
  const policy = await getTwitchPremiumPolicy(guildId);
  if (!policy.integrationEnabled || !policy.eventsAdvancedEnabled) {
    debugLog("award-sub-blocked", { guildId, twitchLogin, reason: "premium_feature_disabled" });
    return { ok: false, reason: "premium_feature_disabled" };
  }
  if (!amount || amount <= 0) {
    debugLog("award-sub-blocked", { guildId, twitchLogin, reason: "amount_zero", source, tier });
    return { ok: false, reason: "amount_zero" };
  }
  const user = await findLinkedDiscordUserByTwitchLogin(twitchLogin);
  if (!user) {
    debugLog("award-sub-blocked", { guildId, twitchLogin, reason: "not_linked", source, tier, amount });
    return { ok: false, reason: "not_linked" };
  }
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
  if (gainResult?.ok) {
    await trackTwitchAchievementByDiscordUser({
      guildId,
      discordUserId: user.discord_id,
      eventKey: "economy_balance_reached",
      increment: Number(gainResult.balance || 0),
      metadata: { source, currentBalance: Number(gainResult.balance || 0) }
    });
  }
  debugLog("award-sub-result", {
    guildId,
    twitchLogin,
    source,
    tier,
    amount,
    ok: Boolean(gainResult?.ok),
    reason: gainResult?.reason || null
  });
  return gainResult;
};

const awardBitsEvent = async ({ guildId, twitchLogin, bits, amountPerBit }) => {
  const policy = await getTwitchPremiumPolicy(guildId);
  if (!policy.integrationEnabled || !policy.eventsAdvancedEnabled) {
    debugLog("award-bits-blocked", { guildId, twitchLogin, reason: "premium_feature_disabled" });
    return { ok: false, reason: "premium_feature_disabled" };
  }
  const bitsValue = Math.max(0, Math.floor(Number(bits || 0)));
  const perBit = Math.max(0, Number(amountPerBit || 0));
  // coins = bits × coins_per_bit (supports fractional per-bit via floor at the end)
  const amount = perBit > 0 ? Math.floor(bitsValue * perBit) : 0;
  if (bitsValue <= 0 || amount <= 0) {
    debugLog("award-bits-blocked", {
      guildId,
      twitchLogin,
      reason: "amount_zero",
      bits: bitsValue,
      amountPerBit: perBit,
      amount
    });
    return { ok: false, reason: "amount_zero" };
  }
  const user = await findLinkedDiscordUserByTwitchLogin(twitchLogin);
  if (!user) {
    debugLog("award-bits-blocked", {
      guildId,
      twitchLogin,
      reason: "not_linked",
      bits: bitsValue,
      amount
    });
    return { ok: false, reason: "not_linked" };
  }
  const gainResult = await addTwitchGain({
    guildId,
    userId: user.discord_id,
    amount,
    source: "twitch_bits",
    data: { bits: bitsValue, amount_per_bit: perBit }
  });
  if (gainResult?.ok) {
    await trackTwitchAchievementByDiscordUser({
      guildId,
      discordUserId: user.discord_id,
      eventKey: "economy_balance_reached",
      increment: Number(gainResult.balance || 0),
      metadata: { source: "twitch_bits", currentBalance: Number(gainResult.balance || 0) }
    });
  }
  debugLog("award-bits-result", {
    guildId,
    twitchLogin,
    bits: bitsValue,
    amount,
    ok: Boolean(gainResult?.ok),
    reason: gainResult?.reason || null
  });
  return gainResult;
};

export const processTwitchCheerReward = async ({
  guildId,
  twitchLogin,
  bits,
  dedupeKey = ""
} = {}) => {
  const login = String(twitchLogin || "").trim();
  const bitsValue = Math.max(0, Math.floor(Number(bits || 0)));
  if (!guildId || !login || bitsValue <= 0) {
    return { ok: false, reason: "invalid_payload" };
  }
  const transportKey = String(dedupeKey || "").trim();
  // Prefer EventSub/IRC message id for true duplicates.
  if (transportKey && !claimTwitchAwardOnce(transportKey, 120000)) {
    debugLog("award-bits-duplicate", { guildId, twitchLogin: login, bits: bitsValue, key: transportKey });
    return { ok: false, reason: "duplicate" };
  }
  // Collapse IRC + EventSub for the same cheer (different message ids, same size, few seconds apart).
  const crossKey = `bits-cross:${guildId}:${login.toLowerCase()}:${bitsValue}`;
  if (!claimTwitchAwardOnce(crossKey, 8000)) {
    debugLog("award-bits-duplicate", { guildId, twitchLogin: login, bits: bitsValue, key: crossKey });
    return { ok: false, reason: "duplicate" };
  }
  const config = await getCachedConfig(guildId);
  const amountPerBit = config.events?.bits?.enabled ? Number(config.events?.bits?.amount || 0) : 0;
  await trackTwitchAchievementByLogin({
    guildId,
    twitchLogin: login,
    eventKey: "twitch_bits_sent",
    increment: bitsValue,
    metadata: { source: "twitch_reward", event: "cheer" }
  });
  return awardBitsEvent({
    guildId,
    twitchLogin: login,
    bits: bitsValue,
    amountPerBit
  });
};

export const processTwitchSubReward = async ({
  guildId,
  twitchLogin,
  planOrTier,
  source = "twitch_sub",
  giftCount = 1,
  dedupeKey = "",
  recipientLogin = ""
} = {}) => {
  const login = String(twitchLogin || "").trim();
  const tier = normalizeSubTier(planOrTier);
  const eventTier = eventRuleTierKey(tier);
  const count = Math.max(1, Math.floor(Number(giftCount || 1)));
  if (!guildId || !login) {
    return { ok: false, reason: "invalid_payload" };
  }
  const transportKey = String(dedupeKey || "").trim();
  const semanticKey = `${source}:${guildId}:${login.toLowerCase()}:${eventTier || "none"}:${count}`;
  if (transportKey && !claimTwitchAwardOnce(transportKey, 120000)) {
    debugLog("award-sub-duplicate", { guildId, twitchLogin: login, source, tier, key: transportKey });
    return { ok: false, reason: "duplicate" };
  }
  if (!claimTwitchAwardOnce(semanticKey, 12000)) {
    debugLog("award-sub-duplicate", { guildId, twitchLogin: login, source, tier, key: semanticKey });
    return { ok: false, reason: "duplicate" };
  }

  const config = await getCachedConfig(guildId);
  const prefix = source === "twitch_subgift" ? "subgift" : "sub";
  const ruleKey = eventTier ? `${prefix}_${eventTier}` : null;
  const unitAmount = ruleKey && config.events?.[ruleKey]?.enabled
    ? Number(config.events?.[ruleKey]?.amount || 0)
    : 0;
  const amount = unitAmount * count;

  if (source === "twitch_sub") {
    await trackTwitchAchievementByLogin({
      guildId,
      twitchLogin: login,
      eventKey: "twitch_sub_count",
      increment: 1,
      metadata: { source: "twitch_reward", tier: tier || null, event: "subscription" }
    });
  } else if (source === "twitch_subgift") {
    await trackTwitchAchievementByLogin({
      guildId,
      twitchLogin: login,
      eventKey: "twitch_subgift_count",
      increment: count,
      metadata: { source: "twitch_reward", tier: tier || null, event: "subgift" }
    });
  }

  if (!tier || !eventTier) {
    debugLog("award-sub-blocked", { guildId, twitchLogin: login, reason: "invalid_tier", planOrTier });
    return { ok: false, reason: "invalid_tier" };
  }

  const recipient = String(recipientLogin || "").trim();
  if (recipient) {
    await updateSubTier({ guildId, twitchLogin: recipient, tier });
  }

  return awardSubEvent({
    guildId,
    twitchLogin: login,
    tier,
    source,
    amount
  });
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

const getPublicSiteBase = () => {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.API_BASE ||
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
    success: "Daily Twitch reçu: +{amount} {currency}{bonusText} | Streak {streak} | Balance {balance}",
    promoStopOk: "OK — tu ne recevras plus les messages promo EcoBoty sur ce live. Tu pourras toujours lier ton compte plus tard via !daily.",
    promoStopAlready: "Tu as déjà désactivé les messages promo. Tape !daily si tu changes d'avis pour lier ton compte."
  },
  en: {
    link: "To link your Discord and Twitch, connect here: {link}",
    liveOnly: "The !daily only works during the live stream.",
    alreadyWithRemaining: "Daily already claimed. Come back in {remaining}.",
    alreadyToday: "Daily already claimed today.",
    error: "Daily error.",
    success: "Twitch daily received: +{amount} {currency}{bonusText} | Streak {streak} | Balance {balance}",
    promoStopOk: "OK — you won't get EcoBoty promo messages on this channel anymore. You can still link later with !daily.",
    promoStopAlready: "Promo messages are already disabled for you. Use !daily if you change your mind and want to link."
  },
  es: {
    link: "Para vincular tu Discord y Twitch, conéctate aquí: {link}",
    liveOnly: "El !daily solo funciona durante el directo.",
    alreadyWithRemaining: "Daily ya reclamado. Vuelve en {remaining}.",
    alreadyToday: "Daily ya reclamado hoy.",
    error: "Error de daily.",
    success: "Daily de Twitch recibido: +{amount} {currency}{bonusText} | Racha {streak} | Saldo {balance}",
    promoStopOk: "OK — ya no recibirás mensajes promo de EcoBoty en este canal. Puedes vincular más tarde con !daily.",
    promoStopAlready: "Ya desactivaste los mensajes promo. Usa !daily si cambias de opinión para vincular tu cuenta."
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
  try {
    const user = await db("users")
      .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
      .first();
    if (!user) {
      const link = await buildTwitchLinkUrl(guildId, twitchLogin);
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

    await trackTwitchAchievementByDiscordUser({
      guildId,
      discordUserId: user.discord_id,
      eventKey: "daily_claims",
      increment: 1,
      metadata: {
        source: "twitch_daily",
        streak: Number(result.streak || 0),
        amount: Number(result.amount || 0),
        balance: Number(result.balance || 0)
      }
    });

    await trackTwitchAchievementByDiscordUser({
      guildId,
      discordUserId: user.discord_id,
      eventKey: "economy_balance_reached",
      increment: Number(result.balance || 0),
      metadata: { source: "twitch_daily", currentBalance: Number(result.balance || 0) }
    });

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
  } catch (error) {
    debugLog("daily-command-failed", {
      guildId,
      twitchLogin,
      message: error?.message || String(error)
    });
    await client.say(channel, tTwitch(lang, "error"));
  }
};

export const startTwitchListener = async (guildId) => {
  const guildKey = String(guildId || "");
  clearReconnectTimer(guildKey);

  const settings = await getTwitchSettings(guildKey);
  if (!settings) {
    debugLog("listener-skip", { guildId: guildKey, reason: "no_settings" });
    return;
  }

  const refreshed = await refreshTokenIfNeeded(settings);
  const previousToken = twitchClientTokens.get(guildKey);
  const tokenChanged = Boolean(previousToken && previousToken !== refreshed.access_token);

  const existingClient = twitchClients.get(guildKey);
  if (existingClient) {
    let state = "";
    try {
      state = String(existingClient.readyState?.() || "");
    } catch {
      state = "";
    }
    const isHealthy = state === "OPEN" || state === "CONNECTING";
    if (isHealthy && !tokenChanged) {
      ensureWatchInterval(guildKey);
      return;
    }
    try {
      await existingClient.disconnect();
    } catch {
      // ignore
    }
    twitchClients.delete(guildKey);
    twitchClientTokens.delete(guildKey);
  }

  const channel = String(refreshed.twitch_login || "");
  if (!channel) {
    debugLog("listener-skip", { guildId: guildKey, reason: "missing_channel" });
    return;
  }

  if (!twitchClients.has(guildKey)) {
    const client = new tmi.Client({
      options: { debug: isDebugEnabled() },
      identity: {
        username: channel,
        password: `oauth:${refreshed.access_token}`
      },
      channels: [channel]
    });

    client.on("connected", (addr, port) => {
      clearReconnectTimer(guildKey);
      debugLog("connected", { guildId: guildKey, addr, port, channel });
    });

    client.on("disconnected", (reason) => {
      debugLog("disconnected", { guildId: guildKey, reason });
      twitchClients.delete(guildKey);
      scheduleListenerReconnect(guildKey, `disconnected:${String(reason || "unknown")}`, 5000);
    });

    client.on("reconnect", () => {
      debugLog("reconnect", { guildId: guildKey });
    });

    client.on("join", (_channel, username, self) => {
      if (!self) return;
      debugLog("join", { guildId: guildKey, channel: _channel, username });
    });

    client.on("message", async (_channel, tags, message, self) => {
      try {
        if (self) return;
        // Shared Chat: only react to messages that originated in THIS channel.
        if (isForeignSharedChatMessage(tags)) {
          debugLog("message-skip-shared-chat", {
            guildId: guildKey,
            username: tags?.username,
            sourceRoomId: tags?.["source-room-id"],
            roomId: tags?.["room-id"]
          });
          return;
        }
        const username = tags?.username;
        if (!username) return;

        debugLog("message-received", { guildId: guildKey, username, message: String(message || "") });

        const trimmed = String(message || "").trim();
        const lower = trimmed.toLowerCase();
        if (lower === "!stop" || lower.startsWith("!stop ")) {
          await handleTwitchPromoStopCommand({
            guildId: guildKey,
            twitchLogin: username,
            client,
            channel: _channel
          });
          return;
        }
        if (lower.startsWith("!daily")) {
          await handleDailyCommand({ guildId: guildKey, twitchLogin: username, client, channel: _channel });
        }

        await handleTwitchPromoOnChat({
          guildId: guildKey,
          twitchLogin: username,
          displayName: tags?.["display-name"] || username,
          client,
          channel: _channel,
          tags
        });

        await maybeSetSubTierFromBadges({ guildId: guildKey, twitchLogin: username, badges: tags?.badges });
        await awardMessageGain({ guildId: guildKey, twitchLogin: username });
      } catch (error) {
        debugLog("message-handler-failed", {
          guildId: guildKey,
          channel: _channel,
          username: tags?.username || null,
          message: String(message || ""),
          error: error?.message || String(error)
        });
      }
    });

    client.on("subscription", async (_channel, username, _methods, message, userstate) => {
      try {
        const plan = userstate?.["msg-param-sub-plan"];
        const msgId = String(userstate?.id || "").trim();
        debugLog("sub-event", { guildId: guildKey, username, plan, message: String(message || "") });
        await processTwitchSubReward({
          guildId: guildKey,
          twitchLogin: username,
          planOrTier: plan,
          source: "twitch_sub",
          dedupeKey: msgId ? `irc-sub:${msgId}` : ""
        });
      } catch (error) {
        debugLog("sub-handler-failed", {
          guildId: guildKey,
          username,
          error: error?.message || String(error)
        });
      }
    });

    client.on("resub", async (_channel, username, _months, message, userstate) => {
      try {
        const plan = userstate?.["msg-param-sub-plan"];
        const msgId = String(userstate?.id || "").trim();
        debugLog("resub-event", { guildId: guildKey, username, plan, message: String(message || "") });
        await processTwitchSubReward({
          guildId: guildKey,
          twitchLogin: username,
          planOrTier: plan,
          source: "twitch_sub",
          dedupeKey: msgId ? `irc-resub:${msgId}` : ""
        });
      } catch (error) {
        debugLog("resub-handler-failed", {
          guildId: guildKey,
          username,
          error: error?.message || String(error)
        });
      }
    });

    client.on("subgift", async (_channel, username, _streakMonths, recipient, _methods, userstate) => {
      try {
        const plan = userstate?.["msg-param-sub-plan"];
        const msgId = String(userstate?.id || "").trim();
        debugLog("subgift-event", { guildId: guildKey, username, recipient, plan });
        await processTwitchSubReward({
          guildId: guildKey,
          twitchLogin: username,
          planOrTier: plan,
          source: "twitch_subgift",
          giftCount: 1,
          recipientLogin: recipient,
          dedupeKey: msgId ? `irc-subgift:${msgId}` : ""
        });
      } catch (error) {
        debugLog("subgift-handler-failed", {
          guildId: guildKey,
          username,
          recipient,
          error: error?.message || String(error)
        });
      }
    });

    client.on("submysterygift", async (_channel, username, numOfSubs, _methods, userstate) => {
      try {
        const plan = userstate?.["msg-param-sub-plan"];
        const msgId = String(userstate?.id || "").trim();
        const count = Number(numOfSubs || 0);
        debugLog("submysterygift-event", { guildId: guildKey, username, plan, count });
        await processTwitchSubReward({
          guildId: guildKey,
          twitchLogin: username,
          planOrTier: plan,
          source: "twitch_subgift",
          giftCount: count > 0 ? count : 1,
          dedupeKey: msgId ? `irc-submystery:${msgId}` : ""
        });
      } catch (error) {
        debugLog("submysterygift-handler-failed", {
          guildId: guildKey,
          username,
          error: error?.message || String(error)
        });
      }
    });

    client.on("cheer", async (_channel, userstate, message) => {
      try {
        const username = userstate?.username || userstate?.login;
        const bits = Number(userstate?.bits || 0);
        const msgId = String(userstate?.id || "").trim();
        debugLog("bits-event", {
          guildId: guildKey,
          username,
          bits,
          message: String(message || "")
        });
        if (!username || !bits) return;
        await processTwitchCheerReward({
          guildId: guildKey,
          twitchLogin: username,
          bits,
          dedupeKey: msgId ? `irc-cheer:${msgId}` : ""
        });
      } catch (error) {
        debugLog("bits-handler-failed", {
          guildId: guildKey,
          username: userstate?.username || null,
          error: error?.message || String(error)
        });
      }
    });

    try {
      await client.connect();
    } catch (error) {
      debugLog("connect-error", { guildId: guildKey, error: error?.message || String(error) });
      scheduleListenerReconnect(guildKey, "connect_error", 10000);
      return;
    }
    twitchClients.set(guildKey, client);
    twitchClientTokens.set(guildKey, refreshed.access_token);
  }

  ensureWatchInterval(guildKey);
};

const ensureWatchInterval = (guildKey) => {
  if (watchIntervals.has(guildKey)) return;
  const { watchInterval } = getEnv();
  const watchStepMinutes = Math.max(1, Math.floor(Number(watchInterval || 1)));
  const intervalMs = watchStepMinutes * 60 * 1000;
  const timer = setInterval(async () => {
    try {
      if (!twitchClients.has(guildKey)) {
        scheduleListenerReconnect(guildKey, "watch_tick_missing_client", 2000);
        return;
      }

      const current = await getTwitchSettings(guildKey);
      if (!current) return;
      const refreshed = await refreshTokenIfNeeded(current);
      const previousToken = twitchClientTokens.get(guildKey);
      if (previousToken && previousToken !== refreshed.access_token) {
        await startTwitchListener(guildKey);
        return;
      }

      const streamIsLive = await fetchLiveStatusFresh(guildKey, refreshed);
      const liveOnly = normalizeLiveOnly(refreshed.live_only);
      if (liveOnly && !streamIsLive) return;
      const chatters = await fetchChatters(refreshed);
      debugLog("watch-tick", {
        guildId: guildKey,
        streamIsLive,
        liveOnly,
        chatters: Array.isArray(chatters) ? chatters.length : 0
      });
      for (const chatter of chatters) {
        const login = chatter?.user_login;
        if (!login) continue;
        await awardWatchGain({
          guildId: guildKey,
          twitchLogin: login,
          trackedMinutes: watchStepMinutes,
          streamIsLive
        });
      }
    } catch {
      // ignore errors
    }
  }, intervalMs);
  watchIntervals.set(guildKey, timer);
};

export const stopTwitchListener = async (guildId) => {
  const guildKey = String(guildId || "");
  markManualStop(guildKey);
  clearReconnectTimer(guildKey);

  const client = twitchClients.get(guildKey);
  if (client) {
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
    twitchClients.delete(guildKey);
  }
  twitchClientTokens.delete(guildKey);
  const timer = watchIntervals.get(guildKey);
  if (timer) {
    clearInterval(timer);
    watchIntervals.delete(guildKey);
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
