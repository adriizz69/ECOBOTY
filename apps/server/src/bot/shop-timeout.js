import { disableComponentsV2 } from "./shop-ui.js";
import { updateInteractionMessageV2, sendWebhookMessageV2 } from "./discord-rest.js";
import { t } from "./i18n.js";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
/** guildId:userId -> active shop UI session */
const sessions = new Map();

export const shopSessionKey = (guildId, userId) => `${guildId}:${userId}:shop`;

const keyFor = (interaction) => shopSessionKey(interaction.guildId, interaction.user.id);

const disarmMessage = async (session) => {
  if (!session?.applicationId || !session?.token) return;
  try {
    await updateInteractionMessageV2({
      applicationId: session.applicationId,
      interactionToken: session.token,
      payload: { components: disableComponentsV2(session.components || []) }
    });
  } catch {
    // Message gone / token expired / Components V2 reject — server guard still blocks.
  }
};

const announceDone = async (session) => {
  if (!session?.message || !session?.applicationId || !session?.token) return;
  try {
    await sendWebhookMessageV2({
      applicationId: session.applicationId,
      interactionToken: session.token,
      content: session.message
    });
  } catch {
    // ignore
  }
};

const runShopTimeout = async (key, { announce = true } = {}) => {
  const session = sessions.get(key);
  if (!session) return;
  if (session.handle) clearTimeout(session.handle);
  sessions.delete(key);

  await disarmMessage(session);
  if (announce) await announceDone(session);
};

/**
 * True while the user's /shop UI session is still open (before inactivity timeout).
 * Navigation between shops + purchases stay allowed until this becomes false.
 */
export const hasActiveShopSession = (interaction) => {
  if (!interaction?.guildId || !interaction?.user?.id) return false;
  return sessions.has(keyFor(interaction));
};

/**
 * Keep the shop UI usable until inactivity timeout.
 * Pass replacePrevious on a fresh /shop so an older open message is disarmed.
 * Component updates (select / page / buy) must NOT replacePrevious — same UI, new token.
 */
export const scheduleShopTimeout = ({
  interaction,
  components,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  lang = "fr",
  replacePrevious = false
}) => {
  const key = keyFor(interaction);
  const existing = sessions.get(key);

  if (existing?.handle) clearTimeout(existing.handle);

  if (replacePrevious && existing && existing.token !== interaction.token) {
    void disarmMessage(existing);
  }

  const handle = setTimeout(() => {
    void runShopTimeout(key, { announce: true });
  }, timeoutMs);

  sessions.set(key, {
    handle,
    applicationId: interaction.applicationId,
    token: interaction.token,
    components: components ?? existing?.components ?? [],
    message: t(lang, "shopTimeout.navigationDone"),
    lang,
    expiresAt: Date.now() + timeoutMs
  });
};

/** Extend timeout after shop_select / pagination / buy; keep latest components when provided. */
export const touchShopTimeout = ({ interaction, components, lang, updateMessageToken = false } = {}) => {
  const key = keyFor(interaction);
  const existing = sessions.get(key);
  if (!existing) return false;

  if (existing.handle) clearTimeout(existing.handle);

  const nextLang = lang ?? existing.lang ?? "fr";
  const handle = setTimeout(() => {
    void runShopTimeout(key, { announce: true });
  }, DEFAULT_TIMEOUT_MS);

  // Buy replies are ephemeral on a different token — never replace the shop message token.
  // shop_select / shop_page update the shop message, so their token must be stored.
  sessions.set(key, {
    ...existing,
    handle,
    components: components ?? existing.components,
    lang: nextLang,
    message: t(nextLang, "shopTimeout.navigationDone"),
    expiresAt: Date.now() + DEFAULT_TIMEOUT_MS,
    ...(updateMessageToken
      ? {
          applicationId: interaction.applicationId,
          token: interaction.token
        }
      : {})
  });
  return true;
};

export const clearShopTimeout = (interaction) => {
  const key = keyFor(interaction);
  const session = sessions.get(key);
  if (!session) return;
  if (session.handle) clearTimeout(session.handle);
  sessions.delete(key);
};

export const scheduleInteractionTimeout = ({
  interaction,
  components,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  message,
  key
}) => {
  const timeoutKey = key || interaction.token;
  const existing = sessions.get(timeoutKey);
  if (existing?.handle) clearTimeout(existing.handle);

  const handle = setTimeout(async () => {
    const session = sessions.get(timeoutKey);
    sessions.delete(timeoutKey);
    if (!session) return;
    await disarmMessage(session);
    if (session.message) await announceDone(session);
  }, timeoutMs);

  sessions.set(timeoutKey, {
    handle,
    applicationId: interaction.applicationId,
    token: interaction.token,
    components,
    message: message || null
  });
};
