import express from "express";
import cors from "cors";
import morgan from "morgan";
import { jwtMiddleware } from "./middleware/jwt.js";
import { requireAdmin } from "./middleware/admin.js";
import { requireNotBanned } from "./middleware/ban.js";
import { apiRouter } from "./routes/api.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { botRouter } from "./routes/bot.js";
import { shopRouter } from "./routes/shop.js";
import { userRouter } from "./routes/user.js";
import { twitchEventSubRouter } from "./routes/twitch-eventsub.js";
import { topggWebhookRouter } from "./routes/topgg-webhook.js";
import { stripeWebhookRouter } from "./routes/stripe-webhook.js";
import { publicRouter } from "./routes/public.js";

export const createApp = ({ corsOrigins } = {}) => {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  // Required behind Plesk / reverse proxy (correct IPs, secure cookies later)
  app.set("trust proxy", 1);

  const origins = corsOrigins || [
    process.env.BASE_URL,
    "https://ecoboty.eu",
    "https://www.ecoboty.eu",
    "http://localhost:3000",
    "http://localhost:4000"
  ].filter(Boolean);

  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "x-api-key"]
    })
  );
  app.options("*", cors());

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    if (isProd) {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }
    next();
  });

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
      limit: "2mb"
    })
  );
  app.use(morgan(isProd ? "combined" : "dev"));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "ecoboty",
      mode: "unified",
      site: process.env.BASE_URL || null
    });
  });

  // Short Twitch↔Discord link for chat messages: /l/:guildId/:twitchLogin
  app.get("/l/:guildId/:twitchLogin", (req, res) => {
    const guildId = String(req.params.guildId || "").replace(/\D/g, "");
    const twitchLogin = String(req.params.twitchLogin || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 25);
    if (!guildId || !twitchLogin) {
      return res.status(400).send("Lien invalide");
    }
    const qs = new URLSearchParams({ guildId, twitchLogin });
    return res.redirect(302, `/auth/discord/twitch-link?${qs.toString()}`);
  });

  app.use("/webhooks/topgg", topggWebhookRouter);
  app.use("/webhooks/stripe", stripeWebhookRouter);
  app.use("/twitch", twitchEventSubRouter);
  app.use("/auth", authRouter);
  app.use("/public", publicRouter);
  app.use("/api/admin", jwtMiddleware, requireAdmin, adminRouter);
  app.use("/api", jwtMiddleware, requireNotBanned, apiRouter);
  app.use("/api", jwtMiddleware, requireNotBanned, shopRouter);
  app.use("/api/user", jwtMiddleware, requireNotBanned, userRouter);
  app.use("/bot", requireNotBanned, botRouter);

  app.use((err, _req, res, _next) => {
    const status = Number(err?.status || err?.statusCode || 500);
    const message = err?.expose ? err.message : "internal_error";
    if (!isProd) {
      console.error("[api]", err);
    } else {
      console.error("[api]", err?.message || err);
    }
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: message
    });
  });

  return app;
};
