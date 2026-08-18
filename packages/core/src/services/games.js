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

export const SLOT_SYMBOL_CATALOG = ["💎", "🍒", "⭐", "🍋", "🍇", "🍉", "🔔", "🍀", "💰", "👑", "🔥", "🎰"];

const sanitizeSlotSymbols = (list) => {
  const allowed = new Set(SLOT_SYMBOL_CATALOG);
  const next = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const symbol = String(raw || "").trim();
    if (!allowed.has(symbol) || next.includes(symbol)) continue;
    next.push(symbol);
  }
  return next.length >= 3 ? next : SLOT_SYMBOL_CATALOG.slice(0, 4);
};

const sanitizeSlotPayouts = (payouts, symbols) => {
  const allowed = new Set(symbols);
  const fallback = symbols[0] || "💎";
  const rows = (Array.isArray(payouts) ? payouts : [])
    .map((row) => {
      const parts = Array.from(String(row?.combo || ""));
      const combo = [0, 1, 2].map((index) => (allowed.has(parts[index]) ? parts[index] : fallback)).join("");
      return { combo, multiplier: Math.max(0, Number(row?.multiplier || 0)) };
    })
    .filter((row) => row.combo);
  return rows.length ? rows : [{ combo: `${fallback}${fallback}${fallback}`, multiplier: 10 }];
};

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

const mapRouletteColor = (choice) => {
  const value = normalizeChoice(choice);
  if (value === "rouge" || value === "red") return "red";
  if (value === "noir" || value === "black") return "black";
  if (value === "vert" || value === "green") return "green";
  return value;
};

const crashStep = (speed) => (speed === "fast" ? 0.2 : speed === "slow" ? 0.05 : 0.1);

const resolveFlip = (config, choice) => {
  const result = randomFloat() < 0.5 ? "pile" : "face";
  const win = result === normalizeChoice(choice);
  const jackpotEnabled = config.jackpotEnabled !== false;
  const jackpot = win && jackpotEnabled && rollPercent() < Number(config.jackpotChancePercent || 0);
  const multiplier = win
    ? jackpot
      ? Number(config.jackpotMultiplier || 0)
      : Number(config.winMultiplier || 0)
    : 0;
  return { win, result, jackpot, multiplier };
};

const resolveDice = (config, choice) => {
  const sides = Math.max(2, Number(config.sides || 6));
  const selected = Math.min(sides, Math.max(1, Number(choice || 1)));
  const roll = cryptoRandomInt(1, sides + 1);
  const win = roll === selected;
  return { win, roll, multiplier: win ? Number(config.winMultiplier || 0) : 0 };
};

const resolveRoulette = (config, choice) => {
  const redChance = Math.max(0, Number(config.red?.chance || 0));
  const blackChance = Math.max(0, Number(config.black?.chance || 0));
  const greenChance = Math.max(0, Number(config.green?.chance || 0));
  const total = redChance + blackChance + greenChance || 100;
  const roll = randomFloat() * total;
  let color = "green";
  if (roll < redChance) color = "red";
  else if (roll < redChance + blackChance) color = "black";
  const picked = mapRouletteColor(choice);
  const win = picked === color;
  const multiplier = win ? Number(config[color]?.multiplier || 0) : 0;
  return { win, color, multiplier };
};

const resolveHigherLower = (config, choice) => {
  const max = Math.max(2, Number(config.maxNumber || 10));
  const isPlus = normalizeChoice(choice) === "plus";
  const current = cryptoRandomInt(1, max + 1);
  const next = cryptoRandomInt(1, max + 1);
  const win = isPlus ? next > current : next < current;
  return { win, current, next, multiplier: win ? Number(config.winMultiplier || 0) : 0 };
};

const resolveDouble = (config) => {
  const chance = Math.min(100, Math.max(0, Number(config.winChancePercent || 50)));
  const win = rollPercent() < chance;
  return { win, multiplier: win ? Number(config.multiplier || 0) : 0 };
};

const resolveSlot = (config) => {
  const symbols = sanitizeSlotSymbols(config.symbols);
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
  const step = crashStep(speed);
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
  const win = cash <= multiplier;
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

const resolveConfiguredRound = (gameId, game, { choice, cashout, normalizedChoice } = {}) => {
  const picked = normalizedChoice ?? normalizeChoice(choice);
  switch (String(gameId || "")) {
    case "flip":
      if (!["pile", "face"].includes(picked)) return { ok: false, reason: "invalid_choice" };
      return { ok: true, result: resolveFlip(game, picked) };
    case "dice": {
      const selected = Number(choice);
      if (!selected || selected < 1 || selected > Number(game.sides || 6)) {
        return { ok: false, reason: "invalid_choice" };
      }
      return { ok: true, result: resolveDice(game, selected) };
    }
    case "roulette":
      if (!["rouge", "noir", "vert", "red", "black", "green"].includes(picked)) {
        return { ok: false, reason: "invalid_choice" };
      }
      return { ok: true, result: resolveRoulette(game, mapRouletteColor(picked)) };
    case "higherLower":
      if (!["plus", "moins"].includes(picked)) return { ok: false, reason: "invalid_choice" };
      return { ok: true, result: resolveHigherLower(game, picked) };
    case "crash": {
      const max = Number(game.maxMultiplier || 20);
      const cash = Number(cashout || choice || 1);
      if (!cash || cash < 1 || cash > max) return { ok: false, reason: "invalid_choice" };
      return { ok: true, result: resolveCrash(game, cash) };
    }
    case "double":
      return { ok: true, result: resolveDouble(game) };
    case "slot":
      return { ok: true, result: resolveSlot(game) };
    case "mystery":
      return { ok: true, result: resolveMystery(game) };
    default:
      return { ok: false, reason: "unknown_game" };
  }
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
  if (!game || game.enabled === false || isChanceBlockedGame(gameId, game)) {
    return { ok: false, reason: "game_disabled" };
  }

  const betValue = Number(bet || 0);
  const minBet = Number(settings.minBet || 0);
  const maxBet = Number(settings.maxBet || 0);
  if (!Number.isFinite(betValue) || betValue <= 0) {
    return { ok: false, reason: "invalid_bet", minBet, maxBet };
  }
  if (betValue < minBet) return { ok: false, reason: "min_bet", minBet, maxBet };
  if (maxBet > 0 && betValue > maxBet) return { ok: false, reason: "max_bet", minBet, maxBet };

  const key = getCooldownKey(guildId, userId);
  const lastAt = cooldownMap.get(key) || 0;
  const cooldownMs = Math.max(0, Number(settings.cooldownSeconds || 0)) * 1000;
  if (cooldownMs > 0 && nowMs() - lastAt < cooldownMs) {
    const retryIn = Math.ceil((cooldownMs - (nowMs() - lastAt)) / 1000);
    return { ok: false, reason: "cooldown", retryIn };
  }

  const normalizedChoice = normalizeChoice(choice);
  const resolved = resolveConfiguredRound(gameId, game, { choice, cashout, normalizedChoice });
  if (!resolved.ok) return resolved;
  const result = resolved.result;

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

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const houseKeepRate = (edgePercent) => Math.max(0, 1 - Math.max(0, Number(edgePercent || 0)) / 100);

const crashTicksToCashout = (config, cashout) => {
  const maxMultiplier = Math.max(1, Number(config.maxMultiplier || 20));
  const step = crashStep(String(config.speed || "normal"));
  const cash = Math.max(1, Number(cashout || 1));
  let multiplier = 1;
  let ticks = 0;
  while (multiplier < maxMultiplier && multiplier + 1e-9 < cash) {
    ticks += 1;
    multiplier = Math.min(maxMultiplier, Number((multiplier + step).toFixed(2)));
  }
  return ticks;
};

const expectedSlotStats = (config) => {
  const symbols = sanitizeSlotSymbols(config?.symbols);
  const payouts = sanitizeSlotPayouts(config?.payouts, symbols);
  const n = symbols.length;
  const total = n * n * n;
  const twoKind = Number(config?.twoOfKindMultiplier || 0);
  let wins = 0;
  let expectedMultiplier = 0;
  for (let a = 0; a < n; a += 1) {
    for (let b = 0; b < n; b += 1) {
      for (let c = 0; c < n; c += 1) {
        const result = [symbols[a], symbols[b], symbols[c]];
        const combo = result.join("");
        const payoutMatch = payouts.find((row) => row.combo === combo);
        let multiplier = 0;
        if (payoutMatch) {
          multiplier = Number(payoutMatch.multiplier || 0);
        } else if (result[0] === result[1] || result[0] === result[2] || result[1] === result[2]) {
          multiplier = twoKind;
        }
        expectedMultiplier += multiplier;
        if (multiplier > 0) wins += 1;
      }
    }
  }
  return {
    winChancePercent: total ? (100 * wins) / total : 0,
    expectedMultiplier: total ? expectedMultiplier / total : 0
  };
};

const CHANCE_TOTAL_EPS = 0.05;

export const rouletteChanceTotal = (config = {}) =>
  Math.max(0, Number(config.red?.chance || 0)) +
  Math.max(0, Number(config.black?.chance || 0)) +
  Math.max(0, Number(config.green?.chance || 0));

export const mysteryChanceTotal = (config = {}) =>
  (Array.isArray(config.outcomes) ? config.outcomes : []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.chance || 0)),
    0
  );

export const chanceTotalStatus = (total) => {
  const n = Number(total || 0);
  if (!Number.isFinite(n) || Math.abs(n - 100) <= CHANCE_TOTAL_EPS) return "ok";
  return n > 100 ? "over" : "under";
};

const applyChanceIntegrity = (config) => {
  if (!config || typeof config !== "object") return config;
  if (chanceTotalStatus(rouletteChanceTotal(config.roulette)) !== "ok" && config.roulette) {
    config.roulette.enabled = false;
  }
  if (chanceTotalStatus(mysteryChanceTotal(config.mystery)) !== "ok" && config.mystery) {
    config.mystery.enabled = false;
  }
  return config;
};

const isChanceBlockedGame = (gameId, game) => {
  if (gameId === "roulette") return chanceTotalStatus(rouletteChanceTotal(game)) !== "ok";
  if (gameId === "mystery") return chanceTotalStatus(mysteryChanceTotal(game)) !== "ok";
  return false;
};

export const normalizeGamesConfig = (input) => {
  const defaults = getDefaultGamesConfig();
  const config = mergeDeep(JSON.parse(JSON.stringify(defaults)), input || {});
  const minBet = Math.max(1, Number(config.minBet || defaults.minBet || 1));
  const maxBet = Math.max(minBet, Number(config.maxBet || defaults.maxBet || minBet));
  config.minBet = minBet;
  config.maxBet = maxBet;
  config.cooldownSeconds = Math.max(0, Number(config.cooldownSeconds || 0));
  config.houseEdgePercent = Math.min(50, Math.max(0, Number(config.houseEdgePercent || 0)));
  config.flip.winChancePercent = 50;
  const sides = Math.max(2, Math.min(20, Number(config.dice?.sides || 6)));
  config.dice.sides = sides;
  config.dice.winChancePercent = round2(100 / sides);
  const maxNumber = Math.max(2, Number(config.higherLower?.maxNumber || 10));
  config.higherLower.maxNumber = maxNumber;
  config.higherLower.winChancePercent = round2(((maxNumber - 1) / (2 * maxNumber)) * 100);
  config.slot.symbols = sanitizeSlotSymbols(config.slot?.symbols);
  config.slot.payouts = sanitizeSlotPayouts(config.slot?.payouts, config.slot.symbols);
  if (!Array.isArray(config.mystery?.outcomes) || !config.mystery.outcomes.length) {
    config.mystery.outcomes = JSON.parse(JSON.stringify(defaults.mystery.outcomes || []));
  }
  return config;
};

export const theoreticalWinChancePercent = (gameId, config, { choice, cashout } = {}) => {
  const game = config || {};
  switch (String(gameId || "")) {
    case "flip":
      return 50;
    case "dice": {
      const sides = Math.max(2, Number(game.sides || 6));
      return 100 / sides;
    }
    case "roulette": {
      const color = mapRouletteColor(choice || "red");
      const red = Math.max(0, Number(game.red?.chance || 0));
      const black = Math.max(0, Number(game.black?.chance || 0));
      const green = Math.max(0, Number(game.green?.chance || 0));
      const total = red + black + green || 100;
      const weight = color === "black" ? black : color === "green" ? green : red;
      return (100 * weight) / total;
    }
    case "higherLower": {
      const max = Math.max(2, Number(game.maxNumber || 10));
      return ((max - 1) / (2 * max)) * 100;
    }
    case "double":
      return Math.min(100, Math.max(0, Number(game.winChancePercent || 50)));
    case "crash": {
      const p = Math.min(100, Math.max(0, Number(game.crashChancePerTickPercent || 0))) / 100;
      const ticks = crashTicksToCashout(game, cashout);
      return (100 * (1 - p) ** ticks);
    }
    case "slot":
      return expectedSlotStats(game).winChancePercent;
    case "mystery": {
      const outcomes = Array.isArray(game.outcomes) ? game.outcomes : [];
      const total = outcomes.reduce((sum, row) => sum + Math.max(0, Number(row.chance || 0)), 0);
      if (total <= 0) return 0;
      const wins = outcomes.reduce(
        (sum, row) => sum + (Number(row.multiplier || 0) > 0 ? Math.max(0, Number(row.chance || 0)) : 0),
        0
      );
      return (100 * wins) / total;
    }
    default:
      return 0;
  }
};

export const expectedGameStats = (gameId, settings, { choice, cashout } = {}) => {
  const game = settings?.[gameId] || {};
  const keep = houseKeepRate(settings?.houseEdgePercent);
  let winChancePercent = theoreticalWinChancePercent(gameId, game, { choice, cashout });
  let expectedMultiplier = 0;
  switch (String(gameId || "")) {
    case "flip": {
      const jackpotEnabled = game.jackpotEnabled !== false;
      const jackpotChance = jackpotEnabled ? Math.min(100, Math.max(0, Number(game.jackpotChancePercent || 0))) / 100 : 0;
      const winMultiplier = Number(game.winMultiplier || 0);
      const jackpotMultiplier = Number(game.jackpotMultiplier || 0);
      expectedMultiplier = 0.5 * ((1 - jackpotChance) * winMultiplier + jackpotChance * jackpotMultiplier);
      break;
    }
    case "dice":
      expectedMultiplier = (winChancePercent / 100) * Number(game.winMultiplier || 0);
      break;
    case "roulette": {
      const color = mapRouletteColor(choice || "red");
      expectedMultiplier = (winChancePercent / 100) * Number(game[color]?.multiplier || 0);
      break;
    }
    case "higherLower":
      expectedMultiplier = (winChancePercent / 100) * Number(game.winMultiplier || 0);
      break;
    case "double":
      expectedMultiplier = (winChancePercent / 100) * Number(game.multiplier || 0);
      break;
    case "crash":
      expectedMultiplier = (winChancePercent / 100) * Math.max(1, Number(cashout || 1));
      break;
    case "slot":
      expectedMultiplier = expectedSlotStats(game).expectedMultiplier;
      break;
    case "mystery": {
      const outcomes = Array.isArray(game.outcomes) ? game.outcomes : [];
      const total = outcomes.reduce((sum, row) => sum + Math.max(0, Number(row.chance || 0)), 0);
      expectedMultiplier = total
        ? outcomes.reduce((sum, row) => sum + Number(row.multiplier || 0) * Math.max(0, Number(row.chance || 0)), 0) / total
        : 0;
      break;
    }
    default:
      break;
  }
  return {
    winChancePercent: round2(winChancePercent),
    expectedRtpPercent: round2(expectedMultiplier * keep * 100)
  };
};

const defaultSimParams = (gameId, game) => {
  switch (String(gameId || "")) {
    case "flip":
      return { choice: "pile" };
    case "dice":
      return { choice: 1 };
    case "roulette":
      return { choice: "red" };
    case "higherLower":
      return { choice: "plus" };
    case "crash":
      return { cashout: Math.min(2, Math.max(1, Number(game?.maxMultiplier || 20))) };
    default:
      return {};
  }
};

const classifyOdds = (expectedRtp, rounds, expectedWin, observedWin) => {
  let economy = "ok";
  if (expectedRtp >= 108) economy = "generous";
  else if (expectedRtp > 102) economy = "slightly_generous";
  else if (expectedRtp <= 70) economy = "harsh";
  const p = Math.min(1, Math.max(0, Number(expectedWin || 0) / 100));
  const se = Math.sqrt((p * (1 - p)) / Math.max(1, rounds)) * 100;
  const delta = Math.abs(Number(observedWin || 0) - Number(expectedWin || 0));
  let sample = "matches";
  if (rounds < 100) sample = "small_sample";
  else if (delta > 2.8 * Math.max(se, 0.15) + 0.4) sample = "off";
  return { economy, sample };
};

export const GAME_SIM_ROUND_OPTIONS = [10, 20, 50, 100, 1000, 5000];

export const simulateGameRounds = ({ configInput, gameId, rounds, bet, choice, cashout } = {}) => {
  const id = String(gameId || "");
  if (!GAME_MODE_ORDER.includes(id)) return { ok: false, reason: "unknown_game" };
  const n = Number(rounds);
  if (!GAME_SIM_ROUND_OPTIONS.includes(n)) return { ok: false, reason: "invalid_rounds" };
  const settings = normalizeGamesConfig(configInput || {});
  const game = settings[id];
  const defaults = defaultSimParams(id, game);
  let simChoice = choice == null || choice === "" ? defaults.choice : choice;
  let simCashout = cashout == null || cashout === "" ? defaults.cashout : cashout;
  const betValue = Math.max(1, Number(bet || settings.minBet || 10));
  const tryRound = (picked, cash) =>
    resolveConfiguredRound(id, game, {
      choice: picked,
      cashout: cash,
      normalizedChoice: normalizeChoice(picked)
    });
  let probe = tryRound(simChoice, simCashout);
  if (!probe.ok) {
    simChoice = defaults.choice;
    simCashout = defaults.cashout;
    probe = tryRound(simChoice, simCashout);
  }
  if (!probe.ok) return probe;

  let wins = 0;
  let jackpots = 0;
  let totalPayout = 0;
  for (let i = 0; i < n; i += 1) {
    const round = tryRound(simChoice, simCashout);
    if (!round.ok) return round;
    const result = round.result;
    if (result.win) wins += 1;
    if (result.jackpot) jackpots += 1;
    const gross = result.win ? betValue * Number(result.multiplier || 0) : 0;
    totalPayout += applyHouseEdge(gross, settings.houseEdgePercent);
  }

  const expected = expectedGameStats(id, settings, { choice: simChoice, cashout: simCashout });
  const observedWinRate = round2((100 * wins) / n);
  const observedRtp = round2((100 * totalPayout) / (betValue * n));
  const totalBet = betValue * n;
  const net = totalPayout - totalBet;
  const verdict = classifyOdds(expected.expectedRtpPercent, n, expected.winChancePercent, observedWinRate);

  return {
    ok: true,
    recap: {
      gameId: id,
      rounds: n,
      bet: betValue,
      choice: simChoice ?? null,
      cashout: simCashout ?? null,
      wins,
      losses: n - wins,
      jackpots,
      observedWinRate,
      expectedWinRate: expected.winChancePercent,
      observedRtp,
      expectedRtp: expected.expectedRtpPercent,
      totalBet,
      totalPayout,
      net,
      houseEdgePercent: Number(settings.houseEdgePercent || 0),
      verdict
    }
  };
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
  return applyChanceIntegrity(mergeDeep(defaults, config));
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
  const config = normalizeGamesConfig(mergeDeep(JSON.parse(JSON.stringify(baseConfig)), input || {}));
  const rouletteStatus = chanceTotalStatus(rouletteChanceTotal(config.roulette));
  const mysteryStatus = chanceTotalStatus(mysteryChanceTotal(config.mystery));
  if (rouletteStatus === "under" || mysteryStatus === "under") {
    const error = new Error("chance_total_under");
    error.code = "chance_total_under";
    error.details = {
      roulette: rouletteStatus,
      mystery: mysteryStatus,
      rouletteTotal: round2(rouletteChanceTotal(config.roulette)),
      mysteryTotal: round2(mysteryChanceTotal(config.mystery))
    };
    throw error;
  }
  if (rouletteStatus === "over") config.roulette.enabled = false;
  if (mysteryStatus === "over") config.mystery.enabled = false;
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
