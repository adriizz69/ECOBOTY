import { db } from "./db.js";
import { ensureGuild, getOrCreateBalance, getOrCreateSettings } from "./economy.js";
import { getBotSettings } from "./admin.js";

const TABLES = {
  settings: "achievement_settings",
  definitions: "achievement_definitions",
  tiers: "achievement_tiers",
  progress: "achievement_progress",
  marks: "achievement_event_marks",
  shopCooldowns: "achievement_shop_view_cooldowns"
};

export const TIER_ORDER = ["bronze", "silver", "gold", "diamond"];

export const ACHIEVEMENT_EVENTS = [
  { key: "message_count", supportsTier: true },
  { key: "server_boost", supportsTier: false },
  { key: "role_received", supportsTier: false },
  { key: "twitch_authenticated", supportsTier: false },
  { key: "twitch_sub_count", supportsTier: true },
  { key: "twitch_subgift_count", supportsTier: true },
  { key: "twitch_bits_sent", supportsTier: true },
  { key: "birthday_added", supportsTier: false },
  { key: "birthday_announced", supportsTier: false },
  { key: "voice_minutes", supportsTier: true },
  { key: "reactions_added", supportsTier: true },
  { key: "threads_created", supportsTier: true },
  { key: "threads_participated", supportsTier: true },
  { key: "economy_purchases", supportsTier: true },
  { key: "economy_sales_count", supportsTier: true },
  { key: "lootboxes_opened", supportsTier: true },
  { key: "economy_balance_reached", supportsTier: true },
  { key: "daily_claims", supportsTier: true },
  { key: "shop_views", supportsTier: true },
  { key: "twitch_watch_live_minutes", supportsTier: true },
  { key: "games_played", supportsTier: true },
  { key: "games_won", supportsTier: true }
];

export const ACHIEVEMENT_BADGE_CATALOG = {
  shapes: [
    "hexagon",
    "pentagon",
    "circle",
    "diamond",
    "square",
    "star",
    "heart",
    "octagon",
    "shield",
    "ticket"
  ],
  colors: [
    "purple",
    "blue",
    "green",
    "mint",
    "gold",
    "orange",
    "red",
    "pink",
    "cyan",
    "yellow",
    "white",
    "peach"
  ],
  icons: [
    "paw",
    "cat",
    "medal",
    "sparkle",
    "planet",
    "heart",
    "gamepad",
    "shield",
    "ghost",
    "headset",
    "shop",
    "wheel",
    "bomb",
    "graduation",
    "basketball",
    "bone",
    "bug",
    "rocket",
    "thumb",
    "chat",
    "book",
    "chef",
    "burger",
    "target",
    "dice",
    "star",
    "trophy",
    "coin",
    "fire",
    "snow",
    "crown",
    "gift",
    "spider",
    "tree",
    "drop",
    "tag"
  ]
};

export const ACHIEVEMENT_TEMPLATES = [
  {
    key: "messages_basic",
    title: "Messages",
    payload: {
      type: "tier",
      eventKey: "message_count",
      title: "Marathon des messages",
      description: "Messages envoyes sur le serveur.",
      tiers: {
        bronze: { enabled: true, threshold: 100, title: "Bronze" },
        silver: { enabled: true, threshold: 500, title: "Silver" },
        gold: { enabled: true, threshold: 1500, title: "Gold" },
        diamond: { enabled: true, threshold: 5000, title: "Diamond" }
      }
    }
  },
  {
    key: "voice_basic",
    title: "Vocal",
    payload: {
      type: "tier",
      eventKey: "voice_minutes",
      title: "Presence vocale",
      description: "Minutes passees en vocal (hors salon AFK Discord).",
      tiers: {
        bronze: { enabled: true, threshold: 60, title: "Bronze" },
        silver: { enabled: true, threshold: 240, title: "Silver" },
        gold: { enabled: true, threshold: 720, title: "Gold" },
        diamond: { enabled: true, threshold: 1800, title: "Diamond" }
      }
    }
  },
  {
    key: "daily_basic",
    title: "Daily",
    payload: {
      type: "tier",
      eventKey: "daily_claims",
      title: "Daily addict",
      description: "Reclamations daily reussies.",
      tiers: {
        bronze: { enabled: true, threshold: 7, title: "Bronze" },
        silver: { enabled: true, threshold: 30, title: "Silver" },
        gold: { enabled: true, threshold: 90, title: "Gold" },
        diamond: { enabled: true, threshold: 180, title: "Diamond" }
      }
    }
  },
  {
    key: "booster_unique",
    title: "Boost",
    payload: {
      type: "unique",
      eventKey: "server_boost",
      title: "Booster du serveur",
      description: "A booste le serveur.",
      threshold: 1,
      notifyUnlockEnabled: true
    }
  }
];

const ICON_GLYPHS = {
  paw: "🐾",
  cat: "🐱",
  medal: "🏅",
  sparkle: "✨",
  planet: "🪐",
  heart: "💖",
  gamepad: "🎮",
  shield: "🛡️",
  ghost: "👻",
  headset: "🎧",
  shop: "🏪",
  wheel: "🎡",
  bomb: "💣",
  graduation: "🎓",
  basketball: "🏀",
  bone: "🦴",
  bug: "🐞",
  rocket: "🚀",
  thumb: "👍",
  chat: "💬",
  book: "📘",
  chef: "👨‍🍳",
  burger: "🍔",
  target: "🎯",
  dice: "🎲",
  star: "⭐",
  trophy: "🏆",
  coin: "🪙",
  fire: "🔥",
  snow: "❄️",
  crown: "👑",
  gift: "🎁",
  spider: "🕷️",
  tree: "🌲",
  drop: "💧",
  tag: "🏷️"
};

const COLOR_THEME = {
  purple: { base: "#7C3AED", light: "#C4B5FD", dark: "#4C1D95", accent: "#EDE9FE" },
  blue: { base: "#2563EB", light: "#93C5FD", dark: "#1E3A8A", accent: "#DBEAFE" },
  green: { base: "#16A34A", light: "#86EFAC", dark: "#14532D", accent: "#DCFCE7" },
  mint: { base: "#10B981", light: "#6EE7B7", dark: "#065F46", accent: "#D1FAE5" },
  gold: { base: "#D97706", light: "#FCD34D", dark: "#78350F", accent: "#FEF3C7" },
  orange: { base: "#EA580C", light: "#FDBA74", dark: "#7C2D12", accent: "#FFEDD5" },
  red: { base: "#DC2626", light: "#FCA5A5", dark: "#7F1D1D", accent: "#FEE2E2" },
  pink: { base: "#DB2777", light: "#F9A8D4", dark: "#831843", accent: "#FCE7F3" },
  cyan: { base: "#0891B2", light: "#67E8F9", dark: "#164E63", accent: "#CFFAFE" },
  yellow: { base: "#CA8A04", light: "#FDE047", dark: "#713F12", accent: "#FEF9C3" },
  white: { base: "#CBD5E1", light: "#FFFFFF", dark: "#475569", accent: "#F8FAFC" },
  peach: { base: "#FB923C", light: "#FED7AA", dark: "#9A3412", accent: "#FFF7ED" }
};

const DEFAULT_SHOP_VIEW_COOLDOWN_SECONDS = 60;
const DISCORD_CUSTOM_EMOJI_PATTERN = /^<a?:(\w+):(\d+)>$/;
const UNICODE_EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
const ACHIEVEMENT_DESCRIPTION_MAX_CHARS = 220;
const ACHIEVEMENT_DESCRIPTION_MAX_LINES = 4;
const CARD_DESCRIPTION_MAX_CHARS_PER_LINE = 52;
const CARD_DESCRIPTION_MAX_LINES = 2;
const CARD_ASSET_DATA_URI_CACHE = new Map();
const CARD_TEXT_I18N = {
  fr: {
    unlocked: "SUCCES DEBLOQUE !",
    tier: "Palier",
    completion: "Palier final",
    roleWord: "role(s)",
    noReward: "Aucune recompense"
  },
  en: {
    unlocked: "ACHIEVEMENT UNLOCKED!",
    tier: "Tier",
    completion: "Completion",
    roleWord: "role(s)",
    noReward: "No reward"
  },
  es: {
    unlocked: "¡LOGRO DESBLOQUEADO!",
    tier: "Nivel",
    completion: "Nivel final",
    roleWord: "rol(es)",
    noReward: "Sin recompensa"
  }
};

const escapeXml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const wrapTextLines = (value, maxChars = 56, maxLines = 2) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (!current) {
      lines.push(`${word.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`);
      if (lines.length >= maxLines) break;
      current = "";
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
  }
  const consumedWordCount = lines
    .join(" ")
    .split(" ")
    .filter(Boolean).length;
  if (consumedWordCount < words.length && lines.length) {
    const lastIndex = lines.length - 1;
    const base = lines[lastIndex].slice(0, Math.max(0, maxChars - 1)).trimEnd();
    lines[lastIndex] = `${base}...`;
  }
  return lines.slice(0, maxLines);
};

const truncateWithEllipsis = (value, maxChars) => {
  const text = String(value || "");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
};

const sanitizeAchievementDescription = (value) => {
  const normalized = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!normalized) return "";
  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, ACHIEVEMENT_DESCRIPTION_MAX_LINES);
  return truncateWithEllipsis(lines.join("\n"), ACHIEVEMENT_DESCRIPTION_MAX_CHARS);
};

const parseCustomDiscordEmoji = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(DISCORD_CUSTOM_EMOJI_PATTERN);
  if (!match) return null;
  return {
    name: String(match[1] || ""),
    id: String(match[2] || ""),
    animated: raw.startsWith("<a:")
  };
};

const resolveImageDataUri = async (url, fallbackMime = "image/png") => {
  const key = String(url || "").trim();
  if (!key) return "";
  if (CARD_ASSET_DATA_URI_CACHE.has(key)) {
    return CARD_ASSET_DATA_URI_CACHE.get(key) || "";
  }
  try {
    const response = await fetch(key);
    if (!response.ok) {
      CARD_ASSET_DATA_URI_CACHE.set(key, "");
      return "";
    }
    const mime = String(response.headers.get("content-type") || fallbackMime)
      .split(";")[0]
      .trim() || fallbackMime;
    const buffer = await response.arrayBuffer();
    const dataUri = `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
    CARD_ASSET_DATA_URI_CACHE.set(key, dataUri);
    return dataUri;
  } catch {
    CARD_ASSET_DATA_URI_CACHE.set(key, "");
    return "";
  }
};

const toTwemojiCodepoints = (emoji) =>
  Array.from(String(emoji || ""))
    .map((char) => char.codePointAt(0))
    .filter((cp) => Number.isFinite(cp))
    .map((cp) => cp.toString(16).toLowerCase())
    .filter((hex) => hex !== "fe0f")
    .join("-");

const resolveUnicodeEmojiDataUri = async (emoji) => {
  const codepoints = toTwemojiCodepoints(emoji);
  if (!codepoints) return "";
  const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints}.png`;
  return resolveImageDataUri(url);
};

const resolveBadgeIconVisual = async (iconValue) => {
  const raw = String(iconValue || "").trim();
  const parsedCustom = parseCustomDiscordEmoji(raw);
  if (parsedCustom?.id) {
    const imageDataUri = await resolveImageDataUri(
      `https://cdn.discordapp.com/emojis/${parsedCustom.id}.png?size=96&quality=lossless`
    );
    return {
      textSymbol: parsedCustom.name || ICON_GLYPHS.trophy,
      imageDataUri
    };
  }
  const key = raw.toLowerCase();
  const glyph = ICON_GLYPHS[key] || (UNICODE_EMOJI_PATTERN.test(raw) ? raw : ICON_GLYPHS.trophy);
  return {
    textSymbol: glyph,
    imageDataUri: await resolveUnicodeEmojiDataUri(glyph)
  };
};

const resolveCardLocale = (language) => {
  const key = String(language || "fr").toLowerCase();
  if (key.startsWith("en")) return CARD_TEXT_I18N.en;
  if (key.startsWith("es")) return CARD_TEXT_I18N.es;
  return CARD_TEXT_I18N.fr;
};

const resolveCurrencyVisual = async (symbolValue) => {
  const raw = String(symbolValue || "💰").trim() || "💰";
  const parsedCustom = parseCustomDiscordEmoji(raw);
  if (!parsedCustom?.id) {
    return {
      textSymbol: raw,
      imageDataUri: ""
    };
  }
  return {
    textSymbol: parsedCustom.name || "monnaie",
    imageDataUri: await resolveImageDataUri(
      `https://cdn.discordapp.com/emojis/${parsedCustom.id}.png?size=96&quality=lossless`
    )
  };
};

const parseFixedTimeZoneOffset = (timeZone) => {
  const raw = String(timeZone || "").trim();
  if (!raw) return null;
  if (/^(utc|gmt)$/i.test(raw)) return 0;
  const match = raw.match(/^(?:utc|gmt)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  const total = hours * 60 + minutes;
  return match[1] === "-" ? -total : total;
};

const formatDateByTimeZone = (date, timeZone = "UTC", locale = "fr-FR") => {
  const fixedOffset = parseFixedTimeZoneOffset(timeZone);
  if (fixedOffset !== null) {
    const shifted = new Date(date.getTime() + fixedOffset * 60000);
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "UTC"
    }).format(shifted);
  }
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: timeZone || "UTC"
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "UTC"
    }).format(date);
  }
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(raw)) return true;
  if (["false", "0", "no", "off", ""].includes(raw)) return false;
  return Boolean(value);
};

const toInt = (value, fallback = 0, { min = null, max = null } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  let output = Math.floor(parsed);
  if (min !== null) output = Math.max(min, output);
  if (max !== null) output = Math.min(max, output);
  return output;
};

const toPositive = (value, fallback = 1) => {
  const parsed = toInt(value, fallback, { min: 1 });
  return parsed > 0 ? parsed : fallback;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isDuplicateError = (error) =>
  error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || /duplicate/i.test(String(error?.message || ""));

const parseRoleIds = (value) => {
  if (!value) return [];
  let data = value;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = String(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(data)) return [];
  return Array.from(new Set(data.map((item) => String(item || "").trim()).filter(Boolean)));
};

const normalizeRoleId = (value) => {
  const roleId = String(value || "").trim();
  return roleId || null;
};

const serializeRoleIds = (value) => JSON.stringify(parseRoleIds(value));

const getEventDefinition = (eventKey) =>
  ACHIEVEMENT_EVENTS.find((event) => event.key === String(eventKey || "").trim().toLowerCase()) || null;

const isSingleThresholdEvent = (eventKey) => {
  const key = String(eventKey || "").trim().toLowerCase();
  return (
    key === "role_received" ||
    key === "server_boost" ||
    key === "twitch_authenticated" ||
    key === "birthday_added" ||
    key === "birthday_announced"
  );
};

const getDefaultTierTitle = (tierKey) => {
  if (tierKey === "bronze") return "Bronze";
  if (tierKey === "silver") return "Silver";
  if (tierKey === "gold") return "Gold";
  if (tierKey === "diamond") return "Diamond";
  return "Tier";
};

const normalizeScopeReward = (input = {}) => ({
  addRolesEnabled: toBool(input.addRolesEnabled ?? input.reward_add_roles_enabled, false),
  addRoleIds: parseRoleIds(input.addRoleIds ?? input.reward_add_role_ids),
  removeRolesEnabled: toBool(input.removeRolesEnabled ?? input.reward_remove_roles_enabled, false),
  removeRoleIds: parseRoleIds(input.removeRoleIds ?? input.reward_remove_role_ids),
  currencyEnabled: toBool(input.currencyEnabled ?? input.reward_currency_enabled, false),
  currencyAmount: toInt(input.currencyAmount ?? input.reward_currency_amount, 0, { min: 0 })
});

const normalizeScopeNotify = (input = {}) => ({
  progressEnabled: toBool(input.progressEnabled ?? input.notify_progress_enabled, false),
  progressPercent: toInt(input.progressPercent ?? input.notify_progress_percent, 75, {
    min: 1,
    max: 99
  }),
  unlockEnabled: toBool(input.unlockEnabled ?? input.notify_unlock_enabled, true)
});

const normalizeBadge = (input = {}) => {
  const shape = String(input.shape ?? input.badge_shape ?? "hexagon").trim().toLowerCase();
  const color = String(input.color ?? input.badge_color ?? "purple").trim().toLowerCase();
  const icon = String(input.icon ?? input.badge_icon ?? "trophy").trim().toLowerCase();
  return {
    shape: ACHIEVEMENT_BADGE_CATALOG.shapes.includes(shape) ? shape : "hexagon",
    color: ACHIEVEMENT_BADGE_CATALOG.colors.includes(color) ? color : "purple",
    icon: ACHIEVEMENT_BADGE_CATALOG.icons.includes(icon) ? icon : "trophy"
  };
};

const normalizeTierConfig = (input = {}, tierKey) => {
  const badge = normalizeBadge(input.badge || input);
  const notify = normalizeScopeNotify(input.notify || input);
  const reward = normalizeScopeReward(input.reward || input);
  return {
    tierKey,
    title: String(input.title || getDefaultTierTitle(tierKey)).trim() || getDefaultTierTitle(tierKey),
    threshold: toPositive(input.threshold, 1),
    enabled: toBool(input.enabled, tierKey === "bronze"),
    badge,
    notify,
    reward
  };
};

const enforceTierDependencies = (tiers) => {
  const byKey = new Map(tiers.map((tier) => [tier.tierKey, tier]));
  const ordered = TIER_ORDER.map((key) => byKey.get(key)).filter(Boolean);
  for (let index = ordered.length - 1; index >= 1; index -= 1) {
    if (ordered[index].enabled) {
      ordered[index - 1].enabled = true;
    }
  }
  return ordered;
};

const normalizeTiers = (input = {}) => {
  const source = input && typeof input === "object" ? input : {};
  const base = TIER_ORDER.map((tierKey) => normalizeTierConfig(source[tierKey] || {}, tierKey));
  return enforceTierDependencies(base).map((tier, index) => ({
    ...tier,
    sortOrder: index + 1
  }));
};

const normalizeDefinitionInput = (input = {}) => {
  const type = String(input.type || "unique").trim().toLowerCase() === "tier" ? "tier" : "unique";
  const eventKey = String(input.eventKey ?? input.event_key ?? "").trim().toLowerCase();
  const eventDefinition = getEventDefinition(eventKey);
  if (!eventDefinition) {
    throw new Error("achievement_invalid_event");
  }
  if (type === "tier" && !eventDefinition.supportsTier) {
    throw new Error("achievement_tier_not_allowed");
  }

  const eventTargetRoleId = eventKey === "role_received"
    ? normalizeRoleId(input.eventTargetRoleId ?? input.event_target_role_id)
    : null;
  if (eventKey === "role_received" && !eventTargetRoleId) {
    throw new Error("achievement_role_required");
  }

  const badge = normalizeBadge(input.badge || input);
  const notify = normalizeScopeNotify(input.notify || input);
  const reward = normalizeScopeReward(input.reward || input);
  const completionReward = normalizeScopeReward(
    input.completionReward || {
      reward_add_roles_enabled: input.completion_reward_add_roles_enabled,
      reward_add_role_ids: input.completion_reward_add_role_ids,
      reward_remove_roles_enabled: input.completion_reward_remove_roles_enabled,
      reward_remove_role_ids: input.completion_reward_remove_role_ids,
      reward_currency_enabled: input.completion_reward_currency_enabled,
      reward_currency_amount: input.completion_reward_currency_amount
    }
  );

  return {
    type,
    eventKey,
    title: String(input.title || "").trim() || "Nouveau succes",
    description: sanitizeAchievementDescription(input.description || ""),
    enabled: toBool(input.enabled, true),
    threshold: isSingleThresholdEvent(eventKey) ? 1 : toPositive(input.threshold, 1),
    eventTargetRoleId,
    expiresAt: normalizeDate(input.expiresAt ?? input.expires_at),
    badge,
    notify,
    reward,
    completionReward,
    tiers: type === "tier" ? normalizeTiers(input.tiers || {}) : []
  };
};

const buildDefinitionRowPayload = (guildInternalId, normalized, sortOrder = 0) => ({
  guild_id: guildInternalId,
  type: normalized.type,
  event_key: normalized.eventKey,
  event_target_role_id: normalized.eventTargetRoleId,
  title: normalized.title,
  description: normalized.description || null,
  enabled: normalized.enabled,
  expires_at: normalized.expiresAt ? normalized.expiresAt : null,
  threshold: normalized.threshold,
  badge_shape: normalized.badge.shape,
  badge_color: normalized.badge.color,
  badge_icon: normalized.badge.icon,
  notify_progress_enabled: normalized.notify.progressEnabled,
  notify_progress_percent: normalized.notify.progressPercent,
  notify_unlock_enabled: normalized.notify.unlockEnabled,
  reward_add_roles_enabled: normalized.reward.addRolesEnabled,
  reward_add_role_ids: serializeRoleIds(normalized.reward.addRoleIds),
  reward_remove_roles_enabled: normalized.reward.removeRolesEnabled,
  reward_remove_role_ids: serializeRoleIds(normalized.reward.removeRoleIds),
  reward_currency_enabled: normalized.reward.currencyEnabled,
  reward_currency_amount: normalized.reward.currencyAmount,
  completion_reward_add_roles_enabled: normalized.completionReward.addRolesEnabled,
  completion_reward_add_role_ids: serializeRoleIds(normalized.completionReward.addRoleIds),
  completion_reward_remove_roles_enabled: normalized.completionReward.removeRolesEnabled,
  completion_reward_remove_role_ids: serializeRoleIds(normalized.completionReward.removeRoleIds),
  completion_reward_currency_enabled: normalized.completionReward.currencyEnabled,
  completion_reward_currency_amount: normalized.completionReward.currencyAmount,
  sort_order: sortOrder,
  updated_at: new Date()
});

const buildTierRowPayload = (achievementId, tier) => ({
  achievement_id: achievementId,
  tier_key: tier.tierKey,
  title: tier.title,
  threshold: tier.threshold,
  enabled: tier.enabled,
  badge_shape: tier.badge.shape,
  badge_color: tier.badge.color,
  badge_icon: tier.badge.icon,
  notify_progress_enabled: tier.notify.progressEnabled,
  notify_progress_percent: tier.notify.progressPercent,
  notify_unlock_enabled: tier.notify.unlockEnabled,
  reward_add_roles_enabled: tier.reward.addRolesEnabled,
  reward_add_role_ids: serializeRoleIds(tier.reward.addRoleIds),
  reward_remove_roles_enabled: tier.reward.removeRolesEnabled,
  reward_remove_role_ids: serializeRoleIds(tier.reward.removeRoleIds),
  reward_currency_enabled: tier.reward.currencyEnabled,
  reward_currency_amount: tier.reward.currencyAmount,
  sort_order: tier.sortOrder,
  updated_at: new Date()
});

const mapDefinitionRow = (row, tiers = []) => ({
  id: Number(row.id),
  type: row.type === "tier" ? "tier" : "unique",
  eventKey: String(row.event_key || ""),
  eventTargetRoleId: normalizeRoleId(row.event_target_role_id),
  title: String(row.title || ""),
  description: String(row.description || ""),
  enabled: Boolean(row.enabled),
  threshold: isSingleThresholdEvent(row.event_key) ? 1 : toPositive(row.threshold, 1),
  expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  badge: normalizeBadge(row),
  notify: normalizeScopeNotify(row),
  reward: normalizeScopeReward(row),
  completionReward: normalizeScopeReward({
    reward_add_roles_enabled: row.completion_reward_add_roles_enabled,
    reward_add_role_ids: row.completion_reward_add_role_ids,
    reward_remove_roles_enabled: row.completion_reward_remove_roles_enabled,
    reward_remove_role_ids: row.completion_reward_remove_role_ids,
    reward_currency_enabled: row.completion_reward_currency_enabled,
    reward_currency_amount: row.completion_reward_currency_amount
  }),
  sortOrder: toInt(row.sort_order, 0),
  tiers: tiers
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((tier) => ({
      id: Number(tier.id),
      tierKey: String(tier.tier_key || ""),
      title: String(tier.title || ""),
      threshold: toPositive(tier.threshold, 1),
      enabled: Boolean(tier.enabled),
      badge: normalizeBadge(tier),
      notify: normalizeScopeNotify(tier),
      reward: normalizeScopeReward(tier),
      sortOrder: toInt(tier.sort_order, 0)
    }))
});

const getGuildInternalId = async (guildId, trx = db) => {
  const guild = await ensureGuild(String(guildId), trx);
  return Number(guild.id);
};

export const getAchievementCatalogs = () => ({
  events: ACHIEVEMENT_EVENTS,
  tiers: TIER_ORDER,
  badges: ACHIEVEMENT_BADGE_CATALOG
});

export const getAchievementTemplates = () => ACHIEVEMENT_TEMPLATES;

export const getOrCreateAchievementSettings = async (guildId, trx = db) => {
  const guildInternalId = await getGuildInternalId(guildId, trx);
  const existing = await trx(TABLES.settings).where({ guild_id: guildInternalId }).first();
  if (existing) {
    return {
      enabled: Boolean(existing.enabled),
      announceChannelId: existing.announce_channel_id || "",
      webShopViewCooldownSeconds: toInt(
        existing.web_shop_view_cooldown_seconds,
        DEFAULT_SHOP_VIEW_COOLDOWN_SECONDS,
        { min: 5, max: 3600 }
      )
    };
  }
  const row = {
    guild_id: guildInternalId,
    enabled: false,
    announce_channel_id: null,
    web_shop_view_cooldown_seconds: DEFAULT_SHOP_VIEW_COOLDOWN_SECONDS,
    created_at: new Date(),
    updated_at: new Date()
  };
  await trx(TABLES.settings).insert(row);
  return {
    enabled: false,
    announceChannelId: "",
    webShopViewCooldownSeconds: DEFAULT_SHOP_VIEW_COOLDOWN_SECONDS
  };
};

export const saveAchievementSettings = async (guildId, input = {}, trx = db) => {
  const guildInternalId = await getGuildInternalId(guildId, trx);
  const payload = {
    guild_id: guildInternalId,
    enabled: toBool(input.enabled, false),
    announce_channel_id: String(input.announceChannelId ?? input.announce_channel_id ?? "").trim() || null,
    web_shop_view_cooldown_seconds: toInt(
      input.webShopViewCooldownSeconds ?? input.web_shop_view_cooldown_seconds,
      DEFAULT_SHOP_VIEW_COOLDOWN_SECONDS,
      { min: 5, max: 3600 }
    ),
    updated_at: new Date()
  };
  const existing = await trx(TABLES.settings).where({ guild_id: guildInternalId }).first();
  if (existing) {
    await trx(TABLES.settings).where({ guild_id: guildInternalId }).update(payload);
  } else {
    await trx(TABLES.settings).insert({
      ...payload,
      created_at: new Date()
    });
  }
  return {
    enabled: payload.enabled,
    announceChannelId: payload.announce_channel_id || "",
    webShopViewCooldownSeconds: payload.web_shop_view_cooldown_seconds
  };
};

const loadDefinitionsRaw = async (guildInternalId, trx = db) => {
  const definitions = await trx(TABLES.definitions)
    .where({ guild_id: guildInternalId })
    .orderBy("sort_order", "asc")
    .orderBy("id", "asc");
  const ids = definitions.map((row) => Number(row.id));
  if (!ids.length) return [];
  const tiers = await trx(TABLES.tiers).whereIn("achievement_id", ids).orderBy("sort_order", "asc");
  const tiersByDefinitionId = new Map();
  for (const tier of tiers) {
    const key = Number(tier.achievement_id);
    if (!tiersByDefinitionId.has(key)) tiersByDefinitionId.set(key, []);
    tiersByDefinitionId.get(key).push(tier);
  }
  return definitions.map((row) => mapDefinitionRow(row, tiersByDefinitionId.get(Number(row.id)) || []));
};

export const listAchievementDefinitions = async (guildId, options = {}, trx = db) => {
  const guildInternalId = await getGuildInternalId(guildId, trx);
  const includeDisabled = options.includeDisabled !== false;
  const includeExpired = options.includeExpired !== false;
  const now = new Date();
  const list = await loadDefinitionsRaw(guildInternalId, trx);
  return list.filter((item) => {
    if (!includeDisabled && !item.enabled) return false;
    if (!includeExpired && item.expiresAt && new Date(item.expiresAt) < now) return false;
    return true;
  });
};

const getNextSortOrder = async (guildInternalId, trx = db) => {
  const row = await trx(TABLES.definitions)
    .where({ guild_id: guildInternalId })
    .max({ maxValue: "sort_order" })
    .first();
  return toInt(row?.maxValue, -1) + 1;
};

const upsertTiersForDefinition = async (achievementId, tiers = [], trx = db) => {
  const existing = await trx(TABLES.tiers).where({ achievement_id: achievementId });
  const existingByKey = new Map(existing.map((row) => [String(row.tier_key), row]));
  for (const tier of tiers) {
    const payload = buildTierRowPayload(achievementId, tier);
    const previous = existingByKey.get(tier.tierKey);
    if (previous) {
      await trx(TABLES.tiers).where({ id: previous.id }).update(payload);
    } else {
      await trx(TABLES.tiers).insert({
        ...payload,
        created_at: new Date()
      });
    }
  }
};

export const createAchievement = async (guildId, input = {}) => {
  return db.transaction(async (trx) => {
    const guildInternalId = await getGuildInternalId(guildId, trx);
    const normalized = normalizeDefinitionInput(input);
    const sortOrder = await getNextSortOrder(guildInternalId, trx);
    const [achievementId] = await trx(TABLES.definitions).insert({
      ...buildDefinitionRowPayload(guildInternalId, normalized, sortOrder),
      created_at: new Date()
    });
    if (normalized.type === "tier") {
      await upsertTiersForDefinition(Number(achievementId), normalized.tiers, trx);
    }
    const rows = await loadDefinitionsRaw(guildInternalId, trx);
    return rows.find((row) => Number(row.id) === Number(achievementId)) || null;
  });
};

export const updateAchievement = async (guildId, achievementId, input = {}) => {
  return db.transaction(async (trx) => {
    const guildInternalId = await getGuildInternalId(guildId, trx);
    const existing = await trx(TABLES.definitions)
      .where({ id: Number(achievementId), guild_id: guildInternalId })
      .first();
    if (!existing) throw new Error("achievement_not_found");
    const normalized = normalizeDefinitionInput({
      ...mapDefinitionRow(existing, []),
      ...input
    });

    await trx(TABLES.definitions)
      .where({ id: Number(achievementId), guild_id: guildInternalId })
      .update({
        ...buildDefinitionRowPayload(guildInternalId, normalized, toInt(existing.sort_order, 0))
      });

    if (normalized.type === "tier") {
      await upsertTiersForDefinition(Number(achievementId), normalized.tiers, trx);
    } else {
      await trx(TABLES.tiers).where({ achievement_id: Number(achievementId) }).del();
      await trx(TABLES.progress)
        .where({ achievement_id: Number(achievementId), scope_type: "tier" })
        .del();
    }
    const rows = await loadDefinitionsRaw(guildInternalId, trx);
    return rows.find((row) => Number(row.id) === Number(achievementId)) || null;
  });
};

export const deleteAchievement = async (guildId, achievementId) => {
  return db.transaction(async (trx) => {
    const guildInternalId = await getGuildInternalId(guildId, trx);
    const deleted = await trx(TABLES.definitions)
      .where({ guild_id: guildInternalId, id: Number(achievementId) })
      .del();
    return { ok: deleted > 0 };
  });
};

export const applyAchievementTemplate = async (guildId, templateKey) => {
  const template = ACHIEVEMENT_TEMPLATES.find((row) => row.key === String(templateKey || ""));
  if (!template) throw new Error("achievement_template_not_found");
  return createAchievement(guildId, template.payload);
};

const getAchievementCompletedCounts = async ({ guildInternalId, achievements = [] }, trx = db) => {
  const map = new Map();
  const allIds = (achievements || []).map((item) => Number(item?.id || 0)).filter((id) => id > 0);
  if (!allIds.length) return map;

  const uniqueIds = achievements
    .filter((item) => String(item?.type || "") !== "tier")
    .map((item) => Number(item.id))
    .filter((id) => id > 0);
  const tierIds = achievements
    .filter((item) => String(item?.type || "") === "tier")
    .map((item) => Number(item.id))
    .filter((id) => id > 0);

  if (uniqueIds.length) {
    const rows = await trx(TABLES.progress)
      .where({ guild_id: guildInternalId, scope_type: "unique" })
      .whereNotNull("completed_at")
      .whereIn("achievement_id", uniqueIds)
      .groupBy("achievement_id")
      .countDistinct({ completed_users: "user_discord_id" })
      .select("achievement_id");
    for (const row of rows || []) {
      map.set(Number(row.achievement_id), toInt(row.completed_users, 0, { min: 0 }));
    }
  }

  if (tierIds.length) {
    const rows = await trx(TABLES.progress)
      .where({ guild_id: guildInternalId, scope_type: "completion" })
      .whereNotNull("completed_at")
      .whereIn("achievement_id", tierIds)
      .groupBy("achievement_id")
      .countDistinct({ completed_users: "user_discord_id" })
      .select("achievement_id");
    for (const row of rows || []) {
      map.set(Number(row.achievement_id), toInt(row.completed_users, 0, { min: 0 }));
    }
  }

  return map;
};

export const getAchievementConfigPayload = async (guildId) => {
  const guildInternalId = await getGuildInternalId(guildId, db);
  const [settings, achievements] = await Promise.all([
    getOrCreateAchievementSettings(guildId, db),
    listAchievementDefinitions(guildId, { includeDisabled: true, includeExpired: true }, db)
  ]);
  const completedCounts = await getAchievementCompletedCounts({ guildInternalId, achievements }, db);
  const achievementsWithStats = achievements.map((item) => ({
    ...item,
    stats: {
      ...(item.stats || {}),
      completedCount: completedCounts.get(Number(item.id)) || 0
    }
  }));
  return {
    settings,
    achievements: achievementsWithStats,
    catalogs: getAchievementCatalogs(),
    templates: getAchievementTemplates()
  };
};

const upsertProgressScope = async ({
  guildInternalId,
  achievementId,
  userId,
  scopeType,
  scopeId,
  increment,
  mode = "increment",
  threshold,
  notifyEnabled,
  notifyPercent
}) => {
  const now = new Date();
  const userKey = String(userId);
  return db.transaction(async (trx) => {
    const whereScope = {
      guild_id: guildInternalId,
      achievement_id: Number(achievementId),
      user_discord_id: userKey,
      scope_type: scopeType,
      scope_id: Number(scopeId || 0)
    };
    let row = await trx(TABLES.progress).where(whereScope).forUpdate().first();
    if (!row) {
      try {
        await trx(TABLES.progress).insert({
          ...whereScope,
          progress_count: 0,
          progress_notified: false,
          completed_at: null,
          reward_applied: false,
          unlock_notified: false,
          announced: false,
          created_at: now,
          updated_at: now
        });
      } catch (error) {
        if (!isDuplicateError(error)) throw error;
      }
      row = await trx(TABLES.progress).where(whereScope).forUpdate().first();
    }
    if (!row) throw new Error("achievement_progress_failed");

    const current = toInt(row.progress_count, 0, { min: 0 });
    const completedAt = row.completed_at ? new Date(row.completed_at) : null;
    if (completedAt) {
      return {
        rowId: Number(row.id),
        progressCount: current,
        completed: true,
        completedNow: false,
        progressNotifiedNow: false
      };
    }

    const normalizedMode = String(mode || "").trim().toLowerCase() === "set_max" ? "set_max" : "increment";
    const inc =
      normalizedMode === "set_max"
        ? Math.max(0, toInt(increment, 0, { min: 0 }))
        : Math.max(1, toInt(increment, 1, { min: 1 }));
    const next = normalizedMode === "set_max" ? Math.max(current, inc) : current + inc;
    const updates = {
      progress_count: next,
      updated_at: now
    };

    let progressNotifiedNow = false;
    const pctTarget = Math.max(1, Math.min(99, toInt(notifyPercent, 75, { min: 1, max: 99 })));
    const thresholdValue = Math.max(1, toInt(threshold, 1, { min: 1 }));
    const notifyAt = Math.ceil((thresholdValue * pctTarget) / 100);
    if (
      notifyEnabled &&
      !toBool(row.progress_notified, false) &&
      current < notifyAt &&
      next >= notifyAt &&
      next < thresholdValue
    ) {
      updates.progress_notified = true;
      progressNotifiedNow = true;
    }

    let completedNow = false;
    if (next >= thresholdValue) {
      updates.completed_at = now;
      completedNow = true;
    }

    const hasProgressCountChange = next !== current;
    const mustPersistFlags = progressNotifiedNow || completedNow;
    if (hasProgressCountChange || mustPersistFlags) {
      await trx(TABLES.progress).where({ id: row.id }).update(updates);
    }
    return {
      rowId: Number(row.id),
      progressCount: next,
      completed: completedNow,
      completedNow,
      progressNotifiedNow
    };
  });
};

const getActiveDefinitionsForEvent = async (guildInternalId, eventKey) => {
  const definitions = await loadDefinitionsRaw(guildInternalId, db);
  const now = new Date();
  return definitions.filter((definition) => {
    if (!definition.enabled) return false;
    if (String(definition.eventKey) !== String(eventKey)) return false;
    if (definition.expiresAt && new Date(definition.expiresAt) < now) return false;
    return true;
  });
};

const markEventOnce = async ({ guildInternalId, userId, markKey }) => {
  try {
    await db(TABLES.marks).insert({
      guild_id: guildInternalId,
      user_discord_id: String(userId),
      mark_key: String(markKey),
      created_at: new Date()
    });
    return true;
  } catch (error) {
    if (isDuplicateError(error)) return false;
    throw error;
  }
};

const checkShopViewCooldown = async ({
  guildInternalId,
  userId,
  source,
  cooldownSeconds
}) => {
  const now = new Date();
  const normalizedSource = source === "discord" ? "discord" : "web";
  const whereScope = {
    guild_id: guildInternalId,
    user_discord_id: String(userId),
    source: "web"
  };
  const existing = await db(TABLES.shopCooldowns).where(whereScope).first();
  const cooldownMs = Math.max(1000, toInt(cooldownSeconds, DEFAULT_SHOP_VIEW_COOLDOWN_SECONDS, { min: 1 })) * 1000;
  if (existing?.last_counted_at) {
    const last = new Date(existing.last_counted_at);
    if (!Number.isNaN(last.getTime()) && now.getTime() - last.getTime() < cooldownMs) {
      return false;
    }
  }
  if (existing) {
    await db(TABLES.shopCooldowns).where({ id: existing.id }).update({
      last_counted_at: now,
      updated_at: now
    });
  } else {
    await db(TABLES.shopCooldowns).insert({
      ...whereScope,
      last_counted_at: now,
      created_at: now,
      updated_at: now
    });
  }
  if (normalizedSource !== "web") {
    await db(TABLES.shopCooldowns)
      .where({
        guild_id: guildInternalId,
        user_discord_id: String(userId),
        source: normalizedSource
      })
      .del();
  }
  return true;
};

const getDiscordHeaders = () => {
  const token = String(process.env.DISCORD_BOT_TOKEN || "").trim();
  if (!token) return null;
  return { Authorization: `Bot ${token}` };
};

const sendDiscordMessage = async ({ channelId, content = "", file = null }) => {
  const headers = getDiscordHeaders();
  if (!headers || !channelId) return { ok: false, reason: "missing_bot_token_or_channel" };
  const url = `https://discord.com/api/channels/${channelId}/messages`;
  if (file && file.buffer) {
    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({
        content: String(content || "").trim()
      })
    );
    const type = file.mime || "image/png";
    const filename = file.filename || "achievement-card.png";
    form.append("files[0]", new Blob([file.buffer], { type }), filename);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: form
    });
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      return { ok: false, reason: "discord_send_failed", status: response.status, details };
    }
    return { ok: true };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ content: String(content || "").trim() })
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return { ok: false, reason: "discord_send_failed", status: response.status, details };
  }
  return { ok: true };
};

const createDmChannel = async (userId) => {
  const headers = getDiscordHeaders();
  if (!headers) return null;
  const response = await fetch("https://discord.com/api/users/@me/channels", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ recipient_id: String(userId) })
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.id ? String(data.id) : null;
};

const setProgressFlags = async (progressId, updates = {}) => {
  if (!progressId || !Object.keys(updates).length) return;
  await db(TABLES.progress).where({ id: Number(progressId) }).update({
    ...updates,
    updated_at: new Date()
  });
};

const applyCurrencyReward = async ({ guildId, userId, amount }) => {
  const gain = toInt(amount, 0, { min: 0 });
  if (gain <= 0) return { ok: true, applied: 0 };
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(String(guildId), trx);
    const settings = await getOrCreateSettings(String(guildId), trx);
    const balance = await getOrCreateBalance(String(guildId), String(userId), settings.start_balance || 0, trx);
    const maxBalance = toInt(settings.max_balance, 0, { min: 0 });
    const nextBalance = maxBalance > 0 ? Math.min(Number(balance.balance || 0) + gain, maxBalance) : Number(balance.balance || 0) + gain;
    const applied = Math.max(0, nextBalance - Number(balance.balance || 0));
    if (applied <= 0) return { ok: true, applied: 0 };
    await trx("balances")
      .where({ guild_id: Number(guild.id), user_discord_id: String(userId) })
      .update({ balance: nextBalance });
    await trx("economy_gain_logs").insert({
      guild_id: Number(guild.id),
      user_discord_id: String(userId),
      source: "achievement",
      base_amount: applied,
      multiplier: 1,
      bonus_amount: 0,
      total_amount: applied,
      data: null,
      created_at: new Date()
    });
    return { ok: true, applied };
  });
};

const assignDiscordRole = async ({ guildId, userId, roleId }) => {
  const headers = getDiscordHeaders();
  if (!headers) return { ok: false, reason: "missing_bot_token" };
  const response = await fetch(
    `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "PUT",
      headers
    }
  );
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return { ok: false, reason: "role_add_failed", status: response.status, details };
  }
  return { ok: true };
};

const removeDiscordRole = async ({ guildId, userId, roleId }) => {
  const headers = getDiscordHeaders();
  if (!headers) return { ok: false, reason: "missing_bot_token" };
  const response = await fetch(
    `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers
    }
  );
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return { ok: false, reason: "role_remove_failed", status: response.status, details };
  }
  return { ok: true };
};

const applyRewardConfig = async ({ guildId, userId, reward = {} }) => {
  const summary = {
    addedRoles: [],
    removedRoles: [],
    currency: 0,
    roleErrors: []
  };
  const addRoleIds = reward.addRolesEnabled ? parseRoleIds(reward.addRoleIds) : [];
  const removeRoleIds = reward.removeRolesEnabled ? parseRoleIds(reward.removeRoleIds) : [];

  for (const roleId of addRoleIds) {
    try {
      const result = await assignDiscordRole({ guildId, userId, roleId });
      if (result.ok) summary.addedRoles.push(roleId);
      else summary.roleErrors.push({ roleId, action: "add", reason: result.reason });
    } catch {
      summary.roleErrors.push({ roleId, action: "add", reason: "role_add_failed" });
    }
  }
  for (const roleId of removeRoleIds) {
    try {
      const result = await removeDiscordRole({ guildId, userId, roleId });
      if (result.ok) summary.removedRoles.push(roleId);
      else summary.roleErrors.push({ roleId, action: "remove", reason: result.reason });
    } catch {
      summary.roleErrors.push({ roleId, action: "remove", reason: "role_remove_failed" });
    }
  }
  if (reward.currencyEnabled && toInt(reward.currencyAmount, 0, { min: 0 }) > 0) {
    try {
      const money = await applyCurrencyReward({
        guildId,
        userId,
        amount: reward.currencyAmount
      });
      summary.currency = toInt(money?.applied, 0, { min: 0 });
    } catch {
      summary.currency = 0;
    }
  }
  return summary;
};

const getTierLabel = (tierKey) => getDefaultTierTitle(String(tierKey || "").toLowerCase());

const rewardSummaryText = (rewardSummary = {}, options = {}) => {
  const localeTexts = options?.localeTexts || CARD_TEXT_I18N.fr;
  const currencyToken = String(options?.currencyToken || "💰").trim() || "💰";
  const showCurrencyToken = options?.showCurrencyToken !== false;
  const parts = [];
  if (toInt(rewardSummary.currency, 0, { min: 0 }) > 0) {
    const currencyPart = showCurrencyToken ? `+${rewardSummary.currency} ${currencyToken}` : `+${rewardSummary.currency}`;
    parts.push(currencyPart.trim());
  }
  if (Array.isArray(rewardSummary.addedRoles) && rewardSummary.addedRoles.length) {
    parts.push(`+${rewardSummary.addedRoles.length} ${localeTexts.roleWord}`);
  }
  if (Array.isArray(rewardSummary.removedRoles) && rewardSummary.removedRoles.length) {
    parts.push(`-${rewardSummary.removedRoles.length} ${localeTexts.roleWord}`);
  }
  return parts.join(" • ") || localeTexts.noReward;
};

const buildRewardPreview = (reward = {}) => {
  const normalized = normalizeScopeReward(reward);
  const addRoleIds = normalized.addRolesEnabled ? parseRoleIds(normalized.addRoleIds) : [];
  const removeRoleIds = normalized.removeRolesEnabled ? parseRoleIds(normalized.removeRoleIds) : [];
  const currencyAmount = normalized.currencyEnabled ? toInt(normalized.currencyAmount, 0, { min: 0 }) : 0;

  const parts = [];
  if (currencyAmount > 0) parts.push(`+${currencyAmount} monnaie`);
  if (addRoleIds.length) parts.push(`+${addRoleIds.length} role(s)`);
  if (removeRoleIds.length) parts.push(`-${removeRoleIds.length} role(s)`);

  return {
    hasReward: parts.length > 0,
    text: parts.length ? parts.join(" • ") : "Aucune recompense configuree",
    currencyAmount,
    addRoleIds,
    removeRoleIds
  };
};

const shapePath = (shape, cx, cy, r) => {
  const ring = (points) => points.map((pt) => `${pt[0]},${pt[1]}`).join(" ");
  if (shape === "circle") return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
  if (shape === "square") return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.2}" />`;
  if (shape === "diamond") {
    const points = [
      [cx, cy - r],
      [cx + r, cy],
      [cx, cy + r],
      [cx - r, cy]
    ];
    return `<polygon points="${ring(points)}" />`;
  }
  if (shape === "pentagon") {
    const points = Array.from({ length: 5 }).map((_, index) => {
      const angle = (-90 + index * 72) * (Math.PI / 180);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
    return `<polygon points="${ring(points)}" />`;
  }
  if (shape === "star") {
    const points = [];
    for (let i = 0; i < 10; i += 1) {
      const angle = (-90 + i * 36) * (Math.PI / 180);
      const radius = i % 2 === 0 ? r : r * 0.45;
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
    return `<polygon points="${ring(points)}" />`;
  }
  if (shape === "heart") {
    const bottomY = cy + r * 0.9;
    const topY = cy - r * 0.28;
    return `<path d="M ${cx} ${bottomY}
      C ${cx - r * 0.95} ${cy + r * 0.35}, ${cx - r * 0.98} ${cy - r * 0.15}, ${cx - r * 0.48} ${topY}
      C ${cx - r * 0.22} ${cy - r * 0.5}, ${cx + r * 0.22} ${cy - r * 0.5}, ${cx + r * 0.48} ${topY}
      C ${cx + r * 0.98} ${cy - r * 0.15}, ${cx + r * 0.95} ${cy + r * 0.35}, ${cx} ${bottomY} Z" />`;
  }
  if (shape === "octagon") {
    const points = Array.from({ length: 8 }).map((_, index) => {
      const angle = (-90 + index * 45) * (Math.PI / 180);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
    return `<polygon points="${ring(points)}" />`;
  }
  if (shape === "shield") {
    return `<path d="M ${cx} ${cy - r}
      L ${cx + r * 0.78} ${cy - r * 0.4}
      L ${cx + r * 0.62} ${cy + r * 0.62}
      L ${cx} ${cy + r}
      L ${cx - r * 0.62} ${cy + r * 0.62}
      L ${cx - r * 0.78} ${cy - r * 0.4}
      Z" />`;
  }
  if (shape === "ticket") {
    return `<path d="M ${cx - r} ${cy - r * 0.55}
      L ${cx + r} ${cy - r * 0.55}
      Q ${cx + r * 0.86} ${cy - r * 0.2} ${cx + r} ${cy}
      Q ${cx + r * 0.86} ${cy + r * 0.2} ${cx + r} ${cy + r * 0.55}
      L ${cx - r} ${cy + r * 0.55}
      Q ${cx - r * 0.86} ${cy + r * 0.2} ${cx - r} ${cy}
      Q ${cx - r * 0.86} ${cy - r * 0.2} ${cx - r} ${cy - r * 0.55}
      Z" />`;
  }
  const points = Array.from({ length: 6 }).map((_, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  return `<polygon points="${points.map((pt) => `${pt[0]},${pt[1]}`).join(" ")}" />`;
};

const buildAchievementCardSvg = ({
  kickerText,
  title,
  subtitle,
  tierLabel,
  rewardText,
  dateLabel,
  badge,
  badgeIconText = "",
  badgeIconDataUri = "",
  currencyIconDataUri = "",
  hasCurrencyReward = false
}) => {
  const theme = COLOR_THEME[badge.color] || COLOR_THEME.purple;
  const icon = String(badgeIconText || ICON_GLYPHS[badge.icon] || ICON_GLYPHS.trophy);
  const safeKicker = escapeXml(kickerText || CARD_TEXT_I18N.en.unlocked);
  const safeTitle = escapeXml(title || "Achievement unlocked");
  const safeTier = escapeXml(tierLabel || "");
  const safeReward = escapeXml(rewardText || "");
  const safeDate = escapeXml(dateLabel || "");
  const subtitleLines = wrapTextLines(subtitle, CARD_DESCRIPTION_MAX_CHARS_PER_LINE, CARD_DESCRIPTION_MAX_LINES);
  const subtitleOffset = Math.max(0, subtitleLines.length - 1) * 24;
  const tierY = 238 + subtitleOffset;
  const rewardY = 282 + subtitleOffset;
  const dateY = 322 + subtitleOffset;
  const showCurrencyIcon = Boolean(hasCurrencyReward && currencyIconDataUri);
  const rewardTextX = showCurrencyIcon ? 264 : 220;
  const badgeIconSvg = badgeIconDataUri
    ? `<image x="-38" y="-38" width="76" height="76" href="${escapeXml(badgeIconDataUri)}" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="0" y="20" text-anchor="middle" font-size="54" font-family="Segoe UI Emoji, Arial" fill="${theme.accent}">${escapeXml(icon)}</text>`;
  const rewardIconSvg = showCurrencyIcon
    ? `<image x="220" y="${rewardY - 27}" width="32" height="32" href="${escapeXml(currencyIconDataUri)}" />`
    : "";
  const subtitleSvg = subtitleLines.length
    ? `<text x="220" y="190" fill="#94A3B8" font-size="30" font-family="Inter, Arial">${subtitleLines
        .map((line, index) => `<tspan x="220" dy="${index === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
        .join("")}</text>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="line" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.base}" />
      <stop offset="100%" stop-color="${theme.light}" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="1196" height="356" rx="22" fill="url(#bg)" stroke="url(#line)" stroke-width="4"/>
  <circle cx="1080" cy="280" r="220" fill="${theme.base}" opacity="0.08"/>
  <circle cx="1030" cy="70" r="150" fill="${theme.light}" opacity="0.08"/>

  <g transform="translate(110, 180)">
    <g fill="${theme.base}" stroke="${theme.light}" stroke-width="8">
      ${shapePath(badge.shape, 0, 0, 72)}
    </g>
    ${badgeIconSvg}
  </g>

  <text x="220" y="86" fill="${theme.base}" font-size="40" font-weight="700" font-family="Inter, Arial">${safeKicker}</text>
  <text x="220" y="144" fill="#F8FAFC" font-size="54" font-weight="800" font-family="Inter, Arial">${safeTitle}</text>
  ${subtitleSvg}
  <text x="220" y="${tierY}" fill="${theme.light}" font-size="28" font-family="Inter, Arial">${safeTier}</text>
  ${rewardIconSvg}
  <text x="${rewardTextX}" y="${rewardY}" fill="#E2E8F0" font-size="26" font-family="Inter, Arial">${safeReward}</text>
  <text x="220" y="${dateY}" fill="#64748B" font-size="22" font-family="Inter, Arial">${safeDate}</text>
</svg>`;
};

const renderCardFile = async (payload) => {
  const svg = buildAchievementCardSvg(payload);
  const resvg = await import("@resvg/resvg-js").catch(() => null);
  if (typeof resvg?.Resvg !== "function") {
    throw new Error("achievement_card_renderer_unavailable");
  }
  const renderer = new resvg.Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200
    }
  });
  const png = renderer.render();
  return {
    buffer: Buffer.from(png.asPng()),
    mime: "image/png",
    filename: "achievement-card.png"
  };
};

const sendProgressDm = async ({ userId, title, percent }) => {
  const dmChannelId = await createDmChannel(userId);
  if (!dmChannelId) return false;
  const content = `🎯 Progression succes: **${title}** (${percent}%)`;
  const result = await sendDiscordMessage({ channelId: dmChannelId, content });
  return Boolean(result.ok);
};

const sendUnlockNotifications = async ({
  guildId,
  userId,
  kickerText,
  title,
  subtitle,
  tierLabel,
  rewardText,
  dateLabel,
  badge,
  announceChannelId,
  notifyDm,
  currencyIconDataUri = "",
  hasCurrencyReward = false
}) => {
  let file = null;
  try {
    const badgeIconVisual = await resolveBadgeIconVisual(badge?.icon);
    file = await renderCardFile({
      kickerText,
      title,
      subtitle,
      tierLabel,
      rewardText,
      dateLabel,
      badge,
      badgeIconText: badgeIconVisual.textSymbol,
      badgeIconDataUri: badgeIconVisual.imageDataUri,
      currencyIconDataUri,
      hasCurrencyReward
    });
  } catch (error) {
    console.error("Achievement card render failed", error);
    return { dmOk: false, announceOk: false };
  }
  let dmOk = false;
  let announceOk = false;
  if (notifyDm) {
    const dmChannelId = await createDmChannel(userId);
    if (dmChannelId) {
      const dmResult = await sendDiscordMessage({
        channelId: dmChannelId,
        content: "",
        file
      });
      dmOk = Boolean(dmResult.ok);
    }
  }
  if (announceChannelId) {
    const content = `Bravo <@${userId}> tu as obtenu le succes **${title}**`;
    const channelResult = await sendDiscordMessage({
      channelId: announceChannelId,
      content,
      file
    });
    announceOk = Boolean(channelResult.ok);
  }
  return { dmOk, announceOk };
};

const getProgressThresholdPercent = (progressCount, threshold) => {
  const target = Math.max(1, toInt(threshold, 1, { min: 1 }));
  const count = Math.max(0, toInt(progressCount, 0, { min: 0 }));
  return Math.max(0, Math.min(100, Math.floor((count / target) * 100)));
};

const buildScopeKey = (scopeType, scopeId) => `${scopeType}:${scopeId}`;

const getProgressRowsForUser = async ({ guildInternalId, userId, achievementIds }) => {
  if (!achievementIds.length) return [];
  return db(TABLES.progress)
    .where({
      guild_id: guildInternalId,
      user_discord_id: String(userId)
    })
    .whereIn("achievement_id", achievementIds);
};

const getScopeProgressMap = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.achievement_id}:${buildScopeKey(row.scope_type, row.scope_id)}`;
    map.set(key, row);
  }
  return map;
};

const shouldProcessEvent = async ({
  guildInternalId,
  userId,
  eventKey,
  metadata,
  settings
}) => {
  if (eventKey === "threads_participated") {
    const threadId = String(metadata?.threadId || metadata?.thread_id || "").trim();
    if (!threadId) return false;
    return markEventOnce({
      guildInternalId,
      userId,
      markKey: `threads_participated:${threadId}`
    });
  }
  if (eventKey === "shop_views") {
    const source = String(metadata?.source || "web").toLowerCase() === "discord" ? "discord" : "web";
    return checkShopViewCooldown({
      guildInternalId,
      userId,
      source,
      cooldownSeconds: settings.webShopViewCooldownSeconds
    });
  }
  return true;
};

const collectActiveTierRows = (definition) =>
  (definition.tiers || [])
    .filter((tier) => tier.enabled)
    .sort((a, b) => toInt(a.sortOrder, 0) - toInt(b.sortOrder, 0));

const isExpired = (definition) =>
  definition.expiresAt ? new Date(definition.expiresAt).getTime() < Date.now() : false;

const ensureCompletionProgress = async ({ guildInternalId, achievementId, userId }) => {
  const rows = await db(TABLES.progress).where({
    guild_id: guildInternalId,
    achievement_id: Number(achievementId),
    user_discord_id: String(userId),
    scope_type: "completion",
    scope_id: 0
  });
  return rows[0] || null;
};

const areAllEnabledTiersCompleted = async ({ guildInternalId, achievementId, userId, tierIds }) => {
  if (!tierIds.length) return false;
  const rows = await db(TABLES.progress)
    .where({
      guild_id: guildInternalId,
      achievement_id: Number(achievementId),
      user_discord_id: String(userId),
      scope_type: "tier"
    })
    .whereIn("scope_id", tierIds);
  const completed = new Set(
    rows.filter((row) => row.completed_at).map((row) => Number(row.scope_id))
  );
  return tierIds.every((tierId) => completed.has(Number(tierId)));
};

export const recordAchievementEvent = async ({
  guildId,
  userId,
  eventKey,
  increment = 1,
  metadata = {},
  force = false
}) => {
  const normalizedEventKey = String(eventKey || "").trim().toLowerCase();
  const userKey = String(userId || "").trim();
  if (!userKey || !normalizedEventKey) {
    return { ok: false, error: "missing_params" };
  }
  const eventDefinition = getEventDefinition(normalizedEventKey);
  if (!eventDefinition) {
    return { ok: false, error: "invalid_event" };
  }
  const guildInternalId = await getGuildInternalId(guildId, db);
  const settings = await getOrCreateAchievementSettings(guildId, db);
  if (!settings.enabled && !force) {
    return { ok: true, skipped: "module_disabled", processed: 0 };
  }
  const shouldProcess = await shouldProcessEvent({
    guildInternalId,
    userId: userKey,
    eventKey: normalizedEventKey,
    metadata,
    settings
  });
  if (!shouldProcess) {
    return { ok: true, skipped: "event_deduped", processed: 0 };
  }

  const roleIdsFromEvent = parseRoleIds(metadata?.roleIds ?? metadata?.role_ids);
  const definitions = (await getActiveDefinitionsForEvent(guildInternalId, normalizedEventKey)).filter((definition) => {
    if (normalizedEventKey !== "role_received") return true;
    const targetRoleId = normalizeRoleId(definition.eventTargetRoleId);
    if (!targetRoleId) return true;
    return roleIdsFromEvent.includes(targetRoleId);
  });
  if (!definitions.length) {
    return { ok: true, processed: 0, unlocked: 0 };
  }

  const now = new Date();
  const isBalanceEvent = normalizedEventKey === "economy_balance_reached";
  const incrementValue = isSingleThresholdEvent(normalizedEventKey)
    ? 1
    : isBalanceEvent
    ? Math.max(0, toInt(metadata?.currentBalance ?? metadata?.balance ?? increment, 0, { min: 0 }))
    : Math.max(1, toInt(increment, 1, { min: 1 }));
  const progressMode = isBalanceEvent ? "set_max" : "increment";
  const unlockedActions = [];
  const progressActions = [];
  let botTimeZone = "UTC";
  let botLanguage = "fr";
  let botLocale = "fr-FR";
  try {
    const botSettings = await getBotSettings(String(guildId));
    botTimeZone = String(botSettings?.timezone || "UTC");
    botLanguage = String(botSettings?.bot_language || "fr").toLowerCase();
    if (botLanguage === "en") botLocale = "en-US";
    if (botLanguage === "es") botLocale = "es-ES";
  } catch {
    botTimeZone = "UTC";
    botLanguage = "fr";
    botLocale = "fr-FR";
  }
  const cardLocale = resolveCardLocale(botLanguage);
  let currencyVisual = { textSymbol: "💰", imageDataUri: "" };
  try {
    const economySettings = await getOrCreateSettings(String(guildId), db);
    currencyVisual = await resolveCurrencyVisual(economySettings?.emoji_symbol || "💰");
  } catch {
    currencyVisual = { textSymbol: "💰", imageDataUri: "" };
  }

  for (const definition of definitions) {
    if (isExpired(definition)) continue;
    if (definition.type === "unique") {
      const progress = await upsertProgressScope({
        guildInternalId,
        achievementId: definition.id,
        userId: userKey,
        scopeType: "unique",
        scopeId: 0,
        increment: incrementValue,
        mode: progressMode,
        threshold: definition.threshold,
        notifyEnabled: definition.notify.progressEnabled,
        notifyPercent: definition.notify.progressPercent
      });
      if (progress.progressNotifiedNow) {
        progressActions.push({
          title: definition.title,
          percent: definition.notify.progressPercent
        });
      }
      if (progress.completedNow) {
        unlockedActions.push({
          progressId: progress.rowId,
          definition,
          tier: null,
          reward: definition.reward
        });
      }
      continue;
    }

    const activeTiers = collectActiveTierRows(definition);
    if (!activeTiers.length) continue;
    let hasNewTierCompletion = false;
    for (const tier of activeTiers) {
      const progress = await upsertProgressScope({
        guildInternalId,
        achievementId: definition.id,
        userId: userKey,
        scopeType: "tier",
        scopeId: tier.id,
        increment: incrementValue,
        mode: progressMode,
        threshold: tier.threshold,
        notifyEnabled: tier.notify.progressEnabled,
        notifyPercent: tier.notify.progressPercent
      });
      if (progress.progressNotifiedNow) {
        progressActions.push({
          title: `${definition.title} (${tier.title || getTierLabel(tier.tierKey)})`,
          percent: tier.notify.progressPercent
        });
      }
      if (progress.completedNow) {
        hasNewTierCompletion = true;
        unlockedActions.push({
          progressId: progress.rowId,
          definition,
          tier,
          reward: tier.reward
        });
      }
    }
    if (!hasNewTierCompletion) continue;

    const allCompleted = await areAllEnabledTiersCompleted({
      guildInternalId,
      achievementId: definition.id,
      userId: userKey,
      tierIds: activeTiers.map((tier) => Number(tier.id))
    });
    if (!allCompleted) continue;
    const completion = await upsertProgressScope({
      guildInternalId,
      achievementId: definition.id,
      userId: userKey,
      scopeType: "completion",
      scopeId: 0,
      increment: 1,
      threshold: 1,
      notifyEnabled: false,
      notifyPercent: 100
    });
    if (completion.completedNow) {
      unlockedActions.push({
        progressId: completion.rowId,
        definition,
        tier: { tierKey: "diamond", title: "Completion", badge: definition.badge, notify: definition.notify },
        reward: definition.completionReward,
        completion: true
      });
    }
  }

  for (const action of progressActions) {
    try {
      await sendProgressDm({
        userId: userKey,
        title: action.title,
        percent: action.percent
      });
    } catch {
      // ignore DM failures
    }
  }

  const unlocked = [];
  for (const action of unlockedActions) {
    const rewardResult = await applyRewardConfig({
      guildId,
      userId: userKey,
      reward: action.reward
    });
    await setProgressFlags(action.progressId, { reward_applied: true });
    const hasCurrencyReward = toInt(rewardResult.currency, 0, { min: 0 }) > 0;
    const tierLabel = action.completion
      ? cardLocale.completion
      : action.tier?.title || (action.tier?.tierKey ? getTierLabel(action.tier?.tierKey) : cardLocale.tier);
    const notifications = await sendUnlockNotifications({
      guildId,
      userId: userKey,
      kickerText: cardLocale.unlocked,
      title: action.definition.title,
      subtitle: action.definition.description || "",
      tierLabel,
      rewardText: rewardSummaryText(rewardResult, {
        localeTexts: cardLocale,
        currencyToken: currencyVisual.textSymbol,
        showCurrencyToken: !(hasCurrencyReward && currencyVisual.imageDataUri)
      }),
      dateLabel: formatDateByTimeZone(now, botTimeZone, botLocale),
      badge: action.tier?.badge || action.definition.badge,
      announceChannelId: settings.announceChannelId,
      notifyDm: action.tier?.notify?.unlockEnabled ?? action.definition.notify.unlockEnabled,
      currencyIconDataUri: hasCurrencyReward ? currencyVisual.imageDataUri : "",
      hasCurrencyReward
    });
    await setProgressFlags(action.progressId, {
      unlock_notified: notifications.dmOk,
      announced: notifications.announceOk
    });
    unlocked.push({
      achievementId: action.definition.id,
      title: action.definition.title,
      tier: tierLabel,
      reward: rewardResult
    });
  }

  return {
    ok: true,
    processed: definitions.length,
    unlocked: unlocked.length,
    unlockedItems: unlocked
  };
};

export const getUserAchievements = async ({ guildId, userId }) => {
  const guildInternalId = await getGuildInternalId(guildId, db);
  const settings = await getOrCreateAchievementSettings(guildId, db);
  if (!settings.enabled) {
    return {
      enabled: false,
      settings,
      achievements: []
    };
  }
  const definitions = await listAchievementDefinitions(
    guildId,
    { includeDisabled: false, includeExpired: true },
    db
  );
  if (!definitions.length) {
    return {
      enabled: true,
      settings,
      achievements: []
    };
  }

  const progressRows = await getProgressRowsForUser({
    guildInternalId,
    userId: String(userId),
    achievementIds: definitions.map((item) => Number(item.id))
  });
  const progressMap = getScopeProgressMap(progressRows);

  const achievements = definitions.map((definition) => {
    const expired = isExpired(definition);
    if (definition.type === "unique") {
      const row = progressMap.get(`${definition.id}:${buildScopeKey("unique", 0)}`);
      const progressCount = toInt(row?.progress_count, 0, { min: 0 });
      const percent = getProgressThresholdPercent(progressCount, definition.threshold);
      const completed = Boolean(row?.completed_at);
      return {
        id: definition.id,
        type: definition.type,
        title: definition.title,
        description: definition.description,
        eventKey: definition.eventKey,
        badge: definition.badge,
        rewardPreview: buildRewardPreview(definition.reward),
        expiresAt: definition.expiresAt,
        expired,
        progress: {
          current: progressCount,
          target: definition.threshold,
          percent,
          completed,
          completedAt: row?.completed_at ? new Date(row.completed_at).toISOString() : null
        },
        status: completed ? "completed" : expired ? "expired" : percent > 0 ? "in_progress" : "not_started"
      };
    }

    const tiers = collectActiveTierRows(definition).map((tier) => {
      const row = progressMap.get(`${definition.id}:${buildScopeKey("tier", tier.id)}`);
      const progressCount = toInt(row?.progress_count, 0, { min: 0 });
      const percent = getProgressThresholdPercent(progressCount, tier.threshold);
      const completed = Boolean(row?.completed_at);
      return {
        id: tier.id,
        tierKey: tier.tierKey,
        title: tier.title || getTierLabel(tier.tierKey),
        badge: tier.badge,
        rewardPreview: buildRewardPreview(tier.reward),
        target: tier.threshold,
        current: progressCount,
        percent,
        completed,
        completedAt: row?.completed_at ? new Date(row.completed_at).toISOString() : null
      };
    });
    const completionRow = progressMap.get(`${definition.id}:${buildScopeKey("completion", 0)}`);
    const completed = Boolean(completionRow?.completed_at);
    const averagePercent = tiers.length
      ? Math.floor(tiers.reduce((sum, tier) => sum + tier.percent, 0) / tiers.length)
      : 0;
    return {
      id: definition.id,
      type: definition.type,
      title: definition.title,
      description: definition.description,
      eventKey: definition.eventKey,
      badge: definition.badge,
      completionRewardPreview: buildRewardPreview(definition.completionReward),
      expiresAt: definition.expiresAt,
      expired,
      tiers,
      completion: {
        completed,
        completedAt: completionRow?.completed_at ? new Date(completionRow.completed_at).toISOString() : null
      },
      progress: {
        percent: averagePercent,
        completed
      },
      status: completed ? "completed" : expired ? "expired" : averagePercent > 0 ? "in_progress" : "not_started"
    };
  });

  return {
    enabled: true,
    settings,
    achievements
  };
};

export const getUserAchievementsPage = async ({
  guildId,
  userId,
  page = 1,
  limit = 8
}) => {
  const data = await getUserAchievements({ guildId, userId });
  const all = Array.isArray(data.achievements) ? data.achievements : [];
  const perPage = Math.max(1, Math.min(20, toInt(limit, 8, { min: 1, max: 20 })));
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const currentPage = Math.max(1, Math.min(totalPages, toInt(page, 1, { min: 1 })));
  const start = (currentPage - 1) * perPage;
  return {
    ...data,
    page: currentPage,
    limit: perPage,
    total: all.length,
    totalPages,
    achievements: all.slice(start, start + perPage)
  };
};

const loadDiscordGuildMembers = async (guildId) => {
  const headers = getDiscordHeaders();
  if (!headers) throw new Error("missing_bot_token");

  const all = [];
  let after = "";
  for (let page = 0; page < 250; page += 1) {
    const params = new URLSearchParams({ limit: "1000" });
    if (after) params.set("after", after);
    const response = await fetch(`https://discord.com/api/guilds/${guildId}/members?${params.toString()}`, {
      headers
    });
    if (!response.ok) {
      throw new Error("achievement_sync_members_fetch_failed");
    }
    const rows = await response.json().catch(() => []);
    if (!Array.isArray(rows) || !rows.length) break;
    all.push(...rows);
    if (rows.length < 1000) break;
    after = String(rows[rows.length - 1]?.user?.id || "").trim();
    if (!after) break;
  }
  return all;
};

const runWithConcurrency = async (items, limit, worker) => {
  const source = Array.isArray(items) ? items : [];
  const safeLimit = Math.max(1, toInt(limit, 1, { min: 1, max: 10 }));
  let cursor = 0;
  const runners = Array.from({ length: Math.min(safeLimit, source.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= source.length) break;
      await worker(source[index], index);
    }
  });
  await Promise.all(runners);
};

export const syncAchievementFromDiscord = async ({ guildId, achievementId }) => {
  const guildInternalId = await getGuildInternalId(guildId, db);
  const definitions = await loadDefinitionsRaw(guildInternalId, db);
  const targetId = toInt(achievementId, 0, { min: 0 });
  const definition = definitions.find((item) => Number(item.id) === targetId);
  if (!definition) throw new Error("achievement_not_found");

  const eventKey = String(definition.eventKey || "").trim().toLowerCase();
  if (String(definition.type || "") !== "unique") throw new Error("achievement_sync_not_supported");
  if (!["role_received", "server_boost", "birthday_added", "twitch_authenticated"].includes(eventKey)) {
    throw new Error("achievement_sync_not_supported");
  }
  if (eventKey === "role_received" && !normalizeRoleId(definition.eventTargetRoleId)) {
    throw new Error("achievement_role_required");
  }

  let scannedMembers = 0;
  let eligibleUserIds = [];
  if (eventKey === "birthday_added") {
    const rows = await db("birthday_entries")
      .where({ guild_id: guildInternalId })
      .select("user_discord_id");
    const eligible = (rows || [])
      .map((row) => String(row.user_discord_id || "").trim())
      .filter(Boolean);
    scannedMembers = eligible.length;
    eligibleUserIds = Array.from(new Set(eligible));
  } else {
    const members = await loadDiscordGuildMembers(String(guildId));
    const eligible = [];
    const memberUserIds = [];
    for (const member of members) {
      const userId = String(member?.user?.id || "").trim();
      if (!userId) continue;
      if (member?.user?.bot) continue;
      memberUserIds.push(userId);

      if (eventKey === "twitch_authenticated") {
        continue;
      }

      if (eventKey === "role_received") {
        const roleId = String(definition.eventTargetRoleId || "").trim();
        const memberRoles = Array.isArray(member?.roles) ? member.roles.map((value) => String(value)) : [];
        if (memberRoles.includes(roleId)) eligible.push(userId);
        continue;
      }

      if (eventKey === "server_boost" && member?.premium_since) {
        eligible.push(userId);
      }
    }
    scannedMembers = members.length;
    if (eventKey === "twitch_authenticated") {
      const uniqueMemberUserIds = Array.from(new Set(memberUserIds));
      const linked = [];
      for (let index = 0; index < uniqueMemberUserIds.length; index += 1000) {
        const chunk = uniqueMemberUserIds.slice(index, index + 1000);
        if (!chunk.length) continue;
        const rows = await db("users")
          .whereIn("discord_id", chunk)
          .whereNotNull("twitch_login")
          .whereRaw("TRIM(COALESCE(twitch_login, '')) <> ''")
          .select("discord_id");
        for (const row of rows || []) {
          const discordId = String(row?.discord_id || "").trim();
          if (discordId) linked.push(discordId);
        }
      }
      eligibleUserIds = Array.from(new Set(linked));
    } else {
      eligibleUserIds = Array.from(new Set(eligible));
    }
  }

  let synced = 0;
  let unlocked = 0;
  let failed = 0;

  await runWithConcurrency(eligibleUserIds, 4, async (userId) => {
    try {
      const result = await recordAchievementEvent({
        guildId: String(guildId),
        userId: String(userId),
        eventKey,
        increment: 1,
        metadata:
          eventKey === "role_received"
            ? { roleIds: [String(definition.eventTargetRoleId || "").trim()] }
            : {},
        force: true
      });
      synced += 1;
      unlocked += toInt(result?.unlocked, 0, { min: 0 });
    } catch {
      failed += 1;
    }
  });

  return {
    ok: true,
    achievementId: Number(definition.id),
    eventKey,
    scannedMembers,
    eligibleMembers: eligibleUserIds.length,
    syncedMembers: synced,
    unlockedMembers: unlocked,
    failedMembers: failed
  };
};
