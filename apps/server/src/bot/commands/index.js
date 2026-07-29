import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} from "discord.js";
import axios from "axios";
import { buildShopContainerMessage } from "../shop-ui.js";
import { sendInteractionResponseV2 } from "../discord-rest.js";
import { scheduleShopTimeout, scheduleInteractionTimeout } from "../shop-timeout.js";
import { resolveDisplayNames } from "../user-resolve.js";
import { getBotLanguage, getBotSettings, t } from "../i18n.js";

const getApiConfig = () => ({
  apiBase: process.env.API_BASE || "http://localhost:4000",
  apiKey: process.env.API_SECRET_KEY || ""
});

const getWebBaseUrl = () => String(process.env.BASE_URL || "https://ecoboty.eu");

const buildUserGuildUrl = (guildId) => {
  const base = getWebBaseUrl();
  try {
    return new URL(`/user/guild/${guildId}`, base).toString();
  } catch {
    return `${base.replace(/\/+$/, "")}/user/guild/${guildId}`;
  }
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

const parseRequiredRolesMode = (shop) => {
  const mode = String(shop?.required_roles_mode || "").trim().toLowerCase();
  return mode === "any" ? "any" : "all";
};

const memberHasRequiredRoles = (member, roleIds, roleMode = "all") => {
  const required = Array.isArray(roleIds) ? roleIds.map(String).filter(Boolean) : [];
  if (!required.length) return true;
  if (roleMode === "any") return required.some((id) => member.roles.cache.has(id));
  return required.every((id) => member.roles.cache.has(id));
};

const resolveSensitiveRoleId = (settings) => String(settings?.sensitive_commands_role_id || "").trim();

const memberHasSensitiveRole = async (interaction, roleId) => {
  const targetRoleId = String(roleId || "").trim();
  if (!targetRoleId) return false;
  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    return memberHasRequiredRoles(member, [targetRoleId], "any");
  } catch {
    return false;
  }
};

const canUseSensitiveCommand = async (interaction, settings = {}) => {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  const roleId = resolveSensitiveRoleId(settings);
  if (!roleId) return false;
  return memberHasSensitiveRole(interaction, roleId);
};

const sensitiveCommandDeniedMessage = (tr, settings = {}) => {
  const roleId = resolveSensitiveRoleId(settings);
  if (!roleId) return tr("commands.sensitiveCommandDeniedAdminOnly");
  return tr("commands.sensitiveCommandDeniedWithRole", { role: `<@&${roleId}>` });
};

const getBirthdayFormatByLang = (lang) => {
  const key = String(lang || "").toLowerCase();
  if (key.startsWith("en")) {
    return {
      format: "ymd",
      label: "YYYY/MM/DD",
      placeholder: "Ex: 2000/12/31"
    };
  }
  return {
    format: "dmy",
    label: "JJ/MM/AAAA",
    placeholder: "Ex: 31/12/2000"
  };
};

const formatBirthdayDateByLang = (isoDate, lang) => {
  const value = String(isoDate || "").trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || "-";
  const [_, year, month, day] = match;
  const key = String(lang || "").toLowerCase();
  if (key.startsWith("en")) return `${year}/${month}/${day}`;
  return `${day}/${month}/${year}`;
};

const daily = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setNameLocalizations({
      "en-US": "daily",
      "es-ES": "diario"
    })
    .setDescription("Récupérer votre récompense quotidienne")
    .setDescriptionLocalizations({
      "en-US": "Claim your daily reward",
      "es-ES": "Reclamar tu recompensa diaria"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const formatDuration = (ms) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
      };
      const buildNextBonusText = (nextBonus) => {
        if (!nextBonus) return tr("daily.nextBonusNone");
        if (nextBonus.reached) {
          return tr("daily.nextBonusMax", { percent: nextBonus.percent });
        }
        return tr("daily.nextBonusIn", {
          percent: nextBonus.percent,
          daysLeft: nextBonus.daysLeft,
          target: nextBonus.target
        });
      };
      const res = await axios.post(
        `${apiBase}/bot/economy/daily`,
        { guildId: interaction.guildId, userId: interaction.user.id },
        { headers: { "x-api-key": apiKey } }
      );
      const settingsRes = await axios.get(`${apiBase}/bot/economy/settings`, {
        params: { guildId: interaction.guildId },
        headers: { "x-api-key": apiKey }
      });
      const currencyEmoji = settingsRes.data?.emoji || "💰";

      if (!res.data.ok && res.data.reason === "already_claimed") {
        const nextAt = res.data.nextAt ? new Date(res.data.nextAt) : null;
        const remaining = nextAt ? formatDuration(nextAt.getTime() - Date.now()) : "";
        const embed = new EmbedBuilder()
          .setTitle(tr("daily.alreadyTitle"))
          .setDescription(
            remaining ? tr("daily.alreadyNext", { remaining }) : tr("daily.alreadyLater")
          )
          .addFields(
            { name: tr("daily.streak"), value: String(res.data.streak ?? 0), inline: true },
            { name: tr("daily.balance"), value: `${res.data.balance ?? 0} ${currencyEmoji}`, inline: true },
            { name: tr("daily.nextBonus"), value: buildNextBonusText(res.data.nextBonus), inline: false }
          )
          .setColor(0xf59e0b);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setTitle(tr("daily.receivedTitle"))
        .setDescription(`+${res.data.amount} ${currencyEmoji}`)
        .addFields(
          { name: tr("daily.streak"), value: String(res.data.streak), inline: true },
          { name: tr("daily.balance"), value: `${res.data.balance} ${currencyEmoji}`, inline: true },
          {
            name: tr("daily.bonus"),
            value: tr("daily.bonusLine", {
              base: res.data.base,
              bonus: res.data.bonus,
              status: res.data.bonus > 0 ? tr("daily.bonusWith") : tr("daily.bonusWithout")
            }),
            inline: false
          },
          { name: tr("daily.nextBonus"), value: buildNextBonusText(res.data.nextBonus), inline: false }
        )
        .setColor(0x7c3aed);

      if (res.data.streakReset) {
        embed.addFields({
          name: tr("daily.streakResetTitle"),
          value: tr("daily.streakResetText"),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(
        "[bot] /daily failed:",
        error?.response?.status,
        error?.response?.data || error?.message || error
      );
      return interaction.reply({ content: t(lang, "daily.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

const shop = {
  data: new SlashCommandBuilder()
    .setName("boutique")
    .setNameLocalizations({
      "en-US": "shop",
      "es-ES": "tienda"
    })
    .setDescription("Afficher la liste des boutiques")
    .setDescriptionLocalizations({
      "en-US": "Show the list of shops",
      "es-ES": "Mostrar la lista de tiendas"
    })
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setNameLocalizations({
          "en-US": "user",
          "es-ES": "usuario"
        })
        .setDescription("Voir la boutique d'un membre")
        .setDescriptionLocalizations({
          "en-US": "View a member's shop",
          "es-ES": "Ver la tienda de un miembro"
        })
        .setRequired(false)
    ),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const targetUser = interaction.options.getUser("utilisateur");

      if (targetUser) {
        if (targetUser.bot) {
          return interaction.reply({ content: tr("shop.userShopBot"), flags: MessageFlags.Ephemeral });
        }
        const userShopRes = await axios.get(`${apiBase}/bot/user-shops`, {
          params: { guildId: interaction.guildId, ownerId: targetUser.id },
          headers: { "x-api-key": apiKey }
        });
        const settings = userShopRes.data?.settings || {};
        if (!settings.enabled) {
          return interaction.reply({ content: tr("shop.userShopsDisabled"), flags: MessageFlags.Ephemeral });
        }
        const shopSelected = userShopRes.data?.shop;
        if (!shopSelected) {
          return interaction.reply({
            content: tr("shop.userShopNone", { user: targetUser.username || targetUser.id }),
            flags: MessageFlags.Ephemeral
          });
        }
        const items = userShopRes.data?.items || [];
        const balanceRes = await axios.get(`${apiBase}/bot/economy/balance`, {
          params: { guildId: interaction.guildId, userId: interaction.user.id },
          headers: { "x-api-key": apiKey }
        });
        const balance = Number(balanceRes.data.balance || 0);
        const settingsRes = await axios.get(`${apiBase}/bot/economy/settings`, {
          params: { guildId: interaction.guildId },
          headers: { "x-api-key": apiKey }
        });
        const currencyEmoji = settingsRes.data?.emoji || "💰";
        const shops = [shopSelected];
        const allowedShopIds = [String(shopSelected.id)];
        const { components } = buildShopContainerMessage({
          shop: shopSelected,
          items,
          shops,
          allowedShopIds,
          balance,
          currencyEmoji,
          page: 1,
          lang
        });
        await sendInteractionResponseV2({
          interactionId: interaction.id,
          interactionToken: interaction.token,
          payload: { components }
        });
        scheduleShopTimeout({ interaction, components, lang, replacePrevious: true });
        return;
      }

      const shopsRes = await axios.get(`${apiBase}/bot/shops`, {
        params: { guildId: interaction.guildId, userId: interaction.user.id },
        headers: { "x-api-key": apiKey }
      });

      const shops = shopsRes.data.shops || [];
      if (!shops.length) {
        return interaction.reply({ content: tr("shop.noneConfigured") });
      }
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const allowedShopIds = [];
      const available = shops.filter((s) => {
        const roleIds = parseRequiredRoleIds(s);
        const roleMode = parseRequiredRolesMode(s);
        const allowed = memberHasRequiredRoles(member, roleIds, roleMode);
        if (allowed) allowedShopIds.push(String(s.id));
        return allowed;
      });

      if (!available.length) {
        const lines = shops
          .map((s) => {
            const roleIds = parseRequiredRoleIds(s);
            const roleMode = parseRequiredRolesMode(s);
            const allowed = memberHasRequiredRoles(member, roleIds, roleMode);
            return `• ${s.name} ${allowed ? "✅" : "🔒"}`;
          })
          .join("\n");
        const embed = new EmbedBuilder()
          .setTitle(tr("shop.availableTitle"))
          .setDescription(lines)
          .setColor(0x16a34a);
        return interaction.reply({ embeds: [embed], content: tr("shop.noneAccessible") });
      }

      const shopSelected = available[0];
      const balanceRes = await axios.get(`${apiBase}/bot/economy/balance`, {
        params: { guildId: interaction.guildId, userId: interaction.user.id },
        headers: { "x-api-key": apiKey }
      });
      const balance = Number(balanceRes.data.balance || 0);
      const settingsRes = await axios.get(`${apiBase}/bot/economy/settings`, {
        params: { guildId: interaction.guildId },
        headers: { "x-api-key": apiKey }
      });
      const currencyEmoji = settingsRes.data?.emoji || "💰";
      const itemsRes = await axios.get(`${apiBase}/bot/shops/${shopSelected.id}/items`, {
        headers: { "x-api-key": apiKey }
      });
      const items = itemsRes.data.items || [];

      const { components } = buildShopContainerMessage({
        shop: shopSelected,
        items,
        shops,
        allowedShopIds,
        balance,
        currencyEmoji,
        page: 1,
        lang
      });

      await sendInteractionResponseV2({
        interactionId: interaction.id,
        interactionToken: interaction.token,
        payload: { components }
      });

      scheduleShopTimeout({ interaction, components, lang, replacePrevious: true });
      return;
    } catch (error) {
      console.error("Erreur commande /shop", error);
      return interaction.reply({ content: t(lang, "shop.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

const buy = {
  data: new SlashCommandBuilder()
    .setName("acheter")
    .setNameLocalizations({
      "en-US": "buy",
      "es-ES": "comprar"
    })
    .setDescription("Acheter un article par ID")
    .setDescriptionLocalizations({
      "en-US": "Buy an item by ID",
      "es-ES": "Comprar un artículo por ID"
    })
    .addIntegerOption((option) =>
      option
        .setName("item_id")
        .setNameLocalizations({
          "en-US": "item_id",
          "es-ES": "id_articulo"
        })
        .setDescription("ID de l'article")
        .setDescriptionLocalizations({
          "en-US": "Item ID",
          "es-ES": "ID del artículo"
        })
        .setRequired(true)
    ),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const itemId = interaction.options.getInteger("item_id");
      const res = await axios.post(
        `${apiBase}/bot/shops/${interaction.guildId}/purchase`,
        { guildId: interaction.guildId, userId: interaction.user.id, itemId },
        { headers: { "x-api-key": apiKey } }
      );
      return interaction.reply({ content: tr("buy.success", { price: res.data.price }) });
    } catch (error) {
      return interaction.reply({ content: t(lang, "buy.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

const achievementI18n = {
  fr: {
    title: "Tes succes",
    disabled: "Les succes ne sont pas actives sur ce serveur.",
    empty: "Aucun succes configure pour le moment.",
    page: "Page",
    unique: "Unique",
    tier: "Palier",
    progress: "Progression",
    completed: "termine",
    expired: "expire",
    inProgress: "en cours",
    notStarted: "non commence",
    tiersDone: "paliers valides"
  },
  en: {
    title: "Your achievements",
    disabled: "Achievements are disabled on this server.",
    empty: "No achievement configured yet.",
    page: "Page",
    unique: "Unique",
    tier: "Tier",
    progress: "Progress",
    completed: "completed",
    expired: "expired",
    inProgress: "in progress",
    notStarted: "not started",
    tiersDone: "tiers done"
  },
  es: {
    title: "Tus logros",
    disabled: "Los logros estan desactivados en este servidor.",
    empty: "No hay logros configurados por ahora.",
    page: "Pagina",
    unique: "Unico",
    tier: "Escalon",
    progress: "Progreso",
    completed: "completado",
    expired: "expirado",
    inProgress: "en progreso",
    notStarted: "sin empezar",
    tiersDone: "escalones completados"
  }
};

const getAchievementLang = (lang) => {
  const key = String(lang || "").toLowerCase();
  if (key.startsWith("en")) return achievementI18n.en;
  if (key.startsWith("es")) return achievementI18n.es;
  return achievementI18n.fr;
};

const achievementStatusIcon = (status) => {
  if (status === "completed") return "✅";
  if (status === "expired") return "⏳";
  if (status === "in_progress") return "🟡";
  return "⚪";
};

const achievementStatusLabel = (status, ui) => {
  if (status === "completed") return ui.completed;
  if (status === "expired") return ui.expired;
  if (status === "in_progress") return ui.inProgress;
  return ui.notStarted;
};

const succes = {
  data: new SlashCommandBuilder()
    .setName("succes")
    .setNameLocalizations({
      "en-US": "achievements",
      "es-ES": "logros"
    })
    .setDescription("Voir tes succes et ta progression")
    .setDescriptionLocalizations({
      "en-US": "See your achievements and progression",
      "es-ES": "Ver tus logros y progreso"
    })
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setNameLocalizations({
          "en-US": "page",
          "es-ES": "pagina"
        })
        .setDescription("Numero de page")
        .setDescriptionLocalizations({
          "en-US": "Page number",
          "es-ES": "Numero de pagina"
        })
        .setMinValue(1)
        .setMaxValue(30)
        .setRequired(false)
    ),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const ui = getAchievementLang(lang);
      const page = Math.max(1, Number(interaction.options.getInteger("page") || 1));
      const res = await axios.get(`${apiBase}/bot/achievements/user`, {
        params: {
          guildId: interaction.guildId,
          userId: interaction.user.id,
          page,
          limit: 6
        },
        headers: { "x-api-key": apiKey }
      });
      const payload = res.data || {};
      if (!payload.enabled) {
        return interaction.reply({ content: ui.disabled, flags: MessageFlags.Ephemeral });
      }
      const rows = Array.isArray(payload.achievements) ? payload.achievements : [];
      if (!rows.length) {
        return interaction.reply({ content: ui.empty, flags: MessageFlags.Ephemeral });
      }

      const lines = rows.map((item) => {
        const icon = achievementStatusIcon(item.status);
        const status = achievementStatusLabel(item.status, ui);
        if (item.type === "tier") {
          const tiers = Array.isArray(item.tiers) ? item.tiers : [];
          const done = tiers.filter((tier) => tier.completed).length;
          const total = tiers.length;
          const percent = Number(item.progress?.percent || 0);
          return `${icon} **${item.title}** (${ui.tier})\n${ui.progress}: ${percent}% • ${done}/${total} ${ui.tiersDone} • ${status}`;
        }
        const current = Number(item.progress?.current || 0);
        const target = Number(item.progress?.target || 1);
        const percent = Number(item.progress?.percent || 0);
        return `${icon} **${item.title}** (${ui.unique})\n${ui.progress}: ${current}/${target} (${percent}%) • ${status}`;
      });

      const embed = new EmbedBuilder()
        .setTitle(ui.title)
        .setDescription(lines.join("\n\n"))
        .setFooter({
          text: `${ui.page} ${payload.page || page}/${payload.totalPages || 1}`
        })
        .setColor(0x2563eb);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      return interaction.reply({
        content: getAchievementLang(lang).empty,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

const anniversaire = {
  data: new SlashCommandBuilder()
    .setName("anniversaire")
    .setNameLocalizations({
      "en-US": "birthday",
      "es-ES": "cumpleanos"
    })
    .setDescription("Ajouter ou modifier ta date d'anniversaire")
    .setDescriptionLocalizations({
      "en-US": "Add or update your birthday date",
      "es-ES": "Agregar o modificar tu fecha de cumpleanos"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const settingsRes = await axios.get(`${apiBase}/bot/birthdays/settings`, {
        params: { guildId: interaction.guildId },
        headers: { "x-api-key": apiKey }
      });
      if (!settingsRes.data?.settings?.enabled) {
        return interaction.reply({
          content: "Le module anniversaire est desactive sur ce serveur.",
          flags: MessageFlags.Ephemeral
        });
      }

      const selfRes = await axios.get(`${apiBase}/bot/birthdays/self`, {
        params: { guildId: interaction.guildId, userId: interaction.user.id },
        headers: { "x-api-key": apiKey }
      }).catch(() => null);
      const existingBirthDate = String(selfRes?.data?.entry?.birthDate || "").trim();
      if (existingBirthDate) {
        return interaction.reply({
          content:
            "Tu as deja enregistre ta date d'anniversaire. Pour toute correction, contacte un administrateur du serveur.",
          flags: MessageFlags.Ephemeral
        });
      }

      const formatMeta = getBirthdayFormatByLang(lang);
      const modal = new ModalBuilder()
        .setCustomId(`birthday_modal:${formatMeta.format}`)
        .setTitle("Anniversaire (definitif)");
      const input = new TextInputBuilder()
        .setCustomId("birth_date")
        .setLabel(`Date de naissance (${formatMeta.label}) - definitive`)
        .setPlaceholder(`${formatMeta.placeholder} (verifie avant validation)`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
    } catch (error) {
      return interaction.reply({
        content: "Impossible d'ouvrir le formulaire anniversaire.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

const anniversaireList = {
  data: new SlashCommandBuilder()
    .setName("anniversaire-list")
    .setNameLocalizations({
      "en-US": "birthday-list",
      "es-ES": "lista-cumpleanos"
    })
    .setDescription("Afficher les 10 prochains anniversaires")
    .setDescriptionLocalizations({
      "en-US": "Show the next 10 birthdays",
      "es-ES": "Mostrar los proximos 10 cumpleanos"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const res = await axios.get(`${apiBase}/bot/birthdays/upcoming`, {
        params: { guildId: interaction.guildId, limit: 10 },
        headers: { "x-api-key": apiKey }
      });
      const payload = res.data || {};
      if (!payload?.settings?.enabled) {
        return interaction.reply({ content: "Le module anniversaire est desactive sur ce serveur." });
      }
      const rows = Array.isArray(payload.birthdays) ? payload.birthdays : [];
      if (!rows.length) {
        return interaction.reply({ content: "Aucun anniversaire enregistre pour le moment." });
      }
      const showAge = Boolean(payload?.settings?.showAgeInList);
      const lines = rows.map((row, index) => {
        const nextDate = formatBirthdayDateByLang(row?.nextBirthdayDate, lang);
        const agePart = showAge && Number.isFinite(Number(row?.age)) ? ` • ${Number(row.age)} ans` : "";
        const days = Number(row?.daysUntil || 0);
        const when = days <= 0 ? "aujourd'hui" : `dans ${days}j`;
        return `${index + 1}. <@${row.userId}> • ${nextDate}${agePart} • ${when}`;
      });
      const embed = new EmbedBuilder()
        .setTitle("Prochains anniversaires")
        .setDescription(lines.join("\n"))
        .setColor(0xf59e0b);
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      return interaction.reply({ content: "Impossible de recuperer la liste des anniversaires." });
    }
  }
};

const spawnMoney = {
  data: new SlashCommandBuilder()
    .setName("ajouter-argent")
    .setNameLocalizations({
      "en-US": "add-money",
      "es-ES": "agregar-dinero"
    })
    .setDescription("Ajouter de l'argent à un membre (admin / rôle sensible)")
    .setDescriptionLocalizations({
      "en-US": "Add money to a member (admin / sensitive role)",
      "es-ES": "Añadir dinero a un miembro (admin / rol sensible)"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setNameLocalizations({
          "en-US": "user",
          "es-ES": "usuario"
        })
        .setDescription("Membre qui reçoit l'argent")
        .setDescriptionLocalizations({
          "en-US": "Member who receives the money",
          "es-ES": "Miembro que recibe el dinero"
        })
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("montant")
        .setNameLocalizations({
          "en-US": "amount",
          "es-ES": "cantidad"
        })
        .setDescription("Montant à ajouter")
        .setDescriptionLocalizations({
          "en-US": "Amount to add",
          "es-ES": "Cantidad a añadir"
        })
        .setRequired(true)
        .setMinValue(1)
    ),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      const settings = await getBotSettings(interaction.guildId, apiBase, apiKey);
      lang = String(settings?.language || "fr").toLowerCase();
      const tr = (key, vars) => t(lang, key, vars);
      const target =
        interaction.options.getUser("utilisateur") ||
        interaction.options.getUser("user", true);
      const amount = Number(
        interaction.options.getInteger("montant") ??
          interaction.options.getInteger("amount", true)
      );

      if (!(await canUseSensitiveCommand(interaction, settings))) {
        return interaction.reply({
          content: sensitiveCommandDeniedMessage(tr, settings),
          flags: MessageFlags.Ephemeral
        });
      }
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
        return interaction.reply({ content: tr("commands.giveMoneyInvalidAmount"), flags: MessageFlags.Ephemeral });
      }
      if (target.bot) {
        return interaction.reply({ content: tr("commands.giveMoneyBot"), flags: MessageFlags.Ephemeral });
      }

      const res = await axios.post(
        `${apiBase}/bot/economy/add-money`,
        {
          guildId: interaction.guildId,
          userId: target.id,
          amount,
          adminId: interaction.user.id
        },
        { headers: { "x-api-key": apiKey } }
      );
      const payload = res?.data || {};
      const emoji = String(payload.currencyEmoji || "💰");
      const embed = new EmbedBuilder()
        .setTitle(tr("commands.addMoneySuccessTitle"))
        .setDescription(
          tr("commands.addMoneySuccessBody", {
            amount: Number(payload.amount || amount),
            emoji,
            user: `<@${target.id}>`
          })
        )
        .addFields({
          name: tr("commands.giveMoneyRecipientBalance"),
          value: `${Number(payload.balance || 0)} ${emoji}`,
          inline: true
        })
        .setColor(0x38bdf8);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      const reason = String(error?.response?.data?.error || error?.message || "");
      const map = {
        invalid_amount: "commands.giveMoneyInvalidAmount",
        economy_disabled: "commands.giveMoneyEconomyDisabled",
        recipient_max_balance: "commands.giveMoneyRecipientMaxBalance"
      };
      const key = map[reason] || "commands.addMoneyFailed";
      return interaction.reply({ content: t(lang, key), flags: MessageFlags.Ephemeral });
    }
  }
};

const leaderboard = {
  data: new SlashCommandBuilder()
    .setName("classement")
    .setNameLocalizations({
      "en-US": "leaderboard",
      "es-ES": "clasificacion"
    })
    .setDescription("Afficher le classement")
    .setDescriptionLocalizations({
      "en-US": "Show the leaderboard",
      "es-ES": "Mostrar la clasificación"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const res = await axios.get(`${apiBase}/bot/economy/leaderboard`, {
        params: { guildId: interaction.guildId, limit: 10 },
        headers: { "x-api-key": apiKey }
      });

      const list = res.data.leaderboard || [];
      const userUrl = buildUserGuildUrl(interaction.guildId);
      const members = await Promise.all(
        list.map(async (row) => {
          const member = await interaction.guild?.members.fetch(row.userId).catch(() => null);
          return {
            ...row,
            name: member?.displayName || row.userId
          };
        })
      );
      const lines = members
        .map((row) => {
          const label = userUrl ? `[${row.name}](${userUrl})` : row.name;
          return `#${row.rank} ${label} — ${row.balance}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(tr("leaderboard.title"))
        .setDescription(lines || tr("common.noData"))
        .setColor(0x2563eb);

      return interaction.reply({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: t(lang, "leaderboard.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

const jeux = {
  data: new SlashCommandBuilder()
    .setName("jeux")
    .setNameLocalizations({
      "en-US": "games",
      "es-ES": "juegos"
    })
    .setDescription("Mini-jeux de paris")
    .setDescriptionLocalizations({
      "en-US": "Betting mini-games",
      "es-ES": "Minijuegos de apuestas"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const settingsRes = await axios.get(`${apiBase}/bot/games/settings`, {
        params: { guildId: interaction.guildId },
        headers: { "x-api-key": apiKey }
      });
      const settings = settingsRes.data?.settings || {};
      const gameIds = ["flip", "dice", "slot", "roulette", "higherLower", "crash", "double", "mystery"];
      const isGlobalEnabled = settings.enabled !== false;
      const isGameEnabled = (gameId) => isGlobalEnabled && settings?.[gameId]?.enabled !== false;
      const hasAnyEnabled = gameIds.some(isGameEnabled);

      const embed = new EmbedBuilder()
        .setTitle(tr("games.title"))
        .setDescription(
          settings.enabled === false || !hasAnyEnabled
            ? tr("games.disabled")
            : tr("games.choose")
        )
        .addFields(
          { name: tr("games.minBet"), value: String(settings.minBet ?? 0), inline: true },
          { name: tr("games.maxBet"), value: String(settings.maxBet ?? 0), inline: true },
          { name: tr("games.cooldown"), value: `${settings.cooldownSeconds ?? 0}s`, inline: true }
        )
        .setColor(0x2563eb);

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("game_open:flip")
          .setLabel(tr("games.labels.flip"))
          .setEmoji("🪙")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("flip")),
        new ButtonBuilder()
          .setCustomId("game_open:dice")
          .setLabel(tr("games.labels.dice"))
          .setEmoji("🎲")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("dice")),
        new ButtonBuilder()
          .setCustomId("game_open:slot")
          .setLabel(tr("games.labels.slot"))
          .setEmoji("🎰")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("slot")),
        new ButtonBuilder()
          .setCustomId("game_open:roulette")
          .setLabel(tr("games.labels.roulette"))
          .setEmoji("🎯")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("roulette"))
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("game_open:higherLower")
          .setLabel(tr("games.labels.higherLower"))
          .setEmoji("⬆️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("higherLower")),
        new ButtonBuilder()
          .setCustomId("game_open:crash")
          .setLabel(tr("games.labels.crash"))
          .setEmoji("💥")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("crash")),
        new ButtonBuilder()
          .setCustomId("game_open:double")
          .setLabel(tr("games.labels.double"))
          .setEmoji("🔁")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("double")),
        new ButtonBuilder()
          .setCustomId("game_open:mystery")
          .setLabel(tr("games.labels.mystery"))
          .setEmoji("🎁")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!isGameEnabled("mystery"))
      );
      const components = [row1, row2];
      await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
      scheduleInteractionTimeout({
        interaction,
        components,
        message: tr("games.timeout")
      });
      return;
    } catch (error) {
      return interaction.reply({ content: t(lang, "games.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

const inventaire = {
  data: new SlashCommandBuilder()
    .setName("inventaire")
    .setNameLocalizations({
      "en-US": "inventory",
      "es-ES": "inventario"
    })
    .setDescription("Afficher votre inventaire")
    .setDescriptionLocalizations({
      "en-US": "Show your inventory",
      "es-ES": "Mostrar tu inventario"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const res = await axios.get(`${apiBase}/bot/inventory`, {
        params: { guildId: interaction.guildId, userId: interaction.user.id },
        headers: { "x-api-key": apiKey }
      });
      const items = res.data?.items || [];
      const lines = items.length
        ? items.map((item) => `• ${item.name} × ${item.quantity}`).join("\n")
        : tr("inventory.empty");

      const embed = new EmbedBuilder()
        .setTitle(tr("inventory.title"))
        .setDescription(lines)
        .setColor(0x2563eb);

      const components = [];
      const lootboxes = items.filter((item) => item.type === "lootbox");
      if (lootboxes.length) {
        const options = lootboxes.slice(0, 25).map((item) => ({
          label: item.name || tr("inventory.lootboxFallback"),
          value: String(item.item_id),
          description: `x${item.quantity}`
        }));
        const select = new StringSelectMenuBuilder()
          .setCustomId("lootbox_open_select")
          .setPlaceholder(tr("inventory.openLootbox"))
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(options);
        components.push(new ActionRowBuilder().addComponents(select));
      }

      const usable = items.filter((item) => item.type === "role" || item.type === "temp_role");
      if (usable.length) {
        const options = usable.slice(0, 25).map((item) => ({
          label: item.name || tr("inventory.itemFallback"),
          value: String(item.item_id),
          description: `x${item.quantity}`
        }));
        const select = new StringSelectMenuBuilder()
          .setCustomId("inventory_use_select")
          .setPlaceholder(tr("inventory.useSelect"))
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(options);
        components.push(new ActionRowBuilder().addComponents(select));
      }

      await interaction.reply({ embeds: [embed], components });
      if (components.length) {
        scheduleInteractionTimeout({
          interaction,
          components,
          message: tr("inventory.timeout")
        });
      }
      return;
    } catch (error) {
      return interaction.reply({ content: t(lang, "inventory.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

const vente = {
  data: new SlashCommandBuilder()
    .setName("vente")
    .setNameLocalizations({
      "en-US": "sale",
      "es-ES": "venta"
    })
    .setDescription("Vendre ou acheter des objets")
    .setDescriptionLocalizations({
      "en-US": "Sell or buy items",
      "es-ES": "Vender o comprar artículos"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const [inventoryRes, salesRes] = await Promise.all([
        axios.get(`${apiBase}/bot/inventory`, {
          params: { guildId: interaction.guildId, userId: interaction.user.id },
          headers: { "x-api-key": apiKey }
        }),
        axios.get(`${apiBase}/bot/inventory/sales`, {
          params: { guildId: interaction.guildId },
          headers: { "x-api-key": apiKey }
        })
      ]);

      const inventory = inventoryRes.data?.items || [];
      const sales = salesRes.data?.sales || [];

      const sellable = inventory.filter((item) => item.type === "inventory");
      const inventoryLines = sellable.length
        ? sellable.map((item) => `• ${item.name} × ${item.quantity}`).join("\n")
        : tr("sale.noneToSell");
      const sellerIds = sales.map((sale) => sale.seller_discord_id);
      const sellerNames = sales.length ? await resolveDisplayNames(interaction.guild, sellerIds) : {};
      const salesLines = sales.length
        ? sales
            .map((sale) => {
              const sellerName = sellerNames[String(sale.seller_discord_id)] || sale.seller_discord_id;
              return `• ${sale.name} ×${sale.quantity || 1} — ${sale.price} 💰 (vendu par ${sellerName})`;
            })
            .join("\n")
        : tr("sale.noneForSale");

      const embed = new EmbedBuilder()
        .setTitle(tr("sale.title"))
        .addFields(
          { name: tr("sale.inventoryTitle"), value: inventoryLines, inline: false },
          { name: tr("sale.salesTitle"), value: salesLines, inline: false }
        )
        .setColor(0x7c3aed);

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("sale_mode:buy").setLabel(tr("sale.buy")).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("sale_mode:sell").setLabel(tr("sale.sell")).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sale_cancel").setLabel(tr("sale.cancel")).setStyle(ButtonStyle.Secondary)
      );

      const components = [actionRow];
      await interaction.reply({ embeds: [embed], components });
      scheduleInteractionTimeout({
        interaction,
        components,
        message: tr("sale.timeout")
      });
      return;
    } catch (error) {
      return interaction.reply({ content: t(lang, "sale.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

const vote = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setNameLocalizations({
      "en-US": "vote",
      "es-ES": "votar"
    })
    .setDescription("Voter pour EcoBoty sur Top.gg et récupérer la récompense")
    .setDescriptionLocalizations({
      "en-US": "Vote for EcoBoty on Top.gg and claim your reward",
      "es-ES": "Vota por EcoBoty en Top.gg y reclama tu recompensa"
    })
    .addSubcommand((sub) =>
      sub
        .setName("link")
        .setNameLocalizations({ "en-US": "link", "es-ES": "enlace" })
        .setDescription("Ouvre le lien de vote Top.gg")
        .setDescriptionLocalizations({
          "en-US": "Open the Top.gg vote link",
          "es-ES": "Abre el enlace de voto de Top.gg"
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName("claim")
        .setNameLocalizations({ "en-US": "claim", "es-ES": "reclamar" })
        .setDescription("Récupérer la récompense après avoir voté")
        .setDescriptionLocalizations({
          "en-US": "Claim your reward after voting",
          "es-ES": "Reclama tu recompensa después de votar"
        })
    ),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const sub = interaction.options.getSubcommand(false) || "link";

      if (sub === "link") {
        const statusRes = await axios.get(`${apiBase}/bot/topgg/status`, {
          params: { userId: interaction.user.id },
          headers: { "x-api-key": apiKey }
        });
        const votePageUrl = statusRes.data?.votePageUrl || "https://top.gg/fr/bot/1465377603090383161";
        const rewardAmount = Number(statusRes.data?.rewardAmount || 0);
        const hasClaimable = Boolean(statusRes.data?.hasClaimable);
        const embed = new EmbedBuilder()
          .setTitle(tr("vote.linkTitle"))
          .setDescription(tr("vote.linkBody", { url: votePageUrl }))
          .addFields(
            {
              name: tr("vote.reward"),
              value: String(rewardAmount),
              inline: true
            },
            {
              name: tr("vote.status"),
              value: hasClaimable ? tr("vote.statusClaimable") : tr("vote.statusNeedVote"),
              inline: true
            }
          )
          .setColor(0xff3366);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel(tr("vote.openButton")).setStyle(ButtonStyle.Link).setURL(votePageUrl)
        );
        return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      }

      const claimRes = await axios.post(
        `${apiBase}/bot/topgg/claim`,
        { guildId: interaction.guildId, userId: interaction.user.id },
        { headers: { "x-api-key": apiKey } }
      );
      const data = claimRes.data || {};
      const votePageUrl = data.votePageUrl || "https://top.gg/fr/bot/1465377603090383161";
      const emoji = data.emoji || "💰";

      if (!data.ok) {
        const reason = String(data.reason || "error");
        const titleKey =
          reason === "already_claimed"
            ? "vote.alreadyTitle"
            : reason === "expired"
              ? "vote.expiredTitle"
              : reason === "disabled"
                ? "vote.disabledTitle"
                : "vote.needTitle";
        const bodyKey =
          reason === "already_claimed"
            ? "vote.alreadyBody"
            : reason === "expired"
              ? "vote.expiredBody"
              : reason === "disabled"
                ? "vote.disabledBody"
                : "vote.needBody";
        const embed = new EmbedBuilder()
          .setTitle(tr(titleKey))
          .setDescription(tr(bodyKey, { url: votePageUrl }))
          .setColor(0xf59e0b);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel(tr("vote.openButton")).setStyle(ButtonStyle.Link).setURL(votePageUrl)
        );
        return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setTitle(tr("vote.claimedTitle"))
        .setDescription(tr("vote.claimedBody", { amount: data.amount, emoji }))
        .addFields(
          { name: tr("vote.weight"), value: String(data.weight || 1), inline: true },
          { name: tr("vote.balance"), value: `${data.balance ?? 0} ${emoji}`, inline: true }
        )
        .setColor(0x22c55e);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      return interaction.reply({ content: t(lang, "vote.error"), flags: MessageFlags.Ephemeral });
    }
  }
};

export const commands = [
  daily,
  shop,
  buy,
  succes,
  anniversaire,
  anniversaireList,
  spawnMoney,
  leaderboard,
  jeux,
  inventaire,
  vente,
  vote
];
