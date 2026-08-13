import { createPublicKey, verify } from "node:crypto";
import { Router } from "express";
import { clearUserTwitchLink } from "../services/discord-twitch-link.js";
import { db } from "../services/db.js";

export const discordWebhookRouter = Router();

const getDiscordPublicKey = () => String(process.env.DISCORD_PUBLIC_KEY || "").trim();

/**
 * Verify Discord Interactions / Event Webhooks Ed25519 signature.
 * @see https://discord.com/developers/docs/interactions/overview#security-and-authorization
 */
export const verifyDiscordWebhookSignature = (publicKeyHex, signatureHex, timestamp, rawBody) => {
  const keyHex = String(publicKeyHex || "").trim();
  const sigHex = String(signatureHex || "").trim();
  const ts = String(timestamp || "");
  const body = typeof rawBody === "string" ? rawBody : "";
  if (!keyHex || !sigHex || !ts) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(keyHex, "hex")
      ]),
      format: "der",
      type: "spki"
    });
    return verify(null, Buffer.from(ts + body), key, Buffer.from(sigHex, "hex"));
  } catch {
    return false;
  }
};

discordWebhookRouter.post("/", async (req, res) => {
  const publicKey = getDiscordPublicKey();
  if (!publicKey) {
    console.warn("[discord-webhook] DISCORD_PUBLIC_KEY missing");
    return res.status(503).json({ error: "discord_webhook_not_configured" });
  }

  const signature = req.get("x-signature-ed25519") || "";
  const timestamp = req.get("x-signature-timestamp") || "";
  const rawBody = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body || {});

  if (!verifyDiscordWebhookSignature(publicKey, signature, timestamp, rawBody)) {
    return res.status(401).json({ error: "invalid_signature" });
  }

  const payload = req.body || {};
  const type = Number(payload.type);

  // PING — Discord verifies the endpoint
  if (type === 0) {
    return res.status(204).end();
  }

  // Event
  if (type === 1) {
    const eventType = String(payload.event?.type || "").trim();
    try {
      if (eventType === "APPLICATION_DEAUTHORIZED") {
        const userId = String(payload.event?.data?.user?.id || "").replace(/\D/g, "");
        if (userId) {
          await clearUserTwitchLink(userId, { reason: "discord_application_deauthorized" });
          try {
            await db("user_oauth_state").where({ discord_id: userId }).del();
          } catch {
            // ignore
          }
          console.log("[discord-webhook] APPLICATION_DEAUTHORIZED", { userId });
        }
      }
    } catch (error) {
      console.error("[discord-webhook]", error?.message || error);
      // Still ack so Discord does not disable the endpoint for transient DB errors.
    }
    return res.status(204).end();
  }

  return res.status(204).end();
});
