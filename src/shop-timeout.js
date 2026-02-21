import { disableComponentsV2 } from "./shop-ui.js";
import { updateInteractionMessageV2, sendWebhookMessageV2 } from "./discord-rest.js";
import { t } from "./i18n.js";

const timeouts = new Map();

const keyForShop = (interaction) => `${interaction.guildId}:${interaction.user.id}:shop`;

export const scheduleInteractionTimeout = ({
  interaction,
  components,
  timeoutMs = 10 * 60 * 1000,
  message,
  key
}) => {
  const timeoutKey = key || interaction.token;
  const existing = timeouts.get(timeoutKey);
  if (existing) clearTimeout(existing);

  const token = interaction.token;
  const applicationId = interaction.applicationId;
  const disabledComponents = disableComponentsV2(components);

  const handle = setTimeout(async () => {
    try {
      await updateInteractionMessageV2({
        applicationId,
        interactionToken: token,
        payload: { components: disabledComponents }
      });
      if (message) {
        await sendWebhookMessageV2({
          applicationId,
          interactionToken: token,
          content: message
        });
      }
    } catch {
      // ignore
    }
  }, timeoutMs);

  timeouts.set(timeoutKey, handle);
};

export const scheduleShopTimeout = ({ interaction, components, timeoutMs = 10 * 60 * 1000, lang = "fr" }) => {
  scheduleInteractionTimeout({
    interaction,
    components,
    timeoutMs,
    key: keyForShop(interaction),
    message: t(lang, "shopTimeout.navigationDone")
  });
};
