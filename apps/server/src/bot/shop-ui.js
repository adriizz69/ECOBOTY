import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import { t as i18nT } from "./i18n.js";

const PAGE_SIZE = 5;

const computePrice = (item, shop) => {
  const itemPrice = Number(item.price || 0);
  const discount = Number(shop.discount_percent || 0) + Number(item.discount_percent || 0);
  return Math.max(0, Math.floor(itemPrice - (itemPrice * discount) / 100));
};

const short = (value, max) => {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

const safeDescription = (value, max) => short(value || "", max);

const formatPrice = (value) => {
  const num = Number(value || 0);
  if (num >= 1_000_000) return `${Math.round(num / 1_000_00) / 10}M`;
  if (num >= 1_000) return `${Math.round(num / 1_00) / 10}k`;
  return String(num);
};

const parseEmoji = (emoji) => {
  if (!emoji) return null;
  const match = emoji.match(/^<a?:(\w+):(\d+)>$/);
  if (match) return { id: match[2], name: match[1], animated: emoji.startsWith("<a:") };
  return { name: emoji };
};

export const buildShopMessage = ({ shop, items, balance = null, page = 1, lang = "fr" }) => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const displayItems = items.slice(start, start + PAGE_SIZE);

  const embeds = [];
  const components = [];

  if (!displayItems.length) {
    const empty = new EmbedBuilder()
      .setTitle(i18nT(lang, "shopUi.emptyTitle"))
      .setDescription(i18nT(lang, "shopUi.emptyText"))
      .setColor(0x111827);
    embeds.push(empty);
    return { embeds, components, page: safePage, totalPages };
  }

  displayItems.forEach((item, index) => {
    const price = computePrice(item, shop);
    const stock = item.stock === null || item.stock === undefined ? null : item.stock;
    const qtyLine =
      stock === null ? "" : `${i18nT(lang, "shopUi.qtyRemaining", { count: stock })}\n`;
    const desc = item.description ? `${safeDescription(item.description, 800)}` : "";
    const title = short(item.name, 120) || i18nT(lang, "shopUi.itemFallback");

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${qtyLine}${desc}${desc ? "\n" : ""}${i18nT(lang, "shopUi.priceLabel", { price })}`)
      .setColor(0x111827);

    embeds.push(embed);

    const canBuy = balance === null ? true : balance >= price;
    const style =
      index % 4 === 0
        ? ButtonStyle.Primary
        : index % 4 === 1
        ? ButtonStyle.Success
        : index % 4 === 2
        ? ButtonStyle.Secondary
        : ButtonStyle.Danger;
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy:${item.id}`)
          .setLabel(i18nT(lang, "shopUi.buyButton", { price }))
          .setStyle(style)
          .setDisabled(!canBuy)
      )
    );
  });

  return { embeds, components, page: safePage, totalPages };
};

export const buildShopContainerMessage = ({
  shop,
  items,
  shops = [],
  allowedShopIds = [],
  balance = null,
  currencyEmoji = "💰",
  page = 1,
  lang = "fr"
}) => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const displayItems = items.slice(start, start + PAGE_SIZE);

  const containerComponents = [];

  if (shop?.image_url) {
    containerComponents.push({
      type: 12,
      items: [{ media: { url: shop.image_url } }]
    });
  }

  if (shop?.name) {
    containerComponents.push({
      type: 10,
      content: `# **${short(shop.name, 120)}**`
    });
  }

  if (shop?.description) {
    containerComponents.push({
      type: 10,
      content: safeDescription(shop.description, 3500)
    });
  }

  containerComponents.push({ type: 14 });

  displayItems.forEach((item) => {
    const price = computePrice(item, shop);
    const stock = item.stock === null || item.stock === undefined ? null : item.stock;
    const qtyLine =
      stock === null ? "" : `${i18nT(lang, "shopUi.qtyRemaining", { count: stock })}\n`;
    const desc = item.description ? `${safeDescription(item.description, 800)}` : "";
    const title = short(item.name, 120) || i18nT(lang, "shopUi.itemFallback");
    const canBuy = balance === null ? true : balance >= price;
    const priceLabel = formatPrice(price);
    const buttonEmoji = parseEmoji(currencyEmoji);

    containerComponents.push({
      type: 9,
      components: [
        {
          type: 10,
          content: `## **${title}**\n${qtyLine}${desc}`
        }
      ],
      accessory: {
        type: 2,
        style: 1,
        custom_id: `buy:${item.id}`,
        label: i18nT(lang, "shopUi.buyButton", { price: priceLabel }),
        disabled: !canBuy,
        ...(buttonEmoji ? { emoji: buttonEmoji } : {})
      }
    });
  });

  containerComponents.push({ type: 14 });

  if (balance !== null) {
    containerComponents.push({
      type: 10,
      content: `│ ${i18nT(lang, "shopUi.balanceLabel", { emoji: currencyEmoji, balance: formatPrice(balance) })}`
    });
  }

  const components = [{ type: 17, components: containerComponents }];

  const actionRows = [];

  if (totalPages > 1) {
    actionRows.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          custom_id: `shop_page:${shop.id}:${safePage - 1}`,
          label: "◀",
          disabled: safePage <= 1
        },
        {
          type: 2,
          style: 2,
          custom_id: `shop_page:${shop.id}:${safePage + 1}`,
          label: "▶",
          disabled: safePage >= totalPages
        }
      ]
    });
  }

  if (shops.length) {
    const allowedSet = new Set((allowedShopIds || []).map((id) => String(id)));
    actionRows.push({
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "shop_select",
          placeholder: i18nT(lang, "shopUi.selectShopPlaceholder"),
          options: shops.slice(0, 25).map((s) => {
            const allowed = allowedSet.size ? allowedSet.has(String(s.id)) : !s.locked;
            const labelBase = short(s.name, 75) || i18nT(lang, "shopUi.shopFallback");
            return {
              label: allowed ? labelBase : `${labelBase} 🔒`,
              value: String(s.id),
              ...(allowed ? {} : { description: i18nT(lang, "shopUi.rolesRequired") })
            };
          })
        }
      ]
    });
  }

  return {
    components: [...components, ...actionRows],
    page: safePage,
    totalPages
  };
};

export const disableComponentsV2 = (components = []) => {
  const clone = JSON.parse(JSON.stringify(components));

  const disableItem = (item) => {
    if (item.type === 2 || item.type === 3) {
      item.disabled = true;
    }
    if (item.type === 9 && item.accessory && item.accessory.type === 2) {
      item.accessory.disabled = true;
    }
    if (Array.isArray(item.components)) {
      item.components.forEach(disableItem);
    }
  };
  clone.forEach(disableItem);
  return clone;
};
