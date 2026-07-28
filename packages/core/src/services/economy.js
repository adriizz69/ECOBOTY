import { db } from "./db.js";
import { randomInt as cryptoRandomInt } from "crypto";

const todayKey = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
const nextDailyAt = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

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

const getDatePartsInTimeZone = (timeZone, date = new Date()) => {
  const fixedOffset = parseFixedTimeZoneOffset(timeZone);
  if (fixedOffset !== null) {
    const shifted = new Date(date.getTime() + fixedOffset * 60000);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds()
    };
  }
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    })
      .formatToParts(date)
      .reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second)
    };
  } catch {
    return null;
  }
};

const addDaysKey = (key, days) => {
  if (!key) return null;
  const [year, month, day] = String(key).split("-").map(Number);
  if (!year || !month || !day) return key;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

import { isGuildFeatureEnabled, getTwitchPremiumPolicy } from "./billing-entitlements.js";

const getTimeZoneOffsetMinutes = (timeZone, date = new Date()) => {
  const fixedOffset = parseFixedTimeZoneOffset(timeZone);
  if (fixedOffset !== null) return fixedOffset;
  try {
    const parts = getDatePartsInTimeZone(timeZone, date);
    if (!parts) return 0;
    const utcTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    return Math.round((utcTime - date.getTime()) / 60000);
  } catch {
    return 0;
  }
};

const todayKeyInTimeZone = (timeZone, date = new Date()) => {
  const parts = getDatePartsInTimeZone(timeZone, date);
  if (!parts) return todayKey(date);
  const yyyy = String(parts.year).padStart(4, "0");
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const nextDailyAtInTimeZone = (timeZone, date = new Date()) => {
  const parts = getDatePartsInTimeZone(timeZone, date);
  if (!parts) return nextDailyAt(date);
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0));
  const offset = getTimeZoneOffsetMinutes(timeZone, utcGuess);
  return new Date(utcGuess.getTime() - offset * 60000);
};

const getBotSettingsRow = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  return trx("bot_settings").where({ guild_id: guild.id }).first();
};

export const ensureGuild = async (guildId, trx = db) => {
  const existing = await trx("guilds").where({ discord_guild_id: guildId }).first();
  if (existing) return existing;
  const row = {
    discord_guild_id: guildId,
    name: "Unknown",
    icon: null,
    owner_discord_id: "unknown",
    user_ui_disabled: false
  };
  const [id] = await trx("guilds").insert(row);
  return { id, ...row };
};

export const getOrCreateSettings = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const settings = await trx("economy_settings").where({ guild_id: guild.id }).first();
  if (settings) return settings;

  const defaults = {
    guild_id: guild.id,
    name: "Economy",
    emoji_symbol: "💰",
    start_balance: 0,
    max_balance: 0,
    daily_amount: 0,
    streak_7_bonus_percent: 0,
    streak_14_bonus_percent: 0,
    streak_30_bonus_percent: 0,
    enabled: true,
    log_channel_id: null
  };
  await trx("economy_settings").insert(defaults);
  return defaults;
};

export const getOrCreateTwitchDailySettings = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const settings = await trx("twitch_daily_settings").where({ guild_id: guild.id }).first();
  if (settings) return settings;

  const defaults = {
    guild_id: guild.id,
    daily_amount: 0,
    streak_7_bonus_percent: 0,
    streak_14_bonus_percent: 0,
    streak_30_bonus_percent: 0,
    enabled: true
  };
  await trx("twitch_daily_settings").insert(defaults);
  return defaults;
};

export const saveTwitchDailySettings = async (guildId, data = {}, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const payload = {
    daily_amount: Number(data.daily_amount ?? data.dailyAmount ?? 0),
    streak_7_bonus_percent: Number(data.streak_7_bonus_percent ?? data.streak7 ?? 0),
    streak_14_bonus_percent: Number(data.streak_14_bonus_percent ?? data.streak14 ?? 0),
    streak_30_bonus_percent: Number(data.streak_30_bonus_percent ?? data.streak30 ?? 0),
    enabled: data.enabled ?? true
  };

  await trx("twitch_daily_settings")
    .insert({ guild_id: guild.id, ...payload })
    .onConflict("guild_id")
    .merge(payload);

  return trx("twitch_daily_settings").where({ guild_id: guild.id }).first();
};

const sanitizePercent = (value) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

const getDailyBonusPolicy = async (guildId) => {
  const enabled = guildId ? await isGuildFeatureEnabled(guildId, "economy_daily_bonus") : false;
  return {
    enabled,
    maxPercent: enabled ? null : 0,
    perTierMax: {
      streak7: enabled ? null : 0,
      streak14: enabled ? null : 0,
      streak30: enabled ? null : 0
    }
  };
};

const applyDailyBonusPolicy = (settings = {}, policy = {}) => {
  const enabled = policy?.enabled !== false;
  const maxPercent = policy?.maxPercent === null || policy?.maxPercent === undefined
    ? null
    : sanitizePercent(policy.maxPercent);
  const perTierMax = policy?.perTierMax && typeof policy.perTierMax === "object"
    ? {
        streak7: policy.perTierMax.streak7 === null || policy.perTierMax.streak7 === undefined
          ? null
          : sanitizePercent(policy.perTierMax.streak7),
        streak14: policy.perTierMax.streak14 === null || policy.perTierMax.streak14 === undefined
          ? null
          : sanitizePercent(policy.perTierMax.streak14),
        streak30: policy.perTierMax.streak30 === null || policy.perTierMax.streak30 === undefined
          ? null
          : sanitizePercent(policy.perTierMax.streak30)
      }
    : { streak7: null, streak14: null, streak30: null };

  const normalizeWithPolicy = (value, tierLimit = null) => {
    const normalized = sanitizePercent(value);
    if (!enabled) return 0;
    if (tierLimit !== null) return Math.min(normalized, tierLimit);
    if (maxPercent === null) return normalized;
    return Math.min(normalized, maxPercent);
  };

  return {
    ...settings,
    streak_7_bonus_percent: normalizeWithPolicy(settings.streak_7_bonus_percent, perTierMax.streak7),
    streak_14_bonus_percent: normalizeWithPolicy(settings.streak_14_bonus_percent, perTierMax.streak14),
    streak_30_bonus_percent: normalizeWithPolicy(settings.streak_30_bonus_percent, perTierMax.streak30)
  };
};

export const applyDailyBonusPolicyForGuild = async (guildId, settings = {}) => {
  const policy = await getDailyBonusPolicy(guildId);
  return applyDailyBonusPolicy(settings, policy);
};

const computeNextBonusForSettings = (streakValue, settings) => {
  const tiers = [
    { target: 7, percent: Number(settings.streak_7_bonus_percent || 0) },
    { target: 14, percent: Number(settings.streak_14_bonus_percent || 0) },
    { target: 30, percent: Number(settings.streak_30_bonus_percent || 0) }
  ].filter((tier) => tier.percent > 0);
  if (!tiers.length) return null;
  const upcoming = tiers.find((tier) => streakValue < tier.target);
  if (!upcoming) {
    const maxTier = tiers[tiers.length - 1];
    return { target: maxTier.target, percent: maxTier.percent, daysLeft: 0, reached: true };
  }
  return {
    target: upcoming.target,
    percent: upcoming.percent,
    daysLeft: Math.max(0, upcoming.target - streakValue),
    reached: false
  };
};

export const getOrCreateBalance = async (guildId, userId, startBalance = 0, trx = db) => {
  const userKey = String(userId);
  const guild = await ensureGuild(guildId, trx);
  const existing = await trx("balances")
    .where({ guild_id: guild.id, user_discord_id: userKey })
    .first();
  if (existing) return existing;

  const row = {
    guild_id: guild.id,
    user_discord_id: userKey,
    balance: startBalance,
    daily_streak: 0,
    last_daily: null
  };
  await trx("balances").insert(row);
  return row;
};

export const getDailyStatus = async ({ guildId, userId }) => {
  return db.transaction(async (trx) => {
    const userKey = String(userId);
    const guild = await ensureGuild(guildId, trx);
    const settings = await trx("economy_settings").where({ guild_id: guild.id }).first();
    const economyRaw = settings || (await getOrCreateSettings(guildId, trx));
    const dailyBonusPolicy = await getDailyBonusPolicy(guildId);
    const economy = applyDailyBonusPolicy(economyRaw, dailyBonusPolicy);
    const botSettings = await getBotSettingsRow(guildId, trx);
    const timeZone = botSettings?.timezone || "UTC";

    const baseAmount = Number(economy.daily_amount || 0);
    const enabled = Boolean(economy.enabled) && baseAmount > 0;

    const current = await getOrCreateBalance(guildId, userKey, economy.start_balance, trx);
    const now = new Date();
    const today = todayKeyInTimeZone(timeZone, now);
    const lastDaily = current.last_daily ? todayKeyInTimeZone(timeZone, new Date(current.last_daily)) : null;
    const alreadyClaimed = enabled && lastDaily === today;
    const nextAtDate = alreadyClaimed
      ? nextDailyAtInTimeZone(timeZone, current.last_daily ? new Date(current.last_daily) : now)
      : null;

    return {
      enabled,
      canClaim: enabled && !alreadyClaimed,
      reason: !enabled ? "daily_disabled" : alreadyClaimed ? "already_claimed" : "claim_available",
      streak: Number(current.daily_streak || 0),
      dailyAmount: baseAmount,
      nextAt: nextAtDate ? nextAtDate.toISOString() : null,
      remainingMs: nextAtDate ? Math.max(0, nextAtDate.getTime() - now.getTime()) : 0,
      nextBonus: computeNextBonusForSettings(Number(current.daily_streak || 0), economy),
      balance: Number(current.balance || 0),
      emoji: economy?.emoji_symbol || "💰",
      timeZone
    };
  });
};

export const applyDaily = async ({ guildId, userId }) => {
  return db.transaction(async (trx) => {
    const userKey = String(userId);
    const guild = await ensureGuild(guildId, trx);
    const settings = await trx("economy_settings").where({ guild_id: guild.id }).first();
    const economyRaw = settings || (await getOrCreateSettings(guildId, trx));
    const dailyBonusPolicy = await getDailyBonusPolicy(guildId);
    const economy = applyDailyBonusPolicy(economyRaw, dailyBonusPolicy);
    const botSettings = await getBotSettingsRow(guildId, trx);
    const timeZone = botSettings?.timezone || "UTC";

    if (!economy.enabled) {
      throw new Error("economy_disabled");
    }

    const balanceRow = await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .first();

    const current = balanceRow || (await getOrCreateBalance(guildId, userKey, economy.start_balance, trx));

    const now = new Date();
    const today = todayKeyInTimeZone(timeZone, now);
    const lastDaily = current.last_daily ? todayKeyInTimeZone(timeZone, new Date(current.last_daily)) : null;
    const computeNextBonus = (streakValue) => computeNextBonusForSettings(streakValue, economy);

    if (lastDaily === today) {
      const lastDate = current.last_daily ? new Date(current.last_daily) : now;
      return {
        ok: false,
        reason: "already_claimed",
        balance: current.balance,
        streak: current.daily_streak,
        nextAt: nextDailyAtInTimeZone(timeZone, lastDate).toISOString(),
        nextBonus: computeNextBonus(current.daily_streak)
      };
    }

    let streak = 1;
    let streakReset = false;
    if (current.last_daily) {
      const expected = addDaysKey(lastDaily, 1);
      if (expected === today) {
        streak = current.daily_streak + 1;
      } else {
        streakReset = true;
      }
    }

    const base = Number(economy.daily_amount || 0);
    let bonusPercent = 0;
    if (streak >= 30) bonusPercent = Number(economy.streak_30_bonus_percent || 0);
    else if (streak >= 14) bonusPercent = Number(economy.streak_14_bonus_percent || 0);
    else if (streak >= 7) bonusPercent = Number(economy.streak_7_bonus_percent || 0);

    const bonus = Math.floor((base * bonusPercent) / 100);
    const amount = base + bonus;

    const maxBalance = Number(economy.max_balance || 0);
    const newBalance = maxBalance > 0 ? Math.min(current.balance + amount, maxBalance) : current.balance + amount;
    const appliedAmount = newBalance - current.balance;

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .update({
        balance: newBalance,
        daily_streak: streak,
        last_daily: now
      });

    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: userKey,
      source: "daily",
      base_amount: base,
      multiplier: 1,
      bonus_amount: bonus,
      total_amount: amount,
      data: null,
      created_at: now
    });

    return {
      ok: true,
      amount: appliedAmount,
      base,
      bonus,
      streak,
      balance: newBalance,
      maxBalance,
      streakReset,
      nextAt: nextDailyAtInTimeZone(timeZone, now).toISOString(),
      nextBonus: computeNextBonus(streak)
    };
  });
};

export const applyTwitchDaily = async ({ guildId, userId }) => {
  if (!(await isGuildFeatureEnabled(guildId, "twitch_module"))) {
    return { ok: false, reason: "premium_feature_disabled", feature_key: "twitch_module" };
  }
  return db.transaction(async (trx) => {
    const userKey = String(userId);
    const guild = await ensureGuild(guildId, trx);
    const economy = await getOrCreateSettings(guildId, trx);
    const botSettings = await getBotSettingsRow(guildId, trx);
    const timeZone = botSettings?.timezone || "UTC";
    if (!economy.enabled) throw new Error("economy_disabled");

    const settings = await getOrCreateTwitchDailySettings(guildId, trx);
    if (!settings.enabled) throw new Error("twitch_daily_disabled");

    const current = await trx("twitch_daily_states")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .first();

    const now = new Date();
    const today = todayKeyInTimeZone(timeZone, now);
    const lastDaily = current?.last_daily ? todayKeyInTimeZone(timeZone, new Date(current.last_daily)) : null;

    if (lastDaily === today) {
      const lastDate = current?.last_daily ? new Date(current.last_daily) : now;
      return {
        ok: false,
        reason: "already_claimed",
        balance: null,
        streak: current?.daily_streak || 0,
        nextAt: nextDailyAtInTimeZone(timeZone, lastDate).toISOString(),
        nextBonus: computeNextBonusForSettings(current?.daily_streak || 0, settings)
      };
    }

    let streak = 1;
    let streakReset = false;
    if (current?.last_daily) {
      const expected = addDaysKey(lastDaily, 1);
      if (expected === today) {
        streak = Number(current.daily_streak || 0) + 1;
      } else {
        streakReset = true;
      }
    }

    const base = Number(settings.daily_amount || 0);
    let bonusPercent = 0;
    if (streak >= 30) bonusPercent = Number(settings.streak_30_bonus_percent || 0);
    else if (streak >= 14) bonusPercent = Number(settings.streak_14_bonus_percent || 0);
    else if (streak >= 7) bonusPercent = Number(settings.streak_7_bonus_percent || 0);

    const bonus = Math.floor((base * bonusPercent) / 100);
    const amount = base + bonus;

    const maxBalance = Number(economy.max_balance || 0);
    const balanceRow = await getOrCreateBalance(guildId, userKey, economy.start_balance, trx);
    const newBalance = maxBalance > 0
      ? Math.min(balanceRow.balance + amount, maxBalance)
      : balanceRow.balance + amount;
    const appliedAmount = newBalance - balanceRow.balance;
    if (appliedAmount <= 0) {
      return {
        ok: false,
        reason: "max_balance",
        balance: balanceRow.balance,
        streak,
        streakReset,
        nextAt: nextDailyAtInTimeZone(timeZone, now).toISOString(),
        nextBonus: computeNextBonusForSettings(streak, settings)
      };
    }

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .update({ balance: newBalance });

    if (current) {
      await trx("twitch_daily_states")
        .where({ id: current.id })
        .update({ daily_streak: streak, last_daily: now });
    } else {
      await trx("twitch_daily_states").insert({
        guild_id: guild.id,
        user_discord_id: userKey,
        daily_streak: streak,
        last_daily: now
      });
    }

    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: userKey,
      source: "twitch_daily",
      base_amount: appliedAmount,
      multiplier: 1,
      bonus_amount: 0,
      total_amount: appliedAmount,
      data: null,
      created_at: now
    });

    return {
      ok: true,
      amount: appliedAmount,
      base,
      bonus,
      streak,
      balance: newBalance,
      maxBalance,
      streakReset,
      nextAt: nextDailyAtInTimeZone(timeZone, now).toISOString(),
      nextBonus: computeNextBonusForSettings(streak, settings)
    };
  });
};

const applyLeaderboardFilters = (query, { minBalance = 0, search = "", matchedIds = [] } = {}) => {
  if (Number(minBalance || 0) > 0) {
    query.andWhere("balances.balance", ">=", Number(minBalance));
  }
  const term = String(search || "").trim();
  const extraIds = Array.from(
    new Set(
      (matchedIds || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
  if (term) {
    const lowered = term.toLowerCase();
    query.andWhere((builder) => {
      builder
        .where("balances.user_discord_id", "like", `%${term}%`)
        .orWhereRaw("LOWER(COALESCE(users.username, '')) LIKE ?", [`%${lowered}%`]);
      if (extraIds.length) {
        builder.orWhereIn("balances.user_discord_id", extraIds);
      }
    });
  } else if (extraIds.length) {
    query.andWhereIn("balances.user_discord_id", extraIds);
  }
  return query;
};

export const getLeaderboard = async ({
  guildId,
  limit = 10,
  offset = 0,
  minBalance = 0,
  search = "",
  matchedIds = []
} = {}) => {
  const guild = await ensureGuild(guildId, db);
  let query = db("balances")
    .leftJoin("users", "balances.user_discord_id", "users.discord_id")
    .where("balances.guild_id", guild.id);
  query = applyLeaderboardFilters(query, { minBalance, search, matchedIds });
  const rows = await query
    .select(
      "balances.user_discord_id",
      "balances.balance",
      "users.username as username",
      "users.avatar as avatar"
    )
    .orderBy("balances.balance", "desc")
    .orderBy("balances.user_discord_id", "asc")
    .limit(limit)
    .offset(offset);

  return rows.map((row, index) => {
    const userId = String(row.user_discord_id || "");
    const username = String(row.username || "").trim();
    return {
      rank: offset + index + 1,
      userId,
      balance: row.balance,
      username,
      displayName: username || userId,
      avatar: row.avatar || ""
    };
  });
};

export const getLeaderboardTotal = async ({
  guildId,
  minBalance = 0,
  search = "",
  matchedIds = []
} = {}) => {
  const guild = await ensureGuild(guildId, db);
  let query = db("balances")
    .leftJoin("users", "balances.user_discord_id", "users.discord_id")
    .where("balances.guild_id", guild.id);
  query = applyLeaderboardFilters(query, { minBalance, search, matchedIds });
  const total = await query.countDistinct({ count: "balances.user_discord_id" }).first();
  return Number(total?.count || 0);
};

export const getBalance = async ({ guildId, userId }) => {
  const settings = await getOrCreateSettings(guildId, db);
  const row = await getOrCreateBalance(guildId, String(userId), settings.start_balance, db);
  return row.balance;
};

export const transferBalance = async ({ guildId, fromUserId, toUserId, amount }) => {
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const settings = await getOrCreateSettings(guildId, trx);
    if (!settings.enabled) throw new Error("economy_disabled");

    const fromKey = String(fromUserId || "").trim();
    const toKey = String(toUserId || "").trim();
    if (!fromKey || !toKey) throw new Error("missing_params");
    if (fromKey === toKey) throw new Error("cannot_transfer_self");

    const rawAmount = Number(amount || 0);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0 || !Number.isInteger(rawAmount)) {
      throw new Error("invalid_amount");
    }

    const fromBalance = await getOrCreateBalance(guildId, fromKey, settings.start_balance, trx);
    const toBalance = await getOrCreateBalance(guildId, toKey, settings.start_balance, trx);

    const transferAmount = Math.max(0, rawAmount);
    if (Number(fromBalance.balance || 0) < transferAmount) {
      throw new Error("insufficient_funds");
    }

    const maxBalance = Number(settings.max_balance || 0);
    if (maxBalance > 0 && Number(toBalance.balance || 0) + transferAmount > maxBalance) {
      throw new Error("recipient_max_balance");
    }

    const senderNextBalance = Number(fromBalance.balance || 0) - transferAmount;
    const recipientNextBalance = Number(toBalance.balance || 0) + transferAmount;
    const now = new Date();
    const transferMeta = JSON.stringify({
      action: "transfer",
      from_user_id: fromKey,
      to_user_id: toKey,
      amount: transferAmount
    });

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: fromKey })
      .update({ balance: senderNextBalance });

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: toKey })
      .update({ balance: recipientNextBalance });

    await trx("economy_gain_logs").insert([
      {
        guild_id: guild.id,
        user_discord_id: fromKey,
        source: "manual",
        base_amount: -transferAmount,
        multiplier: 1,
        bonus_amount: 0,
        total_amount: -transferAmount,
        data: transferMeta,
        created_at: now
      },
      {
        guild_id: guild.id,
        user_discord_id: toKey,
        source: "manual",
        base_amount: transferAmount,
        multiplier: 1,
        bonus_amount: 0,
        total_amount: transferAmount,
        data: transferMeta,
        created_at: now
      }
    ]);

    return {
      ok: true,
      amount: transferAmount,
      senderBalance: senderNextBalance,
      recipientBalance: recipientNextBalance,
      currencyEmoji: settings.emoji_symbol || "💰"
    };
  });
};

export const updateUserBalance = async ({ guildId, userId, amount, mode = "set" }) => {
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const settings = await getOrCreateSettings(guildId, trx);
    const userKey = String(userId);
    const balanceRow = await getOrCreateBalance(guildId, userKey, settings.start_balance, trx);
    const inputAmount = Math.max(0, Number(amount || 0));
    let nextBalance = Math.max(0, inputAmount);
    if (mode === "add") {
      nextBalance = Math.max(0, Number(balanceRow.balance || 0) + inputAmount);
    } else if (mode === "remove") {
      nextBalance = Math.max(0, Number(balanceRow.balance || 0) - inputAmount);
    }
    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .update({ balance: nextBalance });

    const diff = nextBalance - Number(balanceRow.balance || 0);
    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: userKey,
      source: "manual",
      base_amount: diff,
      multiplier: 1,
      bonus_amount: 0,
      total_amount: diff,
      data: null,
      created_at: new Date()
    });

    return { balance: nextBalance, diff, mode };
  });
};

export const addAmountToAllBalances = async ({ guildId, amount }) => {
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const rawAmount = Number(amount || 0);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0 || !Number.isInteger(rawAmount)) {
      throw new Error("invalid_amount");
    }
    const inputAmount = rawAmount;

    const countRow = await trx("balances")
      .where({ guild_id: guild.id })
      .count({ count: "*" })
      .first();
    const affected = Number(countRow?.count || 0);
    if (affected <= 0) {
      return {
        ok: true,
        affected: 0,
        amount: inputAmount,
        totalAdded: 0
      };
    }

    await trx("balances")
      .where({ guild_id: guild.id })
      .increment("balance", inputAmount);

    const now = new Date();
    const logData = JSON.stringify({
      action: "mass_add",
      scope: "all_balances",
      amount: inputAmount
    });
    await trx.raw(
      `INSERT INTO economy_gain_logs
        (guild_id, user_discord_id, source, base_amount, multiplier, bonus_amount, total_amount, data, created_at)
       SELECT ?, user_discord_id, 'manual', ?, 1, 0, ?, ?, ?
       FROM balances
       WHERE guild_id = ?`,
      [guild.id, inputAmount, inputAmount, logData, now, guild.id]
    );

    return {
      ok: true,
      affected,
      amount: inputAmount,
      totalAdded: affected * inputAmount
    };
  });
};

export const applyGameResult = async ({ guildId, userId, bet, payout, source = "game" }) => {
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const settings = await getOrCreateSettings(guildId, trx);
    if (!settings.enabled) return { ok: false, reason: "economy_disabled" };

    const userKey = String(userId);
    const balanceRow = await getOrCreateBalance(guildId, userKey, settings.start_balance, trx);
    const betAmount = Math.max(0, Number(bet || 0));
    if (betAmount <= 0) return { ok: false, reason: "invalid_bet" };
    if (Number(balanceRow.balance || 0) < betAmount) {
      return { ok: false, reason: "insufficient_funds", balance: balanceRow.balance };
    }

    const grossPayout = Math.max(0, Number(payout || 0));
    let newBalance = Number(balanceRow.balance || 0) - betAmount + grossPayout;
    const maxBalance = Number(settings.max_balance || 0);
    if (maxBalance > 0) newBalance = Math.min(newBalance, maxBalance);

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .update({ balance: newBalance });

    const appliedWin = Math.max(0, newBalance - (Number(balanceRow.balance || 0) - betAmount));
    if (appliedWin > 0) {
      await trx("economy_gain_logs").insert({
        guild_id: guild.id,
        user_discord_id: userKey,
        source,
        base_amount: appliedWin,
        multiplier: 1,
        bonus_amount: 0,
        total_amount: appliedWin,
        data: null,
        created_at: new Date()
      });
    }

    return {
      ok: true,
      balance: newBalance,
      bet: betAmount,
      payout: grossPayout,
      net: newBalance - Number(balanceRow.balance || 0)
    };
  });
};

export const addTwitchGain = async ({
  guildId,
  userId,
  amount,
  source,
  data = null,
  baseAmount = null,
  multiplier = null
}) => {
  const sourceKey = String(source || "").trim().toLowerCase();
  const twitchPolicy = await getTwitchPremiumPolicy(guildId);
  if (sourceKey === "twitch_message") {
    if (!twitchPolicy.messageGainsEnabled) {
      return { ok: false, reason: "premium_feature_disabled", feature_key: "twitch_message_gains" };
    }
  } else if (!twitchPolicy.eventsAdvancedEnabled) {
    return { ok: false, reason: "premium_feature_disabled", feature_key: "twitch_module" };
  }
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const settings = await getOrCreateSettings(guildId, trx);
    if (!settings.enabled) return { ok: false, reason: "economy_disabled" };

    const userKey = String(userId);
    const balanceRow = await getOrCreateBalance(guildId, userKey, settings.start_balance, trx);
    const gain = Math.max(0, Number(amount || 0));
    if (gain <= 0) return { ok: false, reason: "zero_gain" };

    const maxBalance = Number(settings.max_balance || 0);
    const newBalance = maxBalance > 0
      ? Math.min(balanceRow.balance + gain, maxBalance)
      : balanceRow.balance + gain;
    const appliedAmount = newBalance - balanceRow.balance;
    if (appliedAmount <= 0) return { ok: false, reason: "max_balance" };

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .update({ balance: newBalance });

    const base = Number(baseAmount ?? amount ?? 0);
    const mult = Number(multiplier ?? 1);
    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: userKey,
      source,
      base_amount: base,
      multiplier: mult,
      bonus_amount: Math.max(0, Math.floor(base * mult) - base),
      total_amount: appliedAmount,
      data: data ? JSON.stringify(data) : null,
      created_at: new Date()
    });

    return { ok: true, amount: appliedAmount, balance: newBalance };
  });
};

export const resetAllBalances = async ({ guildId }) => {
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    await trx("balances")
      .where({ guild_id: guild.id })
      .update({ balance: 0, daily_streak: 0, last_daily: null });
    await trx("economy_gain_logs").where({ guild_id: guild.id }).del();
    await trx("economy_activity").where({ guild_id: guild.id }).del();
    return { ok: true };
  });
};

export const getLeaderboardPostSettings = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  return trx("leaderboard_post_settings").where({ guild_id: guild.id }).first();
};

export const saveLeaderboardPostSettings = async (guildId, data = {}) => {
  const guild = await ensureGuild(guildId, db);
  const existing = await db("leaderboard_post_settings").where({ guild_id: guild.id }).first();
  const nextChannelId = String(data.channel_id || data.channelId || "");
  if (existing && existing.enabled && data?.force !== true) {
    if (existing.message_id && existing.channel_id === nextChannelId) {
      throw new Error("leaderboard_already_exists");
    }
  }
  const payload = {
    guild_id: guild.id,
    channel_id: nextChannelId,
    limit: Number(data.limit || 10),
    enabled: data.enabled !== false,
    message_id: data.message_id || data.messageId || null
  };
  await db("leaderboard_post_settings")
    .insert(payload)
    .onConflict("guild_id")
    .merge(payload);
  return getLeaderboardPostSettings(guildId, db);
};

export const updateLeaderboardMessageId = async (guildId, messageId) => {
  const guild = await ensureGuild(guildId, db);
  await db("leaderboard_post_settings")
    .where({ guild_id: guild.id })
    .update({ message_id: messageId });
};

export const deleteLeaderboardPostSettings = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  await db("leaderboard_post_settings").where({ guild_id: guild.id }).del();
};

const getOrCreateActivity = async (guildId, userId, trx = db) => {
  const userKey = String(userId);
  const guild = await ensureGuild(guildId, trx);
  const existing = await trx("economy_activity")
    .where({ guild_id: guild.id, user_discord_id: userKey })
    .first();
  if (existing) return existing;
  const row = {
    guild_id: guild.id,
    user_discord_id: userKey,
    message_count: 0,
    last_voice_reward_at: null
  };
  await trx("economy_activity").insert(row);
  return row;
};

const normalizeRule = (rule = {}) => {
  const enabled = Boolean(rule.enabled);
  const minGain = Number(rule.min_gain || 0);
  const maxGain = Number(rule.max_gain || 0);
  let interval = Number(rule.interval || 0);
  if (enabled && interval <= 0) interval = 1;
  return {
    enabled,
    min_gain: minGain,
    max_gain: maxGain,
    interval
  };
};

const normalizeBooleanFlag = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") return true;
    if (raw === "false" || raw === "0" || raw === "no" || raw === "off" || raw === "") return false;
  }
  return Boolean(value);
};

const normalizeMultiplierValue = (value, fallback = 1) => {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = typeof value === "string"
    ? value.trim().replace(/^x/i, "").replace(",", ".")
    : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStackableBonus = (multiplier) => {
  const value = normalizeMultiplierValue(multiplier, 1);
  return value >= 1 ? value - 1 : value;
};

export const getAutomationConfig = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const rules = await trx("economy_rules").where({ guild_id: guild.id });
  const messageRule = rules.find((r) => r.type === "message") || {
    enabled: false,
    min_gain: 0,
    max_gain: 0,
    interval: 0
  };
  const voiceRule = rules.find((r) => r.type === "voice") || {
    enabled: false,
    min_gain: 0,
    max_gain: 0,
    interval: 0
  };

  const roleBoosters = await trx("role_modifiers").where({ guild_id: guild.id });
  const channelBoosters = await trx("channel_modifiers").where({ guild_id: guild.id });
  const blockedRoles = await trx("economy_blocked_roles").where({ guild_id: guild.id });
  const blockedChannels = await trx("economy_blocked_channels").where({ guild_id: guild.id });

  return {
    rules: {
      message: normalizeRule(messageRule),
      voice: normalizeRule(voiceRule)
    },
    roleBoosters: roleBoosters.map((r) => ({
      role_id: r.role_id,
      multiplier: normalizeMultiplierValue(r.multiplier, 1),
      enabled: normalizeBooleanFlag(r.enabled, true),
      stackable: normalizeBooleanFlag(r.stackable, false)
    })),
    channelBoosters: channelBoosters.map((c) => ({
      channel_id: c.channel_id,
      multiplier: normalizeMultiplierValue(c.multiplier, 1),
      enabled: normalizeBooleanFlag(c.enabled, true),
      stackable: normalizeBooleanFlag(c.stackable, false)
    })),
    blockedRoles: blockedRoles.map((r) => r.role_id),
    blockedChannels: blockedChannels.map((c) => c.channel_id)
  };
};

export const saveAutomationConfig = async (guildId, config = {}) => {
  const boostersAllowed = await isGuildFeatureEnabled(guildId, "economy_automation_advanced");
  return db.transaction(async (trx) => {
    const guild = await ensureGuild(guildId, trx);
    const messageRule = normalizeRule(config.rules?.message);
    const voiceRule = normalizeRule(config.rules?.voice);

    await trx("economy_rules").where({ guild_id: guild.id }).del();
    await trx("economy_rules").insert([
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
        type: "voice",
        min_gain: voiceRule.min_gain,
        max_gain: voiceRule.max_gain,
        interval: voiceRule.interval,
        enabled: voiceRule.enabled
      }
    ]);

    await trx("role_modifiers").where({ guild_id: guild.id }).del();
    if (boostersAllowed && Array.isArray(config.roleBoosters) && config.roleBoosters.length) {
      const rows = config.roleBoosters
        .filter((r) => r.role_id)
        .map((r) => ({
          guild_id: guild.id,
          role_id: r.role_id,
          multiplier: normalizeMultiplierValue(r.multiplier, 1),
          enabled: normalizeBooleanFlag(r.enabled, true),
          stackable: normalizeBooleanFlag(r.stackable, false)
        }));
      if (rows.length) await trx("role_modifiers").insert(rows);
    }

    await trx("channel_modifiers").where({ guild_id: guild.id }).del();
    if (boostersAllowed && Array.isArray(config.channelBoosters) && config.channelBoosters.length) {
      const rows = config.channelBoosters
        .filter((c) => c.channel_id)
        .map((c) => ({
          guild_id: guild.id,
          channel_id: c.channel_id,
          multiplier: normalizeMultiplierValue(c.multiplier, 1),
          enabled: normalizeBooleanFlag(c.enabled, true),
          stackable: normalizeBooleanFlag(c.stackable, false)
        }));
      if (rows.length) await trx("channel_modifiers").insert(rows);
    }

    await trx("economy_blocked_roles").where({ guild_id: guild.id }).del();
    if (Array.isArray(config.blockedRoles) && config.blockedRoles.length) {
      const rows = config.blockedRoles
        .filter(Boolean)
        .map((roleId) => ({ guild_id: guild.id, role_id: String(roleId) }));
      if (rows.length) await trx("economy_blocked_roles").insert(rows);
    }

    await trx("economy_blocked_channels").where({ guild_id: guild.id }).del();
    if (Array.isArray(config.blockedChannels) && config.blockedChannels.length) {
      const rows = config.blockedChannels
        .filter(Boolean)
        .map((channelId) => ({ guild_id: guild.id, channel_id: String(channelId) }));
      if (rows.length) await trx("economy_blocked_channels").insert(rows);
    }

    return getAutomationConfig(guildId, trx);
  });
};

const randomInt = (min, max) => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const range = high - low + 1;
  if (range <= 1) return low;
  try {
    return cryptoRandomInt(low, high + 1);
  } catch {
    return Math.floor(Math.random() * range) + low;
  }
};

export const applyAutoGain = async ({ guildId, userId, type, channelId, roleIds = [] }) => {
  const boostersAllowed = await isGuildFeatureEnabled(guildId, "economy_automation_advanced");
  return db.transaction(async (trx) => {
    const userKey = String(userId);
    const guild = await ensureGuild(guildId, trx);
    const settings = await getOrCreateSettings(guildId, trx);
    if (!settings.enabled) return { ok: false, reason: "economy_disabled" };

    const rule = await trx("economy_rules").where({ guild_id: guild.id, type }).first();
    if (!rule || !normalizeBooleanFlag(rule.enabled, true)) return { ok: false, reason: "rule_disabled" };

    const minGain = Number(rule.min_gain || 0);
    const maxGain = Number(rule.max_gain || 0);
    const interval = Number(rule.interval || 0);
    if (interval <= 0) return { ok: false, reason: "interval_disabled" };

    const blockedRoles = await trx("economy_blocked_roles").where({ guild_id: guild.id });
    const blockedRoleIds = blockedRoles.map((r) => r.role_id);
    if (roleIds.some((id) => blockedRoleIds.includes(String(id)))) {
      return { ok: false, reason: "blocked_role" };
    }

    if (channelId) {
      const blockedChannels = await trx("economy_blocked_channels").where({ guild_id: guild.id });
      const blockedChannelIds = blockedChannels.map((c) => c.channel_id);
      if (blockedChannelIds.includes(String(channelId))) {
        return { ok: false, reason: "blocked_channel" };
      }
    }

    const activity = await getOrCreateActivity(guildId, userKey, trx);
    const now = new Date();

    if (type === "message") {
      const nextCount = Number(activity.message_count || 0) + 1;
      if (nextCount < Math.max(1, interval)) {
        await trx("economy_activity")
          .where({ guild_id: guild.id, user_discord_id: userKey })
          .update({ message_count: nextCount });
        return { ok: false, reason: "interval_not_reached", count: nextCount };
      }
      await trx("economy_activity")
        .where({ guild_id: guild.id, user_discord_id: userKey })
        .update({ message_count: 0 });
    }

    if (type === "voice") {
      if (!activity.last_voice_reward_at) {
        await trx("economy_activity")
          .where({ guild_id: guild.id, user_discord_id: userKey })
          .update({ last_voice_reward_at: now });
        return { ok: false, reason: "interval_not_reached" };
      }
      const last = new Date(activity.last_voice_reward_at);
      const diffMinutes = (now.getTime() - last.getTime()) / 60000;
      if (diffMinutes < interval) {
        return { ok: false, reason: "interval_not_reached" };
      }
      await trx("economy_activity")
        .where({ guild_id: guild.id, user_discord_id: userKey })
        .update({ last_voice_reward_at: now });
    }

    if (minGain <= 0 && maxGain <= 0) return { ok: false, reason: "zero_gain" };

    const base = randomInt(minGain, maxGain);

    let multiplier = 1;
    if (boostersAllowed) {
      const roleBoosters = await trx("role_modifiers")
        .where({ guild_id: guild.id })
        .whereIn("role_id", roleIds.map(String));
      const enabledRoleBoosters = roleBoosters.filter((r) => normalizeBooleanFlag(r.enabled, true));
      const stackableRoleBoosters = enabledRoleBoosters.filter((r) => normalizeBooleanFlag(r.stackable, false));
      const nonStackableRoleBoosters = enabledRoleBoosters.filter((r) => !normalizeBooleanFlag(r.stackable, false));
      let hasNonStackableBooster = nonStackableRoleBoosters.length > 0;
      let nonStackableMax = hasNonStackableBooster
        ? nonStackableRoleBoosters.reduce(
            (max, r) => Math.max(max, normalizeMultiplierValue(r.multiplier, 1)),
            Number.NEGATIVE_INFINITY
          )
        : 1;
      let stackableBonus = stackableRoleBoosters.reduce(
        (sum, r) => sum + toStackableBonus(r.multiplier),
        0
      );

      if (channelId) {
        const channelBooster = await trx("channel_modifiers")
          .where({ guild_id: guild.id, channel_id: String(channelId) })
          .first();
        if (channelBooster && normalizeBooleanFlag(channelBooster.enabled, true)) {
          const channelMultiplier = normalizeMultiplierValue(channelBooster.multiplier, 1);
          const channelStackable = normalizeBooleanFlag(channelBooster.stackable, false);
          if (channelStackable) {
            stackableBonus += toStackableBonus(channelMultiplier);
          } else {
            nonStackableMax = hasNonStackableBooster
              ? Math.max(nonStackableMax, channelMultiplier)
              : channelMultiplier;
            hasNonStackableBooster = true;
          }
        }
      }

      multiplier = Math.max(0, (hasNonStackableBooster ? nonStackableMax : 1) + stackableBonus);
    }
    const amount = Math.max(0, Math.floor(base * multiplier));
    const bonusAmount = amount - base;

    const balanceRow = await getOrCreateBalance(guildId, userKey, settings.start_balance, trx);
    const maxBalance = Number(settings.max_balance || 0);
    const newBalance = maxBalance > 0
      ? Math.min(balanceRow.balance + amount, maxBalance)
      : balanceRow.balance + amount;
    const appliedAmount = newBalance - balanceRow.balance;

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .update({ balance: newBalance });

    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: userKey,
      source: type,
      base_amount: base,
      multiplier,
      bonus_amount: bonusAmount,
      total_amount: amount,
      data: null,
      created_at: new Date()
    });

    return {
      ok: true,
      amount: appliedAmount,
      base,
      multiplier,
      balance: newBalance,
      maxBalance
    };
  });
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date) => new Date(date.getFullYear(), 0, 1);

const parseRangeDate = (value, isEnd = false) => {
  if (!value) return null;
  if (typeof value === "string" && value.length === 10) {
    const date = new Date(`${value}T00:00:00`);
    return isEnd ? endOfDay(date) : startOfDay(date);
  }
  const date = new Date(value);
  return isEnd ? endOfDay(date) : startOfDay(date);
};

export const getGainSummary = async ({ guildId, period = "day", tzOffset = 0 }) => {
  const guild = await ensureGuild(guildId, db);
  const offsetMinutes = Number(tzOffset || 0);
  const nowLocal = new Date(Date.now() + offsetMinutes * 60000);
  const dayKey = nowLocal.toISOString().slice(0, 10);
  const monthKey = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, "0")}`;
  const yearKey = String(nowLocal.getFullYear());

  const query = db("economy_gain_logs")
    .where({ guild_id: guild.id })
    .whereIn("source", ["message", "voice", "manual", "twitch_message", "twitch_watch"]);
  if (period === "day") {
    query.andWhereRaw("DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)) = ?", [offsetMinutes, dayKey]);
  } else if (period === "month") {
    query.andWhereRaw("DATE_FORMAT(DATE_ADD(created_at, INTERVAL ? MINUTE), '%Y-%m') = ?", [
      offsetMinutes,
      monthKey
    ]);
  } else if (period === "year") {
    query.andWhereRaw("YEAR(DATE_ADD(created_at, INTERVAL ? MINUTE)) = ?", [offsetMinutes, yearKey]);
  }

  const rows = await query.sum({ total: "total_amount" }).first();
  return Number(rows?.total || 0);
};

export const getUserGainStats = async ({ guildId, userId, from, to, tzOffset = 0 }) => {
  const guild = await ensureGuild(guildId, db);
  const userKey = String(userId);
  const start = parseRangeDate(from) || startOfMonth(new Date());
  const end = parseRangeDate(to, true) || new Date();

  const hasDateRange = Boolean(from || to);
  const offsetMinutes = Number(tzOffset || 0);
  const rangeFilter = (query) => {
    if (!hasDateRange) {
      return query.andWhereBetween("created_at", [start, end]);
    }
    const fromDate = from || start.toISOString().slice(0, 10);
    const toDate = to || end.toISOString().slice(0, 10);
    return query.andWhereRaw(
      "DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)) >= ? AND DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)) <= ?",
      [offsetMinutes, fromDate, offsetMinutes, toDate]
    );
  };

  const bySource = await rangeFilter(
    db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .whereIn("source", ["message", "voice", "manual", "twitch_message", "twitch_watch"])
      .select("source")
      .sum({ total: "total_amount" })
      .groupBy("source")
  );

  const bonusRow = await rangeFilter(
    db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .whereIn("source", ["message", "voice", "manual", "twitch_message", "twitch_watch"])
      .sum({ bonus: "bonus_amount" })
  ).first();

  const overallRow = await rangeFilter(
    db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .whereIn("source", ["message", "voice", "manual", "twitch_message", "twitch_watch"])
      .sum({ total: "total_amount" })
  ).first();

  const byDay = await rangeFilter(
    db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .whereIn("source", ["message", "voice", "manual", "twitch_message", "twitch_watch"])
      .select(db.raw("DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)) as date", [offsetMinutes]))
      .sum({ total: "total_amount" })
      .groupBy("date")
      .orderBy("date", "asc")
  );

  const byMonth = await rangeFilter(
    db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .whereIn("source", ["message", "voice", "manual", "twitch_message", "twitch_watch"])
      .select(db.raw("DATE_FORMAT(DATE_ADD(created_at, INTERVAL ? MINUTE), '%Y-%m') as month", [offsetMinutes]))
      .sum({ total: "total_amount" })
      .groupBy("month")
      .orderBy("month", "asc")
  );

  const countAllRow = await db("economy_gain_logs")
    .where({ guild_id: guild.id, user_discord_id: userKey })
    .count({ count: "id" })
    .first();

  const countRangeRow = await rangeFilter(
    db("economy_gain_logs")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .count({ count: "id" })
  ).first();

  return {
    from: start,
    to: end,
    bySource: bySource.map((row) => ({ source: row.source, total: Number(row.total || 0) })),
    bonusTotal: Number(bonusRow?.bonus || 0),
    total: Number(overallRow?.total || 0),
    byDay: byDay.map((row) => ({ date: row.date, total: Number(row.total || 0) })),
    byMonth: byMonth.map((row) => ({ month: row.month, total: Number(row.total || 0) })),
    debug: {
      countAll: Number(countAllRow?.count || 0),
      countRange: Number(countRangeRow?.count || 0)
    }
  };
};
