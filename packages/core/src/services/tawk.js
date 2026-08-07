import crypto from "node:crypto";

export const getTawkApiKey = () => String(process.env.TAWK_API_KEY || "").trim();

export const isTawkSecureModeConfigured = () => Boolean(getTawkApiKey());

/** HMAC-SHA256(userId, apiKey) hex — required by Tawk Secure Mode login(). */
export const buildTawkUserHash = (userId, apiKey = getTawkApiKey()) => {
  const id = String(userId || "").trim();
  const key = String(apiKey || "").trim();
  if (!id || !key) return null;
  return crypto.createHmac("sha256", key).update(id).digest("hex");
};

export const buildTawkLoginPayload = ({ discordId, username } = {}) => {
  const userId = String(discordId || "").trim();
  const name = String(username || "").trim() || (userId ? `Discord ${userId}` : "");
  const hash = buildTawkUserHash(userId);
  if (!userId || !hash) {
    return { enabled: false, userId: null, hash: null, name: null };
  }
  return { enabled: true, userId, hash, name };
};
