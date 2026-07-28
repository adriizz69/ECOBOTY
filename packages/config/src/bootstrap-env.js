import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const REQUIRED_KEYS = [
  "API_SECRET_KEY",
  "DATABASE_URL",
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_REDIRECT_URI"
];

/**
 * Load repo-root .env files without overriding variables already set
 * (Plesk / systemd / Passenger inject process.env first).
 */
export const bootstrapEnv = (rootDir) => {
  const loaded = [];

  for (const name of [".env", ".env.production"]) {
    const filePath = path.join(rootDir, name);
    if (!fs.existsSync(filePath)) continue;
    const result = dotenv.config({ path: filePath });
    if (!result.error) loaded.push(name);
  }

  const missing = REQUIRED_KEYS.filter((key) => !String(process.env[key] || "").trim());
  const source =
    loaded.length > 0
      ? `file (${loaded.join(", ")})`
      : missing.length === 0
        ? "process (Plesk/Passenger)"
        : "none";

  console.log(`[env] source=${source}${missing.length ? ` missing=${missing.join(",")}` : ""}`);

  if (missing.length && loaded.length === 0) {
    console.error(
      "[env] Plesk variables not visible to Node. Fix Application Root = /httpdocs (not .output/public), " +
        "startup = server.js or .output/server/index.mjs, then Restart app — " +
        "or create /httpdocs/.env (same keys as Plesk panel)."
    );
  }

  return { loaded, missing, source };
};
