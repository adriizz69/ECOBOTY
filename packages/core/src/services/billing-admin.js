import { db } from "./db.js";
import { getPlanByKey, BILLING_INTERVALS } from "./billing-catalog.js";
import { getStripeClient, isStripeConfigured } from "./stripe-client.js";
import {
  downgradeGuildPremium,
  syncGuildBillingFromStripe,
  syncSubscriptionFromStripeObject
} from "./billing-webhook.js";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
/** Prix liste mensuel Premium (fiche tarifs) — base du brut MRR. */
const LIST_MONTHLY_CENTS = 499;

const assertStripeReady = () => {
  if (!isStripeConfigured()) {
    const error = new Error("stripe_not_configured");
    error.status = 503;
    error.expose = true;
    throw error;
  }
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

  const subscriptionMetrics = (
    await Promise.all(
      activeSubscriptions.map((row) =>
        resolveSubscriptionMetrics(row.stripe_subscription_id, row.interval_key).catch(() => null)
      )
    )
  ).filter(Boolean);
  const grossMrrCents = subscriptionMetrics.reduce((sum, row) => sum + Number(row.grossMrrCents || 0), 0);
  const discountMrrCents = subscriptionMetrics.reduce((sum, row) => sum + Number(row.discountMrrCents || 0), 0);
  const mrrCents = subscriptionMetrics.reduce((sum, row) => sum + Number(row.netMrrCents || 0), 0);
  const stripeFeesMrrCents = subscriptionMetrics.reduce((sum, row) => sum + Number(row.stripeFeeMrrCents || 0), 0);
  const netAfterFeesMrrCents = subscriptionMetrics.reduce(
    (sum, row) => sum + Number(row.netAfterFeesMrrCents || 0),
    0
  );

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
    mrrLabel: formatMoney(mrrCents),
    grossMrrCents,
    grossMrrLabel: formatMoney(grossMrrCents),
    discountMrrCents,
    discountMrrLabel: formatMoney(discountMrrCents),
    stripeFeesMrrCents,
    stripeFeesMrrLabel: formatMoney(stripeFeesMrrCents),
    netAfterFeesMrrCents,
    netAfterFeesMrrLabel: formatMoney(netAfterFeesMrrCents),
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

  const metricsEntries = await Promise.all(
    subscriptions
      .filter((row) => row?.stripe_subscription_id)
      .map(async (row) => [
        String(row.guild_discord_id),
        await resolveSubscriptionMetrics(row.stripe_subscription_id, row.interval_key).catch(() => null)
      ])
  );
  const metricsMap = new Map(metricsEntries);

  return [...guildIds].map((guildId) => {
    const account = accountMap.get(guildId) || null;
    const subscription = subscriptionMap.get(guildId) || null;
    const guild = guildMap.get(guildId) || null;
    const metrics = metricsMap.get(guildId) || null;
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
      payerAvatar: payerUser?.avatar || null,
      promoCode: metrics?.promoCode || null,
      promoLabel: metrics?.promoLabel || null,
      promoValueLabel: metrics?.promoValueLabel || "—",
      stripeFeeLabel: metrics ? formatMoney(metrics.stripeFeeCycleCents, metrics.currency) : "—",
      billedAmountLabel: metrics ? formatMoney(metrics.netCycleBeforeFeesCents, metrics.currency) : "—"
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

  const normalizedInterval = String(intervalKey || "monthly").toLowerCase();
  if (!BILLING_INTERVALS.includes(normalizedInterval)) {
    const error = new Error("invalid_promo_interval");
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
      ecoboty_interval: normalizedInterval
    }
  };

  if (discountType === "amount") {
    // UI saisit des euros ; Stripe amount_off est en centimes.
    couponParams.amount_off = Math.round(numericValue * 100);
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
      ecoboty_interval: normalizedInterval,
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

const getIntervalMonths = ({ intervalKey = null, recurring = null } = {}) => {
  const interval = String(recurring?.interval || intervalKey || "month").toLowerCase();
  const count = Math.max(1, Number(recurring?.interval_count || 1));
  if (interval === "year" || interval === "yearly") return 12 * count;
  if (interval === "quarter" || interval === "quarterly") return 3 * count;
  if (interval === "month" || interval === "monthly") return count;
  if (interval === "week" || interval === "weekly") return Math.max(1, Math.round(count / 4.345));
  if (interval === "day" || interval === "daily") return Math.max(1, Math.round(count / 30.4375));
  return 1;
};

const annualizeToMonthlyCents = (amountCents, months) =>
  Math.round(Number(amountCents || 0) / Math.max(1, Number(months || 1)));

const getInvoiceNetBeforeTaxCents = (invoice) => {
  if (!invoice) return 0;
  if (invoice.total_excluding_tax != null) return Number(invoice.total_excluding_tax || 0);
  const total = Number(invoice.total || 0);
  const tax = Number(invoice.tax || 0);
  return Math.max(0, total - tax);
};

const getInvoiceSubtotalCents = (invoice) => {
  if (!invoice) return 0;
  if (invoice.subtotal_excluding_tax != null) return Number(invoice.subtotal_excluding_tax || 0);
  if (invoice.subtotal != null) return Number(invoice.subtotal || 0);
  return getInvoiceNetBeforeTaxCents(invoice);
};

const getDiscountSummary = (subscription, invoice, currency = "eur") => {
  const discountAmounts = Array.isArray(invoice?.total_discount_amounts) ? invoice.total_discount_amounts : [];
  const discountCycleCents = discountAmounts.reduce((sum, row) => sum + Number(row?.amount || 0), 0);

  const discountObjects = [];
  if (Array.isArray(subscription?.discounts)) {
    for (const entry of subscription.discounts) {
      if (entry && typeof entry === "object") discountObjects.push(entry);
    }
  }
  if (subscription?.discount && typeof subscription.discount === "object") {
    discountObjects.push(subscription.discount);
  }

  let coupon = null;
  let promotionCode = null;
  for (const discount of discountObjects) {
    const nextCoupon = discount?.coupon;
    if (nextCoupon && typeof nextCoupon === "object") coupon = nextCoupon;
    const nextPromo = discount?.promotion_code;
    if (nextPromo) promotionCode = nextPromo;
  }

  const percentOff = coupon?.percent_off != null ? Number(coupon.percent_off) : null;
  const amountOff = coupon?.amount_off != null ? Number(coupon.amount_off) : null;
  const code =
    typeof promotionCode === "object" && promotionCode?.code
      ? promotionCode.code
      : typeof promotionCode === "string"
        ? promotionCode
        : null;
  let valueLabel = "—";
  if (percentOff != null) valueLabel = `${percentOff}%`;
  else if (amountOff != null) valueLabel = formatMoney(amountOff, coupon?.currency || currency);

  return {
    discountCycleCents,
    promoCode: code,
    promoLabel: coupon?.name || code || null,
    promoValueLabel: discountCycleCents > 0 || percentOff != null || amountOff != null ? valueLabel : "—",
    hasDiscount: discountCycleCents > 0 || percentOff != null || amountOff != null,
    coupon,
    percentOff,
    amountOff,
    couponDuration: coupon?.duration || null
  };
};

const computeCouponCycleCents = ({ coupon, catalogCycleCents }) => {
  if (!coupon) return 0;
  const percentOff = coupon.percent_off != null ? Number(coupon.percent_off) : null;
  if (percentOff != null && Number.isFinite(percentOff)) {
    return Math.round((Number(catalogCycleCents || 0) * percentOff) / 100);
  }
  const amountOff = coupon.amount_off != null ? Number(coupon.amount_off) : null;
  if (amountOff != null && Number.isFinite(amountOff)) {
    return Math.min(Number(catalogCycleCents || 0), Math.max(0, amountOff));
  }
  return 0;
};

const resolveChargeBalanceTransaction = async (stripe, charge) => {
  if (!charge) return null;
  const tx = charge.balance_transaction;
  if (tx && typeof tx === "object") return tx;
  if (!tx) return null;
  try {
    return await stripe.balanceTransactions.retrieve(String(tx));
  } catch {
    return null;
  }
};

const resolveSubscriptionMetrics = async (stripeSubscriptionId, fallbackIntervalKey = null) => {
  if (!stripeSubscriptionId) return null;
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(String(stripeSubscriptionId), {
    expand: [
      "discount.coupon",
      "discount.promotion_code",
      "discounts",
      "items.data.price",
      "latest_invoice.charge",
      "latest_invoice.payment_intent"
    ]
  });

  let latestInvoice = subscription.latest_invoice || null;
  if (typeof latestInvoice === "string") {
    latestInvoice = await stripe.invoices.retrieve(latestInvoice, {
      expand: ["charge", "payment_intent"]
    });
  }

  let charge = null;
  if (latestInvoice?.charge) {
    charge =
      typeof latestInvoice.charge === "object"
        ? latestInvoice.charge
        : await stripe.charges.retrieve(String(latestInvoice.charge));
  } else if (latestInvoice?.payment_intent) {
    const paymentIntent =
      typeof latestInvoice.payment_intent === "object"
        ? latestInvoice.payment_intent
        : await stripe.paymentIntents.retrieve(String(latestInvoice.payment_intent), {
            expand: ["latest_charge"]
          });
    const latestCharge = paymentIntent?.latest_charge || null;
    if (latestCharge) {
      charge =
        typeof latestCharge === "object"
          ? latestCharge
          : await stripe.charges.retrieve(String(latestCharge));
    }
  }

  const balanceTransaction = await resolveChargeBalanceTransaction(stripe, charge);
  const currency = String(
    subscription?.items?.data?.[0]?.price?.currency || latestInvoice?.currency || charge?.currency || "eur"
  ).toLowerCase();

  const price = subscription?.items?.data?.[0]?.price || null;
  const recurring = price?.recurring || null;
  const intervalMonths = getIntervalMonths({
    intervalKey: fallbackIntervalKey,
    recurring
  });

  // Prix catalogue du cycle (mensuel 4,99 / 3 mois 13,47 / annuel 47,90), hors coupon.
  const catalogCycleCents = Number(price?.unit_amount ?? getInvoiceSubtotalCents(latestInvoice) ?? 0);
  const catalogMrrCents = annualizeToMonthlyCents(catalogCycleCents, intervalMonths);
  const listMrrCents = LIST_MONTHLY_CENTS;
  const planDiscountMrrCents = Math.max(0, listMrrCents - catalogMrrCents);

  const discount = getDiscountSummary(subscription, latestInvoice, currency);
  // Remise promo : active sur l'abo, sinon dernière facture (coupon duration once).
  let couponCycleCents = computeCouponCycleCents({
    coupon: discount.coupon,
    catalogCycleCents
  });
  if (!couponCycleCents && discount.discountCycleCents > 0) {
    couponCycleCents = discount.discountCycleCents;
  }
  const couponDiscountMrrCents = annualizeToMonthlyCents(couponCycleCents, intervalMonths);
  const totalDiscountMrrCents = planDiscountMrrCents + couponDiscountMrrCents;
  const netMrrCents = Math.max(0, catalogMrrCents - couponDiscountMrrCents);

  const stripeFeeCycleCents = Number(balanceTransaction?.fee || 0);
  const stripeFeeMrrCents = annualizeToMonthlyCents(stripeFeeCycleCents, intervalMonths);

  return {
    subscription,
    latestInvoice,
    charge,
    currency,
    intervalMonths,
    catalogCycleCents,
    grossCycleCents: catalogCycleCents,
    netCycleBeforeFeesCents: Math.max(0, catalogCycleCents - couponCycleCents),
    discountCycleCents: couponCycleCents,
    stripeFeeCycleCents,
    // Brut = prix liste mensualisé (4,99 €), pas le prix déjà remisé 3 mois / 1 an.
    grossMrrCents: listMrrCents,
    planDiscountMrrCents,
    couponDiscountMrrCents,
    discountMrrCents: totalDiscountMrrCents,
    catalogMrrCents,
    netMrrCents,
    stripeFeeMrrCents,
    netAfterFeesMrrCents: Math.max(0, netMrrCents - stripeFeeMrrCents),
    promoCode: discount.promoCode,
    promoLabel: discount.promoLabel,
    promoValueLabel: discount.promoValueLabel,
    hasDiscount: totalDiscountMrrCents > 0
  };
};

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
