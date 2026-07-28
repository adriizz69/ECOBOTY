import { Router } from "express";
import { SignJWT } from "jose";
import { db } from "../services/db.js";
import { saveTwitchSettings } from "../services/twitch.js";
import { startTwitchListener } from "../services/twitch.js";
import { recordAchievementEvent } from "../services/achievements.js";
import { insertAdminLog } from "../services/admin.js";

export const authRouter = Router();
const jwtTtl = String(process.env.API_JWT_TTL || "30d").trim() || "30d";

const encodeState = (payload) =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

const decodeState = (value) => {
  if (!value) return { kind: "redirect", redirect: "" };
  try {
    const raw = Buffer.from(String(value), "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // ignore
  }
  return { kind: "redirect", redirect: String(value) };
};

const renderHtml = (title, message) => `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:#0b1220; color:#e5e7eb; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
      .card { background: rgba(15,23,42,0.9); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px 28px; max-width:520px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.35);} 
      h1 { margin:0 0 12px; font-size:20px; }
      p { margin:0; color:#cbd5f5; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`;

const discordAuthorizeUrl = (redirect, { prompt } = {}) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds connections",
    state: redirect || ""
  });
  if (prompt) params.set("prompt", prompt);
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
};

const twitchAuthorizeUrl = ({ guildId, redirect }) => {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID || "",
    redirect_uri: process.env.TWITCH_REDIRECT_URI || "",
    response_type: "code",
    scope: "chat:read chat:edit moderator:read:chatters channel:read:subscriptions bits:read moderator:read:followers",
    state: Buffer.from(JSON.stringify({ guildId, redirect })).toString("base64url")
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
};

authRouter.get("/discord/login", (req, res) => {
  const redirect = req.query.redirect || process.env.BASE_URL || "https://ecoboty.eu";
  return res.redirect(discordAuthorizeUrl(redirect));
});

authRouter.get("/discord/twitch-link", (req, res) => {
  const guildId = req.query.guildId;
  const twitchLogin = req.query.twitchLogin || req.query.login;
  if (!guildId || !twitchLogin) return res.status(400).send("Missing guildId/twitchLogin");
  const redirect = req.query.redirect || process.env.BASE_URL || "https://ecoboty.eu";
  const state = encodeState({ kind: "twitch-link", guildId, twitchLogin });
  return res.redirect(discordAuthorizeUrl(state, { prompt: "consent" }));
});

authRouter.get("/discord/callback", async (req, res) => {
  const code = req.query.code;
  const rawState = req.query.state || process.env.BASE_URL || "https://ecoboty.eu";
  const state = decodeState(rawState);

  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.status(401).json({ error: "discord_token_error", details: tokenData });
    }
    const tokenScopes = String(tokenData.scope || "");

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userResponse.json();

    let userGuilds = [];
    let userGuildsFetched = false;
    let userGuildsError = "";
    try {
      const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (guildsRes.ok) {
        userGuilds = await guildsRes.json();
        userGuildsFetched = true;
      } else {
        const err = await guildsRes.json().catch(() => ({}));
        userGuildsError = err?.message || `status_${guildsRes.status}`;
        console.warn("[auth] guilds fetch failed", userGuildsError);
      }
    } catch {
      userGuilds = [];
    }

    let twitchConnection = null;
    let twitchConnections = [];
    let connectionsFetched = false;
    try {
      const connectionsRes = await fetch("https://discord.com/api/users/@me/connections", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (connectionsRes.ok) {
        connectionsFetched = true;
        const connections = await connectionsRes.json();
        twitchConnections = connections.filter((c) => c.type === "twitch");
        twitchConnection = twitchConnections[0] || null;
        if (state?.kind === "twitch-link" && twitchConnections.length > 1) {
          const desiredLogin = String(state.twitchLogin || "").toLowerCase();
          const match = twitchConnections.find(
            (c) => String(c.name || "").toLowerCase() === desiredLogin
          );
          if (match) twitchConnection = match;
        }
      }
    } catch {
      twitchConnection = null;
    }

    const existing = await db("users").where({ discord_id: user.id }).first();
    const previousTwitchId = existing?.twitch_id || null;
    const previousTwitchLogin = existing?.twitch_login || null;
    const twitchId = twitchConnection?.id || null;
    const twitchLogin = twitchConnection?.name || null;

    if (state?.kind === "twitch-link") {
      const desiredLogin = String(state.twitchLogin || "").toLowerCase();
      const connectedLogin = twitchLogin ? String(twitchLogin).toLowerCase() : "";
      const previousLogin = previousTwitchLogin ? String(previousTwitchLogin).toLowerCase() : "";
      if (!desiredLogin) {
        return res
          .status(400)
          .send(renderHtml("Lien Twitch invalide", "Aucun compte Twitch fourni."));
      }
      if (previousLogin && previousLogin === desiredLogin) {
        return res.send(
          renderHtml(
            "Compte déjà lié",
            "Ton Discord est déjà associé à ce Twitch. Tu peux retourner sur le chat."
          )
        );
      }
      if (!twitchConnection) {
        return res
          .status(400)
          .send(
            renderHtml(
              "Twitch non lié",
              `Ton Discord n’a pas de compte Twitch relié.<br><br>
              👉 Ouvre Discord &gt; Paramètres utilisateur &gt; Connexions, puis relie ton Twitch.<br>
              Une fois fait, relance la commande !daily dans le chat Twitch.<br><br>
              Besoin d’aide ? <a href="https://support.discord.com/hc/en-us/articles/32330173689623-Account-Connections-on-Discord-FAQ" target="_blank" rel="noreferrer">Guide officiel Discord</a>.`
            )
          );
      }
      if (connectedLogin !== desiredLogin) {
        return res
          .status(400)
          .send(
            renderHtml(
              "Mauvais compte Twitch",
              `Le compte Twitch relié à ton Discord ne correspond pas au compte qui parle dans le chat.<br><br>
              ✅ Connecte le bon Twitch dans Discord (Paramètres utilisateur &gt; Connexions), puis relance la commande !daily.<br>
              ℹ️ Tu peux avoir plusieurs comptes Twitch liés, mais le compte du chat doit faire partie de ces connexions.<br><br>
              Besoin d’aide ? <a href="https://support.discord.com/hc/en-us/articles/32330173689623-Account-Connections-on-Discord-FAQ" target="_blank" rel="noreferrer">Guide officiel Discord</a>.`
            )
          );
      }

      let liveChannel = String(state.twitchLogin || "").toLowerCase();
      if (state?.guildId) {
        try {
          const guild = await db("guilds")
            .where({ discord_guild_id: String(state.guildId) })
            .first();
          if (guild) {
            const settings = await db("twitch_settings").where({ guild_id: guild.id }).first();
            if (settings?.twitch_login) {
              liveChannel = String(settings.twitch_login).toLowerCase();
            }
          }
        } catch {
          // ignore fallback to state login
        }
      }
      if (state?.guildId) {
        try {
          await recordAchievementEvent({
            guildId: String(state.guildId),
            userId: String(user.id),
            eventKey: "twitch_authenticated",
            increment: 1,
            metadata: { source: "discord_connections" }
          });
        } catch {
          // do not block auth flow
        }
      }
      const liveUrl = liveChannel ? `https://www.twitch.tv/${liveChannel}` : "";
      const scopeNote = tokenScopes.includes("guilds")
        ? ""
        : `<br><br><strong>Serveurs non récupérés</strong> : l’autorisation "guilds" n’a pas été accordée. Supprime l’app des Apps autorisées puis reconnecte.`;
      const serversNote =
        userGuildsFetched && Array.isArray(userGuilds) && userGuilds.length === 0
          ? `<br><br><strong>Serveurs non récupérés</strong> : retire l’autorisation de l’app dans Discord (Paramètres &gt; Apps autorisées), puis reconnecte-toi pour récupérer tes serveurs.`
          : userGuildsError
            ? `<br><br><strong>Serveurs non récupérés</strong> : ${userGuildsError}`
            : "";
      const message = liveUrl
        ? `Ton Discord est bien associé à ton Twitch. Tu peux retourner sur le chat.<br><br>
          <a href="${liveUrl}" target="_blank" rel="noreferrer" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#7c3aed;color:white;text-decoration:none;">Retourner sur le live</a>${scopeNote}${serversNote}`
        : `Ton Discord est bien associé à ton Twitch. Tu peux retourner sur le chat.${scopeNote}${serversNote}`;

      const userPayload = {
        username: user.username,
        avatar: user.avatar,
        twitch_id: twitchId,
        twitch_login: twitchLogin
      };
      if (existing) {
        await db("users").where({ discord_id: user.id }).update(userPayload);
      } else {
        await db("users").insert({
          discord_id: user.id,
          ...userPayload
        });
        await insertAdminLog({
          adminId: String(user.id),
          action: "user_joined",
          data: {
            discordId: String(user.id),
            username: String(user.username || ""),
            source: "discord_oauth"
          }
        });
      }

      const guildCount = Array.isArray(userGuilds) ? userGuilds.length : 0;
      let userGuildsInsertError = userGuildsError || "";
      let savedGuildsCount = 0;
      let savedGuildsSample = "";

      if (userGuildsFetched && Array.isArray(userGuilds) && userGuilds.length > 0) {
        try {
          const uniqueGuilds = new Map();
          userGuilds.forEach((guild) => {
            const id = guild?.id ? String(guild.id) : "";
            if (!id) return;
            if (!uniqueGuilds.has(id)) uniqueGuilds.set(id, guild);
          });
          const guildList = Array.from(uniqueGuilds.values());
          await db("user_guilds").where({ discord_id: String(user.id) }).del();
          if (guildList.length) {
            const rows = guildList.map((guild) => ({
              discord_id: String(user.id),
              guild_id: String(guild.id),
              guild_name: guild.name || null,
              icon: guild.icon || null,
              owner: Boolean(guild.owner),
              permissions: guild.permissions ? String(guild.permissions) : null,
              permissions_new: guild.permissions_new ? String(guild.permissions_new) : null,
              features: Array.isArray(guild.features) ? JSON.stringify(guild.features) : null,
              raw: JSON.stringify(guild),
              updated_at: new Date()
            }));
            await db("user_guilds").insert(rows);
          }
          const savedRow = await db("user_guilds")
            .where({ discord_id: String(user.id) })
            .count({ count: "*" })
            .first();
          savedGuildsCount = Number(savedRow?.count || 0);
          const sampleRow = await db("user_guilds")
            .where({ discord_id: String(user.id) })
            .select("guild_id")
            .first();
          savedGuildsSample = sampleRow?.guild_id || "";
        } catch (error) {
          userGuildsInsertError = error?.message || String(error);
          console.warn("[auth] user_guilds update failed", userGuildsInsertError);
        }
      }

      try {
        const payload = {
          discord_id: String(user.id),
          scopes: tokenScopes || null,
          guilds_fetched: Boolean(userGuildsFetched),
          guilds_count: guildCount,
          guilds_error: userGuildsInsertError || null,
          guilds_saved_count: savedGuildsCount,
          guilds_sample: savedGuildsSample || null,
          updated_at: new Date()
        };
        const existingState = await db("user_oauth_state").where({ discord_id: String(user.id) }).first();
        if (existingState) {
          await db("user_oauth_state").where({ discord_id: String(user.id) }).update(payload);
        } else {
          await db("user_oauth_state").insert(payload);
        }
      } catch (error) {
        console.warn("[auth] oauth state update failed", error?.message || error);
      }
      console.log("[auth] guilds", {
        userId: user?.id,
        scopes: tokenScopes,
        guildsFetched: userGuildsFetched,
        guildsCount: guildCount,
        guildsError: userGuildsError || null
      });
      return res.send(renderHtml("Compte lié", message));
    }

    const resolvedTwitch = twitchConnection
      ? { id: twitchId, login: twitchLogin }
      : connectionsFetched
        ? { id: null, login: null }
        : { id: previousTwitchId, login: previousTwitchLogin };

    const userPayload = {
      username: user.username,
      avatar: user.avatar,
      twitch_id: resolvedTwitch.id,
      twitch_login: resolvedTwitch.login
    };
    if (existing) {
      await db("users").where({ discord_id: user.id }).update(userPayload);
    } else {
      await db("users").insert({
        discord_id: user.id,
        ...userPayload
      });
      await insertAdminLog({
        adminId: String(user.id),
        action: "user_joined",
        data: {
          discordId: String(user.id),
          username: String(user.username || ""),
          source: "discord_oauth"
        }
      });
    }

    const guildCount = Array.isArray(userGuilds) ? userGuilds.length : 0;
    let userGuildsInsertError = userGuildsError || "";
    let savedGuildsCount = 0;
    let savedGuildsSample = "";

    if (userGuildsFetched && Array.isArray(userGuilds) && userGuilds.length > 0) {
      try {
        const uniqueGuilds = new Map();
        userGuilds.forEach((guild) => {
          const id = guild?.id ? String(guild.id) : "";
          if (!id) return;
          if (!uniqueGuilds.has(id)) uniqueGuilds.set(id, guild);
        });
        const guildList = Array.from(uniqueGuilds.values());
        await db("user_guilds").where({ discord_id: String(user.id) }).del();
        if (guildList.length) {
          const rows = guildList.map((guild) => ({
            discord_id: String(user.id),
            guild_id: String(guild.id),
            guild_name: guild.name || null,
            icon: guild.icon || null,
            owner: Boolean(guild.owner),
            permissions: guild.permissions ? String(guild.permissions) : null,
            permissions_new: guild.permissions_new ? String(guild.permissions_new) : null,
            features: Array.isArray(guild.features) ? JSON.stringify(guild.features) : null,
            raw: JSON.stringify(guild),
            updated_at: new Date()
          }));
          await db("user_guilds").insert(rows);
        }
        const savedRow = await db("user_guilds")
          .where({ discord_id: String(user.id) })
          .count({ count: "*" })
          .first();
        savedGuildsCount = Number(savedRow?.count || 0);
        const sampleRow = await db("user_guilds")
          .where({ discord_id: String(user.id) })
          .select("guild_id")
          .first();
        savedGuildsSample = sampleRow?.guild_id || "";
      } catch (error) {
        userGuildsInsertError = error?.message || String(error);
        console.warn("[auth] user_guilds update failed", userGuildsInsertError);
      }
    }

    try {
      const payload = {
        discord_id: String(user.id),
        scopes: tokenScopes || null,
        guilds_fetched: Boolean(userGuildsFetched),
        guilds_count: guildCount,
        guilds_error: userGuildsInsertError || null,
        guilds_saved_count: savedGuildsCount,
        guilds_sample: savedGuildsSample || null,
        updated_at: new Date()
      };
      const existingState = await db("user_oauth_state").where({ discord_id: String(user.id) }).first();
      if (existingState) {
        await db("user_oauth_state").where({ discord_id: String(user.id) }).update(payload);
      } else {
        await db("user_oauth_state").insert(payload);
      }
    } catch (error) {
      console.warn("[auth] oauth state update failed", error?.message || error);
    }

    const rawSecret = process.env.API_SECRET_KEY || "";
    if (!rawSecret) {
      return res.status(500).json({ error: "missing_api_secret" });
    }

    const jwt = await new SignJWT({
      discord_id: user.id,
      username: user.username,
      avatar: user.avatar,
      access_token: tokenData.access_token
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(jwtTtl)
      .sign(new TextEncoder().encode(rawSecret));

    const siteBase = process.env.BASE_URL || "https://ecoboty.eu";
    const intendedRaw = state?.redirect || siteBase;
    const redirectUrl = new URL("/callback", siteBase);
    // Prefer hash to reduce token leakage via Referer / server logs
    redirectUrl.hash = `token=${encodeURIComponent(jwt)}`;
    try {
      const intendedUrl = new URL(intendedRaw, siteBase);
      const siteOrigin = new URL(siteBase).origin;
      if (
        intendedUrl.origin === siteOrigin &&
        intendedUrl.pathname &&
        intendedUrl.pathname !== "/callback" &&
        intendedUrl.pathname !== "/"
      ) {
        redirectUrl.searchParams.set(
          "redirect",
          `${intendedUrl.pathname}${intendedUrl.search}${intendedUrl.hash}`
        );
      }
    } catch {
      // ignore invalid intended redirect
    }

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(500).json({ error: "auth_error" });
  }
});

authRouter.get("/twitch/login", (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).send("Missing guildId");
  const redirect = req.query.redirect || process.env.BASE_URL || "https://ecoboty.eu";
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_REDIRECT_URI) {
    return res.status(500).send("Missing Twitch env config");
  }
  return res.redirect(twitchAuthorizeUrl({ guildId, redirect }));
});

authRouter.get("/twitch/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  if (!code || !state) return res.status(400).send("Missing code/state");

  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"));
  } catch {
    return res.status(400).send("Invalid state");
  }

  const { guildId, redirect } = payload || {};
  if (!guildId) return res.status(400).send("Missing guildId");

  try {
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID || "",
        client_secret: process.env.TWITCH_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: process.env.TWITCH_REDIRECT_URI || ""
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.status(401).json({ error: "twitch_token_error", details: tokenData });
    }

    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-Id": process.env.TWITCH_CLIENT_ID || "",
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    const userData = await userRes.json();
    const user = userData?.data?.[0];
    if (!user) return res.status(400).json({ error: "twitch_user_not_found" });

    const tokenExpiresAt = new Date(Date.now() + Number(tokenData.expires_in || 0) * 1000);
    await saveTwitchSettings(guildId, {
      twitch_broadcaster_id: user.id,
      twitch_login: user.login,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenExpiresAt
    });

    await startTwitchListener(guildId);

    const redirectUrl = redirect || process.env.BASE_URL || "https://ecoboty.eu";
    return res.redirect(redirectUrl);
  } catch (error) {
    return res.status(500).json({ error: "twitch_auth_error" });
  }
});
