import { Router } from "express";
import { SignJWT } from "jose";
import { db, probeDatabaseConnection } from "../services/db.js";
import {
  applyDaily,
  applyDailyBonusPolicyForGuild,
  getLeaderboard,
  getLeaderboardTotal,
  getOrCreateSettings,
  getOrCreateTwitchDailySettings,
  saveTwitchDailySettings,
  ensureGuild,
  getAutomationConfig,
  saveAutomationConfig,
  getGainSummary,
  getUserGainStats,
  updateUserBalance,
  addAmountToAllBalances,
  resetAllBalances,
  getLeaderboardPostSettings,
  saveLeaderboardPostSettings,
  deleteLeaderboardPostSettings,
  updateLeaderboardMessageId
} from "../services/economy.js";
import { getGamesSettings, saveGamesSettings } from "../services/games.js";
import {
  getTwitchSettings,
  deleteTwitchSettings,
  stopTwitchListener,
  getTwitchAutomationConfig,
  saveTwitchAutomationConfig,
  getTwitchStreamSnapshot,
  listTwitchLiveSessions,
  recordTwitchLiveSessionTick,
  updateTwitchLiveMode,
  syncCurrentSubs,
  getTwitchPromoSettings,
  saveTwitchPromoSettings,
  refreshTokenIfNeeded,
  startTwitchListener,
  ensureGuildLinkSlug,
  getGuildLinkSlug,
  updateGuildLinkSlug
} from "../services/twitch.js";
import { getBotSettings, getGuildStatus, saveBotSettings, setGuildUserUiDisabled, createGuildInvite } from "../services/admin.js";
import { listGuildInventories, removeInventoryItem } from "../services/shop.js";
import {
  getInfoMessageSettings,
  saveInfoMessageSettings,
  buildInfoMessage,
  sendInfoMessage,
  updateInfoMessage,
  updateInfoMessageMessageId,
  updateInfoMessageMessageIds,
  syncInfoMessagePresence,
  clearInfoMessageRefs
} from "../services/infoMessage.js";
import {
  getAchievementConfigPayload,
  saveAchievementSettings,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  applyAchievementTemplate,
  startAchievementSyncFromDiscord,
  getAchievementSyncStatus,
  recordAchievementEvent
} from "../services/achievements.js";
import {
  listGuildBirthdays,
  saveBirthdaySettings,
  upsertBirthdayEntry,
  deleteBirthdayEntry,
  processBirthdayRoleAssignments
} from "../services/birthdays.js";
import {
  createGuildCheckoutSession,
  createGuildPortalSession
} from "../services/billing-checkout.js";
import { syncGuildBillingFromStripe } from "../services/billing-webhook.js";
import { getGuildBillingSummary, resolveLogsPolicyWindow } from "../services/billing-entitlements.js";
import {
  applyDowngradeCleanupSelection,
  getLockedPremiumContent
} from "../services/billing-cleanup.js";
import {
  assertUserCanManageGuild,
  fetchUserManagedGuildIds
} from "../services/billing-guild-access.js";
import { buildTawkLoginPayload, isTawkSecureModeConfigured } from "../services/tawk.js";

export const apiRouter = Router();

const trackBalanceAchievementSafe = async ({ guildId, userId, balance, metadata = {} }) => {
  const numericBalance = Number(balance);
  if (!Number.isFinite(numericBalance) || numericBalance < 0) return;
  try {
    await recordAchievementEvent({
      guildId: String(guildId),
      userId: String(userId),
      eventKey: "economy_balance_reached",
      increment: Math.floor(numericBalance),
      metadata: {
        currentBalance: Math.floor(numericBalance),
        ...metadata
      }
    });
  } catch {
    // ignore achievements errors in API flows
  }
};

const leaderboardI18n = {
  fr: {
    title: 'Classements de l\'économie du serveur "{guild}"',
    empty: "Aucune donnée.",
    footer: "MAJ: {date} • Actualisé automatiquement toutes les 10 minutes.",
    locale: "fr-FR"
  },
  en: {
    title: 'Economy leaderboard for server "{guild}"',
    empty: "No data.",
    footer: "Updated: {date} • Auto-updated every 10 minutes.",
    locale: "en-US"
  },
  es: {
    title: 'Clasificación de economía del servidor "{guild}"',
    empty: "Sin datos.",
    footer: "Actualizado: {date} • Se actualiza cada 10 minutos.",
    locale: "es-ES"
  }
};

const resolveLeaderboardLang = (lang) => {
  const key = String(lang || "").toLowerCase();
  return leaderboardI18n[key] ? key : "fr";
};

const parseFixedTimeZoneOffset = (timeZone) => {
  const raw = String(timeZone || "").trim();
  if (!raw) return null;
  if (/^(utc|gmt)$/i.test(raw)) return 0;
  const match = raw.match(/^(?:utc|gmt)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  const total = hours * 60 + minutes;
  return match[1] === "-" ? -total : total;
};

const formatLeaderboardDate = (lang, timeZone, date) => {
  const i18n = leaderboardI18n[resolveLeaderboardLang(lang)];
  const fixedOffset = parseFixedTimeZoneOffset(timeZone);
  if (fixedOffset !== null) {
    const shifted = new Date(date.getTime() + fixedOffset * 60000);
    return new Intl.DateTimeFormat(i18n.locale, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC"
    }).format(shifted);
  }
  try {
    return new Intl.DateTimeFormat(i18n.locale, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: timeZone || "UTC"
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(i18n.locale, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC"
    }).format(date);
  }
};

const getGuildTimeZone = async (guildId) => {
  try {
    const settings = await getBotSettings(guildId);
    return settings?.timezone || "UTC";
  } catch {
    return "UTC";
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeDiscordId = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Guard against scientific notation / unsafe number coercion from JSON clients.
  if (/e\+/i.test(raw)) return "";
  if (!/^\d{5,22}$/.test(raw)) return raw.replace(/\D/g, "") || "";
  return raw;
};

const normalizeDiscordAvatarUrl = (userId, avatar) => {
  const value = String(avatar || "").trim();
  const id = String(userId || "").trim();
  const defaultAvatar = () => {
    if (!/^\d+$/.test(id)) return "https://cdn.discordapp.com/embed/avatars/0.png";
    try {
      const index = Number((BigInt(id) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch {
      return "https://cdn.discordapp.com/embed/avatars/0.png";
    }
  };
  if (!value) return defaultAvatar();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const hash = value.replace(/\.(png|gif|webp|jpg|jpeg)$/i, "");
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=64`;
};

const parseDiscordRetryAfterMs = async (response) => {
  const headerValue = Number(response.headers.get("retry-after"));
  if (Number.isFinite(headerValue) && headerValue >= 0) {
    return Math.ceil(headerValue * 1000);
  }
  const body = await response.clone().json().catch(() => ({}));
  const bodyRetry = Number(body?.retry_after);
  if (Number.isFinite(bodyRetry) && bodyRetry >= 0) {
    return Math.ceil(bodyRetry * 1000);
  }
  return 1000;
};

// Global Discord REST gate: concurrent bursts were causing 429s and leaving IDs unresolved.
let discordRateLimitedUntil = 0;
let discordRequestChain = Promise.resolve();

const noteDiscordRateLimit = async (response) => {
  const retryMs = await parseDiscordRetryAfterMs(response);
  const until = Date.now() + retryMs + 75;
  if (until > discordRateLimitedUntil) {
    discordRateLimitedUntil = until;
  }
  return retryMs;
};

const waitForDiscordRateLimitWindow = async () => {
  const remaining = discordRateLimitedUntil - Date.now();
  if (remaining > 0) {
    await wait(remaining);
  }
};

const discordFetch = async (url, botToken, { maxAttempts = 5 } = {}) => {
  const run = async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await waitForDiscordRateLimitWindow();
      const response = await fetch(url, {
        headers: { Authorization: `Bot ${botToken}` }
      });
      if (response.status !== 429) {
        return response;
      }
      const retryMs = await noteDiscordRateLimit(response);
      if (attempt >= maxAttempts) {
        return response;
      }
      await wait(retryMs + 75);
    }
    return null;
  };

  const queued = discordRequestChain.then(run, run);
  // Keep the chain alive even if one request fails.
  discordRequestChain = queued.then(
    () => undefined,
    () => undefined
  );
  return queued;
};

const fetchDiscordUserProfile = async ({ userId, botToken, maxAttempts = 5 }) => {
  const normalizedUserId = normalizeDiscordId(userId);
  if (!normalizedUserId || !/^\d{16,22}$/.test(normalizedUserId)) {
    return { ok: false, notFound: true, displayName: String(userId || ""), username: "", avatar: "" };
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await discordFetch(
      `https://discord.com/api/users/${normalizedUserId}`,
      botToken,
      { maxAttempts: 1 }
    );
    if (!response) {
      if (attempt < maxAttempts) {
        await wait(250 * attempt);
        continue;
      }
      return null;
    }
    if (response.ok) {
      const user = await response.json();
      const username = String(user?.username || "").trim();
      const displayName = String(user?.global_name || username || normalizedUserId).trim();
      return {
        ok: true,
        notFound: false,
        displayName: displayName || normalizedUserId,
        username,
        avatar: normalizeDiscordAvatarUrl(normalizedUserId, user?.avatar)
      };
    }
    if (response.status === 404 || response.status === 403) {
      return {
        ok: false,
        notFound: true,
        displayName: normalizedUserId,
        username: "",
        avatar: normalizeDiscordAvatarUrl(normalizedUserId, "")
      };
    }
    if (response.status === 429) {
      await noteDiscordRateLimit(response);
      if (attempt < maxAttempts) continue;
      return null;
    }
    if (response.status >= 500 && attempt < maxAttempts) {
      await wait(300 * attempt);
      continue;
    }
    return null;
  }
  return null;
};

const fetchGuildMemberProfile = async ({ guildId, userId, botToken, maxAttempts = 4 }) => {
  const normalizedGuildId = normalizeDiscordId(guildId);
  const normalizedUserId = normalizeDiscordId(userId);
  if (!normalizedGuildId || !normalizedUserId) {
    return fetchDiscordUserProfile({ userId, botToken });
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await discordFetch(
      `https://discord.com/api/guilds/${normalizedGuildId}/members/${normalizedUserId}`,
      botToken,
      { maxAttempts: 1 }
    );
    if (!response) break;

    if (response.ok) {
      const member = await response.json();
      const username = String(member.user?.username || "").trim();
      const displayName = String(
        member.nick || member.user?.global_name || username || normalizedUserId
      ).trim();
      const guildAvatar = member.avatar;
      const userAvatar = member.user?.avatar;
      let avatar = "";
      if (guildAvatar) {
        const ext = String(guildAvatar).startsWith("a_") ? "gif" : "png";
        avatar = `https://cdn.discordapp.com/guilds/${normalizedGuildId}/users/${normalizedUserId}/avatars/${guildAvatar}.${ext}?size=64`;
      } else {
        avatar = normalizeDiscordAvatarUrl(normalizedUserId, userAvatar);
      }
      return {
        ok: true,
        notFound: false,
        displayName: displayName || normalizedUserId,
        username,
        avatar
      };
    }

    // Member left / unknown in guild → resolve via global user endpoint (still has username).
    if (response.status === 404 || response.status === 403) {
      return fetchDiscordUserProfile({ userId: normalizedUserId, botToken });
    }

    if (response.status === 429) {
      await noteDiscordRateLimit(response);
      if (attempt < maxAttempts) continue;
      break;
    }

    if (response.status >= 500 && attempt < maxAttempts) {
      await wait(300 * attempt);
      continue;
    }
    break;
  }

  // Fallback: never leave a transient guild failure as a raw ID if /users works.
  return fetchDiscordUserProfile({ userId: normalizedUserId, botToken });
};

const mapWithConcurrency = async (items, limit, worker) => {
  const safeLimit = Math.max(1, Number(limit || 1));
  const input = Array.isArray(items) ? items : [];
  const out = new Array(input.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(safeLimit, input.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= input.length) break;
      out[index] = await worker(input[index], index);
    }
  });

  await Promise.all(runners);
  return out;
};

const searchGuildMemberIdsForLeaderboard = async (guildId, search, limit = 25) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const query = String(search || "").trim();
  const normalizedGuildId = normalizeDiscordId(guildId);
  if (!botToken || !normalizedGuildId || query.length < 2) return [];
  try {
    const params = new URLSearchParams({
      query,
      limit: String(Math.max(1, Math.min(25, Number(limit) || 25)))
    });
    const response = await fetch(
      `https://discord.com/api/guilds/${normalizedGuildId}/members/search?${params.toString()}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
    if (!response.ok) return [];
    const payload = await response.json().catch(() => []);
    return (Array.isArray(payload) ? payload : [])
      .map((member) => normalizeDiscordId(member?.user?.id))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const upsertDiscordUserCache = async ({ userId, username, avatar }) => {
  const discordId = normalizeDiscordId(userId);
  if (!discordId) return;
  const name = String(username || "").trim().slice(0, 64);
  const avatarValue = String(avatar || "").trim();
  const avatarHash = avatarValue.includes("/avatars/")
    ? avatarValue.split("/avatars/")[1]?.split(".")[0] || null
    : avatarValue || null;
  try {
    const existing = await db("users").where({ discord_id: discordId }).first();
    if (existing) {
      const payload = {};
      if (name && name !== discordId && name !== existing.username) payload.username = name;
      if (avatarHash && avatarHash !== existing.avatar) payload.avatar = avatarHash;
      if (Object.keys(payload).length) {
        await db("users").where({ discord_id: discordId }).update(payload);
      }
      return;
    }
    if (!name || name === discordId) return;
    await db("users").insert({
      discord_id: discordId,
      username: name,
      avatar: avatarHash
    });
  } catch {
    // Best-effort cache for leaderboard search; ignore conflicts.
  }
};

const toSafePositiveInteger = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const getGuildLogsPolicy = async ({ guildId, requestedLimit = 50 } = {}) => {
  if (!guildId) {
    const safeRequestedLimit = toSafePositiveInteger(requestedLimit, 50, { min: 1, max: 10000 });
    return { limit: safeRequestedLimit, minCreatedAt: null };
  }
  return resolveLogsPolicyWindow({ guildId, requestedLimit, maxLimit: 10000 });
};

apiRouter.get("/me", (req, res) => {
  const user = req.user || {};
  res.json({
    user: {
      discord_id: user.discord_id,
      username: user.username,
      avatar: user.avatar,
      impersonated: user.impersonated,
      impersonated_username: user.impersonated_username,
      iat: user.iat,
      exp: user.exp
    }
  });
});

apiRouter.get("/tawk/session", (req, res) => {
  try {
    if (!isTawkSecureModeConfigured()) {
      return res.json({
        enabled: false,
        reason: "tawk_api_key_missing",
        userId: null,
        hash: null,
        name: null
      });
    }
    const user = req.user || {};
    const payload = buildTawkLoginPayload({
      discordId: user.discord_id,
      username: user.username
    });
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "tawk_session_failed" });
  }
});

const refreshDiscordUserToken = async (refreshToken) => {
  if (!refreshToken) return null;
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || "",
        client_secret: process.env.DISCORD_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: String(refreshToken)
      })
    });
    const tokenData = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokenData?.access_token) return null;
    return tokenData;
  } catch {
    return null;
  }
};

const signDiscordSessionJwt = async (claims) => {
  const rawSecret = process.env.API_SECRET_KEY || "";
  if (!rawSecret) return null;
  const jwtTtl = String(process.env.API_JWT_TTL || "30d").trim() || "30d";
  return new SignJWT({
    discord_id: claims.discord_id,
    username: claims.username,
    avatar: claims.avatar,
    access_token: claims.access_token,
    refresh_token: claims.refresh_token || null
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(jwtTtl)
    .sign(new TextEncoder().encode(rawSecret));
};

apiRouter.get("/servers", async (_req, res) => {
  let accessToken = _req.user?.access_token;
  if (!accessToken) {
    return res.status(401).json({ error: "missing_discord_token" });
  }

  try {
    const fetchGuilds = async (token) => {
      const guildResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const guilds = await guildResponse.json().catch(() => ({}));
      return { guildResponse, guilds };
    };

    let { guildResponse, guilds } = await fetchGuilds(accessToken);
    let refreshedToken = null;

    if (guildResponse.status === 401 && _req.user?.refresh_token) {
      const tokenData = await refreshDiscordUserToken(_req.user.refresh_token);
      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
        refreshedToken = await signDiscordSessionJwt({
          discord_id: _req.user.discord_id,
          username: _req.user.username,
          avatar: _req.user.avatar,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || _req.user.refresh_token
        });
        ({ guildResponse, guilds } = await fetchGuilds(accessToken));
      }
    }

    if (!guildResponse.ok) {
      // Only Discord unauthorized should force re-login. Rate limits / outages must not.
      if (guildResponse.status === 401) {
        return res.status(401).json({ error: "discord_token_expired", details: guilds });
      }
      return res.status(502).json({
        error: "discord_guilds_error",
        status: guildResponse.status,
        details: guilds
      });
    }

    const canManageGuild = (guild) => {
      if (guild.owner) return true;
      try {
        const perms = BigInt(guild.permissions || "0");
        const ADMIN = 0x8n;
        const MANAGE_GUILD = 0x20n;
        return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
      } catch {
        return false;
      }
    };

    const botToken = process.env.DISCORD_BOT_TOKEN;
    let botId = null;
    let botCheckError = null;
    let botGuildIds = null;

    if (botToken) {
      const botUserResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });
      if (botUserResponse.ok) {
        const botUser = await botUserResponse.json();
        botId = botUser.id;
        console.log("[bot-check] bot id:", botId);

        const botGuildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
          headers: {
            Authorization: `Bot ${botToken}`
          }
        });
        if (botGuildsResponse.ok) {
          const botGuilds = await botGuildsResponse.json();
          botGuildIds = new Set(botGuilds.map((g) => g.id));
          console.log("[bot-check] bot guilds count:", botGuildIds.size);
        }
      } else {
        botCheckError = "bot_user_fetch_failed";
      }
    }

    const guildRows = await db("guilds")
      .select("discord_guild_id", "banned", "banned_reason")
      .whereIn(
        "discord_guild_id",
        guilds.map((g) => g.id)
      );
    const guildMap = new Map(
      guildRows.map((row) => [String(row.discord_guild_id), row])
    );

    const subscriptionRows = await db("billing_subscriptions")
      .select("guild_discord_id", "plan_key", "status", "current_period_end", "cancel_at_period_end")
      .whereIn("guild_discord_id", guilds.map((g) => String(g.id)));
    const subscriptionMap = new Map(
      subscriptionRows.map((row) => [String(row.guild_discord_id), row])
    );

    const servers = await Promise.all(
      guilds.filter(canManageGuild).map(async (guild) => {
        let botPresent = false;
        if (botToken && botId) {
          if (botGuildIds) {
            botPresent = botGuildIds.has(guild.id);
          } else {
            const memberResponse = await fetch(
              `https://discord.com/api/guilds/${guild.id}/members/${botId}`,
              {
                headers: {
                  Authorization: `Bot ${botToken}`
                }
              }
            );
            botPresent = memberResponse.ok;
            console.log("[bot-check] guild", guild.id, "member status", memberResponse.status);
          }
        }

        const guildRow = guildMap.get(String(guild.id));
        const billingRow = subscriptionMap.get(String(guild.id));
        const billingStatus = String(billingRow?.status || "free").toLowerCase();
        const isPremium = billingStatus === "active" || billingStatus === "trialing";
        return {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
          permissions: guild.permissions,
          botPresent,
          canManage: true,
          botCheckError,
          botId,
          banned: Boolean(guildRow?.banned),
          banned_reason: guildRow?.banned_reason || "",
          billing: {
            planKey: isPremium ? "premium" : "free",
            isPremium,
            status: billingStatus,
            currentPeriodEnd: billingRow?.current_period_end || null,
            cancelAtPeriodEnd: Boolean(billingRow?.cancel_at_period_end)
          }
        };
      })
    );

    return res.json({
      servers,
      ...(refreshedToken ? { token: refreshedToken } : {})
    });
  } catch (error) {
    return res.status(500).json({ error: "servers_fetch_failed" });
  }
});

apiRouter.get("/guilds/:id/billing", async (req, res) => {
  try {
    await assertUserCanManageGuild({
      accessToken: req.user?.access_token,
      guildDiscordId: req.params.id,
      discordId: req.user?.discord_id || req.user?.id
    });
    const summary = await getGuildBillingSummary(req.params.id);
    return res.json(summary);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error?.message || "billing_fetch_failed" });
  }
});

apiRouter.post("/guilds/:id/billing/sync", async (req, res) => {
  try {
    await assertUserCanManageGuild({
      accessToken: req.user?.access_token,
      guildDiscordId: req.params.id,
      discordId: req.user?.discord_id || req.user?.id
    });
    // Never invent a payer from the current viewer (platform admins are not the subscriber).
    // Sync only uses payerDiscordId as a fallback when the guild has no billing account yet.
    const account = await db("billing_accounts")
      .where({ guild_discord_id: String(req.params.id || "").replace(/\D/g, "") })
      .first();
    const result = await syncGuildBillingFromStripe(req.params.id, {
      payerDiscordId: account?.payer_discord_id || null
    });
    const summary = await getGuildBillingSummary(req.params.id);
    return res.json({ ...result, billing: summary });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error?.message || "billing_sync_failed" });
  }
});

apiRouter.post("/guilds/:id/billing/checkout", async (req, res) => {
  try {
    await assertUserCanManageGuild({
      accessToken: req.user?.access_token,
      guildDiscordId: req.params.id,
      discordId: req.user?.discord_id || req.user?.id
    });
    const result = await createGuildCheckoutSession({
      guildDiscordId: req.params.id,
      payerDiscordId: req.user?.discord_id || req.user?.id,
      payerEmail: req.user?.email || null,
      intervalKey: req.body?.interval || req.body?.intervalKey || "monthly",
      waiveRetraction: req.body?.waiveRetraction === true,
      promotionCode: req.body?.promotionCode || req.body?.promoCode || null,
      successUrl: req.body?.successUrl,
      cancelUrl: req.body?.cancelUrl
    });
    return res.json(result);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error?.message || "billing_checkout_failed" });
  }
});

apiRouter.post("/guilds/:id/billing/portal", async (req, res) => {
  try {
    await assertUserCanManageGuild({
      accessToken: req.user?.access_token,
      guildDiscordId: req.params.id,
      discordId: req.user?.discord_id || req.user?.id
    });
    const result = await createGuildPortalSession({
      guildDiscordId: req.params.id,
      returnUrl: req.body?.returnUrl
    });
    return res.json(result);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error?.message || "billing_portal_failed" });
  }
});

apiRouter.get("/guilds/:id/billing/cleanup", async (req, res) => {
  try {
    await assertUserCanManageGuild({
      accessToken: req.user?.access_token,
      guildDiscordId: req.params.id,
      discordId: req.user?.discord_id || req.user?.id
    });
    const lockedContent = await getLockedPremiumContent(req.params.id);
    return res.json({
      pending: null,
      lockedContent
    });
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ error: error?.message || "billing_cleanup_failed" });
  }
});

apiRouter.post("/guilds/:id/billing/cleanup/apply", async (req, res) => {
  try {
    await assertUserCanManageGuild({
      accessToken: req.user?.access_token,
      guildDiscordId: req.params.id,
      discordId: req.user?.discord_id || req.user?.id
    });
    const result = await applyDowngradeCleanupSelection({
      guildDiscordId: req.params.id,
      selection: req.body?.selection || req.body || {},
      resolvedBy: req.user?.discord_id || req.user?.id || null,
      resolution: "manual"
    });
    return res.json(result);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({
      error: error?.message || "billing_cleanup_apply_failed",
      ...(error?.payload || {})
    });
  }
});

apiRouter.get("/guilds/:id/settings", async (_req, res) => {
  try {
    const settingsRaw = await getOrCreateSettings(_req.params.id);
    const settings = await applyDailyBonusPolicyForGuild(_req.params.id, settingsRaw);
    return res.json({ settings });
  } catch (error) {
    console.error("settings_fetch_failed", error);
    return res.status(500).json({ error: "settings_fetch_failed" });
  }
});

apiRouter.get("/guilds/:id/status", async (req, res) => {
  try {
    const status = await getGuildStatus(req.params.id);
    return res.json({ status });
  } catch (error) {
    return res.status(500).json({ error: "status_failed" });
  }
});

apiRouter.get("/guilds/:id/bot-settings", async (req, res) => {
  try {
    const settings = await getBotSettings(req.params.id);
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "bot_settings_failed" });
  }
});

apiRouter.post("/guilds/:id/bot-settings", async (req, res) => {
  try {
    const settings = await saveBotSettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "bot_settings_failed" });
  }
});

apiRouter.get("/guilds/:id/user-ui", async (req, res) => {
  try {
    const guild = await ensureGuild(req.params.id, db);
    const row = await db("guilds").where({ id: guild.id }).first();
    return res.json({ disabled: Boolean(row?.user_ui_disabled) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "user_ui_fetch_failed" });
  }
});

apiRouter.post("/guilds/:id/user-ui", async (req, res) => {
  try {
    const disabled = Boolean(req.body?.disabled);
    const guild = await setGuildUserUiDisabled({ guildId: req.params.id, disabled });
    return res.json({ disabled: Boolean(guild?.user_ui_disabled) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "user_ui_save_failed" });
  }
});

apiRouter.get("/guilds/:id/twitch/status", async (req, res) => {
  try {
    const settings = await getTwitchSettings(req.params.id);
    if (!settings) return res.json({ connected: false });
    const refreshed = await refreshTokenIfNeeded(settings);
    void startTwitchListener(req.params.id);
    const snapshot = await getTwitchStreamSnapshot(req.params.id, { forceRefresh: true });
    void recordTwitchLiveSessionTick(req.params.id, snapshot || { live: false }, []);
    let linkSlug = "";
    let effectiveLinkSlug = "";
    try {
      linkSlug = await getGuildLinkSlug(req.params.id);
      effectiveLinkSlug = await ensureGuildLinkSlug(req.params.id);
    } catch {
      linkSlug = "";
      effectiveLinkSlug = "";
    }
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    return res.json({
      connected: true,
      login: refreshed.twitch_login,
      broadcasterId: refreshed.twitch_broadcaster_id,
      live: Boolean(snapshot.live),
      title: snapshot.title || "",
      gameName: snapshot.gameName || "",
      viewerCount: Number(snapshot.viewerCount || 0) || 0,
      startedAt: snapshot.startedAt || null,
      linkSlug,
      effectiveLinkSlug,
      live_only: refreshed.live_only === undefined || refreshed.live_only === null
        ? true
        : Boolean(refreshed.live_only)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_status_failed" });
  }
});

apiRouter.post("/guilds/:id/twitch/link-slug", async (req, res) => {
  try {
    const settings = await getTwitchSettings(req.params.id);
    if (!settings) return res.status(400).json({ error: "twitch_not_connected" });
    const result = await updateGuildLinkSlug(req.params.id, req.body?.slug);
    return res.json({
      ok: true,
      linkSlug: result.slug,
      effectiveLinkSlug: result.effectiveSlug
    });
  } catch (error) {
    const code = error?.code || error?.message || "link_slug_failed";
    return res.status(400).json({ error: code });
  }
});

apiRouter.get("/guilds/:id/twitch/live-history", async (req, res) => {
  try {
    const settings = await getTwitchSettings(req.params.id);
    if (!settings) return res.json({ items: [], total: 0, page: 1, pageSize: 10 });
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || req.query.limit || 10);
    const data = await listTwitchLiveSessions(req.params.id, { page, pageSize });
    return res.json(data);
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_live_history_failed" });
  }
});

apiRouter.post("/guilds/:id/twitch/live-mode", async (req, res) => {
  try {
    const liveOnly = req.body?.live_only;
    if (typeof liveOnly !== "boolean") {
      return res.status(400).json({ error: "invalid_params" });
    }
    const settings = await updateTwitchLiveMode(req.params.id, liveOnly);
    if (!settings) return res.status(400).json({ error: "twitch_not_connected" });
    return res.json({ ok: true, live_only: settings.live_only !== false });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_live_mode_failed" });
  }
});

apiRouter.post("/guilds/:id/twitch/disconnect", async (req, res) => {
  try {
    await deleteTwitchSettings(req.params.id);
    await stopTwitchListener(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_disconnect_failed" });
  }
});

apiRouter.post("/guilds/:id/discord-invite", async (req, res) => {
  try {
    const invite = await createGuildInvite({
      guildId: req.params.id,
      maxAge: 0,
      maxUses: 0
    });
    return res.json({ ok: true, invite });
  } catch (error) {
    return res.status(400).json({ error: error.message || "invite_failed" });
  }
});

apiRouter.get("/guilds/:id/twitch/automation", async (req, res) => {
  try {
    const config = await getTwitchAutomationConfig(req.params.id);
    return res.json({ config });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_automation_failed" });
  }
});

apiRouter.get("/guilds/:id/twitch/daily-settings", async (req, res) => {
  try {
    const settings = await getOrCreateTwitchDailySettings(req.params.id);
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_daily_settings_failed" });
  }
});

apiRouter.post("/guilds/:id/twitch/daily-settings", async (req, res) => {
  try {
    const settings = await saveTwitchDailySettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_daily_settings_failed" });
  }
});

apiRouter.get("/guilds/:id/twitch/promo", async (req, res) => {
  try {
    const settings = await getTwitchPromoSettings(req.params.id);
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_promo_failed" });
  }
});

apiRouter.post("/guilds/:id/twitch/promo", async (req, res) => {
  try {
    const settings = await saveTwitchPromoSettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_promo_failed" });
  }
});

apiRouter.get("/guilds/:id/games/settings", async (req, res) => {
  try {
    const settings = await getGamesSettings(req.params.id);
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "games_settings_failed" });
  }
});

apiRouter.post("/guilds/:id/games/settings", async (req, res) => {
  try {
    const settings = await saveGamesSettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "games_settings_failed" });
  }
});

apiRouter.get("/guilds/:id/achievements", async (req, res) => {
  try {
    const payload = await getAchievementConfigPayload(req.params.id);
    return res.json(payload);
  } catch (error) {
    return res.status(400).json({ error: error.message || "achievements_fetch_failed" });
  }
});

apiRouter.post("/guilds/:id/achievements/settings", async (req, res) => {
  try {
    const settings = await saveAchievementSettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "achievements_settings_failed" });
  }
});

apiRouter.post("/guilds/:id/achievements", async (req, res) => {
  try {
    const achievement = await createAchievement(req.params.id, req.body || {});
    return res.json({ achievement });
  } catch (error) {
    const status = Number(error?.status || 400);
    return res.status(status).json({
      error: error.message || "achievement_create_failed",
      ...(error?.payload || {})
    });
  }
});

apiRouter.put("/guilds/:id/achievements/:achievementId", async (req, res) => {
  try {
    const achievement = await updateAchievement(req.params.id, req.params.achievementId, req.body || {});
    return res.json({ achievement });
  } catch (error) {
    const status = Number(error?.status || 400);
    return res.status(status).json({
      error: error.message || "achievement_update_failed",
      ...(error?.payload || {})
    });
  }
});

apiRouter.post("/guilds/:id/achievements/templates/:templateKey", async (req, res) => {
  try {
    const achievement = await applyAchievementTemplate(req.params.id, req.params.templateKey);
    return res.json({ achievement });
  } catch (error) {
    const status = Number(error?.status || 400);
    return res.status(status).json({
      error: error.message || "achievement_template_failed",
      ...(error?.payload || {})
    });
  }
});

apiRouter.get("/guilds/:id/achievements/sync-status", async (req, res) => {
  try {
    return res.json(getAchievementSyncStatus(req.params.id));
  } catch (error) {
    return res.status(400).json({ error: error.message || "achievement_sync_status_failed" });
  }
});

apiRouter.post("/guilds/:id/achievements/:achievementId/sync", async (req, res) => {
  try {
    const result = await startAchievementSyncFromDiscord({
      guildId: req.params.id,
      achievementId: req.params.achievementId
    });
    return res.status(202).json(result);
  } catch (error) {
    const status = Number(error?.status || 400);
    return res.status(status).json({
      error: error.message || "achievement_sync_failed",
      ...(error?.payload ? { sync: error.payload } : {})
    });
  }
});

apiRouter.delete("/guilds/:id/achievements/:achievementId", async (req, res) => {
  const confirm = String(req.query.confirm || req.body?.confirm || "").trim().toUpperCase();
  if (confirm !== "DELETE") {
    return res.status(400).json({ error: "delete_confirmation_required" });
  }
  try {
    const result = await deleteAchievement(req.params.id, req.params.achievementId);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "achievement_delete_failed" });
  }
});

apiRouter.get("/guilds/:id/birthdays", async (req, res) => {
  try {
    const payload = await listGuildBirthdays(req.params.id, { limit: 2000 });
    return res.json(payload);
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthdays_fetch_failed" });
  }
});

apiRouter.post("/guilds/:id/birthdays/settings", async (req, res) => {
  try {
    const settings = await saveBirthdaySettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthdays_settings_failed" });
  }
});

apiRouter.post("/guilds/:id/birthdays/entries", async (req, res) => {
  const userId = normalizeDiscordId(req.body?.userId || req.body?.user_id);
  const birthDate = String(req.body?.birthDate || req.body?.birth_date || "").trim();
  if (!userId || !birthDate) {
    return res.status(400).json({ error: "missing_params" });
  }
  try {
    const result = await upsertBirthdayEntry({
      guildId: req.params.id,
      userId,
      birthDate,
      source: "admin",
      actorUserId: req.user?.discord_id || "",
      triggerAchievement: true,
      logChange: true
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthday_upsert_failed" });
  }
});

apiRouter.delete("/guilds/:id/birthdays/entries/:userId", async (req, res) => {
  const userId = normalizeDiscordId(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: "missing_params" });
  }
  try {
    const result = await deleteBirthdayEntry({
      guildId: req.params.id,
      userId,
      source: "admin",
      actorUserId: req.user?.discord_id || "",
      logChange: true
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthday_delete_failed" });
  }
});

apiRouter.post("/guilds/:id/birthdays/sync-role", async (req, res) => {
  try {
    const result = await processBirthdayRoleAssignments({ guildId: req.params.id });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "birthday_role_sync_failed" });
  }
});

apiRouter.get("/guilds/:id/twitch/linked-users", async (req, res) => {
  try {
    const guild = await ensureGuild(req.params.id, db);
    const settings = await getTwitchSettings(req.params.id);
    const streamerLogin = String(settings?.twitch_login || "").toLowerCase();
    const rows = await db("users")
      .join("balances", "users.discord_id", "balances.user_discord_id")
      .where({ "balances.guild_id": guild.id })
      .whereNotNull("users.twitch_login")
      .leftJoin("twitch_activity", function () {
        this.on("twitch_activity.guild_id", "=", db.raw("?", [guild.id]))
          .andOn(
            db.raw("LOWER(twitch_activity.twitch_login)"),
            "=",
            db.raw("LOWER(users.twitch_login)")
          );
      })
      .select("users.discord_id", "users.username", "users.avatar", "users.twitch_login")
      .select("twitch_activity.sub_tier as twitch_tier")
      .orderBy("users.username", "asc");
    const users = (rows || []).map((row) => ({
      ...row,
      is_streamer: streamerLogin && String(row.twitch_login || "").toLowerCase() === streamerLogin
    }));
    return res.json({ users });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_linked_users_failed" });
  }
});

apiRouter.delete("/guilds/:id/twitch/linked-users/:discordId", async (req, res) => {
  try {
    const guild = await ensureGuild(req.params.id, db);
    const discordId = String(req.params.discordId || "").trim();
    if (!discordId) return res.status(400).json({ error: "missing_params" });

    const user = await db("users").where({ discord_id: discordId }).first();
    if (!user) return res.status(404).json({ error: "user_not_found" });

    await db("users").where({ discord_id: discordId }).update({
      twitch_id: null,
      twitch_login: null
    });

    if (user.twitch_login) {
      await db("twitch_activity")
        .where({ guild_id: guild.id })
        .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(user.twitch_login)])
        .del();
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_unlink_failed" });
  }
});

apiRouter.post("/guilds/:id/twitch/automation", async (req, res) => {
  try {
    const config = await saveTwitchAutomationConfig(req.params.id, req.body || {});
    return res.json({ config });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_automation_failed" });
  }
});

apiRouter.post("/guilds/:id/twitch/subs-sync", async (req, res) => {
  try {
    await syncCurrentSubs(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_sync_failed" });
  }
});

apiRouter.post("/guilds/:id/settings", async (req, res) => {
  const guildId = req.params.id;
  const body = req.body || {};
  try {
    const guild = await ensureGuild(guildId, db);
    const rawPayload = {
      name: body.name,
      emoji_symbol: body.emoji_symbol ?? body.emoji,
      start_balance: body.start_balance ?? body.startBalance,
      max_balance: body.max_balance ?? body.maxBalance,
      daily_amount: body.daily_amount ?? body.dailyAmount,
      streak_7_bonus_percent: body.streak_7_bonus_percent ?? body.streak7,
      streak_14_bonus_percent: body.streak_14_bonus_percent ?? body.streak14,
      streak_30_bonus_percent: body.streak_30_bonus_percent ?? body.streak30,
      log_channel_id: body.log_channel_id ?? body.logChannelId ?? null,
      enabled: body.enabled ?? true
    };
    const payload = await applyDailyBonusPolicyForGuild(guildId, rawPayload);

    await db("economy_settings")
      .insert({ guild_id: guild.id, ...payload })
      .onConflict("guild_id")
      .merge(payload);

    const settingsRaw = await getOrCreateSettings(guildId);
    const settings = await applyDailyBonusPolicyForGuild(guildId, settingsRaw);
    return res.json({ ok: true, settings });
  } catch (error) {
    console.error("settings_save_failed", error);
    return res.status(500).json({ error: "settings_save_failed" });
  }
});

apiRouter.get("/guilds/:id/economy/automation", async (req, res) => {
  try {
    const config = await getAutomationConfig(req.params.id);
    res.json({ config });
  } catch (error) {
    res.status(400).json({ error: error.message || "automation_failed" });
  }
});

apiRouter.post("/guilds/:id/economy/automation", async (req, res) => {
  try {
    const config = await saveAutomationConfig(req.params.id, req.body || {});
    res.json({ ok: true, config });
  } catch (error) {
    res.status(400).json({ error: error.message || "automation_failed" });
  }
});

apiRouter.post("/economy/daily", async (req, res) => {
  const guildId = req.body?.guildId;
  const userId = req.user?.discord_id;
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const result = await applyDaily({ guildId, userId });
    if (result?.ok) {
      try {
        await recordAchievementEvent({
          guildId: String(guildId),
          userId: String(userId),
          eventKey: "daily_claims",
          increment: 1
        });
      } catch {
        // ignore achievements errors in daily endpoint
      }
      await trackBalanceAchievementSafe({
        guildId,
        userId,
        balance: result.balance,
        metadata: { source: "daily" }
      });
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "daily_failed" });
  }
});

apiRouter.get("/economy/leaderboard", async (req, res) => {
  const guildId = req.query.guildId;
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
  const page = Math.max(1, Number(req.query.page || 1));
  const minBalance = Number(req.query.minBalance || 0);
  const search = String(req.query.search || "").trim().slice(0, 80);
  const offset = (page - 1) * limit;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    let matchedIds = [];
    if (search) {
      const isSnowflake = /^\d{16,22}$/.test(search);
      if (!isSnowflake) {
        matchedIds = await searchGuildMemberIdsForLeaderboard(guildId, search);
      }
    }
    const [leaderboard, total] = await Promise.all([
      getLeaderboard({ guildId, limit, offset, minBalance, search, matchedIds }),
      getLeaderboardTotal({ guildId, minBalance, search, matchedIds })
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    return res.json({ leaderboard, page, limit, total, totalPages });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_failed" });
  }
});

apiRouter.get("/economy/summary", async (req, res) => {
  const guildId = req.query.guildId;
  const tzOffset = Number(req.query.tzOffset || 0);
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const day = await getGainSummary({ guildId, period: "day", tzOffset });
    const month = await getGainSummary({ guildId, period: "month", tzOffset });
    const year = await getGainSummary({ guildId, period: "year", tzOffset });
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({ day, month, year });
  } catch (error) {
    return res.status(400).json({ error: error.message || "summary_failed" });
  }
});

apiRouter.post("/economy/reset", async (req, res) => {
  const guildId = req.body?.guildId;
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const result = await resetAllBalances({ guildId });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "reset_failed" });
  }
});

apiRouter.post("/economy/user-balance", async (req, res) => {
  const { guildId, userId, amount, mode } = req.body || {};
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const result = await updateUserBalance({ guildId, userId, amount, mode });
    await trackBalanceAchievementSafe({
      guildId,
      userId,
      balance: result.balance,
      metadata: { source: "manual" }
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message || "balance_update_failed" });
  }
});

apiRouter.post("/economy/all-balances/add", async (req, res) => {
  const { guildId, amount } = req.body || {};
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const result = await addAmountToAllBalances({ guildId, amount });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "mass_balance_update_failed" });
  }
});

apiRouter.get("/guilds/:id/leaderboard-post", async (req, res) => {
  try {
    const settings = await getLeaderboardPostSettings(req.params.id);
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_post_failed" });
  }
});

apiRouter.post("/guilds/:id/leaderboard-post", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const existing = await getLeaderboardPostSettings(req.params.id);
    const nextChannelId = String(req.body?.channel_id || req.body?.channelId || "");
    if (existing?.message_id && existing?.channel_id && existing.channel_id !== nextChannelId) {
      await fetch(
        `https://discord.com/api/channels/${existing.channel_id}/messages/${existing.message_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` }
        }
      );
    }
    const settings = await saveLeaderboardPostSettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    if (error.message === "leaderboard_already_exists") {
      return res.status(400).json({ error: "leaderboard_already_exists" });
    }
    return res.status(400).json({ error: error.message || "leaderboard_post_failed" });
  }
});

apiRouter.delete("/guilds/:id/leaderboard-post", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const settings = await getLeaderboardPostSettings(req.params.id);
    if (settings?.channel_id && settings?.message_id) {
      await fetch(
        `https://discord.com/api/channels/${settings.channel_id}/messages/${settings.message_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` }
        }
      );
    }
    await deleteLeaderboardPostSettings(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_post_failed" });
  }
});

apiRouter.post("/guilds/:id/leaderboard-post/send", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const settings = await getLeaderboardPostSettings(req.params.id);
    if (!settings || settings.enabled === false || !settings.channel_id) {
      return res.status(400).json({ error: "leaderboard_not_configured" });
    }

    const guildRes = await fetch(`https://discord.com/api/guilds/${req.params.id}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    if (!guildRes.ok) {
      const err = await guildRes.json().catch(() => ({}));
      console.warn("[leaderboard] Discord guild fetch failed", {
        status: guildRes.status,
        details: err
      });
      return res.status(guildRes.status).json({ error: "discord_guild_fetch_failed", details: err });
    }
    const guildData = await guildRes.json();
    const guildName = guildData?.name || "Serveur";

    const botSettings = await getBotSettings(req.params.id);
    const langKey = resolveLeaderboardLang(botSettings?.bot_language);
    const i18n = leaderboardI18n[langKey];
    const timeZone = botSettings?.timezone || "UTC";

    const settingsEconomy = await getOrCreateSettings(req.params.id);
    const currencyEmoji = settingsEconomy?.emoji_symbol || "💰";

    const rows = await getLeaderboard({ guildId: req.params.id, limit: settings.limit || 10 });
    const filtered = rows.filter((row) => Number(row.balance || 0) > 0);

    const members = await Promise.all(
      filtered.map(async (row) => {
        const memberRes = await fetch(
          `https://discord.com/api/guilds/${req.params.id}/members/${row.userId}`,
          { headers: { Authorization: `Bot ${botToken}` } }
        );
        if (!memberRes.ok) return { ...row, name: row.userId };
        const member = await memberRes.json();
        const name = member.nick || member.user?.global_name || member.user?.username || row.userId;
        return { ...row, name };
      })
    );

    const baseUrl = process.env.BASE_URL || "";
    const userUrl = baseUrl
      ? (() => {
          try {
            return new URL(`/user/guild/${req.params.id}`, baseUrl).toString();
          } catch {
            return `${String(baseUrl).replace(/\/+$/, "")}/user/guild/${req.params.id}`;
          }
        })()
      : "";
    const medal = (index) => (index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : String(index + 1));
    const lines = members.map((row, index) => {
      const m = medal(index);
      const label = userUrl ? `[${row.name}](${userUrl})` : row.name;
      return `${m} : ${label}\n➥ ${row.balance} ${currencyEmoji}`;
    });

    const embed = {
      title: i18n.title.replace("{guild}", guildName),
      description: lines.join("\n\n") || i18n.empty,
      footer: { text: i18n.footer.replace("{date}", formatLeaderboardDate(langKey, timeZone, new Date())) },
      color: 0x2563eb
    };

    let messageId = settings.message_id;
    if (messageId) {
      const messageRes = await fetch(
        `https://discord.com/api/channels/${settings.channel_id}/messages/${messageId}`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );
      if (messageRes.ok) {
        const patchRes = await fetch(`https://discord.com/api/channels/${settings.channel_id}/messages/${messageId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ embeds: [embed] })
        });
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}));
          console.warn("[leaderboard] Discord message update failed", {
            status: patchRes.status,
            details: err
          });
          return res.status(patchRes.status).json({ error: "discord_message_update_failed", details: err });
        }
        return res.json({ ok: true, updated: true });
      }
    }

    const sentRes = await fetch(`https://discord.com/api/channels/${settings.channel_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ embeds: [embed] })
    });
    if (!sentRes.ok) {
      const err = await sentRes.json().catch(() => ({}));
      console.warn("[leaderboard] Discord message send failed", {
        status: sentRes.status,
        details: err
      });
      return res.status(sentRes.status).json({ error: "discord_message_send_failed", details: err });
    }
    const sent = await sentRes.json();
    if (sent?.id) {
      await updateLeaderboardMessageId(req.params.id, sent.id);
    }
    return res.json({ ok: true, created: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_post_failed" });
  }
});

apiRouter.get("/guilds/:id/leaderboard-post/status", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const settings = await getLeaderboardPostSettings(req.params.id);
    if (!settings?.channel_id || !settings?.message_id) {
      return res.json({ status: "none" });
    }
    const channelRes = await fetch(
      `https://discord.com/api/channels/${settings.channel_id}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
    if (!channelRes.ok) return res.json({ status: "none" });
    const channel = await channelRes.json();
    const messageRes = await fetch(
      `https://discord.com/api/channels/${settings.channel_id}/messages/${settings.message_id}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
    if (!messageRes.ok) return res.json({ status: "none" });
    return res.json({ status: "exists", channelName: channel?.name || settings.channel_id });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leaderboard_post_failed" });
  }
});

apiRouter.get("/economy/user-stats", async (req, res) => {
  const guildId = req.query.guildId;
  const userId = req.query.userId;
  const from = req.query.from;
  const to = req.query.to;
  const tzOffset = Number(req.query.tzOffset || 0);
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const stats = await getUserGainStats({ guildId, userId, from, to, tzOffset });
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({ stats });
  } catch (error) {
    return res.status(400).json({ error: error.message || "user_stats_failed" });
  }
});

apiRouter.post("/economy/debug/seed-gain", async (req, res) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { guildId, userId } = req.body || {};
  if (!guildId || !userId) return res.status(400).json({ error: "missing_params" });
  try {
    const guild = await ensureGuild(guildId, db);
    await db("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: String(userId),
      source: "message",
      base_amount: 5,
      multiplier: 1,
      bonus_amount: 0,
      total_amount: 5,
      created_at: new Date()
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "seed_failed" });
  }
});

apiRouter.get("/economy/gains", async (req, res) => {
  const guildId = req.query.guildId;
  const userId = req.query.userId;
  const requestedLimit = Number(req.query.limit || 50);
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const logsPolicy = await getGuildLogsPolicy({ guildId, requestedLimit });
    const guild = await ensureGuild(guildId, db);
    const query = db("economy_gain_logs")
      .where({ guild_id: guild.id })
      .orderBy("created_at", "desc")
      .limit(logsPolicy.limit);
    if (logsPolicy.minCreatedAt) {
      query.andWhere("created_at", ">=", logsPolicy.minCreatedAt);
    }
    if (userId) {
      query.andWhere({ user_discord_id: String(userId) });
    }
    const rows = await query;
    const timeZone = await getGuildTimeZone(guildId);
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({ logs: rows, timeZone });
  } catch (error) {
    return res.status(400).json({ error: error.message || "gains_failed" });
  }
});

apiRouter.get("/guilds/:id/community-message", async (req, res) => {
  try {
    const { settings, missingDetected } = await syncInfoMessagePresence(req.params.id);
    return res.json({ settings, missingDetected: Boolean(missingDetected) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "community_message_failed" });
  }
});

apiRouter.post("/guilds/:id/community-message/reset-refs", async (req, res) => {
  try {
    const settings = await clearInfoMessageRefs(req.params.id);
    return res.json({ ok: true, settings, missingDetected: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "community_message_failed" });
  }
});

apiRouter.post("/guilds/:id/community-message", async (req, res) => {
  try {
    const settings = await saveInfoMessageSettings(req.params.id, req.body || {});
    return res.json({ settings });
  } catch (error) {
    return res.status(400).json({ error: error.message || "community_message_failed" });
  }
});

apiRouter.post("/guilds/:id/community-message/preview", async (req, res) => {
  try {
    const settings = await saveInfoMessageSettings(req.params.id, req.body || {});
    const preview = await buildInfoMessage({ guildId: req.params.id, settings, allowLong: true });
    return res.json({ preview });
  } catch (error) {
    return res.status(400).json({ error: error.message || "community_message_failed" });
  }
});

apiRouter.post("/guilds/:id/community-message/send", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    await saveInfoMessageSettings(req.params.id, req.body || {});
    const { settings } = await syncInfoMessagePresence(req.params.id);
    if (!settings.channel_id) return res.status(400).json({ error: "missing_channel" });
    if (settings.message_id || (Array.isArray(settings.message_ids) && settings.message_ids.length)) {
      return res.status(400).json({ error: "message_already_sent" });
    }
    const result = await sendInfoMessage({
      guildId: req.params.id,
      channelId: settings.channel_id,
      settings
    });
    const messageIds = Array.isArray(result.messageIds) ? result.messageIds.map(String).filter(Boolean) : [];
    if (messageIds.length) {
      await updateInfoMessageMessageIds(req.params.id, messageIds);
    } else if (result.messageId) {
      await updateInfoMessageMessageId(req.params.id, result.messageId);
    }
    return res.json({
      ok: true,
      messageId: result.messageId || messageIds[0] || null,
      messageIds,
      length: result.length
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "community_message_failed" });
  }
});

apiRouter.post("/guilds/:id/community-message/update", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    await saveInfoMessageSettings(req.params.id, req.body || {});
    const { settings } = await syncInfoMessagePresence(req.params.id);
    if (!settings.channel_id) return res.status(400).json({ error: "missing_channel" });
    const existingIds =
      Array.isArray(settings.message_ids) && settings.message_ids.length
        ? settings.message_ids
        : settings.message_id
          ? [settings.message_id]
          : [];
    if (!existingIds.length) return res.status(400).json({ error: "message_not_sent" });
    const result = await updateInfoMessage({
      guildId: req.params.id,
      channelId: settings.channel_id,
      settings,
      existingMessageIds: existingIds
    });
    const messageIds = Array.isArray(result.messageIds) ? result.messageIds.map(String).filter(Boolean) : [];
    if (messageIds.length) {
      await updateInfoMessageMessageIds(req.params.id, messageIds);
    } else if (result.messageId) {
      await updateInfoMessageMessageId(req.params.id, result.messageId);
    }
    return res.json({
      ok: true,
      updated: true,
      messageId: result.messageId || messageIds[0] || null,
      messageIds,
      length: result.length
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "community_message_failed" });
  }
});

apiRouter.delete("/guilds/:id/community-message", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const settings = await getInfoMessageSettings(req.params.id);
    const ids =
      Array.isArray(settings?.message_ids) && settings.message_ids.length
        ? settings.message_ids
        : settings?.message_id
          ? [settings.message_id]
          : [];
    if (settings?.channel_id && ids.length) {
      for (const id of ids) {
        await fetch(`https://discord.com/api/channels/${settings.channel_id}/messages/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` }
        });
      }
    }
    await updateInfoMessageMessageIds(req.params.id, []);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "community_message_failed" });
  }
});

apiRouter.get("/economy/transactions", async (req, res) => {
  const guildId = req.query.guildId;
  const requestedLimit = Number(req.query.limit || 100);
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const logsPolicy = await getGuildLogsPolicy({ guildId, requestedLimit });
    const guild = await ensureGuild(guildId, db);
    const query = db("economy_event_logs")
      .where({ guild_id: guild.id, category: "transaction" })
      .orderBy("created_at", "desc")
      .limit(logsPolicy.limit);
    if (logsPolicy.minCreatedAt) {
      query.andWhere("created_at", ">=", logsPolicy.minCreatedAt);
    }
    const rows = await query;
    const timeZone = await getGuildTimeZone(guildId);
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({ logs: rows, timeZone });
  } catch (error) {
    return res.status(400).json({ error: error.message || "transactions_failed" });
  }
});

apiRouter.get("/economy/games", async (req, res) => {
  const guildId = req.query.guildId;
  const requestedLimit = Number(req.query.limit || 100);
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const logsPolicy = await getGuildLogsPolicy({ guildId, requestedLimit });
    const guild = await ensureGuild(guildId, db);
    const query = db("economy_event_logs")
      .where({ guild_id: guild.id, category: "game" })
      .orderBy("created_at", "desc")
      .limit(logsPolicy.limit);
    if (logsPolicy.minCreatedAt) {
      query.andWhere("created_at", ">=", logsPolicy.minCreatedAt);
    }
    const rows = await query;
    const timeZone = await getGuildTimeZone(guildId);
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({ logs: rows, timeZone });
  } catch (error) {
    return res.status(400).json({ error: error.message || "game_logs_failed" });
  }
});

apiRouter.get("/economy/leaves", async (req, res) => {
  const guildId = req.query.guildId;
  const requestedLimit = Number(req.query.limit || 100);
  if (!guildId) return res.status(400).json({ error: "missing_params" });
  try {
    const logsPolicy = await getGuildLogsPolicy({ guildId, requestedLimit });
    const { listMemberLeaveLogs } = await import("../services/members.js");
    const logs = await listMemberLeaveLogs({
      guildId,
      limit: logsPolicy.limit,
      minCreatedAt: logsPolicy.minCreatedAt || null
    });
    const timeZone = await getGuildTimeZone(guildId);
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({ logs, timeZone });
  } catch (error) {
    return res.status(400).json({ error: error.message || "leave_logs_failed" });
  }
});

apiRouter.post("/twitch/add-money", async (req, res) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { guildId, amount, twitchUserId, twitchLogin } = req.body || {};
  if (!guildId || !amount || (!twitchUserId && !twitchLogin)) {
    return res.status(400).json({ error: "missing_params" });
  }
  try {
    let user = null;
    if (twitchUserId) {
      user = await db("users").where({ twitch_id: String(twitchUserId) }).first();
    }
    if (!user && twitchLogin) {
      user = await db("users")
        .whereRaw("LOWER(twitch_login) = LOWER(?)", [String(twitchLogin)])
        .first();
    }
    if (!user) {
      return res.status(404).json({
        error: "twitch_user_not_linked",
        message: "Tu ne peux pas utiliser la commande, lie ton compte Twitch à Discord."
      });
    }
    const result = await updateUserBalance({
      guildId,
      userId: user.discord_id,
      amount: Number(amount),
      mode: "add"
    });
    await trackBalanceAchievementSafe({
      guildId,
      userId: user.discord_id,
      balance: result.balance,
      metadata: { source: "twitch_add_money" }
    });
    return res.json({ ok: true, discordId: user.discord_id, balance: result.balance, diff: result.diff });
  } catch (error) {
    return res.status(400).json({ error: error.message || "twitch_add_failed" });
  }
});

apiRouter.post("/twitch/daily", async (req, res) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ ok: true, data: req.body });
});

apiRouter.post("/twitch/reward", async (req, res) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ ok: true, data: req.body });
});

apiRouter.get("/db/ping", async (_req, res) => {
  try {
    await db.raw("select 1 as ok");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "db_error" });
  }
});

apiRouter.get("/guilds/:id/summary", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });

  try {
    const guildRes = await fetch(
      `https://discord.com/api/guilds/${req.params.id}?with_counts=true`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
    const guildData = await guildRes.json();
    if (!guildRes.ok) {
      return res.status(400).json({ error: "guild_summary_failed", details: guildData });
    }

    // Avoid GET /members (rate-limit heavy). Approximate counts from with_counts are enough for overview.
    return res.json({
      summary: {
        name: guildData.name || null,
        icon: guildData.icon || null,
        members: guildData.approximate_member_count ?? guildData.member_count ?? null,
        online: guildData.approximate_presence_count ?? null,
        bots: null
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "guild_summary_failed" });
  }
});

apiRouter.get("/status", async (_req, res) => {
  const status = {
    api: { ok: true, message: "API opérationnelle" },
    web: { ok: true, message: "Interface disponible" },
    db: { ok: false, message: "Base de données indisponible" },
    bot: { ok: false, message: "Bot indisponible" },
    twitch: { ok: false, message: "Twitch non configuré" },
    games: { ok: true, message: "Module jeux actif" }
  };

  const dbProbe = await probeDatabaseConnection(Number(process.env.DB_STATUS_TIMEOUT_MS || 2000));
  if (dbProbe.ok) {
    status.db = { ok: true, message: "Base de donnees joignable" };
  } else {
    status.db = { ok: false, message: "Connexion DB impossible" };
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    status.bot = { ok: false, message: "Token bot manquant" };
  } else {
    try {
      const botUserResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });
      if (botUserResponse.ok) {
        const botUser = await botUserResponse.json();
        status.bot = { ok: true, message: `Bot connecté (${botUser.username})` };
      } else {
        status.bot = { ok: false, message: "Token bot invalide" };
      }
    } catch {
      status.bot = { ok: false, message: "Bot inaccessible" };
    }
  }

  const hasTwitch =
    Boolean(process.env.TWITCH_CLIENT_ID) &&
    Boolean(process.env.TWITCH_CLIENT_SECRET) &&
    Boolean(process.env.TWITCH_REDIRECT_URI);
  status.twitch = {
    ok: hasTwitch,
    message: hasTwitch ? "Twitch configuré" : "Twitch non configuré"
  };

  const baseUrl = process.env.BASE_URL || "";
  status.web = {
    ok: true,
    message: baseUrl ? `Interface: ${baseUrl}` : "Interface disponible"
  };

  status.api = { ok: true, message: "API opérationnelle" };

  return res.json({ ok: true, status, updatedAt: new Date().toISOString() });
});

apiRouter.get("/guilds/:id/roles", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    let botId = null;
    const meRes = await fetch(`https://discord.com/api/users/@me`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    if (meRes.ok) {
      const me = await meRes.json();
      botId = me?.id || null;
    }
    const roleRes = await fetch(`https://discord.com/api/guilds/${req.params.id}/roles`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    const roles = await roleRes.json();
    if (!roleRes.ok) return res.status(400).json({ error: "roles_failed", details: roles });
    const filtered = roles
      .filter((r) => r.name !== "@everyone")
      .map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position,
        managed: Boolean(r.managed),
        tags: r.tags || null
      }));

    let botRolePosition = null;
    if (botId) {
      const botRole = filtered.find((role) => role?.tags?.bot_id === botId);
      if (botRole) {
        botRolePosition = Number(botRole.position || 0);
      }
    }
    if (botRolePosition === null) {
      const memberRes = await fetch(`https://discord.com/api/guilds/${req.params.id}/members/@me`, {
        headers: { Authorization: `Bot ${botToken}` }
      });
      if (memberRes.ok) {
        const member = await memberRes.json();
        const rolePositions = new Map(filtered.map((r) => [String(r.id), Number(r.position || 0)]));
        const positions = (member.roles || []).map((roleId) => rolePositions.get(String(roleId)) || 0);
        botRolePosition = positions.length ? Math.max(...positions) : 0;
      }
    }

    return res.json({ roles: filtered, botRolePosition });
  } catch (error) {
    return res.status(500).json({ error: "roles_failed" });
  }
});

apiRouter.get("/guilds/:id/channels", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const channelRes = await fetch(`https://discord.com/api/guilds/${req.params.id}/channels`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    const channels = await channelRes.json();
    if (!channelRes.ok) return res.status(400).json({ error: "channels_failed", details: channels });
    const filtered = (channels || [])
      .filter((c) => [0, 2, 5, 13, 15].includes(c.type))
      .map((c) => ({ id: c.id, name: c.name, type: c.type }));
    return res.json({ channels: filtered });
  } catch (error) {
    return res.status(500).json({ error: "channels_failed" });
  }
});

apiRouter.post("/guilds/:id/members", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  const uniqueIds = [...new Set(userIds.map((id) => normalizeDiscordId(id)).filter(Boolean))];
  try {
    const users = {};
    if (!uniqueIds.length) return res.json({ users });

    const knownUsers = await db("users")
      .select("discord_id", "username", "avatar")
      .whereIn("discord_id", uniqueIds);
    const dbById = new Map(knownUsers.map((row) => [String(row.discord_id), row]));

    // Seed from DB first so the UI never waits on Discord for known names.
    for (const userId of uniqueIds) {
      const row = dbById.get(userId);
      const username = String(row?.username || "").trim();
      const usableName = username && username !== userId && !/^\d{16,22}$/.test(username);
      users[userId] = {
        displayName: usableName ? username : userId,
        username: usableName ? username : "",
        avatar: normalizeDiscordAvatarUrl(userId, row?.avatar),
        ok: usableName,
        notFound: false,
        source: usableName ? "db" : "pending"
      };
    }

    const needsDiscord = uniqueIds.filter((userId) => users[userId]?.source === "pending");

    // One Discord call per unresolved ID (/users). Guild member lookups were doubling
    // traffic and causing partial 429 failures that left snowflakes on screen.
    const fetched = await mapWithConcurrency(needsDiscord, 2, async (userId) => {
      const profile = await fetchDiscordUserProfile({ userId, botToken });
      return [userId, profile];
    });

    for (const entry of fetched) {
      if (!entry) continue;
      const [userId, profile] = entry;
      if (!userId) continue;
      if (profile?.ok && profile.displayName && profile.displayName !== userId) {
        users[userId] = {
          displayName: profile.displayName,
          username: profile.username || "",
          avatar: profile.avatar || normalizeDiscordAvatarUrl(userId, ""),
          ok: true,
          notFound: false,
          source: "discord"
        };
        const cacheName =
          profile.username && profile.username !== userId
            ? profile.username
            : profile.displayName;
        void upsertDiscordUserCache({
          userId,
          username: cacheName,
          avatar: profile.avatar
        });
        continue;
      }
      if (profile?.notFound) {
        users[userId] = {
          displayName: userId,
          username: "",
          avatar: normalizeDiscordAvatarUrl(userId, ""),
          ok: false,
          notFound: true,
          source: "not_found"
        };
        continue;
      }
      // Transient Discord failure: keep DB seed if any, else ID, and mark retryable.
      const previous = users[userId] || {};
      users[userId] = {
        displayName: previous.displayName || userId,
        username: previous.username || "",
        avatar: previous.avatar || normalizeDiscordAvatarUrl(userId, ""),
        ok: Boolean(previous.ok),
        notFound: false,
        source: previous.source === "db" ? "db" : "retry"
      };
    }

    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: "members_failed" });
  }
});

apiRouter.get("/guilds/:id/members/search", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  const query = String(req.query.q || req.query.query || "").trim();
  const rawLimit = Number(req.query.limit || 10);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(25, rawLimit)) : 10;
  if (!query || query.length < 2) {
    return res.json({ members: [] });
  }
  try {
    const params = new URLSearchParams({
      query,
      limit: String(limit)
    });
    const response = await fetch(
      `https://discord.com/api/guilds/${req.params.id}/members/search?${params.toString()}`,
      {
        headers: { Authorization: `Bot ${botToken}` }
      }
    );
    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      return res.status(400).json({ error: "members_search_failed", details: payload });
    }
    const members = (Array.isArray(payload) ? payload : [])
      .map((member) => {
        const userId = normalizeDiscordId(member?.user?.id);
        if (!userId) return null;
        const username = String(member?.user?.username || "").trim();
        const displayName = String(member?.nick || member?.user?.global_name || username || userId);
        const guildAvatar = String(member?.avatar || "").trim();
        const avatar = guildAvatar
          ? `https://cdn.discordapp.com/guilds/${req.params.id}/users/${userId}/avatars/${guildAvatar}.${guildAvatar.startsWith("a_") ? "gif" : "png"}?size=64`
          : normalizeDiscordAvatarUrl(userId, member?.user?.avatar);
        return {
          id: userId,
          username: username || userId,
          displayName,
          avatar
        };
      })
      .filter(Boolean);
    return res.json({ members });
  } catch (error) {
    return res.status(500).json({ error: "members_search_failed" });
  }
});

apiRouter.get("/guilds/:id/emojis", async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const emojiRes = await fetch(`https://discord.com/api/guilds/${req.params.id}/emojis`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    const emojis = await emojiRes.json();
    if (!emojiRes.ok) return res.status(400).json({ error: "emojis_failed", details: emojis });
    const mapped = emojis.map((e) => ({
      id: e.id,
      name: e.name,
      animated: Boolean(e.animated)
    }));
    return res.json({ emojis: mapped });
  } catch (error) {
    return res.status(500).json({ error: "emojis_failed" });
  }
});

apiRouter.get("/guilds/:id/inventories", async (req, res) => {
  try {
    const inventories = await listGuildInventories(req.params.id);
    return res.json({ inventories });
  } catch (error) {
    return res.status(400).json({ error: error.message || "inventories_failed" });
  }
});

apiRouter.delete("/guilds/:id/inventory/:userId/:itemId", async (req, res) => {
  try {
    await removeInventoryItem({
      guildId: req.params.id,
      userId: req.params.userId,
      itemId: req.params.itemId,
      quantity: req.query.quantity
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "inventory_remove_failed" });
  }
});

apiRouter.get("/bot/emojis", async (_req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_CLIENT_ID;
  if (!botToken || !appId) return res.status(500).json({ error: "bot_token_missing" });
  try {
    const emojiRes = await fetch(`https://discord.com/api/applications/${appId}/emojis`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    const emojis = await emojiRes.json();
    if (!emojiRes.ok) return res.status(400).json({ error: "emojis_failed", details: emojis });
    const mapped = (emojis.items || emojis || []).map((e) => ({
      id: e.id,
      name: e.name,
      animated: Boolean(e.animated)
    }));
    return res.json({ emojis: mapped });
  } catch (error) {
    return res.status(500).json({ error: "emojis_failed" });
  }
});
