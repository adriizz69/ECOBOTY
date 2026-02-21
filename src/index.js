import dotenv from "dotenv";
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  AuditLogEvent,
  MessageFlags
} from "discord.js";
import { commands } from "./commands/index.js";
import { buildShopContainerMessage } from "./shop-ui.js";
import { updateInteractionMessageV2 } from "./discord-rest.js";
import { scheduleShopTimeout, scheduleInteractionTimeout } from "./shop-timeout.js";
import { resolveDisplayNames } from "./user-resolve.js";
import { getBotSettings, getBotLanguage, localeFromLang, t } from "./i18n.js";

dotenv.config({ path: "../.env" });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`Bot connected as ${client.user.tag}`);
  void autoSyncCommands();
  scheduleLeaderboardPosts();
  void processExpiredTempRoles();
  setInterval(() => {
    void processExpiredTempRoles();
  }, 60 * 1000);
  void (async () => {
    await refreshBannedGuilds();
    for (const guild of client.guilds.cache.values()) {
      await upsertLeaderboardPost(guild);
      await syncGuildInfo({ guild });
    }
  })();
});

client.on(Events.GuildCreate, async (guild) => {
  let addedById = null;
  let addedByUsername = null;
  try {
    const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    const canViewLogs = me?.permissions?.has?.(PermissionsBitField.Flags.ViewAuditLog);
    if (canViewLogs) {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
      const entry = logs.entries.find((e) => e.target?.id === guild.client.user?.id);
      if (entry?.executor) {
        addedById = entry.executor.id;
        addedByUsername = entry.executor.tag || entry.executor.username;
      }
    }
  } catch {
    // ignore
  }

  if (!addedById) {
    const owner = await guild.fetchOwner().catch(() => null);
    if (owner) {
      addedById = owner.id;
      addedByUsername = owner.user?.tag || owner.user?.username;
    }
  }

  await syncGuildInfo({ guild, addedById, addedByUsername });
  await sendWelcomeMessage(guild);
});

client.on(Events.GuildDelete, async (guild) => {
  try {
    const { apiBase, apiKey } = getApiConfig();
    await fetch(`${apiBase}/bot/guilds/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ guildId: guild.id })
    });
  } catch {
    // ignore
  }
  for (const key of voiceIntervals.keys()) {
    if (key.startsWith(`${guild.id}:`)) {
      stopVoiceInterval(key);
    }
  }
});

const voiceIntervals = new Map();
const bannedCache = {
  map: new Map(),
  lastFetch: 0
};
const bannedCacheTtlMs = 60_000;

const getApiConfig = () => ({
  apiBase: process.env.API_BASE || "http://localhost:4000",
  apiKey: process.env.API_SECRET_KEY || ""
});

const defaultWelcomeMessages = {
  fr:
    "🎉 **Bienvenue sur ECOBOTY**\n" +
    "Merci d'avoir ajoute ECOBOTY.\n\n" +
    "⚙️ **Configuration**\n" +
    "Tout se configure sur **[ecoboty.eu](https://ecoboty.eu)** (dashboard serveur).\n" +
    "🌐 La langue du bot se regle dans **Parametres du bot**.\n\n" +
    "🟣 **Twitch**\n" +
    "Pour relier les viewers, chacun doit faire **!daily** une premiere fois pour lier son compte et commencer a cumuler.\n\n" +
    "📘 **Documentation & Support**\n" +
    "Documentation: **[ecoboty.eu/documentation](https://ecoboty.eu/documentation)**\n" +
    "Support Discord: **[discord.gg/e6eUHaqyGt](https://discord.gg/e6eUHaqyGt)**",
  en:
    "🎉 **Welcome to ECOBOTY**\n" +
    "Thanks for adding ECOBOTY.\n\n" +
    "⚙️ **Configuration**\n" +
    "Everything is configured on **[ecoboty.eu](https://ecoboty.eu)** (server dashboard).\n" +
    "🌐 You can change the bot language in **Bot settings**.\n\n" +
    "🟣 **Twitch**\n" +
    "To link viewers, each user must run **!daily** once to connect their account and start earning.\n\n" +
    "📘 **Documentation & Support**\n" +
    "Documentation: **[ecoboty.eu/documentation](https://ecoboty.eu/documentation)**\n" +
    "Discord support: **[discord.gg/e6eUHaqyGt](https://discord.gg/e6eUHaqyGt)**",
  es:
    "🎉 **Bienvenido a ECOBOTY**\n" +
    "Gracias por anadir ECOBOTY.\n\n" +
    "⚙️ **Configuracion**\n" +
    "Todo se configura en **[ecoboty.eu](https://ecoboty.eu)** (panel del servidor).\n" +
    "🌐 Puedes cambiar el idioma del bot en **Ajustes del bot**.\n\n" +
    "🟣 **Twitch**\n" +
    "Para vincular viewers, cada usuario debe usar **!daily** una primera vez para enlazar su cuenta y empezar a acumular.\n\n" +
    "📘 **Documentacion y Soporte**\n" +
    "Documentacion: **[ecoboty.eu/documentation](https://ecoboty.eu/documentation)**\n" +
    "Soporte Discord: **[discord.gg/e6eUHaqyGt](https://discord.gg/e6eUHaqyGt)**"
};

const clampField = (value, max = 1024) => {
  const text = String(value || "").trim();
  if (text.length <= max) return text || "—";
  return `${text.slice(0, Math.max(0, max - 1))}…`;
};

const findPrivateAdminChannel = async (guild) => {
  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (!me) return null;
  const everyone = guild.roles.everyone;
  const candidates = Array.from(guild.channels.cache.values()).filter((channel) => {
    if (!channel?.isTextBased?.() || channel?.isThread?.()) return false;
    const permsEveryone = channel.permissionsFor(everyone);
    const permsBot = channel.permissionsFor(me);
    if (!permsEveryone || !permsBot) return false;
    const isPrivate = !permsEveryone.has(PermissionsBitField.Flags.ViewChannel);
    const canSend =
      permsBot.has(PermissionsBitField.Flags.ViewChannel) &&
      permsBot.has(PermissionsBitField.Flags.SendMessages) &&
      permsBot.has(PermissionsBitField.Flags.EmbedLinks);
    return isPrivate && canSend;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return candidates[0] || null;
};

const findWritableTopChannel = async (guild) => {
  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (!me) return null;
  const candidates = Array.from(guild.channels.cache.values()).filter((channel) => {
    if (!channel?.isTextBased?.() || channel?.isThread?.()) return false;
    const permsBot = channel.permissionsFor(me);
    if (!permsBot) return false;
    return (
      permsBot.has(PermissionsBitField.Flags.ViewChannel) &&
      permsBot.has(PermissionsBitField.Flags.SendMessages) &&
      permsBot.has(PermissionsBitField.Flags.EmbedLinks)
    );
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return candidates[0] || null;
};

const findSystemOrWritableChannel = async (guild) => {
  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (!me) return null;
  const systemChannel = guild.systemChannel;
  if (systemChannel?.isTextBased?.() && !systemChannel.isThread?.()) {
    const permsBot = systemChannel.permissionsFor(me);
    if (
      permsBot?.has(PermissionsBitField.Flags.ViewChannel) &&
      permsBot?.has(PermissionsBitField.Flags.SendMessages) &&
      permsBot?.has(PermissionsBitField.Flags.EmbedLinks)
    ) {
      return systemChannel;
    }
  }
  return findWritableTopChannel(guild);
};

const sendWelcomeMessage = async (guild) => {
  try {
    const settings = await getGuildBotSettings(guild.id);
    if (settings?.welcome_enabled === false) return;
    const channel = await findSystemOrWritableChannel(guild);
    if (!channel) {
      console.warn(`[welcome] No writable channel found for guild ${guild.id}`);
      return;
    }
    const msgFr = settings?.welcome_message_fr?.trim() || defaultWelcomeMessages.fr;
    const msgEn = settings?.welcome_message_en?.trim() || defaultWelcomeMessages.en;
    const msgEs = settings?.welcome_message_es?.trim() || defaultWelcomeMessages.es;
    const embed = new EmbedBuilder()
      .setTitle("Bienvenue / Welcome / Bienvenido")
      .setDescription(
        "📌 Choisis ta langue ci-dessous. Le bot est configurable depuis ecoboty.eu."
      )
      .setColor(0x2563eb)
      .addFields(
        { name: "🇫🇷 FR", value: clampField(msgFr) },
        { name: "🇬🇧 EN", value: clampField(msgEn) },
        { name: "🇪🇸 ES", value: clampField(msgEs) }
      );
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.warn("[welcome] failed to send message", error?.message || error);
  }
};

const getGuildBotSettings = async (guildId) => {
  const { apiBase, apiKey } = getApiConfig();
  return getBotSettings(guildId, apiBase, apiKey);
};

const getGuildLanguage = async (guildId) => {
  const { apiBase, apiKey } = getApiConfig();
  return getBotLanguage(guildId, apiBase, apiKey);
};

const refreshBannedGuilds = async () => {
  const { apiBase, apiKey } = getApiConfig();
  try {
    const res = await fetch(`${apiBase}/bot/guilds/banned`, {
      headers: { "x-api-key": apiKey }
    });
    if (!res.ok) return;
    const data = await res.json();
    const map = new Map();
    (data.banned || []).forEach((row) => {
      if (row?.guildId) {
        map.set(String(row.guildId), row);
      }
    });
    bannedCache.map = map;
    bannedCache.lastFetch = Date.now();
  } catch {
    // ignore
  }
};

const getBanInfo = async (guildId) => {
  if (!guildId) return null;
  const now = Date.now();
  if (now - bannedCache.lastFetch > bannedCacheTtlMs) {
    await refreshBannedGuilds();
  }
  return bannedCache.map.get(String(guildId)) || null;
};

const syncGuildInfo = async ({ guild, addedById = null, addedByUsername = null }) => {
  if (!guild) return;
  const { apiBase, apiKey } = getApiConfig();
  const owner = await guild.fetchOwner().catch(() => null);
  const finalAddedById = addedById || owner?.id || null;
  const finalAddedByUsername = addedByUsername || owner?.user?.tag || owner?.user?.username || null;
  const payload = {
    guildId: guild.id,
    name: guild.name,
    icon: guild.icon,
    ownerId: owner?.id || guild.ownerId || null,
    addedById: finalAddedById,
    addedByUsername: finalAddedByUsername,
    addedAt: new Date().toISOString()
  };
  try {
    await fetch(`${apiBase}/bot/guilds/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(payload)
    });
  } catch {
    // ignore
  }
};

const medalEmoji = (index) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return String(index + 1);
};

const getGameLabel = (lang, gameId) => {
  const key = `games.labels.${gameId}`;
  const value = t(lang, key);
  return value === key ? t(lang, "games.labels.default") : value;
};

const getGameHintShort = (lang, gameId) => {
  const key = `games.hints.${gameId}`;
  const value = t(lang, key);
  return value === key ? t(lang, "games.hints.default") : value;
};

const clampModalTitle = (title) => {
  const maxLength = 45;
  const value = String(title || "").trim();
  if (!value) return "Commande";
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, Math.max(0, maxLength - 3)).trimEnd();
  return `${trimmed}...`;
};

const replyBanned = async (interaction, lang = "fr", reason = "") => {
  if (!interaction?.isRepliable?.()) return;
  const content = reason
    ? t(lang, "common.botDisabledReason", { reason })
    : t(lang, "common.botDisabled");
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  }
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
};

const replyEphemeral = async (interaction, content) => {
  if (!interaction?.isRepliable?.()) return;
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  }
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
};

const getGameExplanation = (lang, gameId) => {
  switch (gameId) {
    case "flip":
      return t(lang, "games.helpFlip");
    case "dice":
      return t(lang, "games.helpDice");
    case "slot":
      return t(lang, "games.helpSlot");
    case "roulette":
      return t(lang, "games.helpRoulette");
    case "higherLower":
      return t(lang, "games.helpHigherLower");
    case "crash":
      return t(lang, "games.helpCrash");
    case "double":
      return t(lang, "games.helpDouble");
    case "mystery":
      return t(lang, "games.helpMystery");
    default:
      return t(lang, "games.helpDefault");
  }
};

const getWebBaseUrl = () => String(process.env.BASE_URL || "http://localhost:3000");

const buildUserGuildUrl = (guildId) => {
  const base = getWebBaseUrl();
  try {
    return new URL(`/user/guild/${guildId}`, base).toString();
  } catch {
    return `${base.replace(/\/+$/, "")}/user/guild/${guildId}`;
  }
};

const buildLeaderboardEmbed = ({
  guildId,
  guildName,
  leaderboard,
  currencyEmoji,
  updatedAt,
  lang = "fr",
  timeZone = null
}) => {
  const userUrl = buildUserGuildUrl(guildId);
  const lines = leaderboard.map((row, index) => {
    const medal = medalEmoji(index);
    const name = row.name || row.userId;
    const label = userUrl ? `[${name}](${userUrl})` : name;
    return `${medal} : ${label}\n➥ ${row.balance} ${currencyEmoji}`;
  });
  const locale = localeFromLang(lang);
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: timeZone || "UTC"
      }).format(new Date(updatedAt))
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: timeZone || "UTC"
      }).format(new Date());
  return new EmbedBuilder()
    .setTitle(t(lang, "leaderboard.serverTitle", { guild: guildName }))
    .setDescription(lines.join("\n\n") || t(lang, "common.noData"))
    .setFooter({ text: t(lang, "leaderboard.footer", { date: updatedLabel }) })
    .setColor(0x2563eb);
};

const upsertLeaderboardPost = async (guild) => {
  try {
    const banInfo = await getBanInfo(guild?.id);
    if (banInfo) return;
    const { apiBase, apiKey } = getApiConfig();
    const botSettings = await getGuildBotSettings(guild.id);
    const lang = botSettings.language || "fr";
    const timeZone = botSettings.timezone || null;
    const settingsRes = await fetch(
      `${apiBase}/bot/economy/leaderboard-post?guildId=${guild.id}`,
      { headers: { "x-api-key": apiKey } }
    );
    const settingsData = await settingsRes.json();
    const settings = settingsData.settings;
    if (!settings || settings.enabled === false) return;

    const channel = await guild.channels.fetch(settings.channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.warn(`[leaderboard] Salon introuvable ou non texte: ${settings.channel_id}`);
      return;
    }

    const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    const perms = me ? channel.permissionsFor(me) : null;
    const required = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks
    ];
    if (!perms || !perms.has(required)) {
      console.warn(`[leaderboard] Accès manquant au salon ${settings.channel_id} (permissions bot).`);
      return;
    }

    const leaderboardRes = await fetch(
      `${apiBase}/bot/economy/leaderboard?guildId=${guild.id}&limit=${settings.limit || 10}`,
      { headers: { "x-api-key": apiKey } }
    );
    const leaderboardData = await leaderboardRes.json();
    const raw = leaderboardData.leaderboard || [];
    const filtered = raw.filter((row) => Number(row.balance || 0) > 0);

    const members = await Promise.all(
      filtered.map(async (row) => {
        const member = await guild.members.fetch(row.userId).catch(() => null);
        return {
          ...row,
          name: member?.displayName || row.userId
        };
      })
    );

    const settingsRes2 = await fetch(`${apiBase}/bot/economy/settings?guildId=${guild.id}`, {
      headers: { "x-api-key": apiKey }
    });
    const settingsCurrency = await settingsRes2.json();
    const currencyEmoji = settingsCurrency?.emoji || "💰";

    const embed = buildLeaderboardEmbed({
      guildId: guild.id,
      guildName: guild.name,
      leaderboard: members,
      currencyEmoji,
      updatedAt: Date.now(),
      lang,
      timeZone
    });

    let messageId = settings.message_id;
    if (messageId) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        await message.edit({ embeds: [embed] });
        return;
      }
    }

    const sent = await channel.send({ embeds: [embed] });
    await fetch(`${apiBase}/bot/economy/leaderboard-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        guildId: guild.id,
        channelId: settings.channel_id,
        limit: settings.limit || 10,
        enabled: settings.enabled !== false,
        messageId: sent.id
      })
    });
  } catch (error) {
    console.error("[leaderboard] Envoi automatique échoué", error);
  }
};

const scheduleLeaderboardPosts = () => {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      await upsertLeaderboardPost(guild);
    }
  }, 600000);
};

const callAutoGain = async ({ guildId, userId, type, channelId, roleIds }) => {
  const banInfo = await getBanInfo(guildId);
  if (banInfo) return;
  const { apiBase, apiKey } = getApiConfig();
  await fetch(`${apiBase}/bot/economy/auto-gain`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ guildId, userId, type, channelId, roleIds })
  });
};

const stopVoiceInterval = (key) => {
  const existing = voiceIntervals.get(key);
  if (existing) clearInterval(existing);
  voiceIntervals.delete(key);
};

const startVoiceInterval = (member, channelId) => {
  if (!member?.guild?.id || !member?.id) return;
  const key = `${member.guild.id}:${member.id}`;
  stopVoiceInterval(key);
  const interval = setInterval(async () => {
    const currentChannelId = member.voice?.channelId;
    if (!currentChannelId) {
      stopVoiceInterval(key);
      return;
    }
    const roleIds = member.roles?.cache ? Array.from(member.roles.cache.keys()) : [];
    await callAutoGain({
      guildId: member.guild.id,
      userId: member.id,
      type: "voice",
      channelId: currentChannelId,
      roleIds
    });
  }, 60_000);
  voiceIntervals.set(key, interval);
};

const parseRequiredRoleIds = (shop) => {
  const raw = shop?.required_role_ids ?? shop?.required_role_id;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return raw ? [raw] : [];
    }
    return raw ? [raw] : [];
  }
  return [];
};

const memberHasAllRoles = (member, roleIds) => roleIds.every((id) => member.roles.cache.has(id));

const persistTempRole = async ({ guildId, userId, roleId, durationSeconds }) => {
  const apiBase = process.env.API_BASE || "http://localhost:4000";
  const apiKey = process.env.API_SECRET_KEY || "";
  try {
    await fetch(`${apiBase}/bot/temp-roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        guildId,
        userId,
        roleId,
        durationSeconds
      })
    });
  } catch (error) {
    console.error("Persist temp role failed", error);
  }
};

const sendGuildLog = async ({ guildId, content }) => {
  if (!guildId || !content) return;
  const apiBase = process.env.API_BASE || "http://localhost:4000";
  const apiKey = process.env.API_SECRET_KEY || "";
  try {
    await fetch(`${apiBase}/bot/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ guildId, content })
    });
  } catch (error) {
    console.error("Send guild log failed", error);
  }
};

const processExpiredTempRoles = async () => {
  const apiBase = process.env.API_BASE || "http://localhost:4000";
  const apiKey = process.env.API_SECRET_KEY || "";
  try {
    const res = await fetch(`${apiBase}/bot/temp-roles/expired?limit=100`, {
      headers: { "x-api-key": apiKey }
    });
    if (!res.ok) return;
    const data = await res.json();
    const rows = data.rows || [];
    for (const row of rows) {
      try {
        const guildId = String(row.discord_guild_id || "");
        const guild = client.guilds.cache.get(guildId);
        const targetGuild = guild || (guildId ? await client.guilds.fetch(guildId).catch(() => null) : null);
        if (!targetGuild) {
          await fetch(`${apiBase}/bot/temp-roles/mark-removed`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify({ id: row.id })
          });
          continue;
        }
        const member = await targetGuild.members.fetch(String(row.user_discord_id)).catch(() => null);
        if (member && row.role_id) {
          await member.roles.remove([String(row.role_id)], "Rôle temporaire expiré");
          await sendGuildLog({
            guildId,
            content: `⏳ Rôle temporaire expiré pour <@${row.user_discord_id}> : <@&${row.role_id}>.`
          });
        }
        await fetch(`${apiBase}/bot/temp-roles/mark-removed`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ id: row.id })
        });
      } catch (error) {
        console.error("Temp role removal failed", error);
      }
    }
  } catch (error) {
    console.error("Fetch expired temp roles failed", error);
  }
};

const autoSyncCommands = async () => {
  if (process.env.AUTO_REGISTER_COMMANDS === "false") return;
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CLIENT_ID) return;

  try {
    console.log("Vérification des commandes globales...");
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
    const body = commands.map((command) => command.data.toJSON());
    const route = Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
    const existing = await rest.get(route);
    const existingNames = Array.isArray(existing) ? existing.map((cmd) => cmd.name).sort() : [];
    const nextNames = body.map((cmd) => cmd.name).sort();
    const isSame = existingNames.length === nextNames.length && existingNames.every((n, i) => n === nextNames[i]);
    if (!isSame) {
      await rest.put(route, { body });
      console.log("Commandes globales synchronisées.");
    } else {
      console.log("Commandes globales déjà à jour.");
    }
  } catch (error) {
    console.error("Sync commandes échouée", error);
  }
};

client.on(Events.InteractionCreate, async (interaction) => {
  const lang = interaction.guildId ? await getGuildLanguage(interaction.guildId) : "fr";
  const tr = (key, vars) => t(lang, key, vars);
  if (interaction.guildId) {
    const banInfo = await getBanInfo(interaction.guildId);
    if (banInfo) {
      await replyBanned(interaction, lang, banInfo.reason || "");
      return;
    }
  }
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "shop_select") {
      try {
        await interaction.deferUpdate();
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";
        const shopId = interaction.values[0];

        const shopsRes = await fetch(`${apiBase}/bot/shops?guildId=${interaction.guildId}`, {
          headers: { "x-api-key": apiKey }
        });
        const shopsData = await shopsRes.json();
        const shops = shopsData.shops || [];
        const shop = shops.find((s) => String(s.id) === String(shopId));
        if (!shop) {
          return replyEphemeral(interaction, tr("shop.notFound"));
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const requiredRoleIds = parseRequiredRoleIds(shop);
        if (requiredRoleIds.length && !memberHasAllRoles(member, requiredRoleIds)) {
          return replyEphemeral(interaction, tr("shop.noAccess"));
        }

        const allowedShopIds = [];
        shops.forEach((s) => {
          const roleIds = parseRequiredRoleIds(s);
          const allowed = !roleIds.length || memberHasAllRoles(member, roleIds);
          if (allowed) allowedShopIds.push(String(s.id));
        });

        const itemsRes = await fetch(`${apiBase}/bot/shops/${shop.id}/items`, {
          headers: { "x-api-key": apiKey }
        });
        const itemsData = await itemsRes.json();
        const items = itemsData.items || [];

        const balanceRes = await fetch(
          `${apiBase}/bot/economy/balance?guildId=${interaction.guildId}&userId=${interaction.user.id}`,
          { headers: { "x-api-key": apiKey } }
        );
        const balanceData = await balanceRes.json();
        const balance = Number(balanceData.balance || 0);
        const settingsRes = await fetch(`${apiBase}/bot/economy/settings?guildId=${interaction.guildId}`, {
          headers: { "x-api-key": apiKey }
        });
        const settingsData = await settingsRes.json();
        const currencyEmoji = settingsData?.emoji || "💰";

        const { components } = buildShopContainerMessage({
          shop,
          items,
          shops,
          allowedShopIds,
          balance,
          currencyEmoji,
          page: 1,
          lang
        });

        await updateInteractionMessageV2({
          applicationId: interaction.applicationId,
          interactionToken: interaction.token,
          payload: { components }
        });
        scheduleShopTimeout({ interaction, components, lang });
        return;
      } catch (error) {
        console.error("Erreur shop select", error);
        return;
      }
    }
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      await interaction.reply({
        content: tr("common.commandError"),
        flags: MessageFlags.Ephemeral
      });
    }
  }

  if (interaction.isButton()) {
    const [action, a, b] = interaction.customId.split(":");

    if (action === "game_open") {
      const gameId = a;
      if (["flip", "dice", "roulette", "higherLower"].includes(gameId)) {
        const helpText = getGameExplanation(lang, gameId);
        const select = new StringSelectMenuBuilder()
          .setCustomId(`game_choice:${gameId}`)
          .setPlaceholder(tr("common.selectOption"))
          .setMinValues(1)
          .setMaxValues(1);

        if (gameId === "flip") {
          select.addOptions(
            { label: tr("games.choiceHeads"), value: "pile", emoji: "🪙" },
            { label: tr("games.choiceTails"), value: "face", emoji: "🪙" }
          );
        }
        if (gameId === "dice") {
          select.addOptions(
            { label: "1", value: "1", emoji: "🎲" },
            { label: "2", value: "2", emoji: "🎲" },
            { label: "3", value: "3", emoji: "🎲" },
            { label: "4", value: "4", emoji: "🎲" },
            { label: "5", value: "5", emoji: "🎲" },
            { label: "6", value: "6", emoji: "🎲" }
          );
        }
        if (gameId === "roulette") {
          select.addOptions(
            { label: tr("games.choiceRed"), value: "rouge", emoji: "🔴" },
            { label: tr("games.choiceBlack"), value: "noir", emoji: "⚫" },
            { label: tr("games.choiceGreen"), value: "vert", emoji: "🟢" }
          );
        }
        if (gameId === "higherLower") {
          select.addOptions(
            { label: tr("games.choiceHigher"), value: "plus", emoji: "⬆️" },
            { label: tr("games.choiceLower"), value: "moins", emoji: "⬇️" }
          );
        }

        const row = new ActionRowBuilder().addComponents(select);
        const cancelRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("game_cancel").setLabel(tr("common.cancel")).setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({
          content: tr("games.choicePrompt", { game: getGameLabel(lang, gameId), help: helpText }),
          components: [row, cancelRow],
          flags: MessageFlags.Ephemeral
        });
      }

      const gameLabel = getGameLabel(lang, gameId);
      const hint = getGameHintShort(lang, gameId);
      const helpText = getGameExplanation(lang, gameId);
      const modalTitle = clampModalTitle(`🎮 ${gameLabel}${hint ? ` — ${hint}` : ""}`);
      const modal = new ModalBuilder()
        .setCustomId(`game_modal:${gameId}`)
        .setTitle(modalTitle);

      const betInput = new TextInputBuilder()
        .setCustomId("bet")
        .setLabel(tr("common.betLabel"))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder(hint ? `${tr("common.betPlaceholder")} • ${hint}` : tr("common.betPlaceholder"));

      const helpInput = new TextInputBuilder()
        .setCustomId("help")
        .setLabel(tr("common.rulesLabel"))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(helpText);

      const rows = [
        new ActionRowBuilder().addComponents(betInput),
        new ActionRowBuilder().addComponents(helpInput)
      ];

      if (["flip", "dice", "roulette", "higherLower", "crash"].includes(gameId)) {
        const choiceInput = new TextInputBuilder()
          .setCustomId("choice")
          .setLabel(
            gameId === "flip"
              ? tr("common.choiceLabelFlip")
              : gameId === "dice"
              ? tr("common.choiceLabelDice")
              : gameId === "roulette"
              ? tr("common.choiceLabelRoulette")
              : gameId === "higherLower"
              ? tr("common.choiceLabelHigherLower")
              : tr("common.choiceLabelCrash")
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder(
            gameId === "flip"
              ? tr("common.choicePlaceholderFlip")
              : gameId === "dice"
              ? tr("common.choicePlaceholderDice")
              : gameId === "roulette"
              ? tr("common.choicePlaceholderRoulette")
              : gameId === "higherLower"
              ? tr("common.choicePlaceholderHigherLower")
              : tr("common.choicePlaceholderCrash")
          );
        rows.push(new ActionRowBuilder().addComponents(choiceInput));
      }

      modal.addComponents(...rows);
      await interaction.showModal(modal);
      return;
    }

    if (action === "game_cancel") {
      return interaction.update({ content: tr("common.cancelled"), components: [] });
    }

    if (action === "sale_cancel") {
      return interaction.update({ content: tr("common.cancelled"), components: [] });
    }

    if (action === "sale_confirm") {
      const saleId = a;
      try {
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";

        const res = await fetch(`${apiBase}/bot/inventory/buy`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            saleId: Number(saleId)
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          const reason = data.error || data.reason || "unknown";
          const reasonMap = {
            cannot_buy_own: tr("sale.cannotBuyOwn"),
            insufficient_funds: tr("sale.insufficientFunds"),
            sale_not_found: tr("sale.saleNotFound"),
            item_not_found: tr("sale.itemNotFound")
          };
          const message = reasonMap[reason] || tr("sale.purchaseFailed", { reason });
          return interaction.update({ content: message, embeds: [], components: [] });
        }

        const itemName = data?.item?.name || tr("shopUi.itemFallback");
        const sellerId = data?.sellerId;
        if (sellerId && String(sellerId) !== String(interaction.user.id)) {
          try {
            const sellerUser = await interaction.client.users.fetch(String(sellerId));
            await sellerUser.send(
              tr("sale.saleConfirmedDm", {
                item: itemName,
                buyer: interaction.user.id,
                price: data.price
              })
            );
          } catch (notifyError) {
            console.error("DM vente (seller) échouée", notifyError);
          }
        }
        const isSelfBuy = data?.selfBuy === true || String(sellerId) === String(interaction.user.id);
        const embed = new EmbedBuilder()
          .setTitle(isSelfBuy ? tr("sale.itemRecovered") : tr("sale.itemBoughtTitle"))
          .setDescription(
            isSelfBuy
              ? tr("sale.itemRecoveredText", { item: itemName })
              : tr("sale.itemBoughtText", {
                  buyer: interaction.user.username,
                  item: itemName,
                  price: data.price
                })
          )
          .setColor(0x22c55e);

        return interaction.update({ embeds: [embed], components: [] });
      } catch (error) {
        console.error("Erreur achat vente", error);
        return interaction.update({ content: tr("sale.buyError"), embeds: [], components: [] });
      }
    }

    if (action === "sale_mode") {
      const mode = a;
      try {
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";

        if (mode === "sell") {
          const res = await fetch(`${apiBase}/bot/inventory?guildId=${interaction.guildId}&userId=${interaction.user.id}`, {
            headers: { "x-api-key": apiKey }
          });
          const data = await res.json();
          const inventory = data?.items || [];
          const sellable = inventory.filter((item) => item.type === "inventory");

          if (!sellable.length) {
            return interaction.reply({ content: tr("sale.noInventoryToSell"), flags: MessageFlags.Ephemeral });
          }

          const options = sellable.slice(0, 25).map((item) => ({
            label: item.name,
            value: String(item.item_id),
            description: `x${item.quantity}`
          }));
          const sellSelect = new StringSelectMenuBuilder()
            .setCustomId("sale_select")
            .setPlaceholder(tr("sale.selectSell"))
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(sellSelect);
          const cancelRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("sale_cancel").setLabel(tr("sale.cancel")).setStyle(ButtonStyle.Secondary)
          );
          const components = [row, cancelRow];
          await interaction.reply({
            content: tr("sale.selectSell"),
            components,
            flags: MessageFlags.Ephemeral
          });
          scheduleInteractionTimeout({
            interaction,
            components,
            message: tr("sale.timeout")
          });
          return;
        }

        if (mode === "buy") {
          const res = await fetch(`${apiBase}/bot/inventory/sales?guildId=${interaction.guildId}`, {
            headers: { "x-api-key": apiKey }
          });
          const data = await res.json();
          const sales = data?.sales || [];

          if (!sales.length) {
            return interaction.reply({ content: tr("sale.noSales"), flags: MessageFlags.Ephemeral });
          }

          const sellerIds = sales.map((sale) => sale.seller_discord_id);
          const sellerNames = await resolveDisplayNames(interaction.guild, sellerIds);
          const options = sales.slice(0, 25).map((sale) => ({
            label: sale.name,
            value: String(sale.id),
            description: tr("sale.optionDesc", {
              qty: sale.quantity || 1,
              price: sale.price,
              seller: sellerNames[String(sale.seller_discord_id)] || sale.seller_discord_id
            })
          }));
          const buySelect = new StringSelectMenuBuilder()
            .setCustomId("sale_buy")
            .setPlaceholder(tr("sale.chooseBuy"))
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(buySelect);
          const cancelRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("sale_cancel").setLabel(tr("sale.cancel")).setStyle(ButtonStyle.Secondary)
          );
          const components = [row, cancelRow];
          await interaction.reply({
            content: tr("sale.chooseBuy"),
            components,
            flags: MessageFlags.Ephemeral
          });
          scheduleInteractionTimeout({
            interaction,
            components,
            message: tr("sale.timeout")
          });
          return;
        }
      } catch (error) {
        console.error("Erreur vente mode", error);
        return interaction.reply({ content: tr("sale.error"), flags: MessageFlags.Ephemeral });
      }
    }

    if (action === "shop_page") {
      const shopId = a;
      const page = Number(b || 1);
      try {
        await interaction.deferUpdate();
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";

        const shopsRes = await fetch(`${apiBase}/bot/shops?guildId=${interaction.guildId}`, {
          headers: { "x-api-key": apiKey }
        });
        const shopsData = await shopsRes.json();
        const shops = shopsData.shops || [];
        const shop = shops.find((s) => String(s.id) === String(shopId));
        if (!shop) {
          return replyEphemeral(interaction, tr("shop.notFound"));
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const requiredRoleIds = parseRequiredRoleIds(shop);
        if (requiredRoleIds.length && !memberHasAllRoles(member, requiredRoleIds)) {
          return replyEphemeral(interaction, tr("shop.noAccess"));
        }

        const allowedShopIds = [];
        shops.forEach((s) => {
          const roleIds = parseRequiredRoleIds(s);
          const allowed = !roleIds.length || memberHasAllRoles(member, roleIds);
          if (allowed) allowedShopIds.push(String(s.id));
        });

        const itemsRes = await fetch(`${apiBase}/bot/shops/${shop.id}/items`, {
          headers: { "x-api-key": apiKey }
        });
        const itemsData = await itemsRes.json();
        const items = itemsData.items || [];

        const balanceRes = await fetch(
          `${apiBase}/bot/economy/balance?guildId=${interaction.guildId}&userId=${interaction.user.id}`,
          { headers: { "x-api-key": apiKey } }
        );
        const balanceData = await balanceRes.json();
        const balance = Number(balanceData.balance || 0);
        const settingsRes = await fetch(`${apiBase}/bot/economy/settings?guildId=${interaction.guildId}`, {
          headers: { "x-api-key": apiKey }
        });
        const settingsData = await settingsRes.json();
        const currencyEmoji = settingsData?.emoji || "💰";

        const { components } = buildShopContainerMessage({
          shop,
          items,
          shops,
          allowedShopIds,
          balance,
          currencyEmoji,
          page,
          lang
        });

        await updateInteractionMessageV2({
          applicationId: interaction.applicationId,
          interactionToken: interaction.token,
          payload: { components }
        });
        scheduleShopTimeout({ interaction, components, lang });
        return;
      } catch (error) {
        console.error("Erreur shop pagination", error);
        return;
      }
    }

    if (action === "buy") {
      const itemId = a;
      try {
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";

        const itemRes = await fetch(`${apiBase}/bot/shops/item/${itemId}`, {
          headers: { "x-api-key": apiKey }
        });
        const data = await itemRes.json();
        if (!itemRes.ok) {
          return interaction.reply({ content: tr("buy.notFound"), flags: MessageFlags.Ephemeral });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const shopRoleIds = parseRequiredRoleIds(data.shop);
        if (shopRoleIds.length && !memberHasAllRoles(member, shopRoleIds)) {
          return interaction.reply({ content: tr("buy.rolesRequired"), flags: MessageFlags.Ephemeral });
        }

        const purchaseRes = await fetch(`${apiBase}/bot/shops/${interaction.guildId}/purchase`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey
          },
          body: JSON.stringify({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            itemId: Number(itemId)
          })
        });
        const purchase = await purchaseRes.json();
        if (!purchaseRes.ok) {
          return interaction.reply({
            content: tr("buy.purchaseFailed", { reason: purchase.error }),
            flags: MessageFlags.Ephemeral
          });
        }
        const settingsRes = await fetch(`${apiBase}/bot/economy/settings?guildId=${interaction.guildId}`, {
          headers: { "x-api-key": apiKey }
        });
        const settingsData = await settingsRes.json();
        const currencyEmoji = settingsData?.emoji || "💰";
        const itemName = data?.item?.name || `#${itemId}`;
        const shopName = data?.shop?.name || tr("shopUi.shopFallback");
        if (data?.item?.send_dm) {
          try {
            const owner = await interaction.guild.fetchOwner();
            await owner.send(
              tr("buy.ownerDm", {
                shop: shopName,
                buyer: interaction.user.id,
                item: itemName,
                price: purchase.price
              })
            );
          } catch (notifyError) {
            console.error("Notification achat (owner) échouée", notifyError);
          }
        }
        let roleAssigned = null;
        if (data?.item?.type === "role" || data?.item?.type === "temp_role") {
          try {
            let itemData = data.item?.data || null;
            if (typeof itemData === "string") {
              try {
                itemData = JSON.parse(itemData);
              } catch {
                itemData = null;
              }
            }
            const roleIds = Array.isArray(itemData?.role_ids)
              ? itemData.role_ids
              : itemData?.role_id
              ? [itemData.role_id]
              : [];
            const durationSeconds = Number(itemData?.duration_seconds || itemData?.role_duration_seconds || 0);
            if (roleIds.length) {
              await member.roles.add(roleIds, "Achat boutique");
              roleAssigned = true;
              if (data?.item?.type === "temp_role" && durationSeconds > 0) {
                await Promise.all(
                  roleIds.map((roleId) =>
                    persistTempRole({
                      guildId: interaction.guildId,
                      userId: interaction.user.id,
                      roleId,
                      durationSeconds
                    })
                  )
                );
                await sendGuildLog({
                  guildId: interaction.guildId,
                  content: `⏳ Rôle temporaire attribué à <@${interaction.user.id}> : ${roleIds
                    .map((roleId) => `<@&${roleId}>`)
                    .join(", ")} (${durationSeconds}s).`
                });
              }
            }
          } catch (roleError) {
            console.error("Attribution rôle achat échouée", roleError);
            roleAssigned = false;
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(tr("buy.confirmTitle"))
          .setDescription(tr("buy.confirmText"))
          .addFields(
            { name: tr("buy.fieldShop"), value: shopName, inline: true },
            { name: tr("buy.fieldItem"), value: itemName, inline: true },
            { name: tr("buy.fieldPrice"), value: `${purchase.price} ${currencyEmoji}`, inline: true }
          )
          .setColor(0x22c55e);
        if (roleAssigned === true) {
          embed.addFields({ name: tr("buy.fieldRole"), value: tr("buy.roleAssigned"), inline: true });
        }
        if (roleAssigned === false) {
          embed.addFields({ name: tr("buy.fieldRole"), value: tr("buy.roleFailed"), inline: true });
        }
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error("Erreur achat", error);
        return interaction.reply({ content: tr("buy.errorBuy"), flags: MessageFlags.Ephemeral });
      }
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "lootbox_open_select") {
      const itemId = interaction.values?.[0];
      try {
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";

        const res = await fetch(`${apiBase}/bot/inventory/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            itemId: Number(itemId)
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          const reason = data.error || "unknown";
          const reasonMap = {
            no_lootbox: tr("lootbox.noLootbox"),
            lootbox_empty: tr("lootbox.empty"),
            lootbox_not_found: tr("lootbox.notFound"),
            lootbox_invalid: tr("lootbox.invalid"),
            shop_not_found: tr("lootbox.shopNotFound")
          };
          const message = reasonMap[reason] || tr("sale.purchaseFailed", { reason });
          return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }

        const reward = data.reward || {};
        const rewardType = reward.type || "inventory";
        const rewardName = reward.name || tr("lootbox.rewardFallback");
        const rewardDescription = reward.description || "";
        const lootboxInfo = data?.lootbox || null;

        // Récompenses lootbox : tout est stocké en inventaire (utilisable plus tard).

        if (lootboxInfo?.send_dm) {
          try {
            const owner = await interaction.guild.fetchOwner();
            await owner.send(
              tr("lootbox.ownerDm", {
                lootbox: lootboxInfo.name || tr("inventory.lootboxFallback"),
                user: interaction.user.id,
                reward: rewardName,
                type: rewardType
              })
            );
          } catch (notifyError) {
            console.error("Notification lootbox (owner) échouée", notifyError);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(tr("lootbox.openedTitle"))
          .setDescription(
            tr("lootbox.wonText", {
              reward: rewardName,
              description: rewardDescription ? `\n${rewardDescription}` : ""
            })
          )
          .addFields({ name: tr("lootbox.fieldType"), value: rewardType, inline: true })
          .setColor(0x22c55e);

        if (["inventory", "irl", "role", "temp_role"].includes(rewardType)) {
          embed.addFields({ name: tr("lootbox.fieldInventory"), value: tr("lootbox.inventoryAdded"), inline: true });
        }

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error("Erreur ouverture lootbox", error);
        return interaction.reply({ content: tr("lootbox.openFailed"), flags: MessageFlags.Ephemeral });
      }
    }

    if (interaction.customId === "inventory_use_select") {
      const itemId = interaction.values?.[0];
      try {
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";
        const res = await fetch(`${apiBase}/bot/inventory/use`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            itemId: Number(itemId)
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return interaction.reply({ content: tr("inventory.useFailed"), flags: MessageFlags.Ephemeral });
        }
        return interaction.reply({
          content: tr("inventory.useSuccess", { item: data?.item?.name || tr("inventory.itemFallback") }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error("Erreur utilisation inventaire", error);
        return interaction.reply({ content: tr("inventory.useFailed"), flags: MessageFlags.Ephemeral });
      }
    }

    if (interaction.customId === "sale_select") {
      const itemId = interaction.values?.[0];
      const modal = new ModalBuilder()
        .setCustomId(`sale_modal:${itemId}`)
        .setTitle(tr("sale.modalTitle"));

      const priceInput = new TextInputBuilder()
        .setCustomId("price")
        .setLabel(tr("sale.modalPriceLabel"))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder(tr("sale.modalPricePlaceholder"));

      const quantityInput = new TextInputBuilder()
        .setCustomId("quantity")
        .setLabel(tr("sale.modalQtyLabel"))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder(tr("sale.modalQtyPlaceholder"));

      modal.addComponents(
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(quantityInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === "sale_buy") {
      const saleId = interaction.values?.[0];
      try {
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";

        const salesRes = await fetch(`${apiBase}/bot/inventory/sales?guildId=${interaction.guildId}`, {
          headers: { "x-api-key": apiKey }
        });
        const salesData = await salesRes.json();
        const sales = salesData?.sales || [];
        const sale = sales.find((row) => String(row.id) === String(saleId));
        if (!sale) {
          return interaction.reply({ content: tr("sale.saleNotFound"), flags: MessageFlags.Ephemeral });
        }

        const sellerNames = await resolveDisplayNames(interaction.guild, [sale.seller_discord_id]);
        const sellerName = sellerNames[String(sale.seller_discord_id)] || sale.seller_discord_id;
        const embed = new EmbedBuilder()
          .setTitle(tr("sale.confirmTitle"))
          .setDescription(
            tr("sale.confirmDesc", {
              item: sale.name,
              qty: sale.quantity || 1,
              price: sale.price,
              seller: sellerName
            })
          )
          .setColor(0xf59e0b);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`sale_confirm:${sale.id}`)
            .setLabel(tr("sale.confirmButton"))
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("sale_cancel").setLabel(tr("sale.cancel")).setStyle(ButtonStyle.Secondary)
        );

        const components = [row];
        await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
        scheduleInteractionTimeout({
          interaction,
          components,
          message: tr("sale.confirmExpired")
        });
        return;
      } catch (error) {
        console.error("Erreur achat vente", error);
        return interaction.reply({ content: tr("sale.buyError"), flags: MessageFlags.Ephemeral });
      }
    }

    const [action, gameId] = interaction.customId.split(":");
    if (action !== "game_choice") return;

    const choice = interaction.values?.[0] || "";
    const gameLabel = getGameLabel(lang, gameId);
    const hint = getGameHintShort(lang, gameId);
    const helpText = getGameExplanation(lang, gameId);
    const modalTitle = clampModalTitle(`🎮 ${gameLabel}${hint ? ` — ${hint}` : ""}`);

    const modal = new ModalBuilder()
      .setCustomId(`game_modal:${gameId}:${choice}`)
      .setTitle(modalTitle);

    const betInput = new TextInputBuilder()
      .setCustomId("bet")
      .setLabel(tr("common.betLabel"))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(hint ? `${tr("common.betPlaceholder")} • ${hint}` : tr("common.betPlaceholder"));

    const helpInput = new TextInputBuilder()
      .setCustomId("help")
      .setLabel(tr("common.rulesLabel"))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setValue(helpText);

    modal.addComponents(
      new ActionRowBuilder().addComponents(betInput),
      new ActionRowBuilder().addComponents(helpInput)
    );
    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit()) {
    const [action, gameId, presetChoice] = interaction.customId.split(":");
    if (action === "sale_modal") {
      try {
        const price = interaction.fields.getTextInputValue("price");
        const quantity = interaction.fields.getTextInputValue("quantity");
        const apiBase = process.env.API_BASE || "http://localhost:4000";
        const apiKey = process.env.API_SECRET_KEY || "";

        const res = await fetch(`${apiBase}/bot/inventory/sell`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            itemId: Number(gameId),
            price: Number(price),
            quantity: Number(quantity)
          })
        });
        const data = await res.json();
        if (!res.ok) {
          const reason = data.error || data.reason || "unknown";
          return interaction.reply({ content: tr("sale.saleImpossible", { reason }), flags: MessageFlags.Ephemeral });
        }

        const itemName = data?.item?.name || tr("shopUi.itemFallback");
        const embed = new EmbedBuilder()
          .setTitle(tr("sale.soldTitle"))
          .setDescription(
            tr("sale.soldText", {
              seller: interaction.user.username,
              item: itemName,
              price: data.price
            })
          )
          .setColor(0x7c3aed);

        return interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur vente", error);
        return interaction.reply({ content: tr("sale.error"), flags: MessageFlags.Ephemeral });
      }
    }

    if (action !== "game_modal") return;
    try {
      const bet = interaction.fields.getTextInputValue("bet");
      const choice = presetChoice
        ? presetChoice
        : interaction.fields.fields.has("choice")
        ? interaction.fields.getTextInputValue("choice")
        : "";

      const apiBase = process.env.API_BASE || "http://localhost:4000";
      const apiKey = process.env.API_SECRET_KEY || "";
      const res = await fetch(`${apiBase}/bot/games/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          gameId,
          bet: Number(bet),
          choice
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const reason = data.reason || data.error || "unknown";
        return interaction.reply({ content: tr("game.impossible", { reason }), flags: MessageFlags.Ephemeral });
      }

      const settingsRes = await fetch(`${apiBase}/bot/economy/settings?guildId=${interaction.guildId}`, {
        headers: { "x-api-key": apiKey }
      });
      const settingsData = await settingsRes.json();
      const currencyEmoji = settingsData?.emoji || "💰";
      const gameLabel = getGameLabel(lang, gameId);

      const embed = new EmbedBuilder()
        .setTitle(tr("game.resultTitle", { game: gameLabel }))
        .setDescription(data.win ? tr("game.resultWin") : tr("game.resultLose"))
        .addFields(
          { name: tr("game.fieldBet"), value: `${data.bet} ${currencyEmoji}`, inline: true },
          { name: tr("game.fieldGain"), value: `${data.payout} ${currencyEmoji}`, inline: true },
          { name: tr("game.fieldBalance"), value: `${data.balance} ${currencyEmoji}`, inline: true }
        )
        .setColor(data.win ? 0x22c55e : 0xef4444);

      if (data.details?.result) {
        embed.addFields({
          name: tr("game.detailResult"),
          value: Array.isArray(data.details.result) ? data.details.result.join(" ") : String(data.details.result),
          inline: false
        });
      }
      if (data.details?.roll) {
        embed.addFields({ name: tr("game.detailDie"), value: String(data.details.roll), inline: true });
      }
      if (data.details?.color) {
        embed.addFields({ name: tr("game.detailColor"), value: String(data.details.color), inline: true });
      }
      if (data.details?.current && data.details?.next) {
        embed.addFields({ name: tr("game.detailStreak"), value: `${data.details.current} → ${data.details.next}`, inline: true });
      }
      if (data.details?.crashAt) {
        embed.addFields({ name: tr("game.detailCrash"), value: `x${data.details.crashAt}`, inline: true });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      return interaction.reply({ content: tr("game.error"), flags: MessageFlags.Ephemeral });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author?.bot) return;
  const banInfo = await getBanInfo(message.guild.id);
  if (banInfo) return;
  const roleIds = message.member?.roles?.cache ? Array.from(message.member.roles.cache.keys()) : [];
  await callAutoGain({
    guildId: message.guild.id,
    userId: message.author.id,
    type: "message",
    channelId: message.channel?.id,
    roleIds
  });
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user?.bot) return;
  const banInfo = await getBanInfo(member.guild.id);
  if (banInfo) return;
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;
  const key = `${member.guild.id}:${member.id}`;

  if (!newChannelId) {
    stopVoiceInterval(key);
    return;
  }

  if (oldChannelId !== newChannelId || !voiceIntervals.has(key)) {
    startVoiceInterval(member, newChannelId);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
