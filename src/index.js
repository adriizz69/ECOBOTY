import "dotenv/config";
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
import { startAllTwitchListeners } from "./services/twitch.js";
import { probeDatabaseConnection } from "./services/db.js";
import { twitchEventSubRouter } from "./routes/twitch-eventsub.js";

const app = express();

app.use(
  cors({
    origin: ["https://ecoboty.eu", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"]
  })
);
app.options("*", cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  })
);
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/twitch", twitchEventSubRouter);
app.use("/auth", authRouter);
app.use("/api/admin", jwtMiddleware, requireAdmin, adminRouter);
app.use("/api", jwtMiddleware, requireNotBanned, apiRouter);
app.use("/api", jwtMiddleware, requireNotBanned, shopRouter);
app.use("/api/user", jwtMiddleware, requireNotBanned, userRouter);
app.use("/bot", requireNotBanned, botRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on :${port}`);
  void (async () => {
    const probe = await probeDatabaseConnection(Number(process.env.DB_STATUS_TIMEOUT_MS || 2000));
    if (!probe.ok) {
      console.error(`[startup] Database not reachable (${probe.code}): ${probe.message}`);
      return;
    }
    await startAllTwitchListeners();
  })().catch((error) => {
    const code = error?.code || error?.errno || "UNKNOWN";
    const message = error?.message || String(error);
    console.error(`[startup] Twitch listeners not started (${code}): ${message}`);
  });
});
