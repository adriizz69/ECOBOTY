import { db } from "./db.js";
import { ensureGuild, getOrCreateSettings } from "./economy.js";

const getBotToken = () => process.env.DISCORD_BOT_TOKEN;

export const insertEventLog = async ({
  trx = db,
  guildId,
  category,
  type,
  userId,
  amount = 0,
  data = null,
  createdAt = new Date()
}) => {
  const guild = await ensureGuild(guildId, trx);
  const payload = data
    ? typeof data === "string"
      ? data
      : JSON.stringify(data)
    : null;
  await trx("economy_event_logs").insert({
    guild_id: guild.id,
    category,
    type,
    user_discord_id: String(userId),
    amount: Number(amount || 0),
    data: payload,
    created_at: createdAt
  });
};

export const listEventLogs = async ({ guildId, category, limit = 100 }) => {
  const guild = await ensureGuild(guildId, db);
  return db("economy_event_logs")
    .where({ guild_id: guild.id, category })
    .orderBy("created_at", "desc")
    .limit(limit);
};

export const sendLogMessage = async ({ guildId, content }) => {
  const token = getBotToken();
  if (!token || !content) return;
  const settings = await getOrCreateSettings(guildId, db);
  let channelId = settings?.log_channel_id;
  if (!channelId) {
    const guild = await ensureGuild(guildId, db);
    const botSettings = await db("bot_settings").where({ guild_id: guild.id }).first();
    channelId = botSettings?.log_channel_id;
  }
  if (!channelId) return;

  try {
    const res = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[logs] sendLogMessage failed", res.status, body);
    }
  } catch (error) {
    console.error("[logs] sendLogMessage error", error);
  }
};
