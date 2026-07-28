import { Router } from "express";
import {
  getBillingPublicCatalog,
  getBillingPublicStatus
} from "../services/billing-guild-access.js";

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
