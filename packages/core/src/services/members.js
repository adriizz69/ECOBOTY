import { db } from "./db.js";
import { ensureGuild } from "./economy.js";
import { listInventory } from "./shop.js";
import { insertEventLog, sendLogMessage } from "./logs.js";

const safeDelete = async (trx, table, where) => {
  try {
    await trx(table).where(where).del();
  } catch {
    // Table may not exist in older DBs — ignore
  }
};

const parseJsonMaybe = (value) => {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

/**
 * Snapshot user economy state, write a leave log, then purge live guild user data.
 */
export const handleMemberLeave = async ({
  guildId,
  userId,
  displayName = "",
  username = ""
}) => {
  const discordGuildId = String(guildId || "").trim();
  const discordUserId = String(userId || "").trim();
  if (!discordGuildId || !discordUserId) {
    return { ok: false, error: "missing_params" };
  }

  const guild = await ensureGuild(discordGuildId, db);
  const name =
    String(displayName || "").trim() ||
    String(username || "").trim() ||
    discordUserId;

  const balanceRow = await db("balances")
    .where({ guild_id: guild.id, user_discord_id: discordUserId })
    .first();
  const balance = Number(balanceRow?.balance || 0);
  const dailyStreak = Number(balanceRow?.daily_streak || 0);

  let inventory = [];
  try {
    const rows = await listInventory({ guildId: discordGuildId, userId: discordUserId });
    inventory = (rows || []).map((row) => ({
      itemId: row.item_id,
      name: row.name,
      type: row.type,
      quantity: Number(row.quantity || 0)
    }));
  } catch {
    inventory = [];
  }

  const inventoryTotalQty = inventory.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

  await db.transaction(async (trx) => {
    await insertEventLog({
      trx,
      guildId: discordGuildId,
      category: "member",
      type: "left_server",
      userId: discordUserId,
      amount: balance,
      data: {
        displayName: name,
        username: String(username || "").trim() || null,
        balance,
        dailyStreak,
        inventory,
        inventoryTotalQty,
        inventoryItemCount: inventory.length
      }
    });

    await safeDelete(trx, "balances", { guild_id: guild.id, user_discord_id: discordUserId });
    await safeDelete(trx, "inventory", { guild_id: guild.id, user_discord_id: discordUserId });
    await safeDelete(trx, "inventory_sales", {
      guild_id: guild.id,
      seller_discord_id: discordUserId
    });
    await safeDelete(trx, "economy_activity", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "twitch_daily_states", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "twitch_activity", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "temp_role_assignments", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "birthday_entries", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "birthday_role_assignments", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "achievement_progress", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "achievement_event_marks", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "achievement_shop_view_cooldowns", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "user_guilds", {
      guild_id: discordGuildId,
      discord_id: discordUserId
    });
    await safeDelete(trx, "giveaway_entries", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
    await safeDelete(trx, "giveaway_message_counts", {
      guild_id: guild.id,
      user_discord_id: discordUserId
    });
  });

  try {
    const { deleteUserShopsForOwner } = await import("./shop.js");
    await deleteUserShopsForOwner({
      guildId: discordGuildId,
      ownerDiscordId: discordUserId
    });
  } catch {
    // ignore if shops module unavailable
  }

  const invPreview = inventory
    .slice(0, 8)
    .map((row) => `• ${row.name} ×${row.quantity}`)
    .join("\n");
  const more =
    inventory.length > 8 ? `\n… +${inventory.length - 8} autre(s) objet(s)` : "";

  await sendLogMessage({
    guildId: discordGuildId,
    content: [
      `🚪 **Départ serveur** — ${name} (\`${discordUserId}\`)`,
      `💰 Solde au départ : **${balance}**`,
      `🎒 Inventaire : **${inventoryTotalQty}** objet(s) (${inventory.length} type(s))`,
      invPreview ? `\n${invPreview}${more}` : ""
    ]
      .filter(Boolean)
      .join("\n")
  });

  return {
    ok: true,
    balance,
    inventoryTotalQty,
    inventoryItemCount: inventory.length
  };
};

export const listMemberLeaveLogs = async ({ guildId, limit = 100, minCreatedAt = null }) => {
  const guild = await ensureGuild(guildId, db);
  const query = db("economy_event_logs")
    .where({ guild_id: guild.id, category: "member", type: "left_server" })
    .orderBy("created_at", "desc")
    .limit(limit);
  if (minCreatedAt) {
    query.andWhere("created_at", ">=", minCreatedAt);
  }
  const rows = await query;
  return rows.map((row) => ({
    ...row,
    data: parseJsonMaybe(row.data)
  }));
};
