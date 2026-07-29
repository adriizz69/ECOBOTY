import { Router } from "express";
import { requireNotBannedByShop } from "../middleware/ban.js";
import { assertUserCanManageGuild } from "../services/billing-guild-access.js";
import { isPlatformAdminId } from "../services/platform-admin.js";
import {
  listShops,
  createShop,
  updateShop,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  deleteShop,
  getUserShopsSettings,
  saveUserShopsSettings,
  listUserShops,
  deleteUserShop,
  deleteUserShopItem
} from "../services/shop.js";

export const shopRouter = Router();

const sendShopError = (res, error, fallback) => {
  const status = Number(error?.status || 400);
  return res.status(status).json({ error: error.message || fallback });
};

const requireGuildManageAccess = async (req, guildDiscordId) => {
  await assertUserCanManageGuild({
    accessToken: req.user?.access_token,
    guildDiscordId,
    discordId: req.user?.discord_id || req.user?.id
  });
};

shopRouter.use("/shops/:id", requireNotBannedByShop);

shopRouter.get("/guilds/:id/user-shops/settings", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    const settings = await getUserShopsSettings(req.params.id);
    return res.json({ settings });
  } catch (error) {
    return sendShopError(res, error, "user_shops_settings_failed");
  }
});

shopRouter.put("/guilds/:id/user-shops/settings", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    const body = req.body || {};
    const settings = await saveUserShopsSettings(req.params.id, {
      enabled: body.enabled,
      allowedTypes: body.allowedTypes ?? body.allowed_types
    });
    return res.json({ settings });
  } catch (error) {
    return sendShopError(res, error, "user_shops_settings_save_failed");
  }
});

shopRouter.get("/guilds/:id/user-shops", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    const shops = await listUserShops(req.params.id, { enabledOnly: false });
    const withItems = await Promise.all(
      (shops || []).map(async (shop) => {
        const items = await listItems(shop.id, {
          includeHidden: true,
          includeUnavailable: true,
          enforceShopAccess: false
        });
        return { ...shop, items };
      })
    );
    return res.json({ shops: withItems });
  } catch (error) {
    return sendShopError(res, error, "user_shops_failed");
  }
});

shopRouter.delete("/guilds/:id/user-shops/:shopId", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    await deleteUserShop({
      guildId: req.params.id,
      shopId: req.params.shopId,
      asAdmin: true
    });
    return res.json({ ok: true });
  } catch (error) {
    return sendShopError(res, error, "user_shop_delete_failed");
  }
});

shopRouter.delete("/guilds/:id/user-shops/:shopId/items/:itemId", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    await deleteUserShopItem({
      guildId: req.params.id,
      shopId: req.params.shopId,
      itemId: req.params.itemId,
      asAdmin: true
    });
    return res.json({ ok: true });
  } catch (error) {
    return sendShopError(res, error, "user_shop_item_delete_failed");
  }
});

shopRouter.get("/guilds/:id/shops", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    // Managers always get the full server-shop catalog (no premium hide).
    const shops = await listShops(req.params.id, { bypassPremiumLocks: true });
    res.json({ shops });
  } catch (error) {
    sendShopError(res, error, "shops_failed");
  }
});

shopRouter.post("/guilds/:id/shops", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    const platformAdmin = await isPlatformAdminId(req.user?.discord_id || req.user?.id);
    const shop = await createShop(req.params.id, req.body || {}, {
      // Only platform admins may create beyond the guild plan limit.
      bypassPremiumLocks: platformAdmin
    });
    res.json({ shop });
  } catch (error) {
    sendShopError(res, error, "shop_create_failed");
  }
});

shopRouter.put("/guilds/:id/shops/:shopId", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    const shop = await updateShop(req.params.id, req.params.shopId, req.body || {}, {
      bypassPremiumLocks: true
    });
    res.json({ shop });
  } catch (error) {
    sendShopError(res, error, "shop_update_failed");
  }
});

shopRouter.delete("/guilds/:id/shops/:shopId", async (req, res) => {
  try {
    await requireGuildManageAccess(req, req.params.id);
    await deleteShop(req.params.id, req.params.shopId);
    res.json({ ok: true });
  } catch (error) {
    sendShopError(res, error, "shop_delete_failed");
  }
});

shopRouter.get("/shops/:id/items", async (req, res) => {
  try {
    const includeHidden = ["1", "true", "yes"].includes(String(req.query.includeHidden || "").toLowerCase());
    const withInventory = ["1", "true", "yes"].includes(String(req.query.withInventory || "").toLowerCase());
    const includeUnavailable = ["1", "true", "yes"].includes(
      String(req.query.includeUnavailable || "").toLowerCase()
    );
    const items = await listItems(req.params.id, {
      includeHidden: includeHidden || withInventory,
      withInventoryCounts: withInventory,
      includeUnavailable,
      enforceShopAccess: false,
      bypassPremiumLocks: true
    });
    res.json({ items });
  } catch (error) {
    sendShopError(res, error, "items_failed");
  }
});

shopRouter.post("/shops/:id/items", async (req, res) => {
  try {
    const item = await createItem(req.params.id, req.body || {});
    res.json({ item });
  } catch (error) {
    sendShopError(res, error, "item_create_failed");
  }
});

shopRouter.put("/shops/:id/items/:itemId", async (req, res) => {
  try {
    const item = await updateItem(req.params.id, req.params.itemId, req.body || {});
    res.json({ item });
  } catch (error) {
    sendShopError(res, error, "item_update_failed");
  }
});

shopRouter.delete("/shops/:id/items/:itemId", async (req, res) => {
  try {
    const purgeRewards = ["1", "true", "yes"].includes(String(req.query.purgeRewards || "").toLowerCase());
    await deleteItem(req.params.id, req.params.itemId, { purgeRewards });
    res.json({ ok: true });
  } catch (error) {
    sendShopError(res, error, "item_delete_failed");
  }
});
