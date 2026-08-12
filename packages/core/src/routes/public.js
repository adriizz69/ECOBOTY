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
    const linkPath = twitchLogin
      ? `/auth/discord/twitch-link?guildId=${encodeURIComponent(guild.discord_guild_id)}&twitchLogin=${encodeURIComponent(twitchLogin)}`
      : null;

    return res.json({
      slug: guild.link_slug || slug,
      guildId: String(guild.discord_guild_id),
      guildName: String(guild.name || "Serveur Discord"),
      streamerLogin: String(twitch?.twitch_login || "").replace(/^@/, ""),
      currency: String(economy?.name || "coins"),
      discordInvite,
      twitchLogin: twitchLogin || null,
      linkUrl: linkPath ? (siteBase ? `${siteBase}${linkPath}` : linkPath) : null,
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
