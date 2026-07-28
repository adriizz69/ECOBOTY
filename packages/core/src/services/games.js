import { db } from "./db.js";
import { ensureGuild, applyGameResult, getOrCreateSettings } from "./economy.js";
import { insertEventLog, sendLogMessage } from "./logs.js";
import { randomInt as cryptoRandomInt } from "crypto";

export const getDefaultGamesConfig = () => ({
  enabled: true,
  minBet: 10,
  maxBet: 10000,
  cooldownSeconds: 10,
  houseEdgePercent: 5,
  flip: {
    enabled: true,
    winChancePercent: 50,
    winMultiplier: 2,
    jackpotEnabled: true,
    jackpotChancePercent: 1,
    jackpotMultiplier: 10
  },
  dice: {
    enabled: true,
    sides: 6,
    winChancePercent: 16.67,
    winMultiplier: 5
  },
  slot: {
    enabled: true,
    symbols: ["💎", "🍒", "⭐", "🍋"],
    payouts: [
      { combo: "💎💎💎", multiplier: 10 },
      { combo: "🍒🍒🍒", multiplier: 5 },
      { combo: "⭐⭐⭐", multiplier: 3 }
    ],
    twoOfKindMultiplier: 2
  },
  roulette: {
    enabled: true,
    red: { chance: 45, multiplier: 2 },
    black: { chance: 45, multiplier: 2 },
    green: { chance: 10, multiplier: 14 }
  },
  higherLower: {
    enabled: true,
    maxNumber: 10,
    winMultiplier: 2,
    winChancePercent: 50,
    streakBonusEnabled: false
  },
  crash: {
    enabled: true,
    maxMultiplier: 20,
    crashChancePerTickPercent: 2,
    speed: "normal"
  },
  double: {
    enabled: true,
    winChancePercent: 50,
    multiplier: 2
  },
  mystery: {
    enabled: true,
    outcomes: [
      { multiplier: 0, chance: 20 },
      { multiplier: 0.5, chance: 15 },
      { multiplier: 1, chance: 25 },
      { multiplier: 2, chance: 20 },
      { multiplier: 5, chance: 15 },
      { multiplier: 10, chance: 5 }
    ]
  }
});

const cooldownMap = new Map();
const getCooldownKey = (guildId, userId) => `${guildId}:${userId}`;
const GAME_MODE_ORDER = ["flip", "dice", "slot", "roulette", "higherLower", "crash", "double", "mystery"];
const ADVANCED_GAME_MODES = new Set(["crash", "double", "mystery"]);

const nowMs = () => Date.now();
const randomFloat = () => cryptoRandomInt(0, 1_000_000) / 1_000_000;
const rollPercent = () => randomFloat() * 100;

const applyHouseEdge = (amount, edgePercent) => {
  const edge = Math.max(0, Number(edgePercent || 0));
  const multiplier = Math.max(0, 1 - edge / 100);
  return Math.floor(Number(amount || 0) * multiplier);
};

const pickWeighted = (items, weightKey = "chance") => {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item[weightKey] || 0)), 0);
  if (total <= 0) return null;
  let roll = randomFloat() * total;
  for (const item of items) {
    roll -= Math.max(0, Number(item[weightKey] || 0));
    if (roll <= 0) return item;
  }
  return items[items.length - 1] || null;
};

const normalizeChoice = (choice) => String(choice || "").trim().toLowerCase();

const resolveFlip = (config, choice) => {
  const win = rollPercent() < Number(config.winChancePercent || 50);
  const result = win ? choice : choice === "pile" ? "face" : "pile";
  const jackpotEnabled = config.jackpotEnabled !== false;
  const jackpot = jackpotEnabled && rollPercent() < Number(config.jackpotChancePercent || 0);
  const multiplier = win
    ? jackpot
      ? Number(config.jackpotMultiplier || 0)
      : Number(config.winMultiplier || 0)
    : 0;
  return { win, result, jackpot, multiplier };
};

const resolveDice = (config, choice) => {
  const sides = Math.max(2, Number(config.sides || 6));
  const win = rollPercent() < Number(config.winChancePercent || (100 / sides));
  let roll = cryptoRandomInt(1, sides + 1);
  if (win) {
    roll = Math.min(sides, Math.max(1, Number(choice || 1)));
  } else if (Number(choice) === roll) {
    roll = roll === sides ? roll - 1 : roll + 1;
  }
  return { win, roll, multiplier: win ? Number(config.winMultiplier || 0) : 0 };
};

const resolveRoulette = (config, choice) => {
  const redChance = Number(config.red?.chance || 0);
  const blackChance = Number(config.black?.chance || 0);
  const greenChance = Number(config.green?.chance || 0);
  const total = redChance + blackChance + greenChance;
  let roll = randomFloat() * (total || 100);
  let color = "red";
  if (roll < redChance) color = "red";
  else if (roll < redChance + blackChance) color = "black";
  else color = "green";
  const win = normalizeChoice(choice) === color;
  const multiplier = win ? Number(config[color]?.multiplier || 0) : 0;
  return { win, color, multiplier };
};

const resolveHigherLower = (config, choice) => {
  const max = Math.max(2, Number(config.maxNumber || 10));
  const isPlus = normalizeChoice(choice) === "plus";
  let current = cryptoRandomInt(1, max + 1);
  if (isPlus && current === max) current = max - 1;
  if (!isPlus && current === 1) current = 2;
  const win = rollPercent() < Number(config.winChancePercent || 50);
  let next = cryptoRandomInt(1, max + 1);
  if (win) {
    if (isPlus) next = cryptoRandomInt(current + 1, max + 1);
    else next = cryptoRandomInt(1, current);
  } else {
    if (isPlus) next = cryptoRandomInt(1, current + 1);
    else next = cryptoRandomInt(current, max + 1);
  }
  return { win, current, next, multiplier: win ? Number(config.winMultiplier || 0) : 0 };
};

const resolveDouble = (config) => {
  const win = rollPercent() < Number(config.winChancePercent || 50);
  return { win, multiplier: win ? Number(config.multiplier || 0) : 0 };
};

const resolveSlot = (config) => {
  const symbols = Array.isArray(config.symbols) && config.symbols.length ? config.symbols : ["💎", "🍒", "⭐", "🍋"];
  const pick = () => symbols[cryptoRandomInt(0, symbols.length)];
  const result = [pick(), pick(), pick()];
  const combo = result.join("");
  const payoutMatch = (config.payouts || []).find((row) => row.combo === combo);
  if (payoutMatch) {
    return { win: true, result, combo, multiplier: Number(payoutMatch.multiplier || 0), twoKind: false };
  }
  const twoKind = result[0] === result[1] || result[0] === result[2] || result[1] === result[2];
  const multiplier = twoKind ? Number(config.twoOfKindMultiplier || 0) : 0;
  return { win: multiplier > 0, result, combo, multiplier, twoKind };
};

const resolveCrash = (config, cashout) => {
  const maxMultiplier = Math.max(1, Number(config.maxMultiplier || 20));
  const crashChance = Math.max(0, Number(config.crashChancePerTickPercent || 0));
  const speed = String(config.speed || "normal");
  const step = speed === "fast" ? 0.2 : speed === "slow" ? 0.05 : 0.1;
  let multiplier = 1;
  let crashed = false;
  while (multiplier < maxMultiplier) {
    if (rollPercent() < crashChance) {
      crashed = true;
      break;
    }
    multiplier = Math.min(maxMultiplier, Number((multiplier + step).toFixed(2)));
  }
  if (!crashed) multiplier = maxMultiplier;
  const cash = Math.max(1, Number(cashout || 1));
  const win = cash <= multiplier && !crashed;
  return { win, crashAt: multiplier, cashout: cash, multiplier: win ? cash : 0 };
};

const resolveMystery = (config) => {
  const outcomes = Array.isArray(config.outcomes) ? config.outcomes : [];
  const pick = pickWeighted(outcomes, "chance");
  const multiplier = Number(pick?.multiplier || 0);
  return { win: multiplier > 0, multiplier, outcome: pick };
};

const formatGameLabel = (gameId) => {
  switch (String(gameId || "")) {
    case "flip":
      return "Pile ou face";
    case "dice":
      return "Dé";
    case "roulette":
      return "Roulette";
    case "higherLower":
      return "Plus ou moins";
    case "crash":
      return "Crash";
    case "double":
      return "Double";
    case "slot":
      return "Machine à sous";
    case "mystery":
      return "Mystère";
    default:
      return String(gameId || "Jeu");
  }
};

import { FREE_GAME_MODE_IDS, getGamesPremiumPolicy } from "./billing-entitlements.js";

const resolveAllowedGameIds = (settings, policy) => {
  const list = [];
  for (const gameId of GAME_MODE_ORDER) {
    const rule = settings?.[gameId];
    if (!rule || rule.enabled === false) continue;
    if (!policy.advancedModesEnabled) {
      const freeIds = Array.isArray(policy.freeModeIds) && policy.freeModeIds.length
        ? policy.freeModeIds
        : FREE_GAME_MODE_IDS;
      if (!freeIds.includes(gameId)) continue;
    }
    list.push(gameId);
  }
  if (policy.modesMax === null || policy.modesMax === undefined) {
    return new Set(list);
  }
  const max = Math.max(1, Number(policy.modesMax || 1));
  return new Set(list.slice(0, max));
};

export const playGame = async ({ guildId, userId, gameId, bet, choice, cashout }) => {
  const settings = await getGamesSettings(guildId, db);
  const premiumPolicy = await getGamesPremiumPolicy(guildId);
  if (!premiumPolicy.moduleEnabled) {
    return { ok: false, reason: "premium_feature_disabled", feature_key: "games_module" };
  }
  if (!settings.enabled) return { ok: false, reason: "games_disabled" };
  if (!premiumPolicy.advancedModesEnabled) {
    const freeIds = Array.isArray(premiumPolicy.freeModeIds) && premiumPolicy.freeModeIds.length
      ? premiumPolicy.freeModeIds
      : FREE_GAME_MODE_IDS;
    if (!freeIds.includes(String(gameId || ""))) {
      return { ok: false, reason: "premium_feature_disabled", feature_key: "games_advanced_modes" };
    }
  }
  const allowedGameIds = resolveAllowedGameIds(settings, premiumPolicy);
  if (!allowedGameIds.has(String(gameId || ""))) {
    return { ok: false, reason: "premium_limit_reached", limit_key: "games_modes_max" };
  }
  const game = settings[gameId];
  if (!game || game.enabled === false) return { ok: false, reason: "game_disabled" };

  const betValue = Number(bet || 0);
  if (betValue < Number(settings.minBet || 0)) return { ok: false, reason: "min_bet" };
  if (betValue > Number(settings.maxBet || 0)) return { ok: false, reason: "max_bet" };

  const key = getCooldownKey(guildId, userId);
  const lastAt = cooldownMap.get(key) || 0;
  const cooldownMs = Math.max(0, Number(settings.cooldownSeconds || 0)) * 1000;
  if (cooldownMs > 0 && nowMs() - lastAt < cooldownMs) {
    const retryIn = Math.ceil((cooldownMs - (nowMs() - lastAt)) / 1000);
    return { ok: false, reason: "cooldown", retryIn };
  }

  let result = null;
  const normalizedChoice = normalizeChoice(choice);

  switch (gameId) {
    case "flip":
      if (!["pile", "face"].includes(normalizedChoice)) return { ok: false, reason: "invalid_choice" };
      result = resolveFlip(game, normalizedChoice);
      break;
    case "dice": {
      const selected = Number(choice);
      if (!selected || selected < 1 || selected > Number(game.sides || 6)) {
        return { ok: false, reason: "invalid_choice" };
      }
      result = resolveDice(game, selected);
      break;
    }
    case "roulette":
      if (!["rouge", "noir", "vert", "red", "black", "green"].includes(normalizedChoice)) {
        return { ok: false, reason: "invalid_choice" };
      }
      result = resolveRoulette(game, normalizedChoice === "rouge" ? "red" : normalizedChoice === "noir" ? "black" : normalizedChoice);
      break;
    case "higherLower":
      if (!["plus", "moins"].includes(normalizedChoice)) return { ok: false, reason: "invalid_choice" };
      result = resolveHigherLower(game, normalizedChoice);
      break;
    case "crash": {
      const max = Number(game.maxMultiplier || 20);
      const cash = Number(cashout || choice || 1);
      if (!cash || cash < 1 || cash > max) return { ok: false, reason: "invalid_choice" };
      result = resolveCrash(game, cash);
      break;
    }
    case "double":
      result = resolveDouble(game);
      break;
    case "slot":
      result = resolveSlot(game);
      break;
    case "mystery":
      result = resolveMystery(game);
      break;
    default:
      return { ok: false, reason: "unknown_game" };
  }

  const multiplier = Number(result.multiplier || 0);
  const grossPayout = result.win ? betValue * multiplier : 0;
  const payout = applyHouseEdge(grossPayout, settings.houseEdgePercent);
  const effectiveMultiplier = betValue > 0 ? payout / betValue : 0;

  const applied = await applyGameResult({ guildId, userId, bet: betValue, payout, source: "game" });
  if (!applied.ok) return applied;

  cooldownMap.set(key, nowMs());

  const net = payout - betValue;
  await insertEventLog({
    guildId,
    category: "game",
    type: String(gameId),
    userId,
    amount: net,
    data: {
      game_id: String(gameId),
      bet: betValue,
      payout,
      win: Boolean(result.win),
      multiplier,
      choice: normalizedChoice || null,
      details: result
    }
  });

  const economySettings = await getOrCreateSettings(guildId, db);
  const currency = economySettings?.emoji_symbol || "💰";
  const label = formatGameLabel(gameId);
  const outcomeLabel = result.win ? "gagné" : "perdu";
  await sendLogMessage({
    guildId,
    content: `🎮 Jeu — <@${userId}> a joué à **${label}** : mise ${betValue} ${currency}, gain ${payout} ${currency} (${outcomeLabel}).`
  });

  return {
    ok: true,
    gameId,
    bet: betValue,
    win: result.win,
    payout,
    multiplier,
    grossPayout,
    effectiveMultiplier,
    houseEdgePercent: Number(settings.houseEdgePercent || 0),
    balance: applied.balance,
    details: result
  };
};

const mergeDeep = (target, source) => {
  if (!source || typeof source !== "object") return target;
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (Array.isArray(value)) {
      target[key] = value;
    } else if (value && typeof value === "object") {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      mergeDeep(target[key], value);
    } else if (value !== undefined) {
      target[key] = value;
    }
  });
  return target;
};

export const getGamesSettings = async (guildId, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const row = await trx("games_settings").where({ guild_id: guild.id }).first();
  const defaults = getDefaultGamesConfig();
  if (!row) {
    const payload = { guild_id: guild.id, config: JSON.stringify(defaults), updated_at: new Date() };
    await trx("games_settings").insert(payload);
    return defaults;
  }
  let config = row.config || {};
  if (typeof config === "string") {
    try {
      config = JSON.parse(config);
    } catch {
      config = {};
    }
  }
  return mergeDeep(defaults, config);
};

export const saveGamesSettings = async (guildId, input, trx = db) => {
  const guild = await ensureGuild(guildId, trx);
  const defaults = getDefaultGamesConfig();
  const existingRow = await trx("games_settings").where({ guild_id: guild.id }).first();
  let existingConfig = {};
  if (existingRow?.config) {
    if (typeof existingRow.config === "string") {
      try {
        existingConfig = JSON.parse(existingRow.config) || {};
      } catch {
        existingConfig = {};
      }
    } else if (typeof existingRow.config === "object") {
      existingConfig = existingRow.config || {};
    }
  }

  const baseConfig = mergeDeep(JSON.parse(JSON.stringify(defaults)), existingConfig || {});
  const config = mergeDeep(JSON.parse(JSON.stringify(baseConfig)), input || {});
  const premiumPolicy = await getGamesPremiumPolicy(guildId);
  if (!premiumPolicy.moduleEnabled) {
    return baseConfig;
  }
  if (!premiumPolicy.advancedModesEnabled) {
    for (const mode of ADVANCED_GAME_MODES) {
      config[mode] = JSON.parse(JSON.stringify(baseConfig[mode] || defaults[mode] || {}));
    }
  }

  await trx("games_settings")
    .insert({ guild_id: guild.id, config: JSON.stringify(config), updated_at: new Date() })
    .onConflict("guild_id")
    .merge({ config: JSON.stringify(config), updated_at: new Date() });
  return config;
};
