import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional().default("production"),
  PORT: z.coerce.number().int().positive().default(4000),
  BASE_URL: z.string().min(1).default("http://localhost:4000"),
  API_BASE: z.string().optional().default(""),
  API_SECRET_KEY: z.string().min(8),
  API_JWT_TTL: z.string().default("30d"),
  DATABASE_URL: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().min(1),
  ADMIN_USER_ID: z.string().optional(),
  ADMIN_USER_IDS: z.string().optional(),
  TWITCH_CLIENT_ID: z.string().optional().default(""),
  TWITCH_CLIENT_SECRET: z.string().optional().default(""),
  TWITCH_REDIRECT_URI: z.string().optional().default(""),
  TWITCH_EVENTSUB_SECRET: z.string().optional().default(""),
  TWITCH_EVENTSUB_CALLBACK: z.string().optional().default(""),
  ADSENSE_CLIENT: z.string().optional().default(""),
  TAWK_TO_WIDGET_URL: z.string().optional().default(""),
  TAWK_API_KEY: z.string().optional().default(""),
  TOPGG_TOKEN: z.string().optional().default(""),
  TOPGG_WEBHOOK_SECRET: z.string().optional().default(""),
  TOPGG_BOT_PAGE_URL: z.string().optional().default("https://top.gg/fr/bot/1465377603090383161"),
  TOPGG_ENABLED: z.string().optional().default("1")
});

export { bootstrapEnv } from "./bootstrap-env.js";

export const loadEnv = (source = process.env) => {
  const normalized = { ...source };
  if (normalized.BASE_URL && !/^https?:\/\//i.test(String(normalized.BASE_URL))) {
    normalized.BASE_URL = `https://${String(normalized.BASE_URL).replace(/^\/+/, "")}`;
  }
  // Trailing slash breaks OAuth / URL joins
  if (normalized.BASE_URL) {
    normalized.BASE_URL = String(normalized.BASE_URL).replace(/\/+$/, "");
  }
  const parsed = envSchema.safeParse(normalized);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return parsed.data;
};

export const resolveApiBase = (env = {}) => {
  const explicit = String(process.env.API_BASE ?? env.API_BASE ?? "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const nodeEnv = String(process.env.NODE_ENV ?? env.NODE_ENV ?? "").toLowerCase();
  const baseUrl = String(process.env.BASE_URL ?? env.BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  // Plesk/Passenger: loopback :PORT is often unreachable — use public same-origin URL.
  if (nodeEnv === "production" && baseUrl) return baseUrl;

  const port = Number(process.env.PORT ?? env.PORT ?? 4000);
  return `http://127.0.0.1:${port}`;
};

export const applyEnv = (env) => {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) continue;
    process.env[key] = String(value);
  }
  process.env.API_BASE = resolveApiBase(env);
  return env;
};
