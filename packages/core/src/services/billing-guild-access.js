import { db } from "./db.js";
import { getPublicPricingCatalog } from "./billing-catalog.js";
import { isPlatformAdminId } from "./platform-admin.js";
import { isStripeConfigured } from "./stripe-client.js";

const ADMIN = 0x8n;
const MANAGE_GUILD = 0x20n;

const canManageFromPermissions = (owner, permissions) => {
  if (owner) return true;
  try {
    const perms = BigInt(permissions || "0");
    return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
};

export const fetchUserManagedGuildIds = async (accessToken) => {
  if (!accessToken) return new Set();
  try {
    const guildResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!guildResponse.ok) return new Set();
    const guilds = await guildResponse.json();
    if (!Array.isArray(guilds)) return new Set();

    return new Set(
      guilds
        .filter((guild) => canManageFromPermissions(guild.owner, guild.permissions))
        .map((guild) => String(guild.id))
    );
  } catch {
    return new Set();
  }
};

export const fetchManagedGuildIdsFromDb = async (discordId) => {
  const userId = String(discordId || "").trim();
  if (!userId) return new Set();
  try {
    const hasTable = await db.schema.hasTable("user_guilds");
    if (!hasTable) return new Set();
    const rows = await db("user_guilds").where({ discord_id: userId }).select(
      "guild_id",
      "owner",
      "permissions",
      "permissions_new"
    );
    return new Set(
      rows
        .filter((row) =>
          canManageFromPermissions(
            row.owner,
            row.permissions_new || row.permissions || "0"
          )
        )
        .map((row) => String(row.guild_id))
    );
  } catch {
    return new Set();
  }
};

export const assertUserCanManageGuild = async ({
  accessToken,
  guildDiscordId,
  discordId = null
} = {}) => {
  const guildId = String(guildDiscordId || "").trim();
  if (!guildId) {
    const error = new Error("guild_access_denied");
    error.status = 403;
    error.expose = true;
    throw error;
  }

  if (discordId && (await isPlatformAdminId(discordId))) {
    return true;
  }

  const liveManaged = await fetchUserManagedGuildIds(accessToken);
  if (liveManaged.has(guildId)) return true;

  // Discord OAuth token in JWT often expires before the API JWT itself.
  // Fall back to guild membership snapshot saved at login.
  const dbManaged = await fetchManagedGuildIdsFromDb(discordId);
  if (dbManaged.has(guildId)) return true;

  const error = new Error("guild_access_denied");
  error.status = 403;
  error.expose = true;
  throw error;
};

export const getBillingPublicStatus = () => ({
  enabled: isStripeConfigured(),
  publishableKey: String(process.env.STRIPE_PUBLISHABLE_KEY || "").trim() || null
});

export const getBillingPublicCatalog = async () => getPublicPricingCatalog();
