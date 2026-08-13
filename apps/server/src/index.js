import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

// MUST load env before importing packages that create Knex at module scope
const { bootstrapEnv, loadEnv, applyEnv } = await import("@ecoboty/config");
bootstrapEnv(rootDir);
const { runMigrations } = await import("@ecoboty/db");
const {
  createApp,
  probeDatabaseConnection,
  startBirthdayScheduler,
  startAllTwitchListeners,
  startBillingCleanupScheduler,
  startTwitchLinkSyncScheduler,
  setBotGuildIdsProvider
} = await import("@ecoboty/core");
const { startBot, getDiscordClient } = await import("./bot/index.js");

const env = applyEnv(loadEnv(process.env));
const port = env.PORT;
const isProd = env.NODE_ENV === "production";

try {
  await runMigrations();
} catch (error) {
  console.error(`[db] migration failed: ${error?.message || error}`);
  if (isProd) process.exit(1);
}

const app = createApp({
  corsOrigins: [
    env.BASE_URL,
    "https://ecoboty.eu",
    "https://www.ecoboty.eu",
    "http://localhost:3000",
    "http://localhost:4000"
  ]
});

const webOutputCandidates = [
  path.join(rootDir, ".output/public"),
  path.join(rootDir, "apps/web/.output/public"),
  path.join(rootDir, "apps/web/dist")
];

const webPublicDir = webOutputCandidates.find((candidate) => fs.existsSync(candidate));

if (webPublicDir) {
  app.use(
    express.static(webPublicDir, {
      index: false,
      maxAge: isProd ? "1h" : 0,
      etag: true
    })
  );

  const spaShell = ["200.html", "index.html"]
    .map((name) => path.join(webPublicDir, name))
    .find((candidate) => fs.existsSync(candidate));

  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/auth") ||
      req.path.startsWith("/bot") ||
      req.path.startsWith("/public") ||
      req.path.startsWith("/webhooks") ||
      req.path.startsWith("/twitch") ||
      req.path.startsWith("/health") ||
      req.path.startsWith("/l/")
    ) {
      return next();
    }
    if (!spaShell) return next();
    return res.sendFile(spaShell);
  });

  console.log(`[web] Serving frontend from ${webPublicDir}`);
} else if (isProd) {
  console.error("[web] FATAL: no Nuxt build found. Run `npm run build` before starting production.");
  process.exit(1);
} else {
  console.warn("[web] No Nuxt build found. Run `npm run build` or use `npm run dev:web`.");
}

const server = app.listen(port, () => {
  console.log(
    `[server] EcoBoty listening on :${port} (${env.NODE_ENV}) site=${env.BASE_URL} api=${process.env.API_BASE}`
  );
  void (async () => {
    const probe = await probeDatabaseConnection(Number(process.env.DB_STATUS_TIMEOUT_MS || 2000));
    if (!probe.ok) {
      console.error(`[startup] Database not reachable (${probe.code}): ${probe.message}`);
    } else {
      startBirthdayScheduler();
      try {
        startTwitchLinkSyncScheduler();
      } catch (error) {
        console.warn(`[twitch-link-sync] scheduler failed: ${error?.message || error}`);
      }
      try {
        startBillingCleanupScheduler();
      } catch (error) {
        console.warn(`[billing] cleanup scheduler failed: ${error?.message || error}`);
      }
      try {
        const { syncStripeCatalog } = await import("@ecoboty/core");
        const result = await syncStripeCatalog({ source: "startup" });
        if (result.ok) {
          console.log(`[billing] Stripe catalog synced (${result.mode}) product=${result.productId}`);
        } else {
          console.warn(`[billing] Stripe catalog sync skipped: ${result.reason || "unknown"}`);
        }
      } catch (error) {
        console.warn(`[billing] catalog sync failed: ${error?.message || error}`);
      }
      try {
        await startAllTwitchListeners();
      } catch (error) {
        console.error(`[startup] Twitch listeners: ${error?.message || error}`);
      }
    }

    try {
      if (process.env.ECOBOTY_SKIP_BOT === "1") {
        console.warn("[bot] Skipped (ECOBOTY_SKIP_BOT=1)");
      } else {
        await startBot();
        setBotGuildIdsProvider(() => {
          const client = getDiscordClient();
          if (!client?.isReady?.()) return null;
          return new Set(client.guilds.cache.map((guild) => String(guild.id)));
        });
        console.log("[bot] Discord client started in unified process");
      }
    } catch (error) {
      console.error(`[bot] Failed to start: ${error?.message || error}`);
    }
  })();
});

const shutdown = async (signal) => {
  console.log(`[server] ${signal} received, shutting down…`);
  try {
    const client = getDiscordClient?.();
    if (client?.destroy) await client.destroy();
  } catch (error) {
    console.error("[bot] destroy error:", error?.message || error);
  }
  server.close(() => {
    console.log("[server] closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
