<script setup>
const props = defineProps({
  guildId: { type: String, required: true }
});

const config = useRuntimeConfig();
const { getToken } = useAuth();
const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const { comparisonSections, cellValue } = useBillingComparison();
const { loading: catalogLoading, premiumPlan, resolvePremiumDisplay, loadCatalog } = useBillingCatalog();

const loading = ref(true);
const actionLoading = ref(false);
const billing = ref(null);
const selectedInterval = ref("yearly");
const waiveRetraction = ref(false);

const intervalOptions = computed(() => [
  { value: "monthly", label: t("billing.intervals.monthly"), discount: null },
  { value: "quarterly", label: t("billing.intervals.quarterly"), discount: "−10%" },
  { value: "yearly", label: t("billing.intervals.yearly"), discount: "−20%" }
]);

const premiumDisplay = computed(() => resolvePremiumDisplay(selectedInterval.value));

const premiumHighlights = computed(() => [
  t("pricing.premium.item2"),
  t("pricing.premium.item3"),
  t("pricing.premium.item4"),
  t("pricing.premium.item5")
]);

const statusLabel = computed(() => {
  if (!billing.value) return t("billing.status.free");
  if (billing.value.isPremium) return t("billing.status.premium");
  return t("billing.status.free");
});

const periodEndLabel = computed(() => {
  const raw = billing.value?.subscription?.currentPeriodEnd;
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleDateString();
  } catch {
    return null;
  }
});

const loadBilling = async () => {
  loading.value = true;
  try {
    const token = await getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${props.guildId}/billing`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "billing_fetch_failed");
    billing.value = data;
  } catch (error) {
    toast.add({
      title: t("billing.errors.load"),
      description: String(error?.message || error),
      color: "error"
    });
  } finally {
    loading.value = false;
  }
};

const syncAfterCheckout = async () => {
  if (route.query.billing !== "success") return;
  try {
    const token = await getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${props.guildId}/billing/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.billing) {
      billing.value = data.billing;
      if (data.billing.isPremium) {
        toast.add({ title: t("billing.panel.checkoutSuccess"), color: "success" });
      }
    }
  } catch {
    // loadBilling still runs afterward
  }
};

const startCheckout = async () => {
  if (!waiveRetraction.value) {
    toast.add({ title: t("billing.errors.waiverRequired"), color: "warning" });
    return;
  }
  actionLoading.value = true;
  try {
    const token = await getToken();
    const endorselyReferral =
      typeof window !== "undefined" && typeof window.endorsely_referral === "string"
        ? window.endorsely_referral.trim()
        : "";
    const res = await fetch(`${config.public.apiBase}/api/guilds/${props.guildId}/billing/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        interval: selectedInterval.value,
        waiveRetraction: true,
        endorselyReferral: endorselyReferral || undefined
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "billing_checkout_failed");
    if (data.url) window.location.href = data.url;
  } catch (error) {
    toast.add({
      title: t("billing.errors.checkout"),
      description: String(error?.message || error),
      color: "error"
    });
  } finally {
    actionLoading.value = false;
  }
};

const openPortal = async () => {
  actionLoading.value = true;
  try {
    const token = await getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${props.guildId}/billing/portal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "billing_portal_failed");
    if (data.url) window.location.href = data.url;
  } catch (error) {
    toast.add({
      title: t("billing.errors.portal"),
      description: String(error?.message || error),
      color: "error"
    });
  } finally {
    actionLoading.value = false;
  }
};

onMounted(async () => {
  void loadCatalog();
  await syncAfterCheckout();
  await loadBilling();
});
</script>

<template>
  <div class="guild-billing">
    <header class="billing-header">
      <div>
        <h2>{{ $t("billing.panel.title") }}</h2>
        <p>{{ $t("billing.panel.subtitle") }}</p>
      </div>
    </header>

    <div v-if="loading" class="billing-loading">{{ $t("common.loading") }}</div>

    <template v-else>
      <section class="current-plan-card" :class="{ premium: billing?.isPremium }">
        <div class="current-plan-kicker">{{ $t("billing.panel.currentPlan") }}</div>
        <p v-if="billing?.guildName" class="current-plan-server">
          {{ $t("billing.panel.serverLabel", { name: billing.guildName, id: billing.guildId || guildId }) }}
        </p>
        <div class="current-plan-row">
          <div>
            <div class="current-plan-name">{{ statusLabel }}</div>
            <p v-if="billing?.isPremium && periodEndLabel" class="current-plan-meta">
              {{ $t("billing.panel.periodEnd", { date: periodEndLabel }) }}
            </p>
            <p v-else-if="!billing?.isPremium" class="current-plan-meta">
              {{ $t("billing.panel.freeSummary") }}
            </p>
            <p v-if="billing?.subscription?.cancelAtPeriodEnd" class="current-plan-warn">
              {{ $t("billing.panel.cancelScheduled") }}
            </p>
          </div>
          <UBadge
            :color="billing?.isPremium ? 'primary' : 'neutral'"
            variant="subtle"
            size="lg"
          >
            {{ statusLabel }}
          </UBadge>
        </div>
      </section>

      <div v-if="!billing?.isPremium" class="free-limits-banner">
        {{ $t("billing.panel.freeLimits") }}
      </div>

      <section v-if="billing?.isPremium" class="premium-active-card">
        <p>{{ $t("billing.panel.premiumActive") }}</p>
        <UButton color="primary" variant="outline" :loading="actionLoading" @click="openPortal">
          {{ $t("billing.panel.manage") }}
        </UButton>
      </section>

      <section v-else class="upgrade-section">
        <div class="upgrade-head">
          <h3>{{ $t("billing.panel.upgradeSection") }}</h3>
          <p>{{ $t("billing.panel.upgradeLead") }}</p>
        </div>

        <div class="interval-toggle" role="tablist" :aria-label="$t('billing.panel.intervalLabel')">
          <button
            v-for="option in intervalOptions"
            :key="option.value"
            type="button"
            role="tab"
            :class="{ active: selectedInterval === option.value }"
            :aria-selected="selectedInterval === option.value"
            @click="selectedInterval = option.value"
          >
            {{ option.label }}
            <span v-if="option.discount" class="discount-pill">{{ option.discount }}</span>
          </button>
        </div>

        <article class="premium-offer-card">
          <div class="recommended-badge">{{ $t("billing.panel.recommended") }}</div>
          <div class="offer-top">
            <div>
              <h4>{{ premiumPlan.label || "Premium" }}</h4>
              <p>{{ premiumPlan.description || $t("pricing.premium.short") }}</p>
            </div>
            <div class="offer-price">
              <span class="amount">{{ premiumDisplay.perMonth }}</span>
              <span class="period">/ {{ $t("pricing.perMonth") }}</span>
            </div>
          </div>
          <p v-if="premiumDisplay.billed" class="offer-billed">
            {{ premiumDisplay.billed }}
            <span v-if="premiumDisplay.discountPercent" class="save">(−{{ premiumDisplay.discountPercent }}%)</span>
          </p>
          <p v-else class="offer-billed">{{ $t("pricing.billedMonthly") }}</p>

          <ul class="offer-features">
            <li v-for="(item, index) in premiumHighlights" :key="`hl-${index}`">
              <UIcon name="i-lucide-check" class="check-icon" />
              <span>{{ item }}</span>
            </li>
          </ul>

          <label class="waiver">
            <input v-model="waiveRetraction" type="checkbox" />
            <span>
              {{ $t("billing.panel.waiver") }}
              <NuxtLink to="/conditions" class="legal-link">{{ $t("billing.panel.legalLinks") }}</NuxtLink>
            </span>
          </label>

          <UButton
            class="checkout-btn"
            color="primary"
            size="xl"
            block
            :loading="actionLoading || catalogLoading"
            @click="startCheckout"
          >
            {{ $t("billing.panel.checkoutStripe") }}
          </UButton>
        </article>
      </section>

      <section class="compare-section">
        <div class="compare-head">
          <h3>{{ $t("billing.panel.compareTitle") }}</h3>
          <p>{{ $t("pricing.compareIntro") }}</p>
        </div>

        <div class="compare-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ $t("pricing.compareFeature") }}</th>
                <th>Free</th>
                <th class="premium-col">Premium</th>
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
                    <UIcon v-if="cellValue(row.free) === 'check'" name="i-lucide-check" class="check-icon" />
                    <span v-else-if="cellValue(row.free) === 'dash'" class="dash">—</span>
                    <span v-else>{{ row.free }}</span>
                  </td>
                  <td class="value-cell premium-col">
                    <UIcon v-if="cellValue(row.premium) === 'check'" name="i-lucide-check" class="check-icon" />
                    <span v-else-if="cellValue(row.premium) === 'dash'" class="dash">—</span>
                    <span v-else>{{ row.premium }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.guild-billing {
  display: grid;
  gap: 20px;
  max-width: 980px;
}

.billing-header h2 {
  margin: 0 0 6px;
  font-family: var(--font-display, var(--ui-font));
  font-size: 1.65rem;
  letter-spacing: -0.02em;
}

.billing-header p {
  margin: 0;
  color: var(--ui-text-muted);
  line-height: 1.5;
}

.billing-loading {
  color: var(--ui-text-muted);
  padding: 24px 0;
}

.current-plan-card {
  border: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
  border-radius: 18px;
  padding: 18px 20px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ui-bg-elevated) 96%, transparent),
    color-mix(in srgb, var(--ui-bg) 88%, transparent)
  );
}

.current-plan-card.premium {
  border-color: color-mix(in srgb, var(--ui-primary) 45%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-primary) 12%, transparent);
}

.current-plan-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d4a017;
  font-weight: 700;
  margin-bottom: 10px;
}

.current-plan-server {
  margin: -4px 0 12px;
  color: var(--ui-text-muted);
  font-size: 0.92rem;
  line-height: 1.45;
}

.current-plan-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.current-plan-name {
  font-size: 1.35rem;
  font-weight: 700;
  text-transform: capitalize;
}

.current-plan-meta {
  margin: 6px 0 0;
  color: var(--ui-text-muted);
  line-height: 1.45;
  font-size: 0.92rem;
}

.current-plan-warn {
  margin: 8px 0 0;
  color: var(--ui-warning);
  font-size: 0.9rem;
}

.free-limits-banner {
  border: 1px solid color-mix(in srgb, #ef4444 35%, transparent);
  background: color-mix(in srgb, #ef4444 10%, transparent);
  color: color-mix(in srgb, #fecaca 85%, var(--ui-text));
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 0.92rem;
  line-height: 1.45;
}

.premium-active-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--ui-primary) 35%, transparent);
  border-radius: 16px;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--ui-primary) 8%, transparent);
}

.premium-active-card p {
  margin: 0;
}

.upgrade-section {
  display: grid;
  gap: 16px;
}

.upgrade-head h3 {
  margin: 0 0 4px;
  font-size: 1.15rem;
}

.upgrade-head p {
  margin: 0;
  color: var(--ui-text-muted);
  line-height: 1.45;
}

.interval-toggle {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
  background: color-mix(in srgb, var(--ui-bg) 70%, transparent);
  width: fit-content;
}

.interval-toggle button {
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  border-radius: 999px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s ease, color 0.2s ease;
}

.interval-toggle button.active {
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
  box-shadow: 0 1px 8px color-mix(in srgb, #000 18%, transparent);
}

.discount-pill {
  font-size: 0.72rem;
  color: var(--ui-primary);
  font-weight: 700;
}

.premium-offer-card {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--ui-primary) 42%, transparent);
  border-radius: 22px;
  padding: 24px 22px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--ui-primary) 10%, var(--ui-bg-elevated)),
    color-mix(in srgb, var(--ui-bg) 92%, transparent)
  );
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ui-primary) 14%, transparent),
    0 20px 50px color-mix(in srgb, var(--ui-primary) 10%, transparent);
  display: grid;
  gap: 14px;
}

.recommended-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, #d4a017 22%, transparent);
  color: #fbbf24;
  border: 1px solid color-mix(in srgb, #d4a017 35%, transparent);
}

.offer-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-right: 88px;
}

.offer-top h4 {
  margin: 0 0 4px;
  font-size: 1.35rem;
}

.offer-top p {
  margin: 0;
  color: var(--ui-text-muted);
  line-height: 1.45;
  max-width: 420px;
}

.offer-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: none;
}

.offer-price .amount {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.offer-price .period {
  color: var(--ui-text-muted);
  font-size: 0.92rem;
  font-weight: 600;
}

.offer-billed {
  margin: -4px 0 0;
  color: var(--ui-text-muted);
  font-size: 0.92rem;
}

.save {
  color: var(--ui-primary);
  font-weight: 700;
}

.offer-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.offer-features li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.4;
}

.check-icon {
  width: 18px;
  height: 18px;
  color: var(--ui-primary);
  flex: none;
  margin-top: 1px;
}

.waiver {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--ui-text-muted);
  cursor: pointer;
}

.waiver input[type="checkbox"] {
  width: 16px !important;
  height: 16px !important;
  min-width: 16px;
  flex: none;
  margin: 3px 0 0;
  accent-color: var(--ui-primary);
  cursor: pointer;
}

.legal-link {
  color: var(--ui-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.checkout-btn {
  font-weight: 700;
}

.compare-section {
  margin-top: 8px;
}

.compare-head h3 {
  margin: 0 0 6px;
  font-size: 1.25rem;
}

.compare-head p {
  margin: 0 0 14px;
  color: var(--ui-text-muted);
  line-height: 1.45;
  font-size: 0.92rem;
}

.compare-table-wrap {
  overflow-x: auto;
  border: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--ui-bg-elevated) 90%, transparent);
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
  border-bottom: 1px solid color-mix(in srgb, var(--ui-border) 70%, transparent);
  vertical-align: top;
}

th {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-text-muted);
}

th:nth-child(2),
th:nth-child(3),
.value-cell {
  text-align: center;
  width: 130px;
}

th.premium-col,
td.premium-col {
  color: color-mix(in srgb, var(--ui-primary) 85%, var(--ui-text));
}

.section-row td {
  background: color-mix(in srgb, var(--ui-primary) 8%, transparent);
  color: var(--ui-primary);
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.feature-cell {
  display: grid;
  gap: 4px;
}

.feature-cell strong {
  font-weight: 650;
}

.hint {
  color: var(--ui-text-muted);
  font-size: 0.86rem;
  line-height: 1.4;
}

.dash {
  color: var(--ui-text-muted);
}

@media (max-width: 720px) {
  .offer-top {
    flex-direction: column;
    padding-right: 0;
    padding-top: 28px;
  }

  .recommended-badge {
    top: 12px;
    right: 12px;
  }
}
</style>
