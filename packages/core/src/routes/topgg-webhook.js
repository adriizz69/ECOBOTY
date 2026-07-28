import { Router } from "express";
import {
  getTopggEnvConfig,
  recordTopggVoteEvent,
  verifyTopggWebhookSignature
} from "../services/topgg.js";

export const topggWebhookRouter = Router();

topggWebhookRouter.post("/", async (req, res) => {
  try {
    const { webhookSecret } = getTopggEnvConfig();
    if (!webhookSecret) {
      return res.status(503).json({ error: "topgg_webhook_not_configured" });
    }

    const rawBody = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body || {});
    const signature = req.get("x-topgg-signature") || "";
    if (!verifyTopggWebhookSignature(rawBody, signature, webhookSecret)) {
      return res.status(401).json({ error: "invalid_signature" });
    }

    const payload = req.body || {};
    const type = String(payload.type || "").trim();

    if (type === "webhook.test") {
      return res.status(200).json({ ok: true, type });
    }

    if (type === "vote.create") {
      const result = await recordTopggVoteEvent(payload);
      return res.status(200).json({ ok: true, created: result.created });
    }

    return res.status(200).json({ ok: true, ignored: true, type: type || null });
  } catch (error) {
    console.error("[topgg-webhook]", error?.message || error);
    return res.status(500).json({ error: "webhook_failed" });
  }
});
