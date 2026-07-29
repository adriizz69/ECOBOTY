import { db } from "../services/db.js";

const DEFAULT_PLATFORM_ADMIN_ID = "1328058083246608407";

export const parsePlatformAdminIdsFromEnv = () => {
  const raw =
    process.env.ADMIN_USER_IDS ||
    process.env.ADMIN_USER_ID ||
    process.env.ADMIN_DISCORD_IDS ||
    DEFAULT_PLATFORM_ADMIN_ID;
  return String(raw)
    .split(/[,\s]+/)
    .map((id) => String(id || "").trim())
    .filter(Boolean);
};

export const isPlatformAdminId = async (discordId) => {
  const userId = String(discordId || "").trim();
  if (!userId) return false;

  if (parsePlatformAdminIdsFromEnv().includes(userId)) return true;

  try {
    if (await db.schema.hasTable("admin_users")) {
      const row = await db("admin_users").where({ discord_id: userId }).first();
      if (row) return true;
    }
  } catch {
    // ignore lookup failures
  }

  return false;
};
