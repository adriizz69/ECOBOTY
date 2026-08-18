import { db } from "./db.js";
import { ensureGuild, getOrCreateSettings } from "./economy.js";
import { resolveLogsPolicyWindow } from "./billing-entitlements.js";

const CREATION_SOURCES = new Set([
  "message",
  "voice",
  "manual",
  "daily",
  "achievement",
  "twitch_message",
  "twitch_watch",
  "twitch_sub",
  "twitch_subgift",
  "twitch_bits",
  "twitch_daily",
  "lootbox",
  "topgg"
]);

const TWITCH_SOURCES = new Set([
  "twitch_message",
  "twitch_watch",
  "twitch_sub",
  "twitch_subgift",
  "twitch_bits",
  "twitch_daily"
]);

const parseJson = (value) => {
  if (value == null) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
};

const toDayKey = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const enumerateDays = (fromKey, toKey) => {
  const days = [];
  const cursor = new Date(`${fromKey}T00:00:00.000Z`);
  const end = new Date(`${toKey}T00:00:00.000Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return days;
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

const bumpMap = (map, key, field, amount) => {
  const id = String(key || "").trim();
  if (!id) return;
  const current = map.get(id) || { id, count: 0, volume: 0 };
  current.count += 1;
  current.volume += Number(amount || 0);
  if (field) current[field] = (current[field] || 0) + Number(amount || 0);
  map.set(id, current);
};

const topEntries = (map, limit = 8) =>
  [...map.values()]
    .sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0) || Number(b.count || 0) - Number(a.count || 0))
    .slice(0, limit);

export const getGuildEconomyStats = async (guildDiscordId, { days: requestedDays = 30 } = {}) => {
  const guild = await ensureGuild(guildDiscordId, db);
  const settings = await getOrCreateSettings(guildDiscordId, db);
  const logsPolicy = await resolveLogsPolicyWindow({
    guildId: guildDiscordId,
    requestedLimit: 25000,
    maxLimit: 25000
  });

  const maxDays = Number(logsPolicy.historyDays || 90);
  const wanted = Math.max(1, Math.min(365, Math.trunc(Number(requestedDays) || 30)));
  const days = Number.isFinite(maxDays) && maxDays > 0 ? Math.min(wanted, maxDays) : wanted;

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);

  const rangeFilter = (query) => {
    query.andWhere("created_at", ">=", from);
    if (logsPolicy.minCreatedAt) {
      query.andWhere("created_at", ">=", logsPolicy.minCreatedAt);
    }
    return query;
  };

  const [
    balanceRow,
    holdersRow,
    inventoryQtyRow,
    inventoryMembersRow,
    gainBySource,
    gainByDay,
    topPositive,
    topNegative,
    eventRows
  ] = await Promise.all([
    db("balances").where({ guild_id: guild.id }).sum({ total: "balance" }).first(),
    db("balances").where({ guild_id: guild.id }).where("balance", ">", 0).count({ count: "*" }).first(),
    db("inventory").where({ guild_id: guild.id }).sum({ total: "quantity" }).first(),
    db("inventory").where({ guild_id: guild.id }).countDistinct("user_discord_id as members").first(),
    rangeFilter(
      db("economy_gain_logs")
        .where({ guild_id: guild.id })
        .select("source")
        .select(
          db.raw("SUM(CASE WHEN total_amount > 0 THEN total_amount ELSE 0 END) as gained"),
          db.raw("SUM(CASE WHEN total_amount < 0 THEN -total_amount ELSE 0 END) as spent"),
          db.raw("COUNT(*) as count")
        )
        .groupBy("source")
    ),
    rangeFilter(
      db("economy_gain_logs")
        .where({ guild_id: guild.id })
        .select(db.raw("DATE(created_at) as day"))
        .select(
          db.raw("SUM(CASE WHEN total_amount > 0 THEN total_amount ELSE 0 END) as gained"),
          db.raw("SUM(CASE WHEN total_amount < 0 THEN -total_amount ELSE 0 END) as spent"),
          db.raw(
            "SUM(CASE WHEN total_amount > 0 AND source NOT IN ('purchase','sale') THEN total_amount ELSE 0 END) as created"
          )
        )
        .groupByRaw("DATE(created_at)")
        .orderByRaw("DATE(created_at)")
    ),
    rangeFilter(
      db("economy_gain_logs")
        .where({ guild_id: guild.id })
        .where("total_amount", ">", 0)
        .whereNotIn("source", ["purchase", "sale"])
        .select("user_discord_id")
        .sum({ amount: "total_amount" })
        .groupBy("user_discord_id")
        .orderBy("amount", "desc")
        .limit(8)
    ),
    rangeFilter(
      db("economy_gain_logs")
        .where({ guild_id: guild.id })
        .where("total_amount", "<", 0)
        .select("user_discord_id")
        .select(db.raw("SUM(-total_amount) as amount"))
        .groupBy("user_discord_id")
        .orderBy("amount", "desc")
        .limit(8)
    ),
    rangeFilter(
      db("economy_event_logs")
        .where({ guild_id: guild.id })
        .whereIn("category", ["transaction", "transactions", "game"])
        .select("category", "type", "user_discord_id", "amount", "data", "created_at")
        .orderBy("created_at", "desc")
        .limit(25000)
    )
  ]);

  const sourceMap = new Map();
  for (const row of gainBySource || []) {
    const source = String(row.source || "other");
    sourceMap.set(source, {
      source,
      gained: Number(row.gained || 0),
      spent: Number(row.spent || 0),
      count: Number(row.count || 0)
    });
  }

  const created = [...sourceMap.values()]
    .filter((row) => CREATION_SOURCES.has(row.source) || row.source === "game")
    .reduce((sum, row) => sum + Number(row.gained || 0), 0);
  const purchaseSpent = Number(sourceMap.get("purchase")?.spent || 0);
  const saleGained = Number(sourceMap.get("sale")?.gained || 0);

  const officialItems = new Map();
  const officialShops = new Map();
  const userItems = new Map();
  const userShops = new Map();
  const marketItems = new Map();
  const gamesById = new Map();
  const gameDay = new Map();
  const shopDay = new Map();

  let officialPurchases = 0;
  let officialVolume = 0;
  let userPurchases = 0;
  let userVolume = 0;
  let marketSales = 0;
  let marketVolume = 0;
  let lootboxOpens = 0;
  let dailyClaimAmount = Number(sourceMap.get("daily")?.gained || 0);
  let dailyClaimCount = Number(sourceMap.get("daily")?.count || 0);

  for (const row of eventRows || []) {
    const data = parseJson(row.data);
    const day = toDayKey(row.created_at);
    const category = String(row.category || "");
    const type = String(row.type || "");
    const amount = Math.max(0, Number(row.amount || data.price || 0));

    if (category === "game") {
      const bet = Math.max(0, Number(data.bet || 0));
      const payout = Math.max(0, Number(data.payout || 0));
      const gameId = String(data.game_id || type || "game");
      const current = gamesById.get(gameId) || {
        gameId,
        rounds: 0,
        wins: 0,
        bets: 0,
        payouts: 0,
        net: 0
      };
      current.rounds += 1;
      if (data.win) current.wins += 1;
      current.bets += bet;
      current.payouts += payout;
      current.net += payout - bet;
      gamesById.set(gameId, current);
      const gd = gameDay.get(day) || { bets: 0, payouts: 0 };
      gd.bets += bet;
      gd.payouts += payout;
      gameDay.set(day, gd);
      continue;
    }

    if (type === "shop_purchase") {
      const itemName = String(data.item_name || "").trim() || `#${data.item_id || "?"}`;
      const shopName = String(data.shop_name || "").trim() || "Boutique";
      const isUser = Boolean(data.owner_shop);
      if (isUser) {
        userPurchases += 1;
        userVolume += amount;
        bumpMap(userItems, itemName, null, amount);
        bumpMap(userShops, shopName, null, amount);
      } else {
        officialPurchases += 1;
        officialVolume += amount;
        bumpMap(officialItems, itemName, null, amount);
        bumpMap(officialShops, shopName, null, amount);
        const sd = shopDay.get(day) || { official: 0, user: 0, market: 0 };
        sd.official += amount;
        shopDay.set(day, sd);
      }
      continue;
    }

    if (type === "sale_purchase") {
      const itemName = String(data.item_name || "").trim() || `#${data.item_id || "?"}`;
      marketSales += 1;
      marketVolume += amount;
      bumpMap(marketItems, itemName, null, amount);
      const sd = shopDay.get(day) || { official: 0, user: 0, market: 0 };
      sd.market += amount;
      shopDay.set(day, sd);
      continue;
    }

    if (type === "lootbox_currency") {
      lootboxOpens += 1;
    }
  }

  const gameTotals = [...gamesById.values()].reduce(
    (acc, row) => {
      acc.rounds += row.rounds;
      acc.wins += row.wins;
      acc.bets += row.bets;
      acc.payouts += row.payouts;
      acc.net += row.net;
      return acc;
    },
    { rounds: 0, wins: 0, bets: 0, payouts: 0, net: 0 }
  );

  const dailyMap = new Map();
  for (const row of gainByDay || []) {
    const day = toDayKey(row.day);
    if (!day) continue;
    dailyMap.set(day, {
      date: day,
      gained: Number(row.created || 0),
      spent: Number(row.spent || 0),
      transferredIn: Number(row.gained || 0) - Number(row.created || 0)
    });
  }

  const series = enumerateDays(fromKey, toKey).map((date) => {
    const base = dailyMap.get(date) || { date, gained: 0, spent: 0, transferredIn: 0 };
    const games = gameDay.get(date) || { bets: 0, payouts: 0 };
    const shops = shopDay.get(date) || { official: 0, user: 0, market: 0 };
    const gameLost = Math.max(0, games.bets - games.payouts);
    const lost = shops.official + gameLost;
    return {
      date,
      gained: base.gained,
      spent: base.spent,
      lost,
      net: base.gained - lost,
      shopOfficial: shops.official,
      shopUser: shops.user,
      shopMarket: shops.market,
      gameBets: games.bets,
      gamePayouts: games.payouts,
      gameLost
    };
  });

  const userIds = [
    ...topPositive.map((row) => String(row.user_discord_id)),
    ...topNegative.map((row) => String(row.user_discord_id))
  ].filter(Boolean);
  const users =
    userIds.length > 0
      ? await db("users").whereIn("discord_id", userIds).select("discord_id", "username", "avatar")
      : [];
  const userMap = new Map(users.map((row) => [String(row.discord_id), row]));
  const mapUser = (row, amountKey = "amount") => {
    const id = String(row.user_discord_id);
    const user = userMap.get(id);
    return {
      userId: id,
      username: user?.username || id,
      avatar: user?.avatar || null,
      amount: Number(row[amountKey] || 0)
    };
  };

  const twitch = [...sourceMap.values()]
    .filter((row) => TWITCH_SOURCES.has(row.source))
    .map((row) => ({ source: row.source, gained: row.gained, count: row.count }));

  const lostTotal = series.reduce((sum, row) => sum + Number(row.lost || 0), 0);
  const gainedTotal = series.reduce((sum, row) => sum + Number(row.gained || 0), 0);

  return {
    currency: {
      name: settings?.name || "Economy",
      symbol: settings?.emoji_symbol || "💰"
    },
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      days,
      requestedDays: wanted,
      historyDays: Number.isFinite(maxDays) ? maxDays : null
    },
    overview: {
      circulating: Number(balanceRow?.total || 0),
      holders: Number(holdersRow?.count || 0),
      gained: gainedTotal,
      spent: series.reduce((sum, row) => sum + Number(row.spent || 0), 0),
      lost: lostTotal,
      net: gainedTotal - lostTotal,
      avgLostPerDay: days > 0 ? Math.round(lostTotal / days) : 0,
      avgGainedPerDay: days > 0 ? Math.round(gainedTotal / days) : 0,
      created,
      purchaseSpent,
      saleGained
    },
    daily: series,
    bySource: [...sourceMap.values()].sort((a, b) => b.gained + b.spent - (a.gained + a.spent)),
    shops: {
      official: {
        purchases: officialPurchases,
        volume: officialVolume,
        topItems: topEntries(officialItems).map((row) => ({ name: row.id, count: row.count, volume: row.volume })),
        topShops: topEntries(officialShops).map((row) => ({ name: row.id, count: row.count, volume: row.volume }))
      },
      user: {
        purchases: userPurchases,
        volume: userVolume,
        topItems: topEntries(userItems).map((row) => ({ name: row.id, count: row.count, volume: row.volume })),
        topShops: topEntries(userShops).map((row) => ({ name: row.id, count: row.count, volume: row.volume }))
      },
      market: {
        sales: marketSales,
        volume: marketVolume,
        topItems: topEntries(marketItems).map((row) => ({ name: row.id, count: row.count, volume: row.volume }))
      }
    },
    games: {
      ...gameTotals,
      houseKeep: Math.max(0, gameTotals.bets - gameTotals.payouts),
      byGame: [...gamesById.values()].sort((a, b) => b.bets - a.bets)
    },
    twitch: {
      gained: twitch.reduce((sum, row) => sum + Number(row.gained || 0), 0),
      count: twitch.reduce((sum, row) => sum + Number(row.count || 0), 0),
      bySource: twitch
    },
    dailyClaims: {
      count: dailyClaimCount,
      amount: dailyClaimAmount
    },
    lootboxes: {
      currencyRewards: lootboxOpens,
      amount: Number(sourceMap.get("lootbox")?.gained || 0)
    },
    inventories: {
      members: Number(inventoryMembersRow?.members || 0),
      items: Number(inventoryQtyRow?.total || 0)
    },
    users: {
      topEarners: (topPositive || []).map((row) => mapUser(row)),
      topSpenders: (topNegative || []).map((row) => mapUser(row))
    }
  };
};
