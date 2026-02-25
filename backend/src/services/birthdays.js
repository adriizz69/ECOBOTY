import { db } from "./db.js";
import { ensureGuild } from "./economy.js";
import { getBotSettings } from "./admin.js";
import { sendLogMessage } from "./logs.js";
import { recordAchievementEvent } from "./achievements.js";

const TABLES = {
  settings: "birthday_settings",
  entries: "birthday_entries",
  roleAssignments: "birthday_role_assignments"
};

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  birthdayRoleId: "",
  announceChannelId: "",
  showAgeInList: true
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let birthdaySchedulerTimer = null;
let birthdaySchedulerRunning = false;

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value || "").trim().toLowerCase();
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

const normalizeDiscordId = (value) => String(value || "").trim();

const normalizeRoleId = (value) => {
  const roleId = String(value || "").trim();
  return roleId || "";
};

const normalizeChannelId = (value) => {
  const channelId = String(value || "").trim();
  return channelId || "";
};

const isLeapYear = (year) => {
  const y = Number(year);
  if (!Number.isFinite(y)) return false;
  if (y % 400 === 0) return true;
  if (y % 100 === 0) return false;
  return y % 4 === 0;
};

const buildIsoDate = (year, month, day) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const isValidDateParts = (year, month, day) => {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const utc = new Date(Date.UTC(y, m - 1, d));
  return (
    utc.getUTCFullYear() === y &&
    utc.getUTCMonth() + 1 === m &&
    utc.getUTCDate() === d
  );
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

const getDatePartsInTimeZone = (date, timeZone = "UTC") => {
  const fixedOffset = parseFixedTimeZoneOffset(timeZone);
  if (fixedOffset !== null) {
    const shifted = new Date(date.getTime() + fixedOffset * 60000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();
    return { year, month, day, isoDate: buildIsoDate(year, month, day) };
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = toInt(parts.find((p) => p.type === "year")?.value, 1970);
  const month = toInt(parts.find((p) => p.type === "month")?.value, 1, { min: 1, max: 12 });
  const day = toInt(parts.find((p) => p.type === "day")?.value, 1, { min: 1, max: 31 });
  return { year, month, day, isoDate: buildIsoDate(year, month, day) };
};

const formatBirthDateByLanguage = (isoDate, language = "fr") => {
  const raw = String(isoDate || "");
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  const year = match[1];
  const month = match[2];
  const day = match[3];
  const key = String(language || "").toLowerCase();
  if (key.startsWith("en")) return `${year}/${month}/${day}`;
  return `${day}/${month}/${year}`;
};

const parseBirthDateIso = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDateParts(year, month, day)) return null;
  return { year, month, day, isoDate: buildIsoDate(year, month, day) };
};

const dateToIsoLocal = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return buildIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

const normalizeStoredBirthDate = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return dateToIsoLocal(value);
  }
  const raw = String(value || "").trim();
  if (!raw) return "";
  const direct = parseBirthDateIso(raw);
  if (direct) return direct.isoDate;
  const headMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (headMatch) {
    const parsedHead = parseBirthDateIso(headMatch[1]);
    if (parsedHead) return parsedHead.isoDate;
  }
  const parsed = new Date(raw);
  return dateToIsoLocal(parsed);
};

const parseBirthdayInputByFormat = (value, format = "dmy") => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, "").replace(/[.]/g, "/").replace(/-/g, "/");
  if (format === "ymd") {
    const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidDateParts(year, month, day)) return null;
    return buildIsoDate(year, month, day);
  }
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidDateParts(year, month, day)) return null;
  return buildIsoDate(year, month, day);
};

const normalizeBirthDateInput = (value) => {
  const parsed = parseBirthDateIso(value);
  if (!parsed) return "";
  return parsed.isoDate;
};

const getMonthDay = (isoDate) => String(isoDate || "").slice(5, 10);

const birthdayDateInYear = ({ birthMonth, birthDay, year }) => {
  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(year)) {
    return { month: 3, day: 1 };
  }
  return { month: birthMonth, day: birthDay };
};

const getNextBirthdayIsoDate = ({ birthDateIso, todayIsoDate }) => {
  const birth = parseBirthDateIso(birthDateIso);
  const today = parseBirthDateIso(todayIsoDate);
  if (!birth || !today) return "";
  const currentYear = today.year;
  const currentUtc = Date.UTC(today.year, today.month - 1, today.day);
  let year = currentYear;
  let candidate = birthdayDateInYear({
    birthMonth: birth.month,
    birthDay: birth.day,
    year
  });
  let candidateUtc = Date.UTC(year, candidate.month - 1, candidate.day);
  if (candidateUtc < currentUtc) {
    year += 1;
    candidate = birthdayDateInYear({
      birthMonth: birth.month,
      birthDay: birth.day,
      year
    });
    candidateUtc = Date.UTC(year, candidate.month - 1, candidate.day);
  }
  return buildIsoDate(year, candidate.month, candidate.day);
};

const getCurrentAge = ({ birthDateIso, todayIsoDate }) => {
  const birth = parseBirthDateIso(birthDateIso);
  const today = parseBirthDateIso(todayIsoDate);
  if (!birth || !today) return null;
  let age = today.year - birth.year;
  const birthdayThisYear = birthdayDateInYear({
    birthMonth: birth.month,
    birthDay: birth.day,
    year: today.year
  });
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const birthdayUtc = Date.UTC(today.year, birthdayThisYear.month - 1, birthdayThisYear.day);
  if (todayUtc < birthdayUtc) {
    age -= 1;
  }
  return Math.max(0, age);
};

const getDaysUntil = ({ fromIsoDate, toIsoDate }) => {
  const from = parseBirthDateIso(fromIsoDate);
  const to = parseBirthDateIso(toIsoDate);
  if (!from || !to) return null;
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.max(0, Math.floor((toUtc - fromUtc) / ONE_DAY_MS));
};

const getGuildInternalId = async (guildId, trx = db) => {
  const guild = await ensureGuild(String(guildId), trx);
  return Number(guild.id);
};

const getGuildLanguageAndTimezone = async (guildId) => {
  try {
    const settings = await getBotSettings(String(guildId));
    return {
      language: String(settings?.bot_language || "fr").toLowerCase(),
      timeZone: String(settings?.timezone || "UTC")
    };
  } catch {
    return {
      language: "fr",
      timeZone: "UTC"
    };
  }
};

const mapEntryRow = (row) => ({
  id: Number(row.id),
  userId: String(row.user_discord_id || ""),
  birthDate: normalizeStoredBirthDate(row.birth_date),
  source: String(row.source || "user"),
  createdBy: row.created_by_discord_id ? String(row.created_by_discord_id) : "",
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
});

const enrichBirthdayEntry = ({ entry, todayIsoDate, showAge = true }) => {
  const nextBirthdayDate = getNextBirthdayIsoDate({
    birthDateIso: entry.birthDate,
    todayIsoDate
  });
  const age = showAge
    ? getCurrentAge({
        birthDateIso: entry.birthDate,
        todayIsoDate
      })
    : null;
  const daysUntil = getDaysUntil({ fromIsoDate: todayIsoDate, toIsoDate: nextBirthdayDate });
  return {
    ...entry,
    nextBirthdayDate,
    age,
    daysUntil
  };
};

const getDiscordHeaders = () => {
  const token = String(process.env.DISCORD_BOT_TOKEN || "").trim();
  if (!token) return null;
  return { Authorization: `Bot ${token}` };
};

const fetchDiscordGuildMember = async ({ guildId, userId }) => {
  const headers = getDiscordHeaders();
  if (!headers) return { ok: false, reason: "missing_bot_token", status: 0, member: null };
  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return {
      ok: false,
      reason: "member_fetch_failed",
      status: response.status,
      details,
      member: null
    };
  }
  const member = await response.json().catch(() => null);
  return { ok: true, status: response.status, member };
};

const addDiscordRole = async ({ guildId, userId, roleId }) => {
  const headers = getDiscordHeaders();
  if (!headers) return { ok: false, reason: "missing_bot_token", status: 0 };
  const response = await fetch(
    `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT", headers }
  );
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return { ok: false, reason: "role_add_failed", status: response.status, details };
  }
  return { ok: true, status: response.status };
};

const removeDiscordRole = async ({ guildId, userId, roleId }) => {
  const headers = getDiscordHeaders();
  if (!headers) return { ok: false, reason: "missing_bot_token", status: 0 };
  const response = await fetch(
    `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "DELETE", headers }
  );
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return { ok: false, reason: "role_remove_failed", status: response.status, details };
  }
  return { ok: true, status: response.status };
};

const sendDiscordChannelMessage = async ({ channelId, content }) => {
  const safeChannelId = normalizeChannelId(channelId);
  const safeContent = String(content || "").trim();
  const headers = getDiscordHeaders();
  if (!headers || !safeChannelId || !safeContent) {
    return { ok: false, reason: "missing_bot_token_or_params", status: 0 };
  }
  const response = await fetch(
    `https://discord.com/api/channels/${safeChannelId}/messages`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: safeContent })
    }
  );
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return { ok: false, reason: "message_send_failed", status: response.status, details };
  }
  return { ok: true, status: response.status };
};

const canMarkRemovalAsDone = (status) => {
  const code = Number(status || 0);
  if (code >= 200 && code < 300) return true;
  if (code === 404 || code === 403) return true;
  return false;
};

export const normalizeBirthdayDateForStorage = (value) => normalizeBirthDateInput(value);

export const parseBirthdayDateFromText = (value, format = "dmy") =>
  parseBirthdayInputByFormat(value, format);

export const getOrCreateBirthdaySettings = async (guildId, trx = db) => {
  const guildInternalId = await getGuildInternalId(guildId, trx);
  const existing = await trx(TABLES.settings).where({ guild_id: guildInternalId }).first();
  if (existing) {
    return {
      enabled: Boolean(existing.enabled),
      birthdayRoleId: normalizeRoleId(existing.birthday_role_id),
      announceChannelId: normalizeChannelId(existing.announce_channel_id),
      showAgeInList: toBool(existing.show_age_in_list, true)
    };
  }
  const now = new Date();
  await trx(TABLES.settings).insert({
    guild_id: guildInternalId,
    enabled: DEFAULT_SETTINGS.enabled,
    birthday_role_id: null,
    announce_channel_id: null,
    show_age_in_list: DEFAULT_SETTINGS.showAgeInList,
    created_at: now,
    updated_at: now
  });
  return { ...DEFAULT_SETTINGS };
};

export const saveBirthdaySettings = async (guildId, input = {}, trx = db) => {
  const guildInternalId = await getGuildInternalId(guildId, trx);
  const payload = {
    enabled: toBool(input.enabled, true),
    birthday_role_id: normalizeRoleId(input.birthdayRoleId ?? input.birthday_role_id) || null,
    announce_channel_id: normalizeChannelId(input.announceChannelId ?? input.announce_channel_id) || null,
    show_age_in_list: toBool(input.showAgeInList ?? input.show_age_in_list, true),
    updated_at: new Date()
  };
  const existing = await trx(TABLES.settings).where({ guild_id: guildInternalId }).first();
  if (existing) {
    await trx(TABLES.settings).where({ guild_id: guildInternalId }).update(payload);
  } else {
    await trx(TABLES.settings).insert({
      guild_id: guildInternalId,
      ...payload,
      created_at: new Date()
    });
  }
  return {
    enabled: payload.enabled,
    birthdayRoleId: normalizeRoleId(payload.birthday_role_id),
    announceChannelId: normalizeChannelId(payload.announce_channel_id),
    showAgeInList: payload.show_age_in_list
  };
};

export const listGuildBirthdays = async (guildId, { limit = 500 } = {}) => {
  const guildInternalId = await getGuildInternalId(guildId, db);
  const [settings, rows, botMeta] = await Promise.all([
    getOrCreateBirthdaySettings(guildId, db),
    db(TABLES.entries)
      .where({ guild_id: guildInternalId })
      .orderBy("birth_date", "asc")
      .limit(Math.max(1, toInt(limit, 500, { min: 1, max: 2000 }))),
    getGuildLanguageAndTimezone(guildId)
  ]);
  const today = getDatePartsInTimeZone(new Date(), botMeta.timeZone);
  const list = (rows || [])
    .map((row) => mapEntryRow(row))
    .map((entry) =>
      enrichBirthdayEntry({
        entry,
        todayIsoDate: today.isoDate,
        showAge: settings.showAgeInList
      })
    )
    .sort((a, b) => {
      const aDays = toInt(a.daysUntil, 999999, { min: 0 });
      const bDays = toInt(b.daysUntil, 999999, { min: 0 });
      if (aDays !== bDays) return aDays - bDays;
      return String(a.userId).localeCompare(String(b.userId));
    });
  return {
    settings,
    birthdays: list,
    timeZone: botMeta.timeZone,
    language: botMeta.language
  };
};

export const getBirthdayForUser = async ({ guildId, userId }) => {
  const guildInternalId = await getGuildInternalId(guildId, db);
  const [settings, row, botMeta] = await Promise.all([
    getOrCreateBirthdaySettings(guildId, db),
    db(TABLES.entries)
      .where({
        guild_id: guildInternalId,
        user_discord_id: normalizeDiscordId(userId)
      })
      .first(),
    getGuildLanguageAndTimezone(guildId)
  ]);
  const today = getDatePartsInTimeZone(new Date(), botMeta.timeZone);
  const entry = row ? enrichBirthdayEntry({
    entry: mapEntryRow(row),
    todayIsoDate: today.isoDate,
    showAge: true
  }) : null;
  return {
    settings,
    entry,
    language: botMeta.language,
    timeZone: botMeta.timeZone
  };
};

const logBirthdayChange = async ({
  guildId,
  userId,
  birthDate,
  source,
  actorUserId,
  created
}) => {
  const { language } = await getGuildLanguageAndTimezone(guildId);
  const formatted = formatBirthDateByLanguage(birthDate, language);
  if (source === "admin") {
    const actor = normalizeDiscordId(actorUserId);
    const actorPart = actor ? `<@${actor}>` : "Un administrateur";
    const action = created ? "a ajoute" : "a modifie";
    await sendLogMessage({
      guildId: String(guildId),
      content: `🎂 ${actorPart} ${action} l'anniversaire de <@${userId}>: **${formatted}**`
    });
    return;
  }
  if (source === "command") {
    const action = created ? "a ajoute" : "a modifie";
    await sendLogMessage({
      guildId: String(guildId),
      content: `🎂 <@${userId}> ${action} sa date d'anniversaire: **${formatted}**`
    });
    return;
  }
  const action = created ? "a ajoute" : "a modifie";
  await sendLogMessage({
    guildId: String(guildId),
    content: `🎂 <@${userId}> ${action} sa date d'anniversaire depuis l'interface: **${formatted}**`
  });
};

export const upsertBirthdayEntry = async ({
  guildId,
  userId,
  birthDate,
  source = "user",
  actorUserId = "",
  triggerAchievement = true,
  logChange = true
}) => {
  const safeGuildId = normalizeDiscordId(guildId);
  const safeUserId = normalizeDiscordId(userId);
  const safeBirthDate = normalizeBirthDateInput(birthDate);
  if (!safeGuildId || !safeUserId || !safeBirthDate) {
    throw new Error("birthday_invalid_params");
  }
  const safeSource = ["command", "user", "admin"].includes(String(source || "").toLowerCase())
    ? String(source).toLowerCase()
    : "user";
  const safeActor = normalizeDiscordId(actorUserId);

  const result = await db.transaction(async (trx) => {
    const guildInternalId = await getGuildInternalId(safeGuildId, trx);
    const existing = await trx(TABLES.entries)
      .where({
        guild_id: guildInternalId,
        user_discord_id: safeUserId
      })
      .first();

    const now = new Date();
    if (existing) {
      await trx(TABLES.entries)
        .where({ id: existing.id })
        .update({
          birth_date: safeBirthDate,
          source: safeSource,
          created_by_discord_id: safeActor || null,
          updated_at: now
        });
      const updated = await trx(TABLES.entries).where({ id: existing.id }).first();
      return { created: false, updated: true, entry: mapEntryRow(updated) };
    }

    const [id] = await trx(TABLES.entries).insert({
      guild_id: guildInternalId,
      user_discord_id: safeUserId,
      birth_date: safeBirthDate,
      source: safeSource,
      created_by_discord_id: safeActor || null,
      created_at: now,
      updated_at: now
    });
    const createdRow = await trx(TABLES.entries).where({ id: Number(id) }).first();
    return { created: true, updated: false, entry: mapEntryRow(createdRow) };
  });

  if (logChange) {
    await logBirthdayChange({
      guildId: safeGuildId,
      userId: safeUserId,
      birthDate: safeBirthDate,
      source: safeSource,
      actorUserId: safeActor,
      created: result.created
    });
  }

  if (triggerAchievement && result.created) {
    try {
      await recordAchievementEvent({
        guildId: safeGuildId,
        userId: safeUserId,
        eventKey: "birthday_added",
        increment: 1,
        metadata: { source: safeSource }
      });
    } catch {
      // do not block birthday save on achievements failures
    }
  }

  return result;
};

export const deleteBirthdayEntry = async ({
  guildId,
  userId,
  source = "user",
  actorUserId = "",
  logChange = true
}) => {
  const safeGuildId = normalizeDiscordId(guildId);
  const safeUserId = normalizeDiscordId(userId);
  if (!safeGuildId || !safeUserId) throw new Error("birthday_invalid_params");

  const deleted = await db.transaction(async (trx) => {
    const guildInternalId = await getGuildInternalId(safeGuildId, trx);
    const row = await trx(TABLES.entries)
      .where({
        guild_id: guildInternalId,
        user_discord_id: safeUserId
      })
      .first();
    if (!row) return { deleted: false, row: null, guildInternalId };
    await trx(TABLES.entries).where({ id: row.id }).del();
    return { deleted: true, row: mapEntryRow(row), guildInternalId };
  });

  if (!deleted.deleted) return { ok: true, deleted: false };

  const activeAssignments = await db(TABLES.roleAssignments)
    .where({
      guild_id: deleted.guildInternalId,
      user_discord_id: safeUserId,
      active: true
    });
  const now = new Date();
  for (const assignment of activeAssignments || []) {
    const roleId = normalizeRoleId(assignment.role_id);
    if (!roleId) continue;
    try {
      const result = await removeDiscordRole({
        guildId: safeGuildId,
        userId: safeUserId,
        roleId
      });
      if (result.ok || canMarkRemovalAsDone(result.status)) {
        await db(TABLES.roleAssignments)
          .where({ id: Number(assignment.id) })
          .update({
            active: false,
            removed_at: now,
            updated_at: now
          });
      }
    } catch {
      // ignore, will retry on scheduler if still active
    }
  }

  if (logChange) {
    const safeSource = String(source || "user").toLowerCase();
    const safeActor = normalizeDiscordId(actorUserId);
    if (safeSource === "admin") {
      const actor = safeActor ? `<@${safeActor}>` : "Un administrateur";
      await sendLogMessage({
        guildId: safeGuildId,
        content: `🎂 ${actor} a supprime l'anniversaire de <@${safeUserId}>.`
      });
    } else {
      await sendLogMessage({
        guildId: safeGuildId,
        content: `🎂 <@${safeUserId}> a supprime sa date d'anniversaire depuis l'interface.`
      });
    }
  }

  return { ok: true, deleted: true };
};

export const getUpcomingBirthdays = async ({ guildId, limit = 10 }) => {
  const safeLimit = Math.max(1, toInt(limit, 10, { min: 1, max: 50 }));
  const guildInternalId = await getGuildInternalId(guildId, db);
  const [settings, rows, botMeta] = await Promise.all([
    getOrCreateBirthdaySettings(guildId, db),
    db(TABLES.entries).where({ guild_id: guildInternalId }),
    getGuildLanguageAndTimezone(guildId)
  ]);
  const today = getDatePartsInTimeZone(new Date(), botMeta.timeZone);
  const list = (rows || [])
    .map((row) => mapEntryRow(row))
    .map((entry) =>
      enrichBirthdayEntry({
        entry,
        todayIsoDate: today.isoDate,
        showAge: settings.showAgeInList
      })
    )
    .sort((a, b) => {
      const aDays = toInt(a.daysUntil, 999999, { min: 0 });
      const bDays = toInt(b.daysUntil, 999999, { min: 0 });
      if (aDays !== bDays) return aDays - bDays;
      return String(a.userId).localeCompare(String(b.userId));
    })
    .slice(0, safeLimit);
  return {
    settings,
    language: botMeta.language,
    timeZone: botMeta.timeZone,
    birthdays: list
  };
};

const loadRoleSyncGuilds = async ({ guildId = "" } = {}) => {
  const query = db(`${TABLES.settings} as settings`)
    .join("guilds", "settings.guild_id", "guilds.id")
    .leftJoin("bot_settings", "bot_settings.guild_id", "guilds.id")
    .where("settings.enabled", true)
    .whereNotNull("settings.birthday_role_id")
    .whereRaw("TRIM(settings.birthday_role_id) <> ''")
    .select(
      "settings.guild_id as guild_internal_id",
      "guilds.discord_guild_id as guild_discord_id",
      "settings.birthday_role_id as birthday_role_id",
      "settings.announce_channel_id as announce_channel_id",
      "bot_settings.timezone as bot_timezone"
    );
  const normalizedGuildId = normalizeDiscordId(guildId);
  if (normalizedGuildId) {
    query.andWhere("guilds.discord_guild_id", normalizedGuildId);
  }
  return query;
};

const loadTodayBirthdayEntries = async ({ guildInternalId, monthDay, year }) => {
  const query = db(TABLES.entries).where({ guild_id: guildInternalId });
  if (monthDay === "03-01" && !isLeapYear(year)) {
    query.where((builder) =>
      builder
        .whereRaw("DATE_FORMAT(birth_date, '%m-%d') = ?", ["03-01"])
        .orWhereRaw("DATE_FORMAT(birth_date, '%m-%d') = ?", ["02-29"])
    );
    return query;
  }
  query.whereRaw("DATE_FORMAT(birth_date, '%m-%d') = ?", [monthDay]);
  return query;
};

const processGuildRoleSync = async (guildRow) => {
  const guildInternalId = Number(guildRow.guild_internal_id);
  const guildDiscordId = String(guildRow.guild_discord_id || "");
  const roleId = normalizeRoleId(guildRow.birthday_role_id);
  const announceChannelId = normalizeChannelId(guildRow.announce_channel_id);
  const timeZone = String(guildRow.bot_timezone || "UTC");
  if (!guildInternalId || !guildDiscordId || !roleId) {
    return {
      guildId: guildDiscordId,
      added: 0,
      removed: 0,
      preexisting: 0,
      failed: 0,
      processed: 0
    };
  }

  const now = new Date();
  const today = getDatePartsInTimeZone(now, timeZone);
  const todayIso = today.isoDate;
  const monthDay = `${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  let added = 0;
  let removed = 0;
  let preexisting = 0;
  let failed = 0;
  let processed = 0;

  const sendBirthdayAnnouncement = async (userId) => {
    if (!announceChannelId) return;
    const content = `🎂 Joyeux anniversaire <@${userId}> ! Role anniversaire du jour: <@&${roleId}>`;
    await sendDiscordChannelMessage({
      channelId: announceChannelId,
      content
    }).catch(() => null);
  };

  const staleAssignments = await db(TABLES.roleAssignments)
    .where({
      guild_id: guildInternalId,
      role_id: roleId,
      active: true
    })
    .where("birthday_date", "<", todayIso);

  for (const assignment of staleAssignments || []) {
    processed += 1;
    try {
      const result = await removeDiscordRole({
        guildId: guildDiscordId,
        userId: String(assignment.user_discord_id),
        roleId
      });
      if (result.ok || canMarkRemovalAsDone(result.status)) {
        await db(TABLES.roleAssignments)
          .where({ id: Number(assignment.id) })
          .update({
            active: false,
            removed_at: now,
            updated_at: now
          });
        removed += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  const [todayEntries, existingTodayRows] = await Promise.all([
    loadTodayBirthdayEntries({ guildInternalId, monthDay, year: today.year }),
    db(TABLES.roleAssignments)
      .where({
        guild_id: guildInternalId,
        role_id: roleId,
        birthday_date: todayIso
      })
  ]);
  const existingTodayByUser = new Set((existingTodayRows || []).map((row) => String(row.user_discord_id)));

  for (const entry of todayEntries || []) {
    const userId = normalizeDiscordId(entry.user_discord_id);
    if (!userId) continue;
    if (existingTodayByUser.has(userId)) continue;
    processed += 1;

    try {
      const memberResult = await fetchDiscordGuildMember({
        guildId: guildDiscordId,
        userId
      });
      if (!memberResult.ok || !memberResult.member) {
        failed += 1;
        continue;
      }

      const roles = Array.isArray(memberResult.member.roles)
        ? memberResult.member.roles.map((item) => String(item))
        : [];
      const alreadyHasRole = roles.includes(roleId);
      if (alreadyHasRole) {
        await db(TABLES.roleAssignments).insert({
          guild_id: guildInternalId,
          user_discord_id: userId,
          role_id: roleId,
          birthday_date: todayIso,
          state: "preexisting",
          active: false,
          removed_at: null,
          created_at: now,
          updated_at: now
        });
        preexisting += 1;
        await sendLogMessage({
          guildId: guildDiscordId,
          content: `🎂 <@${userId}> a deja le role anniversaire <@&${roleId}>. Aucun changement applique.`
        });
        await sendBirthdayAnnouncement(userId);
        continue;
      }

      const addResult = await addDiscordRole({
        guildId: guildDiscordId,
        userId,
        roleId
      });
      if (!addResult.ok) {
        failed += 1;
        continue;
      }
      await db(TABLES.roleAssignments).insert({
        guild_id: guildInternalId,
        user_discord_id: userId,
        role_id: roleId,
        birthday_date: todayIso,
        state: "added",
        active: true,
        removed_at: null,
        created_at: now,
        updated_at: now
      });
      added += 1;
      await sendLogMessage({
        guildId: guildDiscordId,
        content: `🎂 Role anniversaire ajoute pour <@${userId}> : <@&${roleId}>.`
      });
      await sendBirthdayAnnouncement(userId);
    } catch {
      failed += 1;
    }
  }

  return {
    guildId: guildDiscordId,
    added,
    removed,
    preexisting,
    failed,
    processed
  };
};

export const processBirthdayRoleAssignments = async ({ guildId = "" } = {}) => {
  const guilds = await loadRoleSyncGuilds({ guildId });
  if (!Array.isArray(guilds) || !guilds.length) {
    return {
      ok: true,
      guilds: 0,
      added: 0,
      removed: 0,
      preexisting: 0,
      failed: 0,
      processed: 0,
      details: []
    };
  }

  const details = [];
  let added = 0;
  let removed = 0;
  let preexisting = 0;
  let failed = 0;
  let processed = 0;

  for (const guildRow of guilds) {
    const result = await processGuildRoleSync(guildRow);
    details.push(result);
    added += toInt(result.added, 0, { min: 0 });
    removed += toInt(result.removed, 0, { min: 0 });
    preexisting += toInt(result.preexisting, 0, { min: 0 });
    failed += toInt(result.failed, 0, { min: 0 });
    processed += toInt(result.processed, 0, { min: 0 });
  }

  return {
    ok: true,
    guilds: guilds.length,
    added,
    removed,
    preexisting,
    failed,
    processed,
    details
  };
};

export const startBirthdayScheduler = ({ intervalMs = 60_000 } = {}) => {
  if (birthdaySchedulerTimer) return;
  const run = async () => {
    if (birthdaySchedulerRunning) return;
    birthdaySchedulerRunning = true;
    try {
      await processBirthdayRoleAssignments();
    } catch {
      // ignore scheduler loop errors
    } finally {
      birthdaySchedulerRunning = false;
    }
  };
  void run();
  birthdaySchedulerTimer = setInterval(() => {
    void run();
  }, Math.max(15_000, toInt(intervalMs, 60_000, { min: 15_000, max: 600_000 })));
};
