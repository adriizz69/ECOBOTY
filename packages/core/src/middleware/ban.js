import { db } from "../services/db.js";

const getGuildIdFromRequest = (req) => {
  if (req.params?.guildId) return req.params.guildId;
  if (req.path?.startsWith("/guilds/") && req.params?.id) return req.params.id;
  if (req.query?.guildId) return req.query.guildId;
  if (req.body?.guildId) return req.body.guildId;
  return null;
};

const isGuildStatusPath = (req) => {
  const parts = String(req.path || "").split("/").filter(Boolean);
  return parts.length === 3 && parts[0] === "guilds" && parts[2] === "status";
};

export const requireNotBanned = async (req, res, next) => {
  if (isGuildStatusPath(req)) return next();
  const guildId = getGuildIdFromRequest(req);
  if (!guildId) return next();

  const guild = await db("guilds").where({ discord_guild_id: String(guildId) }).first();
  if (guild?.banned) {
    return res.status(403).json({ error: "guild_banned", reason: guild.banned_reason || "" });
  }
  return next();
};

export const requireNotBannedByShop = async (req, res, next) => {
  const shopId = req.params?.id;
  if (!shopId) return next();
  const shop = await db("shops").where({ id: shopId }).first();
  if (!shop) return next();
  const guild = await db("guilds").where({ id: shop.guild_id }).first();
  if (guild?.banned) {
    return res.status(403).json({ error: "guild_banned", reason: guild.banned_reason || "" });
  }
  return next();
};

export const requireNotBannedByItem = async (req, res, next) => {
  const itemId = req.params?.itemId;
  if (!itemId) return next();
  const item = await db("shop_items").where({ id: itemId }).first();
  if (!item) return next();
  const shop = await db("shops").where({ id: item.shop_id }).first();
  if (!shop) return next();
  const guild = await db("guilds").where({ id: shop.guild_id }).first();
  if (guild?.banned) {
    return res.status(403).json({ error: "guild_banned", reason: guild.banned_reason || "" });
  }
  return next();
};
