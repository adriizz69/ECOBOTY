const API_BASE = "https://discord.com/api/v10";
const COMPONENTS_V2_FLAG = 1 << 15;

export const sendInteractionResponseV2 = async ({ interactionId, interactionToken, payload }) => {
  const body = {
    type: 4,
    data: {
      content: payload.content ?? "",
      components: payload.components ?? [],
      flags: COMPONENTS_V2_FLAG
    }
  };

  const res = await fetch(`${API_BASE}/interactions/${interactionId}/${interactionToken}/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`interaction_callback_failed:${res.status}:${text}`);
  }
};

export const updateInteractionMessageV2 = async ({ applicationId, interactionToken, payload }) => {
  const body = {
    content: payload.content ?? "",
    components: payload.components ?? [],
    flags: COMPONENTS_V2_FLAG
  };

  const res = await fetch(
    `${API_BASE}/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`interaction_update_failed:${res.status}:${text}`);
  }
};

export const sendWebhookMessageV2 = async ({ applicationId, interactionToken, content }) => {
  const body = {
    content: content ?? ""
  };

  const res = await fetch(`${API_BASE}/webhooks/${applicationId}/${interactionToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`webhook_send_failed:${res.status}:${text}`);
  }
};
