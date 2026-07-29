import { db } from "./db.js";

/**
 * Resolve a guild display name from the database (fallback: null).
 */
export const resolveGuildDisplayName = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) return null;
  const row = await db("guilds").select("name").where("discord_guild_id", guildId).first();
  const name = String(row?.name || "").trim();
  return name || null;
};

/**
 * Insert the guild name in bold where the template contains `{guild}`.
 * Example: "Tu as reçu un succès sur le serveur {guild}" → "... **Mon Serveur**"
 */
export const formatGuildDmLead = (template, guildName) => {
  const guild = String(guildName || "").trim() || "Serveur";
  return String(template || "").replaceAll("{guild}", `**${guild}**`);
};

/**
 * Compose a DM with a guild context line above optional body text.
 */
export const composeGuildDmContent = ({ leadTemplate, guildName, body = "" }) => {
  const lead = formatGuildDmLead(leadTemplate, guildName);
  const extra = String(body || "").trim();
  return extra ? `${lead}\n${extra}` : lead;
};
