import { Router } from "express";
import { requireNotBannedByShop } from "../middleware/ban.js";
import {
  listShops,
  createShop,
  updateShop,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  deleteShop
} from "../services/shop.js";

export const shopRouter = Router();

shopRouter.use("/shops/:id", requireNotBannedByShop);

shopRouter.get("/guilds/:id/shops", async (req, res) => {
  try {
    const shops = await listShops(req.params.id);
    res.json({ shops });
  } catch (error) {
    res.status(400).json({ error: error.message || "shops_failed" });
  }
});

shopRouter.post("/guilds/:id/shops", async (req, res) => {
  try {
    const shop = await createShop(req.params.id, req.body || {});
    res.json({ shop });
  } catch (error) {
    res.status(400).json({ error: error.message || "shop_create_failed" });
  }
});

shopRouter.put("/guilds/:id/shops/:shopId", async (req, res) => {
  try {
    const shop = await updateShop(req.params.id, req.params.shopId, req.body || {});
    res.json({ shop });
  } catch (error) {
    res.status(400).json({ error: error.message || "shop_update_failed" });
  }
});

shopRouter.delete("/guilds/:id/shops/:shopId", async (req, res) => {
  try {
    await deleteShop(req.params.id, req.params.shopId);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message || "shop_delete_failed" });
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
    res.status(400).json({ error: error.message || "items_failed" });
  }
});

shopRouter.post("/shops/:id/items", async (req, res) => {
  try {
    const item = await createItem(req.params.id, req.body || {});
    res.json({ item });
  } catch (error) {
    res.status(400).json({ error: error.message || "item_create_failed" });
  }
});

shopRouter.put("/shops/:id/items/:itemId", async (req, res) => {
  try {
    const item = await updateItem(req.params.id, req.params.itemId, req.body || {});
    res.json({ item });
  } catch (error) {
    res.status(400).json({ error: error.message || "item_update_failed" });
  }
});

shopRouter.delete("/shops/:id/items/:itemId", async (req, res) => {
  try {
    const purgeRewards = ["1", "true", "yes"].includes(String(req.query.purgeRewards || "").toLowerCase());
    await deleteItem(req.params.id, req.params.itemId, { purgeRewards });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message || "item_delete_failed" });
  }
});
