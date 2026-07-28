import express from "express";
import crypto from "crypto";
import { handleEventSubNotification } from "../services/twitchEventSub.js";

const router = express.Router();

const getSignature = (req) => String(req.headers["twitch-eventsub-message-signature"] || "");
const getMessageId = (req) => String(req.headers["twitch-eventsub-message-id"] || "");
const getTimestamp = (req) => String(req.headers["twitch-eventsub-message-timestamp"] || "");
const getMessageType = (req) => String(req.headers["twitch-eventsub-message-type"] || "");

const verifySignature = (req, secret) => {
  const messageId = getMessageId(req);
  const timestamp = getTimestamp(req);
  const signature = getSignature(req);
  if (!messageId || !timestamp || !signature) return false;
  const rawBody = req.rawBody || "";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(messageId + timestamp + rawBody);
  const digest = `sha256=${hmac.digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
};

router.post("/eventsub", async (req, res) => {
  const secret = process.env.TWITCH_EVENTSUB_SECRET || "";
  if (!secret) return res.status(500).send("Missing TWITCH_EVENTSUB_SECRET");
  if (!verifySignature(req, secret)) return res.status(403).send("Invalid signature");

  const messageType = getMessageType(req);
  if (messageType === "webhook_callback_verification") {
    return res.status(200).send(req.body?.challenge || "");
  }

  if (messageType === "notification") {
    await handleEventSubNotification(req.body || {}, {
      messageId: getMessageId(req)
    });
    return res.sendStatus(204);
  }

  return res.sendStatus(204);
});

export { router as twitchEventSubRouter };
