import fs from "node:fs";
import path from "node:path";

const parseEnv = (file) => {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
};

const root = parseEnv(".env");
const web = parseEnv("apps/web/.env");
const legacyFront = parseEnv("legacy/frontend/.env");

const pick = (...candidates) => {
  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const merged = {
  // Runtime
  NODE_ENV: pick(root.NODE_ENV, "development"),
  PORT: pick(root.PORT, "4000"),
  BASE_URL: pick(
    root.BASE_URL === "http://localhost:3000" ? "http://localhost:4000" : root.BASE_URL,
    "http://localhost:4000"
  ),
  // Local: point Nuxt at the unified API. Production Plesk: leave EMPTY (same origin).
  API_BASE: pick(root.API_BASE, web.API_BASE, legacyFront.API_BASE, "http://localhost:4000"),
  API_SECRET_KEY: pick(root.API_SECRET_KEY),
  API_JWT_TTL: pick(root.API_JWT_TTL, web.API_JWT_TTL, legacyFront.API_JWT_TTL, "30d"),
  ADMIN_USER_IDS: pick(root.ADMIN_USER_IDS, root.ADMIN_USER_ID, ""),
  ADMIN_USER_ID: pick(root.ADMIN_USER_ID, ""),

  // Public web
  TAWK_TO_WIDGET_URL: pick(root.TAWK_TO_WIDGET_URL, web.TAWK_TO_WIDGET_URL, legacyFront.TAWK_TO_WIDGET_URL),

  // MySQL
  DATABASE_URL: pick(root.DATABASE_URL),

  // Discord
  DISCORD_BOT_TOKEN: pick(root.DISCORD_BOT_TOKEN),
  DISCORD_CLIENT_ID: pick(root.DISCORD_CLIENT_ID, web.DISCORD_CLIENT_ID, legacyFront.DISCORD_CLIENT_ID),
  DISCORD_CLIENT_SECRET: pick(root.DISCORD_CLIENT_SECRET),
  DISCORD_REDIRECT_URI: pick(root.DISCORD_REDIRECT_URI),
  DISCORD_GUILD_ID: pick(root.DISCORD_GUILD_ID, ""),

  // Twitch
  TWITCH_CLIENT_ID: pick(root.TWITCH_CLIENT_ID),
  TWITCH_CLIENT_SECRET: pick(root.TWITCH_CLIENT_SECRET),
  TWITCH_REDIRECT_URI: pick(root.TWITCH_REDIRECT_URI),
  TWITCH_EVENTSUB_SECRET: pick(root.TWITCH_EVENTSUB_SECRET),
  TWITCH_EVENTSUB_CALLBACK: pick(root.TWITCH_EVENTSUB_CALLBACK)
};

if (!merged.API_SECRET_KEY || !merged.DATABASE_URL || !merged.DISCORD_BOT_TOKEN) {
  console.error("Missing critical secrets in root .env — aborting merge.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(".env", `.env.backup-${stamp}`);

const lines = [
  "# =============================================================================",
  "# EcoBoty — UNIQUE .env (monorepo / process Node unique)",
  `# Merged ${new Date().toISOString()} from root + apps/web (+ legacy/frontend)`,
  "# Backup of previous root .env: .env.backup-*",
  "# =============================================================================",
  "",
  "# --- Runtime (apps/server) ---",
  `NODE_ENV=${merged.NODE_ENV}`,
  `PORT=${merged.PORT}`,
  "# Public site URL (OAuth success redirects, links in Discord, CORS).",
  `BASE_URL=${merged.BASE_URL}`,
  "# API origin for the Nuxt app.",
  "# - Local: http://localhost:4000",
  "# - Production (same Node host): leave empty",
  `API_BASE=${merged.API_BASE}`,
  `API_SECRET_KEY=${merged.API_SECRET_KEY}`,
  `API_JWT_TTL=${merged.API_JWT_TTL}`,
  `ADMIN_USER_IDS=${merged.ADMIN_USER_IDS}`,
  merged.ADMIN_USER_ID ? `ADMIN_USER_ID=${merged.ADMIN_USER_ID}` : "# ADMIN_USER_ID=",
  "",
  "# --- Public web (Nuxt runtimeConfig) ---",
  `TAWK_TO_WIDGET_URL=${merged.TAWK_TO_WIDGET_URL}`,
  "",
  "# --- MySQL ---",
  `DATABASE_URL=${merged.DATABASE_URL}`,
  "",
  "# --- Discord ---",
  `DISCORD_BOT_TOKEN=${merged.DISCORD_BOT_TOKEN}`,
  `DISCORD_CLIENT_ID=${merged.DISCORD_CLIENT_ID}`,
  `DISCORD_CLIENT_SECRET=${merged.DISCORD_CLIENT_SECRET}`,
  "# Must match Discord Developer Portal. After Plesk cutover, prefer https://VOTRE_DOMAINE/auth/discord/callback",
  `DISCORD_REDIRECT_URI=${merged.DISCORD_REDIRECT_URI}`,
  merged.DISCORD_GUILD_ID ? `DISCORD_GUILD_ID=${merged.DISCORD_GUILD_ID}` : "# DISCORD_GUILD_ID=",
  "",
  "# --- Twitch ---",
  `TWITCH_CLIENT_ID=${merged.TWITCH_CLIENT_ID}`,
  `TWITCH_CLIENT_SECRET=${merged.TWITCH_CLIENT_SECRET}`,
  `TWITCH_REDIRECT_URI=${merged.TWITCH_REDIRECT_URI}`,
  `TWITCH_EVENTSUB_SECRET=${merged.TWITCH_EVENTSUB_SECRET}`,
  `TWITCH_EVENTSUB_CALLBACK=${merged.TWITCH_EVENTSUB_CALLBACK}`,
  ""
];

fs.writeFileSync(".env", lines.join("\n"), "utf8");
console.log("Wrote unified .env (backup created)");
console.log("BASE_URL=", merged.BASE_URL);
console.log("API_BASE=", merged.API_BASE || "(empty = same origin)");
console.log("PORT=", merged.PORT);
console.log("DISCORD_CLIENT_ID=", merged.DISCORD_CLIENT_ID);
console.log("DISCORD_REDIRECT_URI=", merged.DISCORD_REDIRECT_URI);
console.log("TWITCH_EVENTSUB_CALLBACK=", merged.TWITCH_EVENTSUB_CALLBACK);
try {
  const u = new URL(merged.DATABASE_URL);
  console.log("DATABASE=", `${u.hostname}:${u.port || 3306}${u.pathname}`);
} catch {
  console.log("DATABASE=invalid");
}
