import { db } from "./db.js";
import { getStripeClient, isStripeConfigured } from "./stripe-client.js";

const parseJsonField = (value, fallback = {}) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

export const BILLING_PRICE_KEYS = Object.freeze({
  monthly: "premium_monthly",
  quarterly: "premium_quarterly",
  yearly: "premium_yearly"
});

export const BILLING_INTERVALS = Object.freeze(["monthly", "quarterly", "yearly"]);

const PREMIUM_PRICE_SPECS = Object.freeze([
  {
    key: "monthly",
    column: "stripe_price_monthly_id",
    amount: 499,
    interval: "month",
    interval_count: 1,
    metadataKey: "premium_monthly"
  },
  {
    key: "quarterly",
    column: "stripe_price_quarterly_id",
    amount: 1347,
    interval: "month",
    interval_count: 3,
    metadataKey: "premium_quarterly"
  },
  {
    key: "yearly",
    column: "stripe_price_yearly_id",
    amount: 4790,
    interval: "year",
    interval_count: 1,
    metadataKey: "premium_yearly"
  }
]);

export const formatPlanRow = (row) => {
  if (!row) return null;
  return {
    planKey: row.plan_key,
    label: row.label,
    description: row.description || "",
    isDefault: Boolean(row.is_default),
    isPublic: Boolean(row.is_public),
    stripeProductId: row.stripe_product_id || null,
    stripePriceMonthlyId: row.stripe_price_monthly_id || null,
    stripePriceQuarterlyId: row.stripe_price_quarterly_id || null,
    stripePriceYearlyId: row.stripe_price_yearly_id || null,
    features: parseJsonField(row.features, {}),
    limits: parseJsonField(row.limits, {})
  };
};

export const listPublicPlans = async () => {
  const rows = await db("billing_plan_definitions")
    .where({ is_public: true })
    .orderBy([{ column: "is_default", order: "desc" }, { column: "id", order: "asc" }]);
  return rows.map(formatPlanRow);
};

export const getPlanByKey = async (planKey) => {
  const row = await db("billing_plan_definitions").where({ plan_key: String(planKey || "") }).first();
  return formatPlanRow(row);
};

export const getDefaultPlan = async () => {
  const row = await db("billing_plan_definitions").where({ is_default: true }).first()
    || await db("billing_plan_definitions").orderBy("id", "asc").first();
  return formatPlanRow(row);
};

export const resolveStripePriceId = (plan, intervalKey) => {
  if (!plan) return null;
  if (intervalKey === "monthly") return plan.stripePriceMonthlyId;
  if (intervalKey === "quarterly") return plan.stripePriceQuarterlyId;
  if (intervalKey === "yearly") return plan.stripePriceYearlyId;
  return null;
};

export const getPublicPricingCatalog = async () => {
  const plans = await listPublicPlans();
  return {
    currency: "eur",
    plans: plans.map((plan) => ({
      ...plan,
      prices: {
        monthly: plan.planKey === "premium" ? { amountCents: 499, label: "4,99 € / mois" } : { amountCents: 0, label: "0 €" },
        quarterly: plan.planKey === "premium" ? { amountCents: 1347, label: "13,47 € / 3 mois", discountPercent: 10 } : { amountCents: 0, label: "0 €" },
        yearly: plan.planKey === "premium" ? { amountCents: 4790, label: "47,90 € / an", discountPercent: 20 } : { amountCents: 0, label: "0 €" }
      }
    }))
  };
};

const readEnvCatalogOverrides = () => ({
  stripe_product_id: String(process.env.STRIPE_PRODUCT_PREMIUM_ID || "").trim() || null,
  stripe_price_monthly_id: String(process.env.STRIPE_PRICE_PREMIUM_MONTHLY || "").trim() || null,
  stripe_price_quarterly_id: String(process.env.STRIPE_PRICE_PREMIUM_QUARTERLY || "").trim() || null,
  stripe_price_yearly_id: String(process.env.STRIPE_PRICE_PREMIUM_YEARLY || "").trim() || null
});

// 0 % TVA (art. 293 B) — produit non taxable. Managed Payments doit être désactivé au checkout.
const DEFAULT_PREMIUM_TAX_CODE = "txcd_00000000";

const resolvePremiumTaxCode = () =>
  String(process.env.STRIPE_PRODUCT_TAX_CODE || DEFAULT_PREMIUM_TAX_CODE).trim() || DEFAULT_PREMIUM_TAX_CODE;

const ensureProductTaxCode = async (stripe, product) => {
  if (!product?.id) return product;

  const taxCode = resolvePremiumTaxCode();
  if (!taxCode) return product;

  const current = String(product.tax_code || "").trim();
  if (current === taxCode) return product;

  try {
    return await stripe.products.update(product.id, { tax_code: taxCode });
  } catch (error) {
    // Produit déjà utilisé avec Managed Payments : le code taxe est verrouillé.
    // On conserve le produit tel quel ; recreateStripeCatalogZeroTax crée un nouveau produit.
    console.warn("[billing-catalog] tax_code update skipped:", error?.message || error);
    return product;
  }
};

const archiveStripePrice = async (stripe, priceId) => {
  const id = String(priceId || "").trim();
  if (!id) return null;
  try {
    return await stripe.prices.update(id, { active: false });
  } catch (error) {
    if (isStripeResourceMissing(error)) return null;
    console.warn("[billing-catalog] price archive skipped:", id, error?.message || error);
    return null;
  }
};

const archiveStripeProduct = async (stripe, productId) => {
  const id = String(productId || "").trim();
  if (!id) return null;
  try {
    return await stripe.products.update(id, { active: false });
  } catch (error) {
    if (isStripeResourceMissing(error)) return null;
    console.warn("[billing-catalog] product archive skipped:", id, error?.message || error);
    return null;
  }
};

const ZERO_VAT_TAX_RATE_META = "zero_vat_293b";

/**
 * Taux de taxe manuel à 0 % (TVA non applicable, art. 293 B).
 * Affiché sur Checkout / factures Stripe sans augmenter le prix.
 */
export const ensureZeroVatTaxRate = async () => {
  const stripe = getStripeClient();
  const envId = String(process.env.STRIPE_TAX_RATE_ZERO_VAT || "").trim();

  if (envId) {
    try {
      const existing = await stripe.taxRates.retrieve(envId);
      if (existing?.id && existing.active !== false) return existing;
    } catch (error) {
      if (!isStripeResourceMissing(error)) throw error;
    }
  }

  const listed = await stripe.taxRates.list({ limit: 100, active: true });
  const match = (listed.data || []).find((rate) => {
    if (String(rate?.metadata?.ecoboty_tax_rate || "") === ZERO_VAT_TAX_RATE_META) return true;
    return (
      Number(rate?.percentage) === 0 &&
      String(rate?.display_name || "").toUpperCase().includes("TVA") &&
      String(rate?.country || "").toUpperCase() === "FR"
    );
  });
  if (match) return match;

  return stripe.taxRates.create({
    display_name: "TVA",
    description: "TVA non applicable (0 %) — article 293 B du CGI",
    percentage: 0,
    inclusive: true,
    country: "FR",
    jurisdiction: "FR",
    tax_type: "vat",
    metadata: {
      ecoboty_tax_rate: ZERO_VAT_TAX_RATE_META
    }
  });
};

export const ensureStripePriceProductTaxCode = async (priceId) => {
  const normalizedPriceId = String(priceId || "").trim();
  if (!normalizedPriceId) return null;

  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(normalizedPriceId, { expand: ["product"] });
  const product =
    price?.product && typeof price.product === "object"
      ? price.product
      : await stripe.products.retrieve(String(price.product || ""));
  return ensureProductTaxCode(stripe, product);
};

const isStripeResourceMissing = (error) => {
  const code = String(error?.code || error?.raw?.code || "");
  const status = Number(error?.statusCode || error?.raw?.statusCode || 0);
  return code === "resource_missing" || status === 404;
};

const retrieveActiveStripeProduct = async (stripe, productId) => {
  if (!productId) return null;
  try {
    const product = await stripe.products.retrieve(productId);
    return product?.active === false ? null : product;
  } catch (error) {
    if (isStripeResourceMissing(error)) return null;
    throw error;
  }
};

const findPremiumProductOnStripe = async (stripe) => {
  const products = await stripe.products.list({ limit: 100, active: true });
  const match = (products.data || []).find(
    (product) => String(product?.metadata?.ecoboty_plan_key || "") === "premium"
  );
  return match || null;
};

const ensurePremiumProduct = async (stripe, premiumPlan, envOverrides = {}) => {
  const candidates = [
    envOverrides.stripe_product_id,
    premiumPlan?.stripeProductId
  ].filter(Boolean);

  for (const candidate of candidates) {
    const product = await retrieveActiveStripeProduct(stripe, candidate);
    if (product) return ensureProductTaxCode(stripe, product);
  }

  const existing = await findPremiumProductOnStripe(stripe);
  if (existing) return ensureProductTaxCode(stripe, existing);

  return ensureProductTaxCode(
    stripe,
    await stripe.products.create({
      name: "EcoBoty Premium",
      description: "Premium subscription for a Discord server — EcoBoty economy bot",
      metadata: { ecoboty_plan_key: "premium" },
      tax_code: resolvePremiumTaxCode()
    })
  );
};

const retrieveActiveStripePrice = async (stripe, priceId) => {
  if (!priceId) return null;
  try {
    const price = await stripe.prices.retrieve(priceId);
    return price?.active === false ? null : price;
  } catch (error) {
    if (isStripeResourceMissing(error)) return null;
    throw error;
  }
};

const findPremiumPriceOnStripe = async (stripe, { productId, metadataKey }) => {
  const prices = await stripe.prices.list({ product: productId, limit: 100, active: true });
  return (prices.data || []).find(
    (price) => String(price?.metadata?.ecoboty_price_key || "") === metadataKey
  ) || null;
};

const ensurePremiumPrice = async (stripe, { productId, spec, premiumPlan, envOverrides = {} }) => {
  const envPriceId = envOverrides[spec.column] || null;
  const dbPriceId = premiumPlan?.[spec.column] || null;
  const candidates = [envPriceId, dbPriceId].filter(Boolean);

  for (const candidate of candidates) {
    const price = await retrieveActiveStripePrice(stripe, candidate);
    if (price && String(price.product) === String(productId)) return price;
  }

  const existing = await findPremiumPriceOnStripe(stripe, {
    productId,
    metadataKey: spec.metadataKey
  });
  if (existing) return existing;

  return stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: spec.amount,
    // Prix TTC : pas de taxe ajoutée au checkout (Managed Payments off + pas de Stripe Tax).
    tax_behavior: "inclusive",
    recurring: { interval: spec.interval, interval_count: spec.interval_count },
    metadata: {
      ecoboty_plan_key: "premium",
      ecoboty_price_key: spec.metadataKey,
      ecoboty_tax: "zero_vat_293b"
    }
  });
};

/**
 * Ensure Stripe Product + Prices exist for the current Stripe account (test/live)
 * and persist IDs in billing_plan_definitions.
 */
export const syncStripeCatalog = async ({ source = "manual" } = {}) => {
  if (!isStripeConfigured()) {
    return { ok: false, reason: "stripe_not_configured", source };
  }

  const premium = await getPlanByKey("premium");
  if (!premium) {
    return { ok: false, reason: "premium_plan_missing", source };
  }

  const envOverrides = readEnvCatalogOverrides();
  const stripe = getStripeClient();
  const zeroVatTaxRate = await ensureZeroVatTaxRate();
  const product = await ensureProductTaxCode(stripe, await ensurePremiumProduct(stripe, premium, envOverrides));

  const updates = {
    stripe_product_id: product.id,
    updated_at: new Date()
  };
  const priceIds = {};

  for (const spec of PREMIUM_PRICE_SPECS) {
    const price = await ensurePremiumPrice(stripe, {
      productId: product.id,
      spec,
      premiumPlan: premium,
      envOverrides
    });
    updates[spec.column] = price.id;
    priceIds[spec.key] = price.id;
  }

  await db("billing_plan_definitions").where({ plan_key: "premium" }).update(updates);

  return {
    ok: true,
    source,
    productId: product.id,
    priceIds,
    taxRateId: zeroVatTaxRate?.id || null,
    mode: product.livemode ? "live" : "test"
  };
};

/**
 * Archive l’ancien produit/prix Premium et recrée un catalogue à 0 % TVA
 * (code taxe non taxable). Les abonnements existants restent sur les anciens prix.
 */
export const recreateStripeCatalogZeroTax = async ({ source = "admin_recreate_zero_tax" } = {}) => {
  if (!isStripeConfigured()) {
    return { ok: false, reason: "stripe_not_configured", source };
  }

  const premium = await getPlanByKey("premium");
  if (!premium) {
    return { ok: false, reason: "premium_plan_missing", source };
  }

  const envOverrides = readEnvCatalogOverrides();
  const stripe = getStripeClient();
  const zeroVatTaxRate = await ensureZeroVatTaxRate();
  const archived = { products: [], prices: [] };

  const priceCandidates = [
    envOverrides.stripe_price_monthly_id,
    envOverrides.stripe_price_quarterly_id,
    envOverrides.stripe_price_yearly_id,
    premium.stripePriceMonthlyId,
    premium.stripePriceQuarterlyId,
    premium.stripePriceYearlyId
  ].filter(Boolean);

  for (const priceId of new Set(priceCandidates)) {
    const archivedPrice = await archiveStripePrice(stripe, priceId);
    if (archivedPrice?.id) archived.prices.push(archivedPrice.id);
  }

  const productCandidates = [envOverrides.stripe_product_id, premium.stripeProductId].filter(Boolean);
  for (const productId of new Set(productCandidates)) {
    try {
      const listed = await stripe.prices.list({ product: productId, limit: 100, active: true });
      for (const price of listed.data || []) {
        const archivedPrice = await archiveStripePrice(stripe, price.id);
        if (archivedPrice?.id) archived.prices.push(archivedPrice.id);
      }
    } catch (error) {
      console.warn("[billing-catalog] list prices for archive skipped:", productId, error?.message || error);
    }
    const archivedProduct = await archiveStripeProduct(stripe, productId);
    if (archivedProduct?.id) archived.products.push(archivedProduct.id);
  }

  const existing = await findPremiumProductOnStripe(stripe);
  if (existing?.id && !archived.products.includes(existing.id)) {
    try {
      const listed = await stripe.prices.list({ product: existing.id, limit: 100, active: true });
      for (const price of listed.data || []) {
        const archivedPrice = await archiveStripePrice(stripe, price.id);
        if (archivedPrice?.id) archived.prices.push(archivedPrice.id);
      }
    } catch {
      // ignore
    }
    const archivedProduct = await archiveStripeProduct(stripe, existing.id);
    if (archivedProduct?.id) archived.products.push(archivedProduct.id);
  }

  const taxCode = resolvePremiumTaxCode();
  const product = await stripe.products.create({
    name: "EcoBoty Premium",
    description:
      "Abonnement Premium EcoBoty — prix TTC, TVA non applicable (0 %, art. 293 B du CGI).",
    metadata: {
      ecoboty_plan_key: "premium",
      ecoboty_tax: "zero_vat_293b"
    },
    tax_code: taxCode
  });

  const updates = {
    stripe_product_id: product.id,
    updated_at: new Date()
  };
  const priceIds = {};

  for (const spec of PREMIUM_PRICE_SPECS) {
    const price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: spec.amount,
      tax_behavior: "inclusive",
      recurring: { interval: spec.interval, interval_count: spec.interval_count },
      metadata: {
        ecoboty_plan_key: "premium",
        ecoboty_price_key: spec.metadataKey,
        ecoboty_tax: "zero_vat_293b"
      }
    });
    updates[spec.column] = price.id;
    priceIds[spec.key] = price.id;
  }

  await db("billing_plan_definitions").where({ plan_key: "premium" }).update(updates);

  return {
    ok: true,
    source,
    recreated: true,
    taxCode,
    productId: product.id,
    priceIds,
    taxRateId: zeroVatTaxRate?.id || null,
    archived: {
      products: [...new Set(archived.products)],
      prices: [...new Set(archived.prices)]
    },
    mode: product.livemode ? "live" : "test",
    note: "Checkout uses managed_payments.enabled=false + TVA 0% tax rate. Existing subscriptions keep old prices."
  };
};

/** @deprecated use syncStripeCatalog */
export const syncStripeCatalogFromEnv = async () => syncStripeCatalog({ source: "env" });

/** @deprecated use syncStripeCatalog */
export const bootstrapStripeCatalog = async () => syncStripeCatalog({ source: "bootstrap" });

export const getBillingCatalogAdminOverview = async () => {
  const premium = await getPlanByKey("premium");
  let zeroVatTaxRateId = String(process.env.STRIPE_TAX_RATE_ZERO_VAT || "").trim() || null;
  if (isStripeConfigured()) {
    try {
      const rate = await ensureZeroVatTaxRate();
      zeroVatTaxRateId = rate?.id || zeroVatTaxRateId;
    } catch {
      // overview stays usable even if Stripe tax rate lookup fails
    }
  }
  return {
    stripeConfigured: isStripeConfigured(),
    zeroVatTaxRateId,
    premium: premium
      ? {
          planKey: premium.planKey,
          stripeProductId: premium.stripeProductId,
          stripePriceMonthlyId: premium.stripePriceMonthlyId,
          stripePriceQuarterlyId: premium.stripePriceQuarterlyId,
          stripePriceYearlyId: premium.stripePriceYearlyId
        }
      : null
  };
};
