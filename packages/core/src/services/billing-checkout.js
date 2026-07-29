import { db } from "./db.js";
import { resolveGuildIdFromMetadata } from "./billing-webhook.js";
import { getStripeClient, isStripeConfigured } from "./stripe-client.js";
import {
  BILLING_INTERVALS,
  ensureStripePriceProductTaxCode,
  ensureZeroVatTaxRate,
  getPlanByKey,
  resolveStripePriceId
} from "./billing-catalog.js";

const normalizeGuildId = (value) => String(value || "").replace(/\D/g, "");

export const assertBillingConfigured = () => {
  if (!isStripeConfigured()) {
    const error = new Error("stripe_not_configured");
    error.status = 503;
    error.expose = true;
    throw error;
  }
};

export const getOrCreateBillingAccount = async ({
  guildDiscordId,
  payerDiscordId,
  payerEmail = null
}) => {
  assertBillingConfigured();
  const guildId = normalizeGuildId(guildDiscordId);
  const payerId = String(payerDiscordId || "").trim();
  if (!guildId || !payerId) {
    const error = new Error("invalid_billing_account");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const existing = await db("billing_accounts").where({ guild_discord_id: guildId }).first();
  if (existing) return existing;

  const existingPayerAccount = await db("billing_accounts")
    .where({ payer_discord_id: payerId })
    .orderBy("updated_at", "desc")
    .first();

  if (existingPayerAccount?.stripe_customer_id) {
    const now = new Date();
    const [id] = await db("billing_accounts").insert({
      guild_discord_id: guildId,
      payer_discord_id: payerId,
      stripe_customer_id: existingPayerAccount.stripe_customer_id,
      created_at: now,
      updated_at: now
    });

    if (payerEmail) {
      try {
        const stripe = getStripeClient();
        await stripe.customers.update(existingPayerAccount.stripe_customer_id, {
          email: payerEmail
        });
      } catch {
        // keep flow working even if email sync fails
      }
    }

    return db("billing_accounts").where({ id }).first();
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: payerEmail || undefined,
    metadata: {
      ecoboty_entity_type: "guild",
      ecoboty_entity_id: guildId,
      ecoboty_payer_discord_id: payerId
    }
  });

  const now = new Date();
  const [id] = await db("billing_accounts").insert({
    guild_discord_id: guildId,
    payer_discord_id: payerId,
    stripe_customer_id: customer.id,
    created_at: now,
    updated_at: now
  });

  return db("billing_accounts").where({ id }).first();
};

const normalizePromoCodeInput = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");

/**
 * Resolve an active Stripe promotion code and enforce ecoboty_interval metadata
 * so a monthly promo cannot be redeemed on quarterly/yearly (and vice versa).
 */
export const resolvePromotionCodeForInterval = async (promoCodeInput, intervalKey) => {
  const code = normalizePromoCodeInput(promoCodeInput);
  if (!code) return null;

  const interval = String(intervalKey || "monthly").toLowerCase();
  const stripe = getStripeClient();
  const listed = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ["data.coupon"]
  });
  const promotionCode = listed?.data?.[0] || null;
  if (!promotionCode?.id) {
    const error = new Error("promo_code_not_found");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const allowedInterval = String(
    promotionCode.metadata?.ecoboty_interval || promotionCode.coupon?.metadata?.ecoboty_interval || ""
  )
    .trim()
    .toLowerCase();

  if (!allowedInterval || !BILLING_INTERVALS.includes(allowedInterval)) {
    const error = new Error("promo_code_interval_missing");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  if (allowedInterval !== interval) {
    const error = new Error("promo_code_wrong_interval");
    error.status = 400;
    error.expose = true;
    error.payload = { allowedInterval, interval };
    throw error;
  }

  return promotionCode;
};

export const createGuildCheckoutSession = async ({
  guildDiscordId,
  payerDiscordId,
  payerEmail = null,
  intervalKey = "monthly",
  waiveRetraction = false,
  promotionCode = null,
  successUrl,
  cancelUrl
}) => {
  assertBillingConfigured();

  if (!waiveRetraction) {
    const error = new Error("retraction_waiver_required");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const interval = String(intervalKey || "monthly").toLowerCase();
  if (!BILLING_INTERVALS.includes(interval)) {
    const error = new Error("invalid_interval");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const guildId = normalizeGuildId(guildDiscordId);
  const premiumPlan = await getPlanByKey("premium");
  const priceId = resolveStripePriceId(premiumPlan, interval);
  if (!priceId) {
    const error = new Error("premium_price_not_configured");
    error.status = 503;
    error.expose = true;
    throw error;
  }

  const account = await getOrCreateBillingAccount({
    guildDiscordId: guildId,
    payerDiscordId,
    payerEmail
  });

  await db("billing_accounts")
    .where({ id: account.id })
    .update({
      waive_retraction_accepted: true,
      waive_retraction_accepted_at: new Date(),
      payer_discord_id: String(payerDiscordId || account.payer_discord_id),
      updated_at: new Date()
    });

  const guildRow = await db("guilds").select("name").where("discord_guild_id", guildId).first();
  const guildName = String(guildRow?.name || "").trim() || `Serveur ${guildId}`;
  const subscriptionLabel = `EcoBoty Premium — ${guildName} (${guildId})`;

  const stripe = getStripeClient();
  const baseUrl = String(process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");
  await ensureStripePriceProductTaxCode(priceId);
  const zeroVatTaxRate = await ensureZeroVatTaxRate();
  const resolvedPromo = await resolvePromotionCodeForInterval(promotionCode, interval);

  const sessionParams = {
    mode: "subscription",
    customer: account.stripe_customer_id,
    line_items: [{ price: priceId, quantity: 1 }],
    // Désactive Managed Payments : sinon Stripe calcule/ajoute la TVA à ta place.
    managed_payments: { enabled: false },
    success_url: successUrl || `${baseUrl}/guild/${guildId}?tab=billing&billing=success`,
    cancel_url: cancelUrl || `${baseUrl}/guild/${guildId}?tab=billing&billing=cancel`,
    client_reference_id: guildId,
    // Codes promo saisis côté EcoBoty uniquement (contrôle de périodicité).
    allow_promotion_codes: false,
    metadata: {
      ecoboty_plan_key: "premium",
      ecoboty_price_key: `premium_${interval}`,
      ecoboty_entity_type: "guild",
      ecoboty_entity_id: guildId,
      ecoboty_guild_name: guildName,
      ecoboty_payer_discord_id: String(payerDiscordId || ""),
      ecoboty_interval: interval,
      ...(resolvedPromo?.code ? { ecoboty_promo_code: resolvedPromo.code } : {})
    },
    subscription_data: {
      description: subscriptionLabel,
      // Affiche la ligne TVA à 0 % sur Checkout + factures / renouvellements.
      default_tax_rates: zeroVatTaxRate?.id ? [zeroVatTaxRate.id] : undefined,
      metadata: {
        ecoboty_plan_key: "premium",
        ecoboty_price_key: `premium_${interval}`,
        ecoboty_entity_type: "guild",
        ecoboty_entity_id: guildId,
        ecoboty_guild_name: guildName,
        ecoboty_interval: interval
      }
    }
  };

  if (resolvedPromo?.id) {
    sessionParams.discounts = [{ promotion_code: resolvedPromo.id }];
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    url: session.url,
    sessionId: session.id
  };
};

export const createGuildPortalSession = async ({
  guildDiscordId,
  returnUrl
}) => {
  assertBillingConfigured();
  const guildId = normalizeGuildId(guildDiscordId);
  const account = await db("billing_accounts").where({ guild_discord_id: guildId }).first();
  if (!account?.stripe_customer_id) {
    const error = new Error("billing_account_not_found");
    error.status = 404;
    error.expose = true;
    throw error;
  }

  const stripe = getStripeClient();
  const baseUrl = String(process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: returnUrl || `${baseUrl}/guild/${guildId}?billing=portal`
  });

  return { url: session.url };
};

export const listBillingAccountsForPayer = async ({ payerDiscordId }) => {
  const payerId = String(payerDiscordId || "").trim();
  if (!payerId) return [];
  return db("billing_accounts")
    .where({ payer_discord_id: payerId })
    .orderBy("updated_at", "desc");
};

export const getUserBillingOverview = async ({ payerDiscordId }) => {
  assertBillingConfigured();

  const accounts = await listBillingAccountsForPayer({ payerDiscordId });
  if (!accounts.length) {
    return {
      customers: [],
      subscriptions: [],
      invoices: [],
      summary: {
        managedServers: 0,
        premiumServers: 0,
        invoiceCount: 0
      }
    };
  }

  const guildIds = accounts.map((account) => String(account.guild_discord_id));
  const guildRows = await db("guilds")
    .select("discord_guild_id", "name", "icon")
    .whereIn("discord_guild_id", guildIds);
  const guildMap = new Map(guildRows.map((row) => [String(row.discord_guild_id), row]));

  const subscriptionRows = await db("billing_subscriptions")
    .whereIn("guild_discord_id", guildIds)
    .orderBy("updated_at", "desc");
  const subscriptionMap = new Map(subscriptionRows.map((row) => [String(row.guild_discord_id), row]));

  const customerIds = Array.from(new Set(accounts.map((row) => String(row.stripe_customer_id)).filter(Boolean)));
  const stripe = getStripeClient();
  const invoiceLists = await Promise.all(
    customerIds.map(async (customerId) => {
      const invoicePage = await stripe.invoices.list({
        customer: customerId,
        limit: 24
      });
      return invoicePage.data || [];
    })
  );
  const creditNoteLists = await Promise.all(
    customerIds.map(async (customerId) => {
      try {
        const creditNotePage = await stripe.creditNotes.list({
          customer: customerId,
          limit: 24
        });
        return creditNotePage.data || [];
      } catch {
        return [];
      }
    })
  );

  const subsByStripeId = new Map(
    subscriptionRows
      .filter((row) => row.stripe_subscription_id)
      .map((row) => [String(row.stripe_subscription_id), row])
  );

  const flatInvoices = invoiceLists.flat().sort((a, b) => Number(b.created || 0) - Number(a.created || 0));
  const flatCreditNotes = creditNoteLists
    .flat()
    .sort((a, b) => Number(b.created || 0) - Number(a.created || 0));
  const invoiceGuildMap = new Map();
  for (const invoice of flatInvoices) {
    const subscriptionId = invoice.subscription ? String(invoice.subscription) : null;
    if (!subscriptionId || invoiceGuildMap.has(subscriptionId)) continue;

    const cached = subsByStripeId.get(subscriptionId);
    if (cached) {
      invoiceGuildMap.set(subscriptionId, String(cached.guild_discord_id));
      continue;
    }

    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const resolvedGuildId = resolveGuildIdFromMetadata(stripeSubscription.metadata || {});
      if (resolvedGuildId) invoiceGuildMap.set(subscriptionId, resolvedGuildId);
    } catch {
      // ignore lookup errors for invoice enrichment
    }
  }

  const buildInvoiceTitle = (guildId) => {
    const guild = guildMap.get(String(guildId)) || null;
    const name = guild?.name || guildId;
    return `EcoBoty Premium — ${name} (${guildId})`;
  };

  const buildCreditNoteTitle = (guildId, creditNoteNumber) => {
    const guild = guildMap.get(String(guildId)) || null;
    const name = guild?.name || guildId;
    const suffix = creditNoteNumber ? ` · ${creditNoteNumber}` : "";
    return `Avoir / Remboursement — ${name} (${guildId})${suffix}`;
  };

  const invoiceIdGuildMap = new Map();
  for (const invoice of flatInvoices) {
    const subscriptionId = invoice.subscription ? String(invoice.subscription) : null;
    const guildId = subscriptionId ? invoiceGuildMap.get(subscriptionId) || null : null;
    if (guildId) invoiceIdGuildMap.set(String(invoice.id), guildId);
  }

  const invoiceEntries = flatInvoices.map((invoice) => {
    const subscriptionId = invoice.subscription ? String(invoice.subscription) : null;
    const guildId = subscriptionId ? invoiceGuildMap.get(subscriptionId) || null : null;
    return {
      id: invoice.id,
      kind: "invoice",
      customerId: String(invoice.customer || ""),
      status: invoice.status || "draft",
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      invoicePdf: invoice.invoice_pdf || null,
      amountPaid: Number(invoice.amount_paid || 0),
      currency: String(invoice.currency || "eur").toUpperCase(),
      createdAt: Number(invoice.created || 0) ? new Date(Number(invoice.created) * 1000).toISOString() : null,
      subscriptionId,
      guildId,
      guildName: guildId ? guildMap.get(String(guildId))?.name || guildId : null,
      title: guildId ? buildInvoiceTitle(guildId) : invoice.id
    };
  });

  const creditNoteEntries = [];
  for (const creditNote of flatCreditNotes) {
    const relatedInvoiceId = creditNote.invoice ? String(creditNote.invoice) : null;
    let guildId = relatedInvoiceId ? invoiceIdGuildMap.get(relatedInvoiceId) || null : null;

    if (!guildId && relatedInvoiceId) {
      try {
        const relatedInvoice = await stripe.invoices.retrieve(relatedInvoiceId);
        const subscriptionId = relatedInvoice.subscription ? String(relatedInvoice.subscription) : null;
        guildId = subscriptionId ? invoiceGuildMap.get(subscriptionId) || null : null;
        if (guildId) invoiceIdGuildMap.set(relatedInvoiceId, guildId);
      } catch {
        // ignore lookup errors for credit note enrichment
      }
    }

    creditNoteEntries.push({
      id: creditNote.id,
      kind: "credit_note",
      customerId: String(creditNote.customer || ""),
      status: creditNote.status || "issued",
      hostedInvoiceUrl: null,
      invoicePdf: creditNote.pdf || null,
      amountPaid: -Math.abs(Number(creditNote.amount || 0)),
      currency: String(creditNote.currency || "eur").toUpperCase(),
      createdAt: Number(creditNote.created || 0)
        ? new Date(Number(creditNote.created) * 1000).toISOString()
        : null,
      subscriptionId: null,
      guildId,
      guildName: guildId ? guildMap.get(String(guildId))?.name || guildId : null,
      title: guildId
        ? buildCreditNoteTitle(guildId, creditNote.number)
        : `Avoir ${creditNote.number || creditNote.id}`,
      relatedInvoiceId,
      documentNumber: creditNote.number || null
    });
  }

  const invoices = [...invoiceEntries, ...creditNoteEntries].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const subscriptions = accounts.map((account) => {
    const guildId = String(account.guild_discord_id);
    const guild = guildMap.get(guildId) || null;
    const subscription = subscriptionMap.get(guildId) || null;
    const isPremium = ["active", "trialing"].includes(String(subscription?.status || "").toLowerCase());
    return {
      guildId,
      guildName: guild?.name || guildId,
      guildIcon: guild?.icon || null,
      stripeCustomerId: account.stripe_customer_id,
      stripeSubscriptionId: subscription?.stripe_subscription_id || null,
      planKey: isPremium ? "premium" : "free",
      status: subscription?.status || "free",
      intervalKey: subscription?.interval_key || null,
      currentPeriodEnd: subscription?.current_period_end || null,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end)
    };
  });

  return {
    customers: customerIds,
    subscriptions,
    invoices,
    summary: {
      managedServers: subscriptions.length,
      premiumServers: subscriptions.filter((entry) => entry.planKey === "premium").length,
      invoiceCount: invoices.length
    }
  };
};

export const createUserBillingPortalSession = async ({ payerDiscordId, returnUrl }) => {
  assertBillingConfigured();
  const accounts = await listBillingAccountsForPayer({ payerDiscordId });
  const primary = accounts.find((row) => row?.stripe_customer_id);
  if (!primary?.stripe_customer_id) {
    const error = new Error("billing_account_not_found");
    error.status = 404;
    error.expose = true;
    throw error;
  }

  const stripe = getStripeClient();
  const baseUrl = String(process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: primary.stripe_customer_id,
    return_url: returnUrl || `${baseUrl}/compte`
  });

  return { url: session.url };
};
