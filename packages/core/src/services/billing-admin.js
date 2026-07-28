import { db } from "./db.js";
import { getPlanByKey } from "./billing-catalog.js";
import { getStripeClient, isStripeConfigured } from "./stripe-client.js";
import {
  downgradeGuildPremium,
  syncGuildBillingFromStripe,
  syncSubscriptionFromStripeObject
} from "./billing-webhook.js";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const MRR_CENTS_BY_INTERVAL = Object.freeze({
  monthly: 499,
  quarterly: Math.round(1347 / 3),
  yearly: Math.round(4790 / 12)
});

const assertStripeReady = () => {
  if (!isStripeConfigured()) {
    const error = new Error("stripe_not_configured");
    error.status = 503;
    error.expose = true;
    throw error;
  }
};

const estimateMrrCents = (subscriptionRow) => {
  if (!subscriptionRow) return 0;
  const status = String(subscriptionRow.status || "").toLowerCase();
  if (!ACTIVE_STATUSES.has(status) || String(subscriptionRow.plan_key || "") !== "premium") {
    return 0;
  }
  const interval = String(subscriptionRow.interval_key || "monthly").toLowerCase();
  return MRR_CENTS_BY_INTERVAL[interval] || MRR_CENTS_BY_INTERVAL.monthly;
};

const formatPromoCode = (promotionCode) => {
  const coupon = promotionCode?.coupon || {};
  const percentOff = coupon.percent_off != null ? Number(coupon.percent_off) : null;
  const amountOff = coupon.amount_off != null ? Number(coupon.amount_off) : null;
  return {
    id: promotionCode.id,
    code: promotionCode.code,
    label: coupon.name || promotionCode.code,
    planKey: promotionCode.metadata?.ecoboty_plan_key || "premium",
    intervalKey: promotionCode.metadata?.ecoboty_interval || null,
    discountType: percentOff != null ? "percent" : "amount",
    value: percentOff != null ? percentOff : amountOff,
    currency: coupon.currency || "eur",
    maxRedemptions: promotionCode.max_redemptions,
    timesRedeemed: promotionCode.times_redeemed || 0,
    active: Boolean(promotionCode.active),
    expiresAt: promotionCode.expires_at
      ? new Date(Number(promotionCode.expires_at) * 1000).toISOString()
      : null,
    createdAt: promotionCode.created
      ? new Date(Number(promotionCode.created) * 1000).toISOString()
      : null
  };
};

export const getBillingDashboardOverview = async () => {
  assertStripeReady();

  const subscriptionRows = await db("billing_subscriptions").select("*");
  const activeSubscriptions = subscriptionRows.filter(
    (row) =>
      ACTIVE_STATUSES.has(String(row.status || "").toLowerCase()) &&
      String(row.plan_key || "") === "premium"
  );

  const mrrCents = activeSubscriptions.reduce((sum, row) => sum + estimateMrrCents(row), 0);

  const totalGuildsRow = await db("guilds").count({ count: "*" }).first();
  const totalGuilds = Number(totalGuildsRow?.count || 0);
  const premiumGuildIds = new Set(activeSubscriptions.map((row) => String(row.guild_discord_id)));

  const planDistribution = subscriptionRows.reduce((acc, row) => {
    const isPremium =
      ACTIVE_STATUSES.has(String(row.status || "").toLowerCase()) &&
      String(row.plan_key || "") === "premium";
    const key = isPremium ? "premium" : "free";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  if (!planDistribution.free) {
    planDistribution.free = Math.max(0, totalGuilds - premiumGuildIds.size);
  }

  const stripe = getStripeClient();
  const [openInvoices, webhookEndpoints, pendingCleanupRow] = await Promise.all([
    stripe.invoices.list({ status: "open", limit: 100 }),
    stripe.webhookEndpoints.list({ limit: 20 }).catch(() => ({ data: [] })),
    db("billing_downgrade_cleanup")
      .where({ status: "pending" })
      .count({ count: "*" })
      .first()
      .catch(() => ({ count: 0 }))
  ]);

  const recentEvents = await db("billing_event_log")
    .select("event_type", "created_at")
    .orderBy("created_at", "desc")
    .limit(200);

  const webhookConfigured = (webhookEndpoints.data || []).some(
    (endpoint) => String(endpoint.status || "") === "enabled"
  );

  const premiumPlan = await getPlanByKey("premium");

  return {
    stripeConfigured: true,
    mrrCents,
    mrrLabel: `${(mrrCents / 100).toFixed(2)} €`,
    activeSubscriptions: activeSubscriptions.length,
    unpaidInvoices: (openInvoices.data || []).length,
    freeServers: Math.max(0, totalGuilds - premiumGuildIds.size),
    webhookErrors: webhookConfigured ? 0 : 1,
    webhookConfigured,
    pendingCleanups: Number(pendingCleanupRow?.count || 0),
    activeContracts: activeSubscriptions.length,
    planDistribution,
    recentWebhookEvents: recentEvents.length,
    catalog: {
      productId: premiumPlan?.stripeProductId || null,
      priceMonthlyId: premiumPlan?.stripePriceMonthlyId || null,
      priceQuarterlyId: premiumPlan?.stripePriceQuarterlyId || null,
      priceYearlyId: premiumPlan?.stripePriceYearlyId || null
    }
  };
};

export const listAdminBillingAccounts = async () => {
  assertStripeReady();

  const [accounts, subscriptions, guildRows] = await Promise.all([
    db("billing_accounts").orderBy("updated_at", "desc"),
    db("billing_subscriptions").orderBy("updated_at", "desc"),
    db("guilds").select("discord_guild_id", "name", "icon")
  ]);

  const accountMap = new Map(accounts.map((row) => [String(row.guild_discord_id), row]));
  const subscriptionMap = new Map(subscriptions.map((row) => [String(row.guild_discord_id), row]));
  const guildMap = new Map(guildRows.map((row) => [String(row.discord_guild_id), row]));

  const guildIds = new Set([
    ...accounts.map((row) => String(row.guild_discord_id)),
    ...subscriptions.map((row) => String(row.guild_discord_id))
  ]);

  const payerIds = Array.from(
    new Set(accounts.map((row) => String(row.payer_discord_id || "")).filter(Boolean))
  );
  const payerUsers =
    payerIds.length > 0
      ? await db("users")
          .whereIn("discord_id", payerIds)
          .select("discord_id", "username", "avatar")
      : [];
  const payerMap = new Map(payerUsers.map((row) => [String(row.discord_id), row]));

  return [...guildIds].map((guildId) => {
    const account = accountMap.get(guildId) || null;
    const subscription = subscriptionMap.get(guildId) || null;
    const guild = guildMap.get(guildId) || null;
    const status = String(subscription?.status || "free").toLowerCase();
    const isPremium = ACTIVE_STATUSES.has(status) && String(subscription?.plan_key || "") === "premium";
    const payerId = account?.payer_discord_id ? String(account.payer_discord_id) : null;
    const payerUser = payerId ? payerMap.get(payerId) || null : null;

    return {
      guildId,
      guildName: guild?.name || guildId,
      guildIcon: guild?.icon || null,
      entityType: "guild",
      planKey: isPremium ? "premium" : "free",
      status,
      intervalKey: subscription?.interval_key || null,
      currentPeriodEnd: subscription?.current_period_end || null,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      stripeCustomerId: account?.stripe_customer_id || null,
      stripeSubscriptionId: subscription?.stripe_subscription_id || null,
      payerDiscordId: payerId,
      payerUsername: payerUser?.username || null,
      payerAvatar: payerUser?.avatar || null
    };
  });
};

export const listAdminPromoCodes = async () => {
  assertStripeReady();
  const stripe = getStripeClient();
  const page = await stripe.promotionCodes.list({
    limit: 100,
    expand: ["data.coupon"]
  });
  return (page.data || []).map(formatPromoCode);
};

export const createAdminPromoCode = async ({
  code,
  label = "",
  intervalKey = "monthly",
  discountType = "percent",
  value,
  maxRedemptions = null,
  expiresAt = null
}) => {
  assertStripeReady();

  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  if (!normalizedCode) {
    const error = new Error("invalid_promo_code");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    const error = new Error("invalid_promo_value");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const stripe = getStripeClient();
  const couponParams = {
    name: String(label || normalizedCode).slice(0, 40),
    duration: "once",
    metadata: {
      ecoboty_plan_key: "premium",
      ecoboty_interval: String(intervalKey || "monthly")
    }
  };

  if (discountType === "amount") {
    couponParams.amount_off = Math.round(numericValue);
    couponParams.currency = "eur";
  } else {
    couponParams.percent_off = Math.min(100, Math.round(numericValue));
  }

  if (maxRedemptions) {
    couponParams.max_redemptions = Math.max(1, Math.trunc(Number(maxRedemptions)));
  }

  if (expiresAt) {
    const redeemBy = Math.floor(new Date(expiresAt).getTime() / 1000);
    if (Number.isFinite(redeemBy)) couponParams.redeem_by = redeemBy;
  }

  const coupon = await stripe.coupons.create(couponParams);
  const promotionCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: normalizedCode,
    metadata: {
      ecoboty_plan_key: "premium",
      ecoboty_interval: String(intervalKey || "monthly"),
      ecoboty_label: String(label || normalizedCode)
    },
    max_redemptions: maxRedemptions ? Math.max(1, Math.trunc(Number(maxRedemptions))) : undefined,
    expires_at: expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : undefined
  });

  const expanded = await stripe.promotionCodes.retrieve(promotionCode.id, { expand: ["coupon"] });
  return formatPromoCode(expanded);
};

export const deactivateAdminPromoCode = async (promotionCodeId) => {
  assertStripeReady();
  const stripe = getStripeClient();
  const updated = await stripe.promotionCodes.update(String(promotionCodeId), { active: false });
  const expanded = await stripe.promotionCodes.retrieve(updated.id, { expand: ["coupon"] });
  return formatPromoCode(expanded);
};

const formatMoney = (amountCents, currency = "eur") =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: String(currency || "eur").toUpperCase()
  }).format(Number(amountCents || 0) / 100);

const resolveSubscriptionContext = async (guildDiscordId) => {
  const guildId = String(guildDiscordId || "").replace(/\D/g, "");
  const subscriptionRow = await db("billing_subscriptions").where({ guild_discord_id: guildId }).first();
  if (!subscriptionRow?.stripe_subscription_id) {
    const error = new Error("subscription_not_found");
    error.status = 404;
    error.expose = true;
    throw error;
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionRow.stripe_subscription_id, {
    expand: ["latest_invoice"]
  });

  let latestInvoice = subscription.latest_invoice;
  if (typeof latestInvoice === "string") {
    latestInvoice = await stripe.invoices.retrieve(latestInvoice, { expand: ["charge", "payment_intent"] });
  }

  let charge = null;
  if (latestInvoice?.charge) {
    charge =
      typeof latestInvoice.charge === "object"
        ? latestInvoice.charge
        : await stripe.charges.retrieve(String(latestInvoice.charge));
  } else if (latestInvoice?.payment_intent) {
    const paymentIntentId =
      typeof latestInvoice.payment_intent === "object"
        ? latestInvoice.payment_intent.id
        : String(latestInvoice.payment_intent);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"]
    });
    const latestCharge = paymentIntent.latest_charge;
    if (latestCharge) {
      charge =
        typeof latestCharge === "object"
          ? latestCharge
          : await stripe.charges.retrieve(String(latestCharge));
    }
  }

  return { guildId, subscription, latestInvoice, charge, stripe };
};

const computeProrataCents = (subscription, paidCents) => {
  const periodStart = Number(subscription?.current_period_start || 0) * 1000;
  const periodEnd = Number(subscription?.current_period_end || 0) * 1000;
  const now = Date.now();
  if (!periodStart || !periodEnd || periodEnd <= periodStart) return 0;
  const remainingMs = Math.max(0, periodEnd - now);
  const totalMs = periodEnd - periodStart;
  return Math.max(0, Math.round((remainingMs / totalMs) * Number(paidCents || 0)));
};

export const getAdminGuildRefundQuote = async (guildDiscordId) => {
  assertStripeReady();
  const { subscription, latestInvoice, charge } = await resolveSubscriptionContext(guildDiscordId);

  const amountPaid = Number(latestInvoice?.amount_paid || charge?.amount || 0);
  const amountRefunded = Number(charge?.amount_refunded || 0);
  const maxRefundableCents = Math.max(0, amountPaid - amountRefunded);
  const prorataCents = Math.min(computeProrataCents(subscription, amountPaid), maxRefundableCents);
  const currency = String(latestInvoice?.currency || charge?.currency || "eur").toLowerCase();
  const remainingDays = Math.max(
    0,
    Math.ceil(
      (Number(subscription.current_period_end || 0) * 1000 - Date.now()) / (24 * 60 * 60 * 1000)
    )
  );

  return {
    guildId: String(guildDiscordId || "").replace(/\D/g, ""),
    subscriptionId: subscription.id,
    status: subscription.status,
    currency,
    amountPaidCents: amountPaid,
    amountRefundedCents: amountRefunded,
    maxRefundableCents,
    prorataCents,
    remainingDays,
    periodEnd: subscription.current_period_end
      ? new Date(Number(subscription.current_period_end) * 1000).toISOString()
      : null,
    hasRefundableCharge: Boolean(charge?.id) && maxRefundableCents > 0,
    chargeId: charge?.id || null,
    invoiceId: latestInvoice?.id || null,
    labels: {
      amountPaid: formatMoney(amountPaid, currency),
      amountRefunded: formatMoney(amountRefunded, currency),
      maxRefundable: formatMoney(maxRefundableCents, currency),
      prorata: formatMoney(prorataCents, currency)
    }
  };
};

export const cancelAdminGuildSubscription = async ({
  guildDiscordId,
  immediate = true,
  atPeriodEnd = false
}) => {
  assertStripeReady();
  const guildId = String(guildDiscordId || "").replace(/\D/g, "");
  const subscriptionRow = await db("billing_subscriptions").where({ guild_discord_id: guildId }).first();
  if (!subscriptionRow?.stripe_subscription_id) {
    const error = new Error("subscription_not_found");
    error.status = 404;
    error.expose = true;
    throw error;
  }

  const stripe = getStripeClient();
  let subscription;
  if (atPeriodEnd && !immediate) {
    subscription = await stripe.subscriptions.update(subscriptionRow.stripe_subscription_id, {
      cancel_at_period_end: true
    });
  } else {
    subscription = await stripe.subscriptions.cancel(subscriptionRow.stripe_subscription_id);
    await downgradeGuildPremium(guildId, "admin_cancel");
  }

  await syncSubscriptionFromStripeObject(subscription);
  return { ok: true, subscriptionId: subscription.id, status: subscription.status };
};

export const refundAdminGuildSubscription = async ({
  guildDiscordId,
  mode = "prorata",
  amountCents = null,
  cancelSubscription = false,
  internalNote = null
}) => {
  assertStripeReady();
  const quote = await getAdminGuildRefundQuote(guildDiscordId);
  if (!quote.hasRefundableCharge || !quote.chargeId) {
    const error = new Error("refund_charge_not_found");
    error.status = 404;
    error.expose = true;
    throw error;
  }

  let refundAmountCents = 0;
  if (mode === "manual") {
    const manual = Math.trunc(Number(amountCents || 0));
    if (!Number.isFinite(manual) || manual <= 0) {
      const error = new Error("invalid_refund_amount");
      error.status = 400;
      error.expose = true;
      throw error;
    }
    refundAmountCents = manual;
  } else if (mode === "prorata") {
    refundAmountCents = quote.prorataCents;
  } else {
    const error = new Error("invalid_refund_mode");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  if (refundAmountCents > quote.maxRefundableCents) {
    const error = new Error("refund_amount_exceeds_max");
    error.status = 400;
    error.expose = true;
    error.payload = { maxRefundableCents: quote.maxRefundableCents };
    throw error;
  }

  if (refundAmountCents <= 0) {
    const error = new Error("refund_amount_zero");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const { guildId, subscription, latestInvoice, stripe } = await resolveSubscriptionContext(guildDiscordId);
  const invoiceId = quote.invoiceId || latestInvoice?.id || null;

  let refund = null;
  let creditNote = null;

  if (invoiceId) {
    creditNote = await stripe.creditNotes.create({
      invoice: invoiceId,
      refund_amount: refundAmountCents,
      reason: "order_change",
      memo: internalNote ? String(internalNote).slice(0, 500) : undefined,
      metadata: {
        ecoboty_guild_id: guildId,
        ecoboty_refund_mode: String(mode),
        ecoboty_internal_note: internalNote ? String(internalNote).slice(0, 240) : ""
      }
    });
    refund = creditNote?.refund || null;
  } else {
    refund = await stripe.refunds.create({
      charge: quote.chargeId,
      amount: refundAmountCents,
      reason: "requested_by_customer",
      metadata: {
        ecoboty_guild_id: guildId,
        ecoboty_refund_mode: String(mode),
        ecoboty_internal_note: internalNote ? String(internalNote).slice(0, 240) : ""
      }
    });
  }

  if (cancelSubscription) {
    if (String(subscription.status || "").toLowerCase() !== "canceled") {
      await stripe.subscriptions.cancel(subscription.id);
    }
    await downgradeGuildPremium(guildId, "admin_refund");
    await syncGuildBillingFromStripe(guildId);
  } else {
    await syncSubscriptionFromStripeObject(
      await stripe.subscriptions.retrieve(subscription.id)
    );
  }

  return {
    ok: true,
    refundId: refund?.id || null,
    creditNoteId: creditNote?.id || null,
    creditNotePdf: creditNote?.pdf || null,
    creditNoteNumber: creditNote?.number || null,
    amount: refund?.amount || creditNote?.amount || refundAmountCents,
    currency: refund?.currency || creditNote?.currency || quote.currency,
    mode,
    cancelSubscription: Boolean(cancelSubscription),
    quote
  };
};

export const listAdminBillingWebhookEvents = async ({ limit = 50 } = {}) => {
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(Number(limit) || 50)));
  return db("billing_event_log")
    .select("id", "stripe_event_id", "event_type", "guild_discord_id", "created_at")
    .orderBy("created_at", "desc")
    .limit(safeLimit);
};
