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
 * Production (Plesk/Passenger): use panel variables only — they are injected into
 * process.env before Node starts. No .env file needed.
 *
 * Optional: ECOBOTY_USE_DOTENV=1 loads .env from repo root (local dev / fallback).
 */
export const bootstrapEnv = (rootDir) => {
  const loaded = [];
  const useDotenv =
    process.env.ECOBOTY_USE_DOTENV === "1" ||
    (process.env.NODE_ENV !== "production" && process.env.ECOBOTY_USE_DOTENV !== "0");

  if (useDotenv) {
    for (const name of [".env", ".env.production"]) {
      const filePath = path.join(rootDir, name);
      if (!fs.existsSync(filePath)) continue;
      const result = dotenv.config({ path: filePath });
      if (!result.error) loaded.push(name);
    }
  }

  const missing = REQUIRED_KEYS.filter((key) => !String(process.env[key] || "").trim());
  const hasPleskVars = missing.length === 0 && loaded.length === 0;
  const source = loaded.length
    ? `file (${loaded.join(", ")})`
    : hasPleskVars
      ? "process (Plesk/Passenger)"
      : "none";

  console.log(`[env] source=${source}${missing.length ? ` missing=${missing.join(",")}` : ""}`);

  if (missing.length && !loaded.length) {
    console.error(
      "[env] Variables Plesk absentes au démarrage Node. Vérifie dans Plesk Node.js : " +
        "Racine application = /httpdocs (pas .output/public), " +
        "Fichier démarrage = server.js, puis Restart app + redémarrage Apache."
    );
  }

  return { loaded, missing, source };
};
