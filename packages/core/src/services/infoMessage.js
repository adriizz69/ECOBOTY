import { db } from "./db.js";
import {
  ensureGuild,
  getAutomationConfig,
  getOrCreateSettings,
  getOrCreateTwitchDailySettings
} from "./economy.js";
import { getGamesSettings } from "./games.js";
import { listShops, getUserShopsSettings } from "./shop.js";
import { getTwitchSettings, getTwitchAutomationConfig } from "./twitch.js";
import { getBotSettings } from "./admin.js";
import { isGuildFeatureEnabled } from "./billing-entitlements.js";

const DEFAULT_SECTIONS = [
  "overview",
  "gains",
  "commands",
  "shops",
  "inventory",
  "market",
  "twitch",
  "rules",
  "summary"
];

const i18n = {
  fr: {
    title: "ECOBOTY - Guide rapide",
    headerTitle: ":money_with_wings: ÉCONOMIE DU SERVEUR – *{currency}*",
    overview: "Bienvenue dans l’économie du serveur **{guild}** :video_game:",
    overviewLine1: "Tout tourne autour de la monnaie **{currency} ({symbol})**.",
    overviewLine2: ":arrow_right: Tu peux en **gagner**, **acheter**, **ouvrir des lootboxes**, **revendre** des objets et **jouer** !",
    userUiLine: ":globe_with_meridians: Interface utilisateur : {url}",
    gainsTitle: "COMMENT GAGNER DES {symbol} ?",
    commandsTitle: "COMMANDES D’ÉCONOMIE",
    shopTitle: "COMMANDE SHOP",
    inventoryTitle: "INVENTAIRE & LOOTBOX",
    marketTitle: "MARCHÉ ENTRE JOUEURS",
    twitchTitle: "GAINS TWITCH",
    rulesTitle: "RÈGLES IMPORTANTES",
    summaryTitle: ":sparkles: Résumé",
    currencyName: "Monnaie",
    startBalance: "Solde de depart",
    maxBalance: "Limite max",
    dailyBase: "Daily (base)",
    dailyBonus: "Bonus 7/14/30j",
    commandsList: "Commandes",
    shopList: "Shops disponibles",
    shopDiscount: "Remise",
    shopRoles: "Roles requis",
    shopNoRoles: "Aucun",
    gamesConfig: "Parametres jeux",
    minBet: "Mise min",
    maxBet: "Mise max",
    cooldown: "Cooldown",
    houseEdge: "Commission",
    gameChances: "Chances",
    twitchDailyNote: "Pour activer le cumul Twitch: chaque viewer doit faire **!daily** une premiere fois.",
    noShops: "Aucun shop disponible.",
    noConfig: "Non configure.",
    yes: "Oui",
    no: "Non",
    currencyUnit: "Zizicoins",
    cmdShop: "/boutique",
    cmdBuy: "/acheter",
    cmdInventory: "/inventaire",
    cmdSale: "/vente",
    cmdLeaderboard: "/classement",
    cmdGames: "/jeux",
    cmdDaily: "/daily",
    cmdShopMember: "/boutique @membre",
    cmdShopMemberHelp: "voir et acheter dans la boutique d'un membre",
    separator: "------------------------------",
    titleUnderline: "------------------------------",
    gamesLine: ":tada: **Mini‑jeux** → gains et pertes selon la mise",
    boostsTitle: ":gem: **Boosts roles**",
    boostsNone: "Aucun boost role",
    channelBoostsTitle: "TAG SERVEUR",
    blockedAfk: ":no_entry_sign: **Salon AFK** → **Aucun gain**",
    rulesLine1: ":no_entry_sign: Spam / AFK farm = sanctions",
    rulesLine2: ":no_entry_sign: Multi‑comptes = sanctions",
    rulesLine3: ":arrows_counterclockwise: Les prix & stocks peuvent changer",
    summaryLine1: "**/daily** tous les jours",
    summaryLine2: "**/boutique** pour acheter",
    summaryLine3: "**/inventaire** pour gerer tes objets",
    summaryLine4: "**/vente** pour vendre/acheter",
    summaryLine5: "**/jeux** pour miser et gagner"
  },
  en: {
    headerTitle: ":money_with_wings: SERVER ECONOMY – *{currency}*",
    overview: "Welcome to the economy of **{guild}** :video_game:",
    overviewLine1: "Everything revolves around **{currency} ({symbol})**.",
    overviewLine2: ":arrow_right: You can **earn**, **buy**, **open lootboxes**, **resell** items and **play**!",
    userUiLine: ":globe_with_meridians: User interface: {url}",
    gainsTitle: "HOW TO EARN {symbol}",
    commandsTitle: "ECONOMY COMMANDS",
    shopTitle: "SHOP COMMAND",
    inventoryTitle: "INVENTORY & LOOTBOX",
    marketTitle: "PLAYER MARKET",
    twitchTitle: "TWITCH GAINS",
    rulesTitle: "IMPORTANT RULES",
    summaryTitle: ":sparkles: Summary",
    currencyName: "Currency",
    startBalance: "Start balance",
    maxBalance: "Max balance",
    dailyBase: "Daily (base)",
    dailyBonus: "Bonuses 7/14/30d",
    commandsList: "Commands",
    shopList: "Available shops",
    shopDiscount: "Discount",
    shopRoles: "Required roles",
    shopNoRoles: "None",
    gamesConfig: "Game settings",
    minBet: "Min bet",
    maxBet: "Max bet",
    cooldown: "Cooldown",
    houseEdge: "House edge",
    gameChances: "Chances",
    twitchDailyNote: "To enable Twitch earnings: each viewer must run **!daily** once.",
    noShops: "No shops available.",
    noConfig: "Not configured.",
    yes: "Yes",
    no: "No",
    currencyUnit: "Zizicoins",
    cmdShop: "/shop",
    cmdBuy: "/buy",
    cmdInventory: "/inventory",
    cmdSale: "/sale",
    cmdLeaderboard: "/leaderboard",
    cmdGames: "/games",
    cmdDaily: "/daily",
    cmdShopMember: "/shop @member",
    cmdShopMemberHelp: "view and buy from a member's shop",
    separator: "------------------------------",
    boostsTitle: ":gem: **Role boosts**",
    boostsNone: "No role boosts",
    channelBoostsTitle: "SERVER TAG",
    blockedAfk: ":no_entry_sign: **AFK channel** → **No gains**",
    rulesLine1: ":no_entry_sign: Spam / AFK farm = sanctions",
    rulesLine2: ":no_entry_sign: Multi‑accounts = sanctions",
    rulesLine3: ":arrows_counterclockwise: Prices & stocks may change",
    summaryLine1: "**/daily** every day",
    summaryLine2: "**/shop** to buy",
    summaryLine3: "**/inventory** to manage items",
    summaryLine4: "**/sale** to sell/buy",
    summaryLine5: "**/games** to bet and win"
  },
  es: {
    headerTitle: ":money_with_wings: ECONOMIA DEL SERVIDOR – *{currency}*",
    overview: "Bienvenido a la economia de **{guild}** :video_game:",
    overviewLine1: "Todo gira en torno a **{currency} ({symbol})**.",
    overviewLine2: ":arrow_right: Puedes **ganar**, **comprar**, **abrir lootboxes**, **revender** objetos y **jugar**!",
    userUiLine: ":globe_with_meridians: Interfaz de usuario: {url}",
    gainsTitle: "COMO GANAR {symbol}",
    commandsTitle: "COMANDOS DE ECONOMIA",
    shopTitle: "COMANDO SHOP",
    inventoryTitle: "INVENTARIO & LOOTBOX",
    marketTitle: "MERCADO ENTRE JUGADORES",
    twitchTitle: "GANANCIAS TWITCH",
    rulesTitle: "REGLAS IMPORTANTES",
    summaryTitle: ":sparkles: Resumen",
    currencyName: "Moneda",
    startBalance: "Saldo inicial",
    maxBalance: "Limite max",
    dailyBase: "Daily (base)",
    dailyBonus: "Bonos 7/14/30d",
    commandsList: "Comandos",
    shopList: "Tiendas disponibles",
    shopDiscount: "Descuento",
    shopRoles: "Roles requeridos",
    shopNoRoles: "Ninguno",
    gamesConfig: "Ajustes juegos",
    minBet: "Apuesta min",
    maxBet: "Apuesta max",
    cooldown: "Cooldown",
    houseEdge: "Comision",
    gameChances: "Probabilidades",
    twitchDailyNote: "Para activar ganancias Twitch: cada viewer debe usar **!daily** una vez.",
    noShops: "No hay tiendas disponibles.",
    noConfig: "No configurado.",
    yes: "Si",
    no: "No",
    currencyUnit: "Zizicoins",
    cmdShop: "/tienda",
    cmdBuy: "/comprar",
    cmdInventory: "/inventario",
    cmdSale: "/venta",
    cmdLeaderboard: "/clasificacion",
    cmdGames: "/juegos",
    cmdDaily: "/diario",
    cmdShopMember: "/tienda @miembro",
    cmdShopMemberHelp: "ver y comprar en la tienda de un miembro",
    separator: "------------------------------",
    boostsTitle: ":gem: **Boosts de roles**",
    boostsNone: "Sin boosts de roles",
    channelBoostsTitle: "TAG SERVIDOR",
    blockedAfk: ":no_entry_sign: **Canal AFK** → **Sin ganancias**",
    rulesLine1: ":no_entry_sign: Spam / AFK farm = sanciones",
    rulesLine2: ":no_entry_sign: Multi‑cuentas = sanciones",
    rulesLine3: ":arrows_counterclockwise: Precios y stocks pueden cambiar",
    summaryLine1: "**/diario** todos los dias",
    summaryLine2: "**/tienda** para comprar",
    summaryLine3: "**/inventario** para gestionar objetos",
    summaryLine4: "**/venta** para vender/comprar",
    summaryLine5: "**/juegos** para apostar y ganar"
  }
};

const resolveLang = (lang) => (i18n[lang] ? lang : "fr");

const parseJsonField = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

const normalizeSections = (sections) => {
  if (!Array.isArray(sections) || !sections.length) return DEFAULT_SECTIONS;
  return sections.filter(Boolean);
};

const normalizeShopIds = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id)).filter(Boolean);
};

const normalizeMessageIds = (value, fallbackId = null) => {
  let list = value;
  if (typeof list === "string") {
    const trimmed = list.trim();
    if (!trimmed) list = [];
    else {
      try {
        list = JSON.parse(trimmed);
      } catch {
        list = trimmed.includes(",") ? trimmed.split(",") : [trimmed];
      }
    }
  }
  const fromList = Array.isArray(list) ? list.map(String).filter(Boolean) : [];
  if (fromList.length) return [...new Set(fromList)];
  if (fallbackId) return [String(fallbackId)];
  return [];
};

const buildUserInterfaceUrl = () => {
  const base = String(process.env.BASE_URL || "").trim();
  if (!base) return "";
  try {
    const url = new URL(base);
    url.pathname = url.pathname.replace(/\/+$/, "") + "/user";
    return url.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}/user`;
  }
};

export const getInfoMessageSettings = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  const row = await db("guild_info_message_settings").where({ guild_id: guild.id }).first();
  if (!row) {
    return {
      channel_id: "",
      message_id: null,
      message_ids: [],
      sections: DEFAULT_SECTIONS,
      shop_ids: [],
      include_game_chances: false,
      include_shop_discounts: true,
      include_user_shop_command: false
    };
  }
  const messageIds = normalizeMessageIds(parseJsonField(row.message_ids, []), row.message_id);
  return {
    channel_id: row.channel_id || "",
    message_id: messageIds[0] || row.message_id || null,
    message_ids: messageIds,
    sections: normalizeSections(parseJsonField(row.sections, DEFAULT_SECTIONS)),
    shop_ids: normalizeShopIds(parseJsonField(row.shop_ids, [])),
    include_game_chances: row.include_game_chances === true,
    include_shop_discounts: row.include_shop_discounts !== false,
    include_user_shop_command: row.include_user_shop_command === true
  };
};

export const saveInfoMessageSettings = async (guildId, data = {}) => {
  const guild = await ensureGuild(guildId, db);
  const canCustomizeSections = await isGuildFeatureEnabled(guildId, "community_message_sections");
  const sections = canCustomizeSections ? normalizeSections(data.sections) : [...DEFAULT_SECTIONS];
  const payload = {
    guild_id: guild.id,
    channel_id: data.channel_id ? String(data.channel_id) : null,
    message_ids: data.message_ids ? JSON.stringify(data.message_ids) : undefined,
    sections: JSON.stringify(sections),
    shop_ids: JSON.stringify(normalizeShopIds(data.shop_ids)),
    include_game_chances: Boolean(data.include_game_chances),
    include_shop_discounts: data.include_shop_discounts !== false,
    include_user_shop_command: Boolean(data.include_user_shop_command),
    updated_at: new Date()
  };
  if (payload.message_ids === undefined) delete payload.message_ids;
  await db("guild_info_message_settings")
    .insert({
      ...payload,
      created_at: new Date()
    })
    .onConflict("guild_id")
    .merge(payload);
  return getInfoMessageSettings(guildId);
};

export const clearInfoMessageSettings = async (guildId) => {
  const guild = await ensureGuild(guildId, db);
  await db("guild_info_message_settings").where({ guild_id: guild.id }).del();
};

export const updateInfoMessageMessageId = async (guildId, messageId) => {
  const guild = await ensureGuild(guildId, db);
  await db("guild_info_message_settings")
    .where({ guild_id: guild.id })
    .update({ message_id: messageId ? String(messageId) : null, updated_at: new Date() });
};

export const updateInfoMessageMessageIds = async (guildId, messageIds = []) => {
  const guild = await ensureGuild(guildId, db);
  const normalized = normalizeMessageIds(messageIds);
  const payload = {
    message_ids: JSON.stringify(normalized),
    message_id: normalized.length ? String(normalized[0]) : null,
    updated_at: new Date()
  };
  const changed = await db("guild_info_message_settings").where({ guild_id: guild.id }).update(payload);
  if (!changed) {
    await db("guild_info_message_settings").insert({
      guild_id: guild.id,
      channel_id: null,
      sections: JSON.stringify(DEFAULT_SECTIONS),
      shop_ids: JSON.stringify([]),
      include_game_chances: false,
      include_shop_discounts: true,
      include_user_shop_command: false,
      created_at: new Date(),
      ...payload
    });
  }
};

const discordFetchMessage = async (channelId, messageId) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !channelId || !messageId) {
    return { exists: false, definitive: true, status: 0 };
  }
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json"
      }
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 404 || Number(body?.code) === 10008 || Number(body?.code) === 10003) {
      return { exists: false, definitive: true, status: res.status };
    }
    if (res.status === 401 || res.status === 403) {
      return { exists: false, definitive: true, status: res.status };
    }
    if (res.status === 429 || res.status >= 500) {
      return { exists: false, definitive: false, status: res.status };
    }
    if (!res.ok) {
      return { exists: false, definitive: true, status: res.status };
    }
    if (body?.id && String(body.id) === String(messageId)) {
      return { exists: true, definitive: true, status: res.status };
    }
    return { exists: false, definitive: true, status: res.status };
  } catch {
    return { exists: false, definitive: false, status: 0 };
  }
};

/** Drop message IDs that no longer exist on Discord (manual delete, purge, etc.). */
export const syncInfoMessagePresence = async (guildId) => {
  const settings = await getInfoMessageSettings(guildId);
  const ids = normalizeMessageIds(settings.message_ids, settings.message_id);

  if (!ids.length) {
    return { settings: { ...settings, message_ids: [], message_id: null }, missingDetected: false };
  }

  if (!settings.channel_id) {
    await updateInfoMessageMessageIds(guildId, []);
    const refreshed = await getInfoMessageSettings(guildId);
    return { settings: refreshed, missingDetected: true };
  }

  const alive = [];
  let definitiveMisses = 0;
  for (const messageId of ids) {
    const check = await discordFetchMessage(settings.channel_id, messageId);
    if (check.exists) {
      alive.push(messageId);
      continue;
    }
    if (check.definitive) {
      definitiveMisses += 1;
    } else {
      // Keep on transient Discord errors
      alive.push(messageId);
    }
  }

  const missingDetected = definitiveMisses > 0;
  if (missingDetected || alive.length !== ids.length) {
    await updateInfoMessageMessageIds(guildId, alive);
  }

  const refreshed = await getInfoMessageSettings(guildId);
  return { settings: refreshed, missingDetected };
};

/** Clear stored Discord message refs without deleting Discord messages. */
export const clearInfoMessageRefs = async (guildId) => {
  await updateInfoMessageMessageIds(guildId, []);
  return getInfoMessageSettings(guildId);
};

/** Called when Discord reports a community message was deleted. */
export const handleInfoMessageDeleted = async ({ guildDiscordId, channelId, messageId }) => {
  const guildId = String(guildDiscordId || "").trim();
  const deletedId = String(messageId || "").trim();
  if (!guildId || !deletedId) return { updated: false };

  const settings = await getInfoMessageSettings(guildId);
  if (channelId && settings.channel_id && String(settings.channel_id) !== String(channelId)) {
    return { updated: false };
  }

  const ids = normalizeMessageIds(settings.message_ids, settings.message_id);
  if (!ids.includes(deletedId)) return { updated: false };

  const next = ids.filter((id) => id !== deletedId);
  await updateInfoMessageMessageIds(guildId, next);
  return { updated: true, remaining: next.length };
};

const formatRoleMentions = (roleIds = []) => {
  if (!roleIds.length) return "";
  return roleIds.map((id) => `<@&${id}>`).join(", ");
};

const formatPercent = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0%";
  return `${number}%`;
};

const formatLine = (label, value, suffix = "") => {
  if (value === null || value === undefined || value === "") return null;
  return `- ${label}: **${value}${suffix}**`;
};

const buildGamesDetails = (dict, settings, includeChances) => {
  if (!settings) return [dict.noConfig];
  const lines = [
    formatLine(dict.minBet, settings.minBet),
    formatLine(dict.maxBet, settings.maxBet),
    formatLine(dict.cooldown, `${settings.cooldownSeconds}s`),
    formatLine(dict.houseEdge, formatPercent(settings.houseEdgePercent))
  ].filter(Boolean);

  if (includeChances) {
    if (settings.flip?.enabled !== false) {
      lines.push(`- CoinFlip: ${dict.gameChances} **${formatPercent(settings.flip.winChancePercent)}**`);
    }
    if (settings.dice?.enabled !== false) {
      lines.push(`- Dice: ${dict.gameChances} **${formatPercent(settings.dice.winChancePercent)}**`);
    }
    if (settings.higherLower?.enabled !== false) {
      lines.push(`- Higher/Lower: ${dict.gameChances} **${formatPercent(settings.higherLower.winChancePercent)}**`);
    }
    if (settings.double?.enabled !== false) {
      lines.push(`- Double: ${dict.gameChances} **${formatPercent(settings.double.winChancePercent)}**`);
    }
    if (settings.roulette?.enabled !== false) {
      const red = formatPercent(settings.roulette.red?.chance);
      const black = formatPercent(settings.roulette.black?.chance);
      const green = formatPercent(settings.roulette.green?.chance);
      lines.push(`- Roulette: ${red} / ${black} / ${green}`);
    }
  }

  return lines.filter(Boolean);
};

const buildShopsList = (dict, shops, selectedIds, includeDiscounts) => {
  const filtered = selectedIds.length
    ? shops.filter((shop) => selectedIds.includes(String(shop.id)))
    : shops;
  if (!filtered.length) return [dict.noShops];
  return filtered.map((shop) => {
    const roles = [];
    if (shop.required_role_ids) {
      try {
        const parsed = typeof shop.required_role_ids === "string" ? JSON.parse(shop.required_role_ids) : shop.required_role_ids;
        if (Array.isArray(parsed)) roles.push(...parsed);
      } catch {
        // ignore
      }
    }
    if (shop.required_role_id) roles.push(shop.required_role_id);
    const roleText = roles.length ? formatRoleMentions(roles) : dict.shopNoRoles;
    const discount = includeDiscounts ? ` | ${dict.shopDiscount}: ${formatPercent(shop.discount_percent)}` : "";
    return `- **${shop.name}**${discount} | ${dict.shopRoles}: ${roleText}`;
  });
};

export const buildInfoMessage = async ({ guildId, settings, allowLong = false }) => {
  const botSettings = await getBotSettings(guildId);
  const lang = resolveLang(String(botSettings?.bot_language || "fr"));
  const dict = i18n[lang];

  const guild = await ensureGuild(guildId, db);
  const economy = await getOrCreateSettings(guildId);
  const automation = await getAutomationConfig(guildId).catch(() => ({}));
  const games = await getGamesSettings(guildId).catch(() => null);
  const twitch = await getTwitchSettings(guildId).catch(() => null);
  const twitchAutomation = await getTwitchAutomationConfig(guildId).catch(() => null);
  const twitchDaily = await getOrCreateTwitchDailySettings(guildId).catch(() => null);
  const shops = await listShops(guildId, { enabledOnly: true });

  const currencyName = economy?.name || dict.currencyUnit;
  const currencyEmoji = economy?.emoji_symbol || "💰";
  const sections = normalizeSections(settings.sections);
  const shopIds = normalizeShopIds(settings.shop_ids);

  const parts = [];
  const headerTitle = dict.headerTitle.replace("{currency}", currencyName);
  parts.push(`${headerTitle} @everyone`);
  parts.push(dict.overview.replace("{guild}", guild?.name || "Serveur"));
  parts.push(dict.overviewLine1.replace("{currency}", currencyName).replace("{symbol}", currencyEmoji));
  parts.push(dict.overviewLine2);
  const userInterfaceUrl = buildUserInterfaceUrl();
  if (userInterfaceUrl) {
    parts.push(dict.userUiLine.replace("{url}", `<${userInterfaceUrl}>`));
  }
  parts.push(dict.separator);

  if (sections.includes("gains")) {
    const gains = [];
    const messageRule = automation?.rules?.message || {};
    const voiceRule = automation?.rules?.voice || {};
    gains.push(
      `- :envelope: **Messages** → **${messageRule.min_gain || 0} a ${messageRule.max_gain || 0} ${currencyEmoji} par message**`
    );
    gains.push(
      `- :microphone: **Vocal** → **${voiceRule.min_gain || 0} a ${voiceRule.max_gain || 0} ${currencyEmoji} toutes les ${voiceRule.interval || 0} minutes**`
    );
    gains.push(`- :gift: **Prime quotidienne** → **\`${dict.cmdDaily}\`**`);
    gains.push(
      `  - Base : **${economy?.daily_amount || 0} ${currencyEmoji}**`
    );
    gains.push(
      `  - Bonus 7j : **+${economy?.streak_7_bonus_percent || 0}%**`
    );
    gains.push(
      `  - Bonus 14j : **+${economy?.streak_14_bonus_percent || 0}%**`
    );
    gains.push(
      `  - Bonus 30j : **+${economy?.streak_30_bonus_percent || 0}%**`
    );
    gains.push(dict.gamesLine);

    const roleBoosters = Array.isArray(automation?.roleBoosters) ? automation.roleBoosters : [];
    if (roleBoosters.length) {
      gains.push(dict.boostsTitle);
      roleBoosters.forEach((booster) => {
        const mult = Number(booster.multiplier || 1);
        gains.push(`  - <@&${booster.role_id}> = **x${mult}**`);
      });
    } else {
      gains.push(`- ${dict.boostsTitle} → **${dict.boostsNone}**`);
    }

    const channelBoosters = Array.isArray(automation?.channelBoosters)
      ? automation.channelBoosters
      : [];
    if (channelBoosters.length) {
      const line = channelBoosters
        .map((booster) => `<#${booster.channel_id}> x${Number(booster.multiplier || 1)}`)
        .join(", ");
      gains.push(`- ${dict.channelBoostsTitle} : ${line}`);
    }

    if (Array.isArray(automation?.blockedChannels) && automation.blockedChannels.length) {
      gains.push(dict.blockedAfk);
    }

    parts.push(`## **${dict.gainsTitle.replace("{symbol}", currencyEmoji)}**`);
    parts.push(dict.titleUnderline);
    parts.push(gains.join("\n"));
    parts.push(dict.separator);
  }

  if (sections.includes("commands")) {
    parts.push(`## **${dict.commandsTitle}**`);
    parts.push(dict.titleUnderline);
    parts.push(`- **\`${dict.cmdDaily}\`** → ${dict.dailyBase}`);
    parts.push(`- **\`${dict.cmdLeaderboard}\`** → classement des plus riches`);
    parts.push(`- **\`${dict.cmdGames}\`** → mini‑jeux de paris`);
    const userShopsEnabled = await isGuildFeatureEnabled(guildId, "economy_user_shops");
    const userShopSettings = userShopsEnabled ? await getUserShopsSettings(guildId).catch(() => null) : null;
    if (
      settings.include_user_shop_command === true &&
      userShopsEnabled &&
      userShopSettings?.enabled
    ) {
      parts.push(`- **\`${dict.cmdShopMember}\`** → ${dict.cmdShopMemberHelp}`);
    }
    parts.push(dict.separator);
  }

  if (sections.includes("shops")) {
    parts.push(`## **${dict.shopTitle}**`);
    parts.push(dict.titleUnderline);
    parts.push(`:point_right: **\`${dict.cmdShop}\`**`);
    parts.push(`${dict.shopList} :`);
    const lines = buildShopsList(dict, shops, shopIds, settings.include_shop_discounts !== false);
    parts.push(lines.join("\n"));
    parts.push(`:arrow_right: **Tout se passe via \`${dict.cmdShop}\` !**`);
    parts.push(dict.separator);
  }

  if (sections.includes("inventory")) {
    parts.push(`## **${dict.inventoryTitle}**`);
    parts.push(dict.titleUnderline);
    parts.push(`- **\`${dict.cmdInventory}\`** → voir tes objets`);
    parts.push(`- Lootbox ouvrable directement depuis \`${dict.cmdInventory}\``);
    parts.push(dict.separator);
  }

  if (sections.includes("market")) {
    parts.push(`## **${dict.marketTitle}**`);
    parts.push(dict.titleUnderline);
    parts.push(`- **\`${dict.cmdSale}\`** → acheter / vendre un objet d’inventaire`);
    parts.push("- Tu fixes librement ton prix");
    parts.push(dict.separator);
  }

  if (sections.includes("twitch")) {
    parts.push(`## **${dict.twitchTitle}**`);
    parts.push(dict.titleUnderline);
    if (twitchAutomation?.rules?.message) {
      parts.push(
        `- **Messages** → **${twitchAutomation.rules.message.min_gain || 0} a ${twitchAutomation.rules.message.max_gain || 0} ${currencyEmoji} par message**`
      );
    }
    if (twitchAutomation?.rules?.watch) {
      parts.push(
        `- **Visionnage** → **${twitchAutomation.rules.watch.min_gain || 0} a ${twitchAutomation.rules.watch.max_gain || 0} ${currencyEmoji} toutes les ${twitchAutomation.rules.watch.interval || 0} minutes**`
      );
    }
    if (twitchAutomation?.multipliers) {
      const m = twitchAutomation.multipliers;
      parts.push(
        `- **Multiplicateurs** : Prime = **x${m.prime?.value || 1}**, T1 = **x${m.t1?.value || 1}**, T2 = **x${m.t2?.value || 1}**, T3 = **x${m.t3?.value || 1}**`
      );
    }
    if (twitchAutomation?.events) {
      const e = twitchAutomation.events;
      parts.push("- **Recompenses ponctuelles** :");
      parts.push(`  - Sub T1 : **+${e.sub_t1?.amount || 0}**`);
      parts.push(`  - Sub T2 : **+${e.sub_t2?.amount || 0}**`);
      parts.push(`  - Sub T3 : **+${e.sub_t3?.amount || 0}**`);
      parts.push(`  - Subgift T1 : **+${e.subgift_t1?.amount || 0}**`);
      parts.push(`  - Subgift T2 : **+${e.subgift_t2?.amount || 0}**`);
      parts.push(`  - Subgift T3 : **+${e.subgift_t3?.amount || 0}**`);
      parts.push(`  - Bits (par 100) : **+${e.bits?.amount || 0}**`);
    }
    if (twitchDaily) {
      parts.push(`- :gift: **Prime quotidienne** → **\`!daily\`**`);
      parts.push(`  - Base : **${twitchDaily.daily_amount || 0} ${currencyEmoji}**`);
      parts.push(`  - Bonus 7j : **+${twitchDaily.streak_7_bonus_percent || 0}%**`);
      parts.push(`  - Bonus 14j : **+${twitchDaily.streak_14_bonus_percent || 0}%**`);
      parts.push(`  - Bonus 30j : **+${twitchDaily.streak_30_bonus_percent || 0}%**`);
    }
    parts.push(dict.twitchDailyNote);
    parts.push(dict.separator);
  }

  if (sections.includes("rules")) {
    parts.push(`## **${dict.rulesTitle}**`);
    parts.push(dict.titleUnderline);
    parts.push(`- ${dict.rulesLine1}`);
    parts.push(`- ${dict.rulesLine2}`);
    parts.push(`- ${dict.rulesLine3}`);
    parts.push(dict.separator);
  }

  if (sections.includes("summary")) {
    parts.push(`## **${dict.summaryTitle}**`);
    parts.push(dict.titleUnderline);
    parts.push(`- ${dict.summaryLine1}`);
    parts.push(`- ${dict.summaryLine2}`);
    parts.push(`- ${dict.summaryLine3}`);
    parts.push(`- ${dict.summaryLine4}`);
    parts.push(`- ${dict.summaryLine5}`);
  }

  const contentFull = parts.filter(Boolean).join("\n");
  const maxLen = 2000;
  let content = contentFull;
  if (!allowLong && content.length > maxLen) {
    content = `${content.slice(0, maxLen - 3).trimEnd()}...`;
  }
  return { content, length: content.length, fullLength: contentFull.length, lang, parts };
};

const chunkBySections = (sections = [], limit = 2000) => {
  const chunks = [];
  let current = "";
  const pushCurrent = () => {
    if (current.trim().length) chunks.push(current.trim());
    current = "";
  };
  sections.forEach((section) => {
    const next = current ? `${current}\n${section}` : section;
    if (next.length <= limit) {
      current = next;
    } else {
      pushCurrent();
      if (section.length <= limit) {
        current = section;
      } else {
        // Hard split if a single section is too long
        let start = 0;
        while (start < section.length) {
          const slice = section.slice(start, start + limit);
          chunks.push(slice.trim());
          start += limit;
        }
      }
    }
  });
  pushCurrent();
  return chunks;
};

export const buildInfoMessageChunks = async ({ guildId, settings }) => {
  const result = await buildInfoMessage({ guildId, settings, allowLong: true });
  const chunks = chunkBySections(result.parts || []);
  return { chunks, lang: result.lang, fullLength: result.fullLength };
};

export const sendInfoMessage = async ({ guildId, channelId, settings }) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("bot_token_missing");
  const payload = await buildInfoMessageChunks({ guildId, settings });
  if (!payload.chunks.length) throw new Error("message_too_long");
  let firstMessageId = null;
  const messageIds = [];
  for (const chunk of payload.chunks) {
    const res = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: chunk })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = JSON.stringify(err);
      throw new Error(`discord_message_send_failed:${detail}`);
    }
    const sent = await res.json();
    if (!firstMessageId && sent?.id) firstMessageId = sent.id;
    if (sent?.id) messageIds.push(sent.id);
  }
  return { messageId: firstMessageId || null, messageIds, length: payload.fullLength };
};

export const updateInfoMessage = async ({ guildId, channelId, settings, existingMessageIds = [] }) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("bot_token_missing");
  const payload = await buildInfoMessageChunks({ guildId, settings });
  if (!payload.chunks.length) throw new Error("message_too_long");

  const previousIds = normalizeMessageIds(existingMessageIds);
  const messageIds = [];
  const discordHeaders = {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json"
  };

  const createChunk = async (chunk) => {
    const createRes = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: discordHeaders,
      body: JSON.stringify({ content: chunk })
    });
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(`discord_message_update_failed:${JSON.stringify(err)}`);
    }
    const sent = await createRes.json();
    if (!sent?.id) throw new Error("discord_message_update_failed:missing_id");
    return String(sent.id);
  };

  for (let i = 0; i < payload.chunks.length; i += 1) {
    const chunk = payload.chunks[i];
    const existingId = previousIds[i] || null;
    if (existingId) {
      const patchRes = await fetch(`https://discord.com/api/channels/${channelId}/messages/${existingId}`, {
        method: "PATCH",
        headers: discordHeaders,
        body: JSON.stringify({ content: chunk })
      });
      if (patchRes.ok) {
        messageIds.push(String(existingId));
        continue;
      }
      // Message deleted manually (or wrong channel) → recreate this chunk.
      if (patchRes.status !== 404) {
        const err = await patchRes.json().catch(() => ({}));
        throw new Error(`discord_message_update_failed:${JSON.stringify(err)}`);
      }
    }
    messageIds.push(await createChunk(chunk));
  }

  for (let i = payload.chunks.length; i < previousIds.length; i += 1) {
    await fetch(`https://discord.com/api/channels/${channelId}/messages/${previousIds[i]}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${botToken}` }
    }).catch(() => null);
  }

  return {
    messageId: messageIds[0] || null,
    messageIds,
    length: payload.fullLength,
    updated: true
  };
};
