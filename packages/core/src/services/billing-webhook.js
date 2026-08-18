import { db } from "./db.js";
import { getStripeClient, isStripeConfigured } from "./stripe-client.js";
import {
  notifyPaymentFailed,
  upsertDowngradeCleanupJob
} from "./billing-cleanup.js";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const normalizeGuildId = (value) => String(value || "").replace(/\D/g, "");

const parseDate = (unixSeconds) => {
  const numeric = Number(unixSeconds || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return new Date(numeric * 1000);
};

const resolveIntervalKeyFromPriceMetadata = (metadata = {}) => {
  const priceKey = String(metadata.ecoboty_price_key || "");
  if (priceKey.includes("yearly")) return "yearly";
  if (priceKey.includes("quarterly")) return "quarterly";
  if (priceKey.includes("monthly")) return "monthly";
  return null;
};

const resolveIntervalKeyFromRecurring = (recurring = null) => {
  if (!recurring) return null;
  const interval = String(recurring.interval || "").toLowerCase();
  const count = Math.max(1, Number(recurring.interval_count || 1));
  if (interval === "year") return "yearly";
  if (interval === "month") {
    if (count >= 12) return "yearly";
    if (count === 3) return "quarterly";
    if (count === 1) return "monthly";
  }
  return null;
};

const resolveIntervalKeyFromMetadataInterval = (metadata = {}) => {
  const raw = String(metadata.ecoboty_interval || "").toLowerCase().trim();
  if (raw === "yearly" || raw === "year" || raw === "annual") return "yearly";
  if (raw === "quarterly" || raw === "quarter") return "quarterly";
  if (raw === "monthly" || raw === "month") return "monthly";
  return null;
};

/** Résout monthly | quarterly | yearly depuis le prix Stripe + métadonnées abo. */
export const resolveSubscriptionIntervalKey = ({ price = null, metadata = {} } = {}) =>
  resolveIntervalKeyFromRecurring(price?.recurring) ||
  resolveIntervalKeyFromPriceMetadata(price?.metadata || {}) ||
  resolveIntervalKeyFromMetadataInterval(metadata) ||
  resolveIntervalKeyFromPriceMetadata(metadata) ||
  null;

const resolveSubscriptionPrice = async (subscription) => {
  let price = subscription?.items?.data?.[0]?.price ?? null;
  if (!price) return null;
  if (typeof price === "object" && price.recurring) return price;
  const priceId = typeof price === "string" ? price : price?.id || null;
  if (!priceId || !isStripeConfigured()) {
    return typeof price === "object" ? price : null;
  }
  try {
    return await getStripeClient().prices.retrieve(String(priceId));
  } catch {
    return typeof price === "object" ? price : null;
  }
};

export const resolveGuildIdFromMetadata = (metadata = {}) =>
  normalizeGuildId(metadata.ecoboty_entity_id || metadata.guild_discord_id);

const ensureSubscriptionGuildMetadata = async (subscription, { guildId, sessionMetadata = {} }) => {
  if (!subscription?.id || !guildId) return subscription;

  const existingGuildId = resolveGuildIdFromMetadata(subscription.metadata || {});
  if (existingGuildId === guildId) return subscription;

  const stripe = getStripeClient();
  return stripe.subscriptions.update(subscription.id, {
    metadata: {
      ...(subscription.metadata || {}),
      ecoboty_plan_key: String(
        sessionMetadata.ecoboty_plan_key || subscription.metadata?.ecoboty_plan_key || "premium"
      ),
      ecoboty_entity_type: "guild",
      ecoboty_entity_id: guildId,
      ...(String(
        sessionMetadata.ecoboty_price_key || subscription.metadata?.ecoboty_price_key || ""
      ).trim()
        ? {
            ecoboty_price_key: String(
              sessionMetadata.ecoboty_price_key || subscription.metadata?.ecoboty_price_key
            )
          }
        : {}),
      ...(String(
        sessionMetadata.ecoboty_interval || subscription.metadata?.ecoboty_interval || ""
      ).trim()
        ? {
            ecoboty_interval: String(
              sessionMetadata.ecoboty_interval || subscription.metadata?.ecoboty_interval
            )
          }
        : {})
    }
  });
};

export const upsertGuildSubscriptionCache = async ({
  guildDiscordId,
  stripeSubscriptionId = null,
  stripePriceId = null,
  planKey = "free",
  status = "free",
  intervalKey = null,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  cancelAtPeriodEnd = false,
  canceledAt = null
}) => {
  const guildId = normalizeGuildId(guildDiscordId);
  if (!guildId) return null;

  const now = new Date();
  const existing = await db("billing_subscriptions").where({ guild_discord_id: guildId }).first();
  const payload = {
    guild_discord_id: guildId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: stripePriceId,
    plan_key: planKey,
    status,
    interval_key: intervalKey,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: Boolean(cancelAtPeriodEnd),
    canceled_at: canceledAt,
    updated_at: now
  };

  if (existing) {
    await db("billing_subscriptions").where({ id: existing.id }).update(payload);
    return db("billing_subscriptions").where({ id: existing.id }).first();
  }

  const [id] = await db("billing_subscriptions").insert({
    ...payload,
    created_at: now
  });
  return db("billing_subscriptions").where({ id }).first();
};

export const syncSubscriptionFromStripeObject = async (subscription) => {
  if (!subscription) return null;

  const metadata = subscription.metadata || {};
  const guildId = resolveGuildIdFromMetadata(metadata);
  if (!guildId) return null;

  const status = String(subscription.status || "free").toLowerCase();
  const price = await resolveSubscriptionPrice(subscription);
  const priceMetadata = price?.metadata || {};
  const planKey = ACTIVE_STATUSES.has(status)
    ? String(metadata.ecoboty_plan_key || priceMetadata.ecoboty_plan_key || "premium")
    : "free";
  const priceId =
    (typeof subscription?.items?.data?.[0]?.price === "string"
      ? subscription.items.data[0].price
      : null) ||
    price?.id ||
    null;

  return upsertGuildSubscriptionCache({
    guildDiscordId: guildId,
    stripeSubscriptionId: subscription.id || null,
    stripePriceId: priceId,
    planKey: ACTIVE_STATUSES.has(status) ? planKey : "free",
    status,
    intervalKey: resolveSubscriptionIntervalKey({ price, metadata }),
    currentPeriodStart: parseDate(subscription.current_period_start),
    currentPeriodEnd: parseDate(subscription.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    canceledAt: parseDate(subscription.canceled_at)
  });
};

export const downgradeGuildPremium = async (guildDiscordId, triggerReason) => {
  const guildId = normalizeGuildId(guildDiscordId);
  if (!guildId) return;

  await upsertGuildSubscriptionCache({
    guildDiscordId: guildId,
    stripeSubscriptionId: null,
    stripePriceId: null,
    planKey: "free",
    status: "canceled",
    intervalKey: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: new Date()
  });
  await upsertDowngradeCleanupJob({
    guildDiscordId: guildId,
    triggerReason
  });
};

const recordBillingEvent = async ({ eventId, eventType, guildDiscordId, payload }) => {
  const existing = await db("billing_event_log").where({ stripe_event_id: eventId }).first();
  if (existing) return { duplicate: true };

  await db("billing_event_log").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    guild_discord_id: guildDiscordId || null,
    payload: payload ? JSON.stringify(payload) : null,
    created_at: new Date()
  });
  return { duplicate: false };
};

export const handleStripeWebhookEvent = async (event) => {
  const eventId = String(event?.id || "");
  const eventType = String(event?.type || "");
  const object = event?.data?.object || null;

  let guildId = null;
  if (object?.metadata) {
    guildId = resolveGuildIdFromMetadata(object.metadata);
  }
  if (!guildId && object?.client_reference_id) {
    guildId = normalizeGuildId(object.client_reference_id);
  }

  const recorded = await recordBillingEvent({
    eventId,
    eventType,
    guildDiscordId: guildId,
    payload: { id: eventId, type: eventType }
  });
  if (recorded.duplicate) {
    return { ok: true, duplicate: true };
  }

  switch (eventType) {
    case "checkout.session.completed": {
      if (object?.subscription && isStripeConfigured()) {
        const stripe = getStripeClient();
        let subscription = await stripe.subscriptions.retrieve(String(object.subscription), {
          expand: ["items.data.price"]
        });
        const checkoutGuildId =
          resolveGuildIdFromMetadata(subscription.metadata) ||
          resolveGuildIdFromMetadata(object.metadata) ||
          normalizeGuildId(object.client_reference_id);
        if (checkoutGuildId) {
          subscription = await ensureSubscriptionGuildMetadata(subscription, {
            guildId: checkoutGuildId,
            sessionMetadata: object.metadata || {}
          });
          await syncSubscriptionFromStripeObject(subscription);
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      let subscriptionObject = object;
      if (eventType !== "customer.subscription.deleted" && object?.id && isStripeConfigured()) {
        try {
          subscriptionObject = await getStripeClient().subscriptions.retrieve(String(object.id), {
            expand: ["items.data.price"]
          });
        } catch {
          subscriptionObject = object;
        }
      }
      await syncSubscriptionFromStripeObject(subscriptionObject);
      if (eventType === "customer.subscription.deleted") {
        const deletedGuildId = resolveGuildIdFromMetadata(object?.metadata || {});
        if (deletedGuildId) {
          await downgradeGuildPremium(deletedGuildId, "subscription_deleted");
        }
      } else {
        const status = String(subscriptionObject?.status || object?.status || "").toLowerCase();
        const updatedGuildId = resolveGuildIdFromMetadata(
          subscriptionObject?.metadata || object?.metadata || {}
        );
        if (updatedGuildId && !ACTIVE_STATUSES.has(status)) {
          await upsertDowngradeCleanupJob({
            guildDiscordId: updatedGuildId,
            triggerReason: `subscription_${status || "inactive"}`
          });
        }
      }
      break;
    }
    case "charge.refunded": {
      if (!isStripeConfigured()) break;

      const charge = object;
      const amount = Number(charge?.amount || 0);
      const amountRefunded = Number(charge?.amount_refunded || 0);
      const isFullRefund = charge?.refunded === true && amount > 0 && amountRefunded >= amount;
      if (!isFullRefund || !charge?.invoice) break;

      const stripe = getStripeClient();
      const invoice = await stripe.invoices.retrieve(String(charge.invoice));
      const subscriptionId = invoice?.subscription ? String(invoice.subscription) : null;
      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"]
      });
      const refundedGuildId = resolveGuildIdFromMetadata(subscription?.metadata || {});
      if (!refundedGuildId) break;

      await syncSubscriptionFromStripeObject(subscription);
      const status = String(subscription?.status || "").toLowerCase();
      if (!ACTIVE_STATUSES.has(status)) {
        await downgradeGuildPremium(refundedGuildId, "charge_refunded_subscription_inactive");
      } else {
        await downgradeGuildPremium(refundedGuildId, "charge_refunded");
      }
      break;
    }
    case "invoice.voided": {
      const subscriptionId = object?.subscription ? String(object.subscription) : null;
      if (!subscriptionId || !isStripeConfigured()) break;

      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"]
      });
      const voidedGuildId = resolveGuildIdFromMetadata(subscription?.metadata || {});
      if (!voidedGuildId) break;

      await syncSubscriptionFromStripeObject(subscription);
      const status = String(subscription?.status || "").toLowerCase();
      if (!ACTIVE_STATUSES.has(status)) {
        await downgradeGuildPremium(voidedGuildId, "invoice_voided");
      }
      break;
    }
    case "invoice.paid": {
      const subscriptionId = object?.subscription ? String(object.subscription) : null;
      if (subscriptionId && isStripeConfigured()) {
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"]
        });
        await syncSubscriptionFromStripeObject(subscription);
      }
      break;
    }
    case "invoice.payment_failed": {
      const subscriptionId = object?.subscription ? String(object.subscription) : null;
      let failedGuildId = guildId;
      if (subscriptionId && isStripeConfigured()) {
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"]
        });
        await syncSubscriptionFromStripeObject(subscription);
        failedGuildId =
          resolveGuildIdFromMetadata(subscription?.metadata || {}) || failedGuildId;
      }
      if (failedGuildId) {
        await notifyPaymentFailed(failedGuildId);
      }
      break;
    }
    default:
      break;
  }

  return { ok: true, type: eventType };
};

export const syncGuildBillingFromStripe = async (guildDiscordId, { payerDiscordId = null } = {}) => {
  const guildId = normalizeGuildId(guildDiscordId);
  if (!guildId || !isStripeConfigured()) {
    return { ok: false, reason: "invalid_params" };
  }

  let account = await db("billing_accounts").where({ guild_discord_id: guildId }).first();
  if (!account?.stripe_customer_id && payerDiscordId) {
    const payerAccount = await db("billing_accounts")
      .where({ payer_discord_id: String(payerDiscordId).trim() })
      .whereNotNull("stripe_customer_id")
      .orderBy("updated_at", "desc")
      .first();

    if (payerAccount?.stripe_customer_id) {
      const now = new Date();
      if (!account) {
        const [id] = await db("billing_accounts").insert({
          guild_discord_id: guildId,
          payer_discord_id: String(payerDiscordId).trim(),
          stripe_customer_id: payerAccount.stripe_customer_id,
          created_at: now,
          updated_at: now
        });
        account = await db("billing_accounts").where({ id }).first();
      } else {
        await db("billing_accounts").where({ id: account.id }).update({
          stripe_customer_id: payerAccount.stripe_customer_id,
          payer_discord_id: String(payerDiscordId).trim(),
          updated_at: now
        });
        account = await db("billing_accounts").where({ id: account.id }).first();
      }
    }
  }

  if (!account?.stripe_customer_id) {
    return { ok: false, reason: "billing_account_not_found" };
  }

  const stripe = getStripeClient();
  const customerId = String(account.stripe_customer_id);

  const subsList = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
    expand: ["data.items.data.price"]
  });

  for (const sub of subsList.data || []) {
    const subGuildId = resolveGuildIdFromMetadata(sub.metadata);
    if (subGuildId === guildId) {
      const synced = await syncSubscriptionFromStripeObject(sub);
      return { ok: true, synced: Boolean(synced), source: "subscription_metadata" };
    }
  }

  const sessions = await stripe.checkout.sessions.list({
    customer: customerId,
    limit: 24
  });

  for (const session of sessions.data || []) {
    const sessionGuildId =
      resolveGuildIdFromMetadata(session.metadata) || normalizeGuildId(session.client_reference_id);
    if (sessionGuildId !== guildId || session.status !== "complete" || !session.subscription) {
      continue;
    }

    let subscription = await stripe.subscriptions.retrieve(String(session.subscription), {
      expand: ["items.data.price"]
    });
    subscription = await ensureSubscriptionGuildMetadata(subscription, {
      guildId,
      sessionMetadata: session.metadata || {}
    });
    const synced = await syncSubscriptionFromStripeObject(subscription);
    return { ok: true, synced: Boolean(synced), source: "checkout_session" };
  }

  const activeSubs = (subsList.data || []).filter((sub) =>
    ACTIVE_STATUSES.has(String(sub.status || "").toLowerCase())
  );
  if (activeSubs.length === 1) {
    const subscription = await ensureSubscriptionGuildMetadata(activeSubs[0], { guildId });
    const synced = await syncSubscriptionFromStripeObject(subscription);
    return { ok: true, synced: Boolean(synced), source: "single_active_subscription" };
  }

  return { ok: false, reason: "subscription_not_found" };
};

export const constructStripeWebhookEvent = (rawBody, signature) => {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    const error = new Error("stripe_webhook_not_configured");
    error.status = 503;
    error.expose = true;
    throw error;
  }
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
};
