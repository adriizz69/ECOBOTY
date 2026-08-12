import { Router } from "express";
import {
  getBillingPublicCatalog,
  getBillingPublicStatus
} from "../services/billing-guild-access.js";
import { db } from "../services/db.js";
import {
  ensureGuildLinkSlug,
  getTwitchPromoSettings,
  getTwitchSettings,
  resolveGuildByLinkSlug
} from "../services/twitch.js";
import { getOrCreateSettings } from "../services/economy.js";

export const publicRouter = Router();

const resolveGuildFromLinkSlug = async (rawSlug) => {
  const slug = String(rawSlug || "")
    .trim()
    .toLowerCase();
  if (!slug) return null;

  let guild = await resolveGuildByLinkSlug(slug);
  if (!guild && /^\d{15,20}$/.test(slug)) {
    guild = await db("guilds").where({ discord_guild_id: slug }).first();
    if (guild) {
      try {
        await ensureGuildLinkSlug(guild.discord_guild_id);
        guild = await db("guilds").where({ id: guild.id }).first();
      } catch {
        // ignore
      }
    }
  }
  return guild;
};

const checkDiscordGuildMembership = async (guildId, discordUserId) => {
  const botToken = String(process.env.DISCORD_BOT_TOKEN || "").trim();
  const safeGuild = String(guildId || "").replace(/\D/g, "");
  const safeUser = String(discordUserId || "").replace(/\D/g, "");
  if (!botToken || !safeGuild || !safeUser) {
    return { ok: false, inGuild: false };
  }
  try {
    const res = await fetch(`https://discord.com/api/guilds/${safeGuild}/members/${safeUser}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    if (res.status === 200) return { ok: true, inGuild: true };
    if (res.status === 404) return { ok: true, inGuild: false };
    return { ok: false, inGuild: false };
  } catch {
    return { ok: false, inGuild: false };
  }
};

publicRouter.get("/billing/status", (_req, res) => {
  res.json(getBillingPublicStatus());
});

publicRouter.get("/billing/plans", async (_req, res) => {
  try {
    const catalog = await getBillingPublicCatalog();
    return res.json(catalog);
  } catch (error) {
    console.error("[public/billing/plans]", error);
    return res.status(500).json({ error: "billing_catalog_failed" });
  }
});

publicRouter.get("/link/pending", async (req, res) => {
  try {
    const { verifyTwitchLinkPending } = await import("./auth.js");
    const payload = await verifyTwitchLinkPending(req.query.token);
    const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
    return res.json({
      discordId: String(payload.discordId || ""),
      guildId: String(payload.guildId || ""),
      accounts
    });
  } catch {
    return res.status(400).json({ error: "invalid_pending" });
  }
});

publicRouter.post("/link/confirm", async (req, res) => {
  try {
    const { verifyTwitchLinkPending } = await import("./auth.js");
    const { recordAchievementEvent } = await import("../services/achievements.js");
    const action = String(req.body?.action || "confirm").toLowerCase();
    const payload = await verifyTwitchLinkPending(req.body?.token);
    const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
    const discordId = String(payload.discordId || "").replace(/\D/g, "");
    const guildId = String(payload.guildId || "").replace(/\D/g, "");

    if (!discordId) return res.status(400).json({ error: "invalid_pending" });

    if (action === "reject") {
      return res.json({
        ok: true,
        rejected: true,
        message:
          "Alors il faudra délier ton compte Twitch dans Discord (Paramètres → Connexions), puis le relier avec le bon compte Twitch, et recommencer."
      });
    }

    const twitchId = String(req.body?.twitchId || "").trim();
    const selected =
      accounts.find((a) => String(a.id) === twitchId) ||
      (accounts.length === 1 ? accounts[0] : null);
    if (!selected?.id || !selected?.login) {
      return res.status(400).json({ error: "twitch_required" });
    }

    const clash = await db("users")
      .where(function () {
        this.where({ twitch_id: String(selected.id) }).orWhereRaw(
          "LOWER(twitch_login) = LOWER(?)",
          [selected.login]
        );
      })
      .whereNot({ discord_id: discordId })
      .first();
    if (clash) {
      return res.status(409).json({ error: "twitch_already_linked" });
    }

    const existing = await db("users").where({ discord_id: discordId }).first();
    if (!existing) {
      return res.status(404).json({ error: "user_not_found" });
    }

    await db("users").where({ discord_id: discordId }).update({
      twitch_id: String(selected.id),
      twitch_login: String(selected.login)
    });

    if (guildId) {
      try {
        await recordAchievementEvent({
          guildId,
          userId: discordId,
          eventKey: "twitch_authenticated",
          increment: 1,
          metadata: { source: "discord_connections_confirm" }
        });
      } catch {
        // ignore
      }
    }

    return res.json({
      ok: true,
      rejected: false,
      twitchLogin: String(selected.login),
      twitchId: String(selected.id)
    });
  } catch (error) {
    console.error("[public/link/confirm]", error);
    return res.status(400).json({ error: error?.message || "confirm_failed" });
  }
});

publicRouter.get("/link/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "")
      .trim()
      .toLowerCase();
    const twitchLogin = String(req.query.twitch || req.query.u || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 25);

    const guild = await resolveGuildFromLinkSlug(slug);
    if (!guild) {
      return res.status(404).json({ error: "link_not_found" });
    }

    const twitch = await getTwitchSettings(guild.discord_guild_id);
    const promo = await getTwitchPromoSettings(guild.discord_guild_id);
    const economy = await getOrCreateSettings(guild.discord_guild_id);
    const discordInvite =
      String(promo.discordUrl || "").trim() ||
      String(process.env.DISCORD_INVITE_URL || process.env.PUBLIC_DISCORD_INVITE || "").trim() ||
      "";

    const siteBase = String(process.env.BASE_URL || process.env.PUBLIC_SITE_URL || "").replace(
      /\/$/,
      ""
    );
    const linkPath = `/auth/discord/twitch-link?guildId=${encodeURIComponent(guild.discord_guild_id)}${
      twitchLogin ? `&twitchLogin=${encodeURIComponent(twitchLogin)}` : ""
    }`;

    return res.json({
      slug: guild.link_slug || slug,
      guildId: String(guild.discord_guild_id),
      guildName: String(guild.name || "Serveur Discord"),
      streamerLogin: String(twitch?.twitch_login || "").replace(/^@/, ""),
      currency: String(economy?.name || "coins"),
      discordInvite,
      twitchLogin: twitchLogin || null,
      linkUrl: siteBase ? `${siteBase}${linkPath}` : linkPath,
      connectionsTutorialUrl:
        "https://support.discord.com/hc/fr/articles/212112068-FAQ-sur-l-int%C3%A9gration-de-Twitch"
    });
  } catch (error) {
    console.error("[public/link]", error);
    return res.status(500).json({ error: "link_lookup_failed" });
  }
});

publicRouter.get("/link/:slug/status", async (req, res) => {
  try {
    const twitchLogin = String(req.query.twitch || req.query.u || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 25);
    if (!twitchLogin) {
      return res.status(400).json({ error: "twitch_required" });
    }

    const guild = await resolveGuildFromLinkSlug(req.params.slug);
    if (!guild) {
      return res.status(404).json({ error: "link_not_found" });
    }

    const user = await db("users")
      .whereRaw("LOWER(twitch_login) = LOWER(?)", [twitchLogin])
      .first();

    if (!user?.discord_id) {
      return res.json({
        linked: false,
        inGuild: false,
        discordId: null,
        guildId: String(guild.discord_guild_id),
        guildName: String(guild.name || "Serveur Discord")
      });
    }

    const membership = await checkDiscordGuildMembership(
      guild.discord_guild_id,
      user.discord_id
    );

    return res.json({
      linked: true,
      inGuild: Boolean(membership.inGuild),
      membershipChecked: Boolean(membership.ok),
      discordId: String(user.discord_id),
      guildId: String(guild.discord_guild_id),
      guildName: String(guild.name || "Serveur Discord")
    });
  } catch (error) {
    console.error("[public/link/status]", error);
    return res.status(500).json({ error: "link_status_failed" });
  }
});
