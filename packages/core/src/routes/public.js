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

    return res.json({
      slug: guild.link_slug || slug,
      guildId: String(guild.discord_guild_id),
      guildName: String(guild.name || "Serveur Discord"),
      streamerLogin: String(twitch?.twitch_login || "").replace(/^@/, ""),
      currency: String(economy?.name || "coins"),
      discordInvite,
      twitchLogin: twitchLogin || null,
      linkUrl: twitchLogin
        ? `/auth/discord/twitch-link?guildId=${encodeURIComponent(guild.discord_guild_id)}&twitchLogin=${encodeURIComponent(twitchLogin)}`
        : null,
      connectionsTutorialUrl:
        "https://support.discord.com/hc/fr/articles/360021408871-Comment-connecter-un-compte-%C3%A0-votre-compte-Discord"
    });
  } catch (error) {
    console.error("[public/link]", error);
    return res.status(500).json({ error: "link_lookup_failed" });
  }
});
