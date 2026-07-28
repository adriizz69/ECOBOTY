<script setup>
const config = useRuntimeConfig();
const { login, getToken } = useAuth();
const { t } = useI18n();
const router = useRouter();

const billingInterval = ref("yearly");
const loading = ref(false);
const isLoggedIn = ref(false);

const FALLBACK_PLANS = Object.freeze({
  free: {
    planKey: "free",
    label: "Free",
    description: "Pour démarrer EcoBoty sur un petit serveur.",
    prices: {
      monthly: { amountCents: 0, label: "0 €" },
      quarterly: { amountCents: 0, label: "0 €" },
      yearly: { amountCents: 0, label: "0 €" }
    }
  },
  premium: {
    planKey: "premium",
    label: "Premium",
    description: "Pour les serveurs qui veulent aller plus loin.",
    prices: {
      monthly: { amountCents: 499, label: "4,99 €", perMonth: "4,99 €", billed: null },
      quarterly: { amountCents: 1347, label: "4,49 €", perMonth: "4,49 €", billed: "13,47 € facturés / 3 mois", discountPercent: 10 },
      yearly: { amountCents: 4790, label: "3,99 €", perMonth: "3,99 €", billed: "47,90 € facturés / an", discountPercent: 20 }
    }
  }
});

const catalog = ref({
  currency: "eur",
  plans: [FALLBACK_PLANS.free, FALLBACK_PLANS.premium]
});

const freePlan = computed(() => catalog.value?.plans?.find((p) => p.planKey === "free") || FALLBACK_PLANS.free);
const premiumPlan = computed(() => catalog.value?.plans?.find((p) => p.planKey === "premium") || FALLBACK_PLANS.premium);

const premiumDisplay = computed(() => {
  const prices = premiumPlan.value?.prices || FALLBACK_PLANS.premium.prices;
  const fallback = FALLBACK_PLANS.premium.prices[billingInterval.value];
  const fromApi = prices[billingInterval.value];
  if (!fromApi) return fallback;

  if (billingInterval.value === "monthly") {
    return {
      perMonth: fromApi.label || "4,99 €",
      billed: null,
      discountPercent: 0
    };
  }
  if (billingInterval.value === "quarterly") {
    return {
      perMonth: "4,49 €",
      billed: fromApi.label || "13,47 € / 3 mois",
      discountPercent: 10
    };
  }
  return {
    perMonth: "3,99 €",
    billed: fromApi.label || "47,90 € / an",
    discountPercent: 20
  };
});

const { comparisonSections, cellValue } = useBillingComparison();

const loadCatalog = async () => {
  loading.value = true;
  try {
    const base = String(config.public.apiBase || "").replace(/\/$/, "");
    const res = await fetch(`${base}/public/billing/plans`);
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data?.plans) && data.plans.length) {
      catalog.value = data;
    }
  } catch {
    // keep fallback catalog
  } finally {
    loading.value = false;
  }
};

const handlePremiumCta = () => {
  const token = getToken();
  if (!token) {
    login();
    return;
  }
  router.push("/servers");
};

onMounted(() => {
  isLoggedIn.value = Boolean(getToken());
  void loadCatalog();
});
</script>

<template>
  <main class="tarifs-page">
    <section class="hero">
      <p class="kicker">{{ $t("pricing.kicker") }}</p>
      <h1>{{ $t("pricing.title") }}</h1>
      <p class="lede">{{ $t("pricing.subtitle") }}</p>
    </section>

    <section class="interval-toggle" aria-label="Billing interval">
      <button
        type="button"
        :class="{ active: billingInterval === 'monthly' }"
        @click="billingInterval = 'monthly'"
      >
        {{ $t("billing.intervals.monthly") }}
      </button>
      <button
        type="button"
        :class="{ active: billingInterval === 'quarterly' }"
        @click="billingInterval = 'quarterly'"
      >
        {{ $t("billing.intervals.quarterly") }}
        <span class="discount">−10%</span>
      </button>
      <button
        type="button"
        :class="{ active: billingInterval === 'yearly' }"
        @click="billingInterval = 'yearly'"
      >
        {{ $t("billing.intervals.yearly") }}
        <span class="discount">−20%</span>
      </button>
    </section>

    <p v-if="loading" class="loading-hint">{{ $t("common.loading") }}</p>

    <section class="plans-grid">
      <article class="plan-card">
        <div class="plan-top">
          <h2>{{ freePlan.label || "Free" }}</h2>
          <p class="plan-desc">{{ freePlan.description || $t("pricing.free.short") }}</p>
        </div>
        <div class="price-block">
          <div class="price">0 €</div>
          <p class="price-sub">{{ $t("pricing.forever") }}</p>
        </div>
        <ul class="feature-list">
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.free.item1") }}</li>
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.free.item2") }}</li>
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.free.item3") }}</li>
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.free.item4") }}</li>
        </ul>
        <UButton color="neutral" variant="outline" size="lg" block to="/">
          {{ $t("pricing.free.cta") }}
        </UButton>
      </article>

      <article class="plan-card featured">
        <div class="badge">Premium</div>
        <div class="plan-top">
          <h2>{{ premiumPlan.label || "Premium" }}</h2>
          <p class="plan-desc">{{ premiumPlan.description || $t("pricing.premium.short") }}</p>
        </div>
        <div class="price-block">
          <div class="price">
            <span class="amount">{{ premiumDisplay.perMonth }}</span>
            <span class="period">/ {{ $t("pricing.perMonth") }}</span>
          </div>
          <p v-if="premiumDisplay.billed" class="price-sub">
            {{ premiumDisplay.billed }}
            <span v-if="premiumDisplay.discountPercent" class="save">
              (−{{ premiumDisplay.discountPercent }}%)
            </span>
          </p>
          <p v-else class="price-sub">{{ $t("pricing.billedMonthly") }}</p>
        </div>
        <ul class="feature-list">
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.premium.item1") }}</li>
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.premium.item2") }}</li>
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.premium.item3") }}</li>
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.premium.item4") }}</li>
          <li><UIcon name="i-lucide-check" class="ok" /> {{ $t("pricing.premium.item5") }}</li>
        </ul>
        <UButton color="primary" size="lg" block @click="handlePremiumCta">
          {{ isLoggedIn ? $t("pricing.premium.ctaLoggedIn") : $t("pricing.premium.cta") }}
        </UButton>
      </article>
    </section>

    <p class="tax-notice" role="note">{{ $t("pricing.taxNotice") }}</p>

    <section class="compare">
      <div class="compare-head">
        <h2>{{ $t("pricing.compareTitle") }}</h2>
        <p>{{ $t("pricing.compareIntro") }}</p>
      </div>

      <div class="compare-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ $t("pricing.compareFeature") }}</th>
              <th>Free</th>
              <th>Premium</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="section in comparisonSections" :key="section.title">
              <tr class="section-row">
                <td colspan="3">{{ section.title }}</td>
              </tr>
              <tr v-for="row in section.rows" :key="row.key">
                <td class="feature-cell">
                  <strong>{{ $t(`pricing.compare.${row.key}`) }}</strong>
                  <span class="hint">{{ $t(`pricing.compareHints.${row.key}`) }}</span>
                </td>
                <td class="value-cell">
                  <UIcon v-if="cellValue(row.free) === 'check'" name="i-lucide-check" class="ok" />
                  <span v-else-if="cellValue(row.free) === 'dash'" class="dash">—</span>
                  <span v-else>{{ row.free }}</span>
                </td>
                <td class="value-cell">
                  <UIcon v-if="cellValue(row.premium) === 'check'" name="i-lucide-check" class="ok" />
                  <span v-else-if="cellValue(row.premium) === 'dash'" class="dash">—</span>
                  <span v-else>{{ row.premium }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.tarifs-page {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 12px 16px 72px;
}

.hero {
  text-align: center;
  margin-bottom: 28px;
}

.kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.78rem;
  color: var(--accent);
  font-weight: 700;
}

.hero h1 {
  margin: 10px 0 8px;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 2.9rem);
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.lede {
  margin: 0 auto;
  max-width: 620px;
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.55;
}

.interval-toggle {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.interval-toggle button {
  border: 1px solid var(--border-strong);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  color: var(--text);
  border-radius: 999px;
  padding: 10px 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
}

.interval-toggle button.active {
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  background: var(--accent-soft);
}

.discount {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 700;
}

.loading-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: -8px 0 16px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.tax-notice {
  margin: 16px 0 28px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
}

.plan-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 28px 24px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, transparent), color-mix(in srgb, var(--bg-elevated) 90%, transparent));
  display: grid;
  gap: 18px;
  align-content: start;
  box-shadow: var(--shadow);
}

.plan-card.featured {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
    0 18px 50px rgba(45, 212, 160, 0.12);
}

.badge {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}

.plan-top h2 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 1.55rem;
}

.plan-desc {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.45;
}

.price-block {
  display: grid;
  gap: 4px;
}

.price {
  font-family: var(--font-display);
  font-size: 2.3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price .period {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
}

.price-sub {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.save {
  color: var(--accent);
  font-weight: 700;
}

.feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.feature-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.4;
}

.ok {
  width: 18px;
  height: 18px;
  color: var(--accent);
  flex: 0 0 auto;
  margin-top: 2px;
}

.dash {
  color: var(--text-muted);
}

.compare {
  margin-top: 56px;
}

.compare-head {
  text-align: center;
  margin-bottom: 20px;
}

.compare-head h2 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 1.7rem;
}

.compare-head p {
  margin: 0 auto;
  max-width: 560px;
  color: var(--text-muted);
}

.compare-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

th,
td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

th {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

th:nth-child(2),
th:nth-child(3),
.value-cell {
  text-align: center;
  width: 140px;
}

.section-row td {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-weight: 700;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom-color: color-mix(in srgb, var(--accent) 18%, transparent);
}

.feature-cell {
  display: grid;
  gap: 4px;
}

.feature-cell strong {
  font-weight: 650;
}

.hint {
  color: var(--text-muted);
  font-size: 0.86rem;
  line-height: 1.4;
}

@media (max-width: 860px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }

  .plan-card.featured {
    order: -1;
  }
}
</style>
