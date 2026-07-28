import { Router } from "express";
import {
  constructStripeWebhookEvent,
  handleStripeWebhookEvent
} from "../services/billing-webhook.js";

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post("/", async (req, res) => {
  try {
    const signature = req.get("stripe-signature") || "";
    const rawBody = typeof req.rawBody === "string" ? req.rawBody : "";
    if (!rawBody || !signature) {
      return res.status(400).json({ error: "missing_signature" });
    }

    const event = constructStripeWebhookEvent(rawBody, signature);
    const result = await handleStripeWebhookEvent(event);
    return res.status(200).json(result);
  } catch (error) {
    const status = Number(error?.status || 400);
    if (status >= 500) {
      console.error("[stripe-webhook]", error?.message || error);
    }
    return res.status(status).json({ error: error?.message || "webhook_failed" });
  }
});
