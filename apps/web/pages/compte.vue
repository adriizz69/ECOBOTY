<template>
  <section class="page">
    <div class="page-hero">
      <div class="hero-copy">
        <span class="hero-kicker">{{ $t("accountPage.kicker") }}</span>
        <h2>{{ $t("accountPage.title") }}</h2>
        <p class="muted">{{ $t("accountPage.subtitle") }}</p>
      </div>
      <div class="hero-actions">
        <div class="hero-stat">
          <span class="muted small">{{ $t("accountPage.managedServers") }}</span>
          <strong>{{ loading ? "--" : summary.managedServers }}</strong>
        </div>
        <div class="hero-stat">
          <span class="muted small">{{ $t("accountPage.premiumServers") }}</span>
          <strong>{{ loading ? "--" : summary.premiumServers }}</strong>
        </div>
        <div class="hero-stat">
          <span class="muted small">{{ $t("accountPage.invoices") }}</span>
          <strong>{{ loading ? "--" : summary.invoiceCount }}</strong>
        </div>
        <UButton color="neutral" variant="outline" :loading="loading" @click="refresh">
          {{ $t("common.refresh") }}
        </UButton>
      </div>
    </div>

    <UCard v-if="!isLoggedIn" class="card state-card">
      <h3>{{ $t("accountPage.loginRequired") }}</h3>
      <p class="muted">{{ $t("accountPage.loginHint") }}</p>
      <UButton color="primary" class="mt-3" @click="login">{{ $t("nav.login") }}</UButton>
    </UCard>

    <UCard v-else-if="loading" class="card state-card">{{ $t("common.loading") }}</UCard>

    <div v-else class="page-sections">
      <UCard class="card profile-card">
        <div class="profile-row">
          <div
            class="profile-avatar"
            :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}"
          >
            <UIcon v-if="!avatarUrl" name="i-lucide-user" class="size-5" />
          </div>
          <div class="profile-meta">
            <div class="profile-name">{{ me?.username || $t("account.notConnected") }}</div>
            <div class="muted small">Discord · {{ me?.discord_id || "—" }}</div>
          </div>
          <UButton
            color="primary"
            variant="solid"
            icon="i-lucide-credit-card"
            :disabled="!summary.customers.length"
            :loading="portalLoading"
            @click="openBillingPortal"
          >
            {{ $t("accountPage.manageStripe") }}
          </UButton>
        </div>
        <p class="muted profile-hint">{{ $t("accountPage.sharedHint") }}</p>
      </UCard>

      <div class="billing-columns">
        <UCard class="card billing-column">
          <h3>{{ $t("accountPage.subscriptions") }}</h3>
          <p class="muted small">{{ $t("accountPage.subscriptionsHint") }}</p>
          <div v-if="!subscriptions.length" class="empty muted">{{ $t("accountPage.noSubscriptions") }}</div>
          <div v-else class="billing-list">
            <div v-for="subscription in subscriptions" :key="subscription.guildId" class="billing-row">
              <div class="billing-row-main">
                <div
                  class="server-icon"
                  :style="subscription.guildIcon ? { backgroundImage: `url(${guildIcon(subscription)})` } : {}"
                >
                  <span v-if="!subscription.guildIcon">{{ subscription.guildName?.slice(0, 1) || "?" }}</span>
                </div>
                <div>
                  <div class="server-name">{{ subscription.guildName }}</div>
                  <div class="muted small server-id">
                    {{ $t("accountPage.serverId", { id: subscription.guildId }) }}
                  </div>
                  <div class="muted small">
                    <span :class="subscription.planKey === 'premium' ? 'tag premium' : 'tag'">
                      {{ subscription.planKey === "premium" ? $t("billing.status.premium") : $t("billing.status.free") }}
                    </span>
                    <span v-if="subscription.intervalKey"> · {{ $t(`billing.intervals.${subscription.intervalKey}`) }}</span>
                    <span v-if="subscription.currentPeriodEnd">
                      · {{ $t("accountPage.renewal", { date: formatDate(subscription.currentPeriodEnd) }) }}
                    </span>
                  </div>
                </div>
              </div>
              <UButton color="neutral" variant="soft" size="sm" :to="`/guild/${subscription.guildId}?tab=billing`">
                {{ $t("accountPage.openServerBilling") }}
              </UButton>
            </div>
          </div>
        </UCard>

        <UCard class="card billing-column">
          <h3>{{ $t("accountPage.invoicesTitle") }}</h3>
          <p class="muted small">{{ $t("accountPage.invoicesHint") }}</p>
          <div v-if="!invoices.length" class="empty muted">{{ $t("accountPage.noInvoices") }}</div>
          <div v-else class="billing-list">
            <a
              v-for="invoice in invoices"
              :key="invoice.id"
              class="billing-row invoice-row"
              :class="{ 'invoice-row--credit': invoice.kind === 'credit_note' }"
              :href="invoice.hostedInvoiceUrl || invoice.invoicePdf || '#'"
              target="_blank"
              rel="noreferrer"
            >
              <div>
                <div class="server-name">{{ invoice.title }}</div>
                <div v-if="invoice.guildId" class="muted small server-id">
                  {{ $t("accountPage.serverId", { id: invoice.guildId }) }}
                </div>
                <div class="muted small">
                  {{ invoice.amountLabel }} · {{ invoice.statusLabel }}
                  <span v-if="invoice.createdAt">· {{ formatDate(invoice.createdAt) }}</span>
                </div>
              </div>
              <UIcon name="i-lucide-arrow-up-right" class="invoice-icon" />
            </a>
          </div>
        </UCard>
      </div>
    </div>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const { getToken, login } = useAuth();
const { t } = useI18n();

const me = ref(null);
const loading = ref(true);
const portalLoading = ref(false);
const isLoggedIn = ref(false);
const subscriptions = ref([]);
const invoices = ref([]);
const summary = reactive({
  managedServers: 0,
  premiumServers: 0,
  invoiceCount: 0,
  customers: []
});

const avatarUrl = computed(() => {
  if (!me.value?.discord_id || !me.value?.avatar) return "";
  return `https://cdn.discordapp.com/avatars/${me.value.discord_id}/${me.value.avatar}.png`;
});

const guildIcon = (subscription) => {
  if (!subscription?.guildIcon) return "";
  return `https://cdn.discordapp.com/icons/${subscription.guildId}/${subscription.guildIcon}.png`;
};

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
};

const formatAmount = (amount, currency = "EUR") => {
  const numeric = Number(amount || 0) / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: String(currency || "EUR").toUpperCase()
  }).format(numeric);
};

const fetchMe = async (token) => {
  const res = await fetch(`${config.public.apiBase}/api/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    me.value = null;
    return;
  }
  const data = await res.json();
  me.value = data.user || null;
};

const fetchBilling = async (token) => {
  const res = await fetch(`${config.public.apiBase}/api/user/billing`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    summary.managedServers = 0;
    summary.premiumServers = 0;
    summary.invoiceCount = 0;
    summary.customers = [];
    subscriptions.value = [];
    invoices.value = [];
    return;
  }

  const data = await res.json();
  subscriptions.value = Array.isArray(data.subscriptions) ? data.subscriptions : [];
  invoices.value = Array.isArray(data.invoices)
    ? data.invoices.map((invoice) => {
        const isCreditNote = invoice.kind === "credit_note";
        const amount = Math.abs(Number(invoice.amountPaid || 0));
        const formatted = formatAmount(amount, invoice.currency);
        return {
          ...invoice,
          amountLabel: isCreditNote ? `−${formatted}` : formatted,
          statusLabel: isCreditNote
            ? t("accountPage.creditNoteStatus")
            : String(invoice.status || "").toUpperCase()
        };
      })
    : [];
  summary.managedServers = Number(data.summary?.managedServers || 0);
  summary.premiumServers = Number(data.summary?.premiumServers || 0);
  summary.invoiceCount = Number(data.summary?.invoiceCount || 0);
  summary.customers = Array.isArray(data.customers) ? data.customers : [];
};

const refresh = async () => {
  const token = getToken();
  if (!token) {
    isLoggedIn.value = false;
    loading.value = false;
    return;
  }
  isLoggedIn.value = true;
  loading.value = true;
  try {
    await Promise.all([fetchMe(token), fetchBilling(token)]);
  } finally {
    loading.value = false;
  }
};

const openBillingPortal = async () => {
  const token = getToken();
  if (!token) {
    login();
    return;
  }
  portalLoading.value = true;
  try {
    const res = await fetch(`${config.public.apiBase}/api/user/billing/portal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/compte`
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
    }
  } finally {
    portalLoading.value = false;
  }
};

onMounted(refresh);
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding: 12px 4px 34px;
  font-family: "Space Grotesk", "Sora", "Poppins", sans-serif;
}
.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-radius: 24px;
  padding: 18px 20px;
  background: linear-gradient(130deg, rgba(17, 24, 39, 0.95), rgba(124, 58, 237, 0.26), rgba(37, 99, 235, 0.34));
  border: 1px solid rgba(167, 139, 250, 0.28);
  box-shadow: 0 20px 44px rgba(2, 6, 23, 0.36);
}
.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 560px;
}
.hero-kicker {
  display: inline-flex;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  background: rgba(15, 23, 42, 0.42);
  color: #e2e8f0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hero-stat {
  min-width: 84px;
  padding: 9px 11px;
  border-radius: 14px;
  border: 1px solid rgba(167, 139, 250, 0.34);
  background: linear-gradient(130deg, rgba(15, 23, 42, 0.64), rgba(124, 58, 237, 0.22), rgba(37, 99, 235, 0.2));
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.page-sections {
  display: grid;
  gap: 16px;
}
.card {
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.84), rgba(30, 41, 59, 0.68));
  box-shadow: 0 20px 34px rgba(2, 6, 23, 0.22);
}
.state-card {
  text-align: center;
  padding: 24px;
}
.profile-card {
  padding: 18px;
  display: grid;
  gap: 12px;
}
.profile-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08) center / cover no-repeat;
  display: grid;
  place-items: center;
}
.profile-meta {
  flex: 1;
  min-width: 160px;
}
.profile-name {
  font-weight: 700;
  font-size: 1.05rem;
}
.profile-hint {
  margin: 0;
}
.billing-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.billing-column {
  padding: 18px;
  display: grid;
  gap: 10px;
  align-content: start;
}
.billing-column h3 {
  margin: 0;
}
.billing-list {
  display: grid;
  gap: 10px;
}
.billing-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.32);
}
.billing-row-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.server-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(167, 139, 250, 0.32);
  background: radial-gradient(circle at top, rgba(124, 58, 237, 0.34), rgba(30, 41, 59, 0.95));
  background-size: cover;
  background-position: center;
  color: #dbeafe;
  font-weight: 700;
  flex: 0 0 auto;
}
.server-name {
  font-weight: 700;
  font-size: 15px;
}
.tag {
  display: inline-flex;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.45);
}
.tag.premium {
  border-color: rgba(45, 212, 160, 0.4);
  color: #99f6e4;
  background: rgba(45, 212, 160, 0.12);
}
.invoice-row {
  color: inherit;
  text-decoration: none;
}
.invoice-row--credit .server-name {
  color: #fca5a5;
}
.invoice-row--credit .muted.small {
  color: #f87171;
}
.invoice-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  flex: 0 0 auto;
}
.empty {
  padding: 12px 0;
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: 12px;
}
.mt-3 {
  margin-top: 12px;
}

@media (max-width: 900px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .billing-columns {
    grid-template-columns: 1fr;
  }
  .billing-row,
  .billing-row-main {
    flex-wrap: wrap;
  }
}
</style>
