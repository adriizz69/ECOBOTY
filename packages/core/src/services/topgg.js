import crypto from "node:crypto";
import { db } from "@ecoboty/db";
import { ensureGuild, getOrCreateBalance, getOrCreateSettings } from "./economy.js";

const TOPGG_API_BASE = "https://top.gg/api/v1";
const METRICS_SYNC_MIN_INTERVAL_MS = 20 * 60 * 1000;
const DEFAULT_BOT_PAGE_URL = "https://top.gg/fr/bot/1465377603090383161";
const DEFAULT_REWARD_AMOUNT = 500;

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
};

export const getTopggEnvConfig = () => ({
  token: String(process.env.TOPGG_TOKEN || "").trim(),
  webhookSecret: String(process.env.TOPGG_WEBHOOK_SECRET || "").trim(),
  botPageUrl: String(process.env.TOPGG_BOT_PAGE_URL || DEFAULT_BOT_PAGE_URL).trim() || DEFAULT_BOT_PAGE_URL,
  envEnabled: toBool(process.env.TOPGG_ENABLED, true)
});

export const isTopggTokenConfigured = () => Boolean(getTopggEnvConfig().token);

const normalizeSettingsRow = (row) => ({
  enabled: row ? Boolean(row.enabled) : true,
  reward_amount: Math.max(0, Number(row?.reward_amount ?? DEFAULT_REWARD_AMOUNT) || 0),
  last_metrics_sync_at: row?.last_metrics_sync_at || null,
  last_metrics_server_count:
    row?.last_metrics_server_count === null || row?.last_metrics_server_count === undefined
      ? null
      : Number(row.last_metrics_server_count),
  last_metrics_error: row?.last_metrics_error || null,
  updated_at: row?.updated_at || null
});

export const getTopggSettings = async () => {
  let row = await db("topgg_settings").orderBy("id", "asc").first();
  if (!row) {
    await db("topgg_settings").insert({
      enabled: true,
      reward_amount: DEFAULT_REWARD_AMOUNT,
      created_at: new Date(),
      updated_at: new Date()
    });
    row = await db("topgg_settings").orderBy("id", "asc").first();
  }
  return normalizeSettingsRow(row);
};

export const saveTopggSettings = async ({ enabled, rewardAmount } = {}) => {
  const current = await getTopggSettings();
  const nextEnabled = enabled === undefined ? current.enabled : Boolean(enabled);
  const nextReward =
    rewardAmount === undefined
      ? current.reward_amount
      : Math.max(0, Math.floor(Number(rewardAmount) || 0));

  const existing = await db("topgg_settings").orderBy("id", "asc").first();
  const payload = {
    enabled: nextEnabled,
    reward_amount: nextReward,
    updated_at: new Date()
  };
  if (existing?.id) {
    await db("topgg_settings").where({ id: existing.id }).update(payload);
  } else {
    await db("topgg_settings").insert({
      ...payload,
      created_at: new Date()
    });
  }
  return getTopggSettings();
};

export const isTopggIntegrationActive = async () => {
  const env = getTopggEnvConfig();
  if (!env.token || !env.envEnabled) return false;
  const settings = await getTopggSettings();
  return Boolean(settings.enabled);
};

const topggFetch = async (path, { method = "GET", body } = {}) => {
  const { token } = getTopggEnvConfig();
  if (!token) {
    const error = new Error("topgg_token_missing");
    error.status = 400;
    throw error;
  }
  const res = await fetch(`${TOPGG_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const error = new Error(`topgg_api_${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const getTopggProject = async () => topggFetch("/projects/@me");

export const hasVotedOnTopgg = async (discordUserId) => {
  const userId = String(discordUserId || "").trim();
  if (!userId) return null;
  try {
    return await topggFetch(`/projects/@me/votes/${encodeURIComponent(userId)}?source=discord`);
  } catch (error) {
    if (Number(error?.status) === 404) return null;
    throw error;
  }
};

export const postTopggServerCount = async (serverCount, { force = false } = {}) => {
  const active = await isTopggIntegrationActive();
  if (!active) {
    return { ok: false, skipped: true, reason: "disabled" };
  }

  const count = Math.max(0, Math.floor(Number(serverCount) || 0));
  const settings = await getTopggSettings();
  const lastSync = settings.last_metrics_sync_at ? new Date(settings.last_metrics_sync_at).getTime() : 0;
  if (!force && lastSync && Date.now() - lastSync < METRICS_SYNC_MIN_INTERVAL_MS) {
    return { ok: true, skipped: true, reason: "debounced", serverCount: count };
  }

  const existing = await db("topgg_settings").orderBy("id", "asc").first();
  try {
    await topggFetch("/projects/@me/metrics", {
      method: "PATCH",
      body: { server_count: count }
    });
    const patch = {
      last_metrics_sync_at: new Date(),
      last_metrics_server_count: count,
      last_metrics_error: null,
      updated_at: new Date()
    };
    if (existing?.id) {
      await db("topgg_settings").where({ id: existing.id }).update(patch);
    }
    return { ok: true, serverCount: count };
  } catch (error) {
    const message = String(error?.data?.detail || error?.message || "topgg_metrics_failed").slice(0, 500);
    if (existing?.id) {
      await db("topgg_settings").where({ id: existing.id }).update({
        last_metrics_error: message,
        updated_at: new Date()
      });
    }
    return { ok: false, error: message, serverCount: count };
  }
};

export const maybeSyncTopggFromHeartbeat = async (guildCount) => {
  try {
    return await postTopggServerCount(guildCount, { force: false });
  } catch {
    return { ok: false, skipped: true, reason: "error" };
  }
};

export const verifyTopggWebhookSignature = (rawBody, signatureHeader, secret) => {
  const signature = String(signatureHeader || "").trim();
  const key = String(secret || "").trim();
  if (!signature || !key) return false;
  const parts = Object.fromEntries(
    signature.split(",").map((chunk) => {
      const [k, ...rest] = chunk.trim().split("=");
      return [k, rest.join("=")];
    })
  );
  const timestamp = parts.t;
  const received = parts.v1;
  if (!timestamp || !received) return false;
  const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", key).update(`${timestamp}.${rawBody}`).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(String(received), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

export const recordTopggVoteEvent = async (payload) => {
  const data = payload?.data || {};
  const voteId = String(data.id || "").trim();
  const discordUserId = String(data.user?.platform_id || "").trim();
  if (!voteId || !discordUserId) {
    const error = new Error("invalid_vote_payload");
    error.status = 400;
    throw error;
  }

  const existing = await db("topgg_votes").where({ topgg_vote_id: voteId }).first();
  if (existing) {
    return { created: false, vote: existing };
  }

  const now = new Date();
  const row = {
    topgg_vote_id: voteId,
    discord_user_id: discordUserId,
    topgg_user_id: data.user?.id ? String(data.user.id) : null,
    username: data.user?.name ? String(data.user.name).slice(0, 128) : null,
    weight: Math.max(1, Math.floor(Number(data.weight) || 1)),
    voted_at: data.created_at ? new Date(data.created_at) : now,
    expires_at: data.expires_at ? new Date(data.expires_at) : null,
    claimed_at: null,
    claimed_guild_id: null,
    reward_amount: null,
    payload: JSON.stringify(payload),
    created_at: now,
    updated_at: now
  };
  const [id] = await db("topgg_votes").insert(row);
  return { created: true, vote: { id, ...row } };
};

export const listTopggVotes = async ({ limit = 50 } = {}) => {
  const rows = await db("topgg_votes")
    .orderBy("voted_at", "desc")
    .limit(Math.min(200, Math.max(1, Number(limit) || 50)));
  return rows.map((row) => ({
    ...row,
    weight: Number(row.weight || 1),
    reward_amount: row.reward_amount === null || row.reward_amount === undefined ? null : Number(row.reward_amount),
    claimed: Boolean(row.claimed_at)
  }));
};

const getClaimableVoteForUser = async (discordUserId, trx = db) => {
  const userId = String(discordUserId || "").trim();
  const now = new Date();
  return trx("topgg_votes")
    .where({ discord_user_id: userId })
    .whereNull("claimed_at")
    .andWhere((builder) => {
      builder.whereNull("expires_at").orWhere("expires_at", ">", now);
    })
    .orderBy("voted_at", "desc")
    .first();
};

export const getTopggVoteStatusForUser = async (discordUserId) => {
  const userId = String(discordUserId || "").trim();
  const claimable = await getClaimableVoteForUser(userId);
  const latest = await db("topgg_votes").where({ discord_user_id: userId }).orderBy("voted_at", "desc").first();
  const settings = await getTopggSettings();
  const env = getTopggEnvConfig();
  return {
    votePageUrl: env.botPageUrl,
    rewardAmount: settings.reward_amount,
    hasClaimable: Boolean(claimable),
    claimable: claimable
      ? {
          id: claimable.id,
          weight: Number(claimable.weight || 1),
          votedAt: claimable.voted_at,
          expiresAt: claimable.expires_at,
          estimatedReward: settings.reward_amount * Number(claimable.weight || 1)
        }
      : null,
    latest: latest
      ? {
          id: latest.id,
          claimed: Boolean(latest.claimed_at),
          claimedGuildId: latest.claimed_guild_id,
          claimedAt: latest.claimed_at,
          votedAt: latest.voted_at,
          expiresAt: latest.expires_at,
          weight: Number(latest.weight || 1)
        }
      : null
  };
};

export const claimTopggVoteReward = async ({ guildId, userId }) => {
  const guildKey = String(guildId || "").trim();
  const userKey = String(userId || "").trim();
  if (!guildKey || !userKey) {
    const error = new Error("missing_params");
    error.status = 400;
    throw error;
  }

  const settings = await getTopggSettings();
  const env = getTopggEnvConfig();
  if (!settings.enabled || !env.envEnabled) {
    return { ok: false, reason: "disabled", votePageUrl: env.botPageUrl };
  }

  return db.transaction(async (trx) => {
    const vote = await getClaimableVoteForUser(userKey, trx);
    if (!vote) {
      const latest = await trx("topgg_votes")
        .where({ discord_user_id: userKey })
        .orderBy("voted_at", "desc")
        .first();
      if (latest?.claimed_at) {
        return {
          ok: false,
          reason: "already_claimed",
          votePageUrl: env.botPageUrl,
          claimedGuildId: latest.claimed_guild_id,
          claimedAt: latest.claimed_at
        };
      }
      if (latest?.expires_at && new Date(latest.expires_at).getTime() <= Date.now()) {
        return { ok: false, reason: "expired", votePageUrl: env.botPageUrl };
      }
      return { ok: false, reason: "not_voted", votePageUrl: env.botPageUrl };
    }

    const weight = Math.max(1, Math.floor(Number(vote.weight) || 1));
    const baseReward = Math.max(0, Math.floor(Number(settings.reward_amount) || 0));
    const reward = baseReward * weight;
    const guild = await ensureGuild(guildKey, trx);
    const economySettings = await getOrCreateSettings(guildKey, trx);
    const balanceRow = await getOrCreateBalance(guildKey, userKey, economySettings.start_balance, trx);
    const nextBalance = Math.max(0, Number(balanceRow.balance || 0) + reward);
    const now = new Date();

    await trx("balances")
      .where({ guild_id: guild.id, user_discord_id: userKey })
      .update({ balance: nextBalance });

    await trx("economy_gain_logs").insert({
      guild_id: guild.id,
      user_discord_id: userKey,
      source: "topgg",
      base_amount: reward,
      multiplier: weight,
      bonus_amount: 0,
      total_amount: reward,
      data: JSON.stringify({
        topgg_vote_id: vote.topgg_vote_id,
        weight
      }),
      created_at: now
    });

    await trx("topgg_votes")
      .where({ id: vote.id })
      .update({
        claimed_at: now,
        claimed_guild_id: guildKey,
        reward_amount: reward,
        updated_at: now
      });

    return {
      ok: true,
      amount: reward,
      weight,
      baseReward,
      balance: nextBalance,
      votePageUrl: env.botPageUrl,
      emoji: economySettings.emoji || "💰"
    };
  });
};

export const getTopggAdminOverview = async () => {
  const env = getTopggEnvConfig();
  const settings = await getTopggSettings();
  const health = await db("bot_health_status").orderBy("id", "asc").first();
  const localServerCount =
    health?.guild_count === null || health?.guild_count === undefined
      ? null
      : Number(health.guild_count);

  let project = null;
  let projectError = null;
  if (env.token && env.envEnabled) {
    try {
      project = await getTopggProject();
    } catch (error) {
      projectError = String(error?.data?.detail || error?.message || "project_fetch_failed").slice(0, 300);
    }
  }

  const recentVotes = await listTopggVotes({ limit: 30 });
  const unclaimed = await db("topgg_votes").whereNull("claimed_at").count({ count: "*" }).first();

  return {
    configured: Boolean(env.token),
    envEnabled: env.envEnabled,
    webhookConfigured: Boolean(env.webhookSecret),
    votePageUrl: env.botPageUrl,
    settings,
    active: Boolean(env.token && env.envEnabled && settings.enabled),
    localServerCount,
    project,
    projectError,
    unclaimedVotes: Number(unclaimed?.count || 0),
    recentVotes
  };
};
