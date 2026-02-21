import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import axios from "axios";
import { buildShopContainerMessage } from "../shop-ui.js";
import { sendInteractionResponseV2 } from "../discord-rest.js";
import { scheduleShopTimeout, scheduleInteractionTimeout } from "../shop-timeout.js";
import { resolveDisplayNames } from "../user-resolve.js";
import { getBotLanguage, t } from "../i18n.js";

const getApiConfig = () => ({
  apiBase: process.env.API_BASE || "http://localhost:4000",
  apiKey: process.env.API_SECRET_KEY || ""
});

const getWebBaseUrl = () => String(process.env.BASE_URL || "http://localhost:3000");

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

const memberHasAllRoles = (member, roleIds) =>
  roleIds.every((id) => member.roles.cache.has(id));

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
    .setDescription("Afficher la liste des shops")
    .setDescriptionLocalizations({
      "en-US": "Show the list of shops",
      "es-ES": "Mostrar la lista de tiendas"
    }),
  async execute(interaction) {
    let lang = "fr";
    try {
      const { apiBase, apiKey } = getApiConfig();
      lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
      const tr = (key, vars) => t(lang, key, vars);
      const shopsRes = await axios.get(`${apiBase}/bot/shops`, {
        params: { guildId: interaction.guildId },
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
        const allowed = !roleIds.length || memberHasAllRoles(member, roleIds);
        if (allowed) allowedShopIds.push(String(s.id));
        return allowed;
      });

      if (!available.length) {
        const lines = shops
          .map((s) => {
            const roleIds = parseRequiredRoleIds(s);
            const allowed = !roleIds.length || memberHasAllRoles(member, roleIds);
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

      scheduleShopTimeout({ interaction, components, lang });
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

const addMoney = {
  data: new SlashCommandBuilder()
    .setName("ajouter-argent")
    .setNameLocalizations({
      "en-US": "add-money",
      "es-ES": "agregar-dinero"
    })
    .setDescription("Ajouter de l'argent à un utilisateur")
    .setDescriptionLocalizations({
      "en-US": "Add money to a user",
      "es-ES": "Añadir dinero a un usuario"
    })
    .addUserOption((option) =>
      option
        .setName("user")
        .setNameLocalizations({
          "en-US": "user",
          "es-ES": "usuario"
        })
        .setDescription("Utilisateur")
        .setDescriptionLocalizations({
          "en-US": "User",
          "es-ES": "Usuario"
        })
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setNameLocalizations({
          "en-US": "amount",
          "es-ES": "cantidad"
        })
        .setDescription("Montant")
        .setDescriptionLocalizations({
          "en-US": "Amount",
          "es-ES": "Cantidad"
        })
        .setRequired(true)
    ),
  async execute(interaction) {
    const { apiBase, apiKey } = getApiConfig();
    const lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
    await interaction.reply({ content: t(lang, "commands.addMoneyNotImplemented"), flags: MessageFlags.Ephemeral });
  }
};

const giveaway = {
  data: new SlashCommandBuilder()
    .setName("tirage")
    .setNameLocalizations({
      "en-US": "giveaway",
      "es-ES": "sorteo"
    })
    .setDescription("Distribuer un montant à plusieurs participants")
    .setDescriptionLocalizations({
      "en-US": "Distribute an amount to multiple participants",
      "es-ES": "Distribuir una cantidad entre varios participantes"
    })
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setNameLocalizations({
          "en-US": "amount",
          "es-ES": "cantidad"
        })
        .setDescription("Montant")
        .setDescriptionLocalizations({
          "en-US": "Amount",
          "es-ES": "Cantidad"
        })
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("participants")
        .setNameLocalizations({
          "en-US": "participants",
          "es-ES": "participantes"
        })
        .setDescription("Nombre de participants")
        .setDescriptionLocalizations({
          "en-US": "Number of participants",
          "es-ES": "Número de participantes"
        })
        .setRequired(true)
    ),
  async execute(interaction) {
    const { apiBase, apiKey } = getApiConfig();
    const lang = await getBotLanguage(interaction.guildId, apiBase, apiKey);
    await interaction.reply({ content: t(lang, "commands.giveawayNotImplemented"), flags: MessageFlags.Ephemeral });
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

export const commands = [daily, shop, buy, addMoney, giveaway, leaderboard, jeux, inventaire, vente];
