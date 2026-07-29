import { Router } from "express";
import { requireNotBannedByShop } from "../middleware/ban.js";
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
  return res.status(400).json({ error: error.message || fallback });
};

const resolveShopAccessOptions = async (req) => {
  const bypassPremiumLocks = await isPlatformAdminId(req.user?.discord_id || req.user?.id);
  return { bypassPremiumLocks };
};

shopRouter.use("/shops/:id", requireNotBannedByShop);

shopRouter.get("/guilds/:id/user-shops/settings", async (req, res) => {
  try {
    const settings = await getUserShopsSettings(req.params.id);
    return res.json({ settings });
  } catch (error) {
    return sendShopError(res, error, "user_shops_settings_failed");
  }
});

shopRouter.put("/guilds/:id/user-shops/settings", async (req, res) => {
  try {
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
    const access = await resolveShopAccessOptions(req);
    const shops = await listShops(req.params.id, access);
    res.json({ shops });
  } catch (error) {
    sendShopError(res, error, "shops_failed");
  }
});

shopRouter.post("/guilds/:id/shops", async (req, res) => {
  try {
    const access = await resolveShopAccessOptions(req);
    const shop = await createShop(req.params.id, req.body || {}, access);
    res.json({ shop });
  } catch (error) {
    sendShopError(res, error, "shop_create_failed");
  }
});

shopRouter.put("/guilds/:id/shops/:shopId", async (req, res) => {
  try {
    const access = await resolveShopAccessOptions(req);
    const shop = await updateShop(req.params.id, req.params.shopId, req.body || {}, access);
    res.json({ shop });
  } catch (error) {
    sendShopError(res, error, "shop_update_failed");
  }
});

shopRouter.delete("/guilds/:id/shops/:shopId", async (req, res) => {
  try {
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
      includeUnavailable
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
