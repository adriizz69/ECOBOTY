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

      <UCard class="card twitch-card">
        <div class="twitch-head">
          <div class="twitch-title-row">
            <UIcon name="i-simple-icons-twitch" class="twitch-brand" />
            <h3>{{ $t("accountPage.twitch.title") }}</h3>
          </div>
          <UBadge
            :color="twitchBadgeColor"
            variant="soft"
          >
            {{ twitchBadgeLabel }}
          </UBadge>
        </div>

        <div class="twitch-row">
          <div class="twitch-meta">
            <div class="profile-name">
              {{
                twitch.linked && twitch.twitchLogin
                  ? $t("accountPage.twitch.loginLabel", { login: twitch.twitchLogin })
                  : $t("accountPage.twitch.statusUnlinked")
              }}
            </div>
            <p class="muted small">
              {{ twitch.linked ? $t("accountPage.twitch.linkedHint") : $t("accountPage.twitch.unlinkedHint") }}
            </p>
          </div>
          <div class="twitch-actions">
            <UButton
              v-if="!twitch.linked"
              color="primary"
              icon="i-simple-icons-twitch"
              :loading="twitchBusy"
              @click="connectTwitch"
            >
              {{ $t("accountPage.twitch.connect") }}
            </UButton>
            <template v-else>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="twitchBusy"
                @click="connectTwitch"
              >
                {{ twitch.discordMatch ? $t("accountPage.twitch.change") : $t("accountPage.twitch.reconnect") }}
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-unlink"
                :loading="twitchBusy"
                @click="disconnectOpen = true"
              >
                {{ $t("accountPage.twitch.disconnect") }}
              </UButton>
            </template>
          </div>
        </div>

        <UAlert
          v-if="twitch.linked && twitch.discordConnectionsOk && !twitch.discordMatch"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="$t('accountPage.twitch.statusMismatch')"
          :description="$t('accountPage.twitch.mismatch')"
        />
        <UAlert
          v-else-if="twitch.needsDiscordReconnect"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          :description="$t('accountPage.twitch.needsReconnect')"
        />
        <p v-else class="muted small twitch-help">
          {{ $t("accountPage.twitch.discordHelp") }}
          <a
            :href="$t('accountPage.twitch.discordHelpHref')"
            target="_blank"
            rel="noreferrer"
          >
            {{ $t("accountPage.twitch.discordHelpLink") }}
          </a>
        </p>

        <div v-if="twitch.needsSelection && twitch.discordAccounts.length" class="twitch-picker">
          <p class="muted small">{{ $t("accountPage.twitch.selectTitle") }}</p>
          <label
            v-for="account in twitch.discordAccounts"
            :key="account.id"
            class="twitch-option"
            :class="{ selected: selectedTwitchId === account.id }"
          >
            <input v-model="selectedTwitchId" type="radio" name="compte-twitch" :value="account.id" />
            <span>@{{ account.login }}</span>
          </label>
          <UButton
            color="primary"
            size="sm"
            :disabled="!selectedTwitchId"
            :loading="twitchBusy"
            @click="confirmTwitchSelection"
          >
            {{ $t("accountPage.twitch.connect") }}
          </UButton>
        </div>
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

    <UModal
      v-model:open="disconnectOpen"
      :title="$t('accountPage.twitch.confirmDisconnectTitle')"
      :description="$t('accountPage.twitch.confirmDisconnect')"
    >
      <template #body>
        <div class="twitch-modal-actions">
          <UButton color="neutral" variant="outline" @click="disconnectOpen = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton color="error" :loading="twitchBusy" @click="disconnectTwitch">
            {{ $t("accountPage.twitch.disconnect") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { getToken, login } = useAuth();
const { t } = useI18n();

const me = ref(null);
const loading = ref(true);
const portalLoading = ref(false);
const isLoggedIn = ref(false);
const subscriptions = ref([]);
const invoices = ref([]);
const twitchBusy = ref(false);
const disconnectOpen = ref(false);
const selectedTwitchId = ref("");
const twitch = reactive({
  linked: false,
  twitchId: null,
  twitchLogin: null,
  discordAccounts: [],
  discordMatch: false,
  discordConnectionsOk: false,
  needsDiscordReconnect: false,
  needsSelection: false
});
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

const twitchBadgeColor = computed(() => {
  if (!twitch.linked) return "neutral";
  if (twitch.discordConnectionsOk && !twitch.discordMatch) return "warning";
  return "success";
});

const twitchBadgeLabel = computed(() => {
  if (!twitch.linked) return t("accountPage.twitch.statusUnlinked");
  if (twitch.discordConnectionsOk && !twitch.discordMatch) {
    return t("accountPage.twitch.statusMismatch");
  }
  return t("accountPage.twitch.statusLinked");
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

const applyTwitchStatus = (data = {}) => {
  twitch.linked = Boolean(data.linked);
  twitch.twitchId = data.twitchId || null;
  twitch.twitchLogin = data.twitchLogin || null;
  twitch.discordAccounts = Array.isArray(data.discordAccounts) ? data.discordAccounts : [];
  twitch.discordMatch = Boolean(data.discordMatch);
  twitch.discordConnectionsOk = Boolean(data.discordConnectionsOk);
  twitch.needsDiscordReconnect = Boolean(data.needsDiscordReconnect);
  twitch.needsSelection = Boolean(data.needsSelection);
  if (!selectedTwitchId.value && twitch.discordAccounts.length === 1) {
    selectedTwitchId.value = twitch.discordAccounts[0].id;
  }
};

const resetTwitchStatus = () => {
  applyTwitchStatus({});
  selectedTwitchId.value = "";
};

const twitchErrorMessage = (error) => {
  if (error === "no_twitch") return t("accountPage.twitch.errorNoTwitch");
  if (error === "twitch_already_linked") return t("accountPage.twitch.errorAlreadyLinked");
  return t("accountPage.twitch.errorGeneric");
};

const fetchTwitch = async (token) => {
  const res = await fetch(`${config.public.apiBase}/api/user/twitch`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    resetTwitchStatus();
    return;
  }
  applyTwitchStatus(data);
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
});

const startDiscordReconnect = async () => {
  const nextQuery = { ...route.query, twitch: "connect" };
  await router.replace({ query: nextQuery });
  login();
};

const syncTwitch = async (twitchId = "") => {
  const token = getToken();
  if (!token) {
    login();
    return null;
  }
  twitchBusy.value = true;
  try {
    const res = await fetch(`${config.public.apiBase}/api/user/twitch/sync`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(twitchId ? { twitchId } : {})
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.error === "discord_reconnect_required") {
      await startDiscordReconnect();
      return null;
    }
    if (!res.ok) {
      toast.add({
        title: twitchErrorMessage(data.error),
        color: "error"
      });
      return data;
    }
    applyTwitchStatus(data);
    if (data.needsSelection) {
      selectedTwitchId.value = data.discordAccounts?.[0]?.id || "";
      return data;
    }
    toast.add({
      title: data.changed === false
        ? t("accountPage.twitch.unchanged")
        : t("accountPage.twitch.connected", { login: data.twitchLogin || "" }),
      color: "success"
    });
    return data;
  } finally {
    twitchBusy.value = false;
  }
};

const connectTwitch = async () => {
  if (twitch.needsDiscordReconnect) {
    await startDiscordReconnect();
    return;
  }
  await syncTwitch();
};

const confirmTwitchSelection = async () => {
  if (!selectedTwitchId.value) return;
  await syncTwitch(selectedTwitchId.value);
};

const disconnectTwitch = async () => {
  const token = getToken();
  if (!token) {
    login();
    return;
  }
  twitchBusy.value = true;
  try {
    const res = await fetch(`${config.public.apiBase}/api/user/twitch`, {
      method: "DELETE",
      headers: authHeaders(token)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.add({ title: twitchErrorMessage(data.error), color: "error" });
      return;
    }
    applyTwitchStatus({
      ...twitch,
      linked: false,
      twitchId: null,
      twitchLogin: null,
      discordMatch: false,
      needsSelection: twitch.discordAccounts.length > 1
    });
    disconnectOpen.value = false;
    toast.add({ title: t("accountPage.twitch.disconnected"), color: "success" });
  } finally {
    twitchBusy.value = false;
  }
};

const consumeTwitchConnectQuery = async () => {
  if (String(route.query.twitch || "") !== "connect") return;
  const nextQuery = { ...route.query };
  delete nextQuery.twitch;
  await router.replace({ query: nextQuery });
  await syncTwitch();
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
    resetTwitchStatus();
    return;
  }
  isLoggedIn.value = true;
  loading.value = true;
  try {
    await Promise.all([fetchMe(token), fetchBilling(token), fetchTwitch(token)]);
    await consumeTwitchConnectQuery();
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
.twitch-card {
  padding: 18px;
  display: grid;
  gap: 12px;
}
.twitch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.twitch-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.twitch-title-row h3 {
  margin: 0;
}
.twitch-brand {
  width: 18px;
  height: 18px;
  color: #a78bfa;
}
.twitch-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.twitch-meta {
  min-width: 220px;
  flex: 1;
}
.twitch-meta p {
  margin: 4px 0 0;
}
.twitch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.twitch-help {
  margin: 0;
}
.twitch-help a {
  color: var(--ui-primary, #a78bfa);
  text-decoration: underline;
}
.twitch-picker {
  display: grid;
  gap: 8px;
}
.twitch-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.32);
  cursor: pointer;
}
.twitch-option.selected {
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(124, 58, 237, 0.16);
}
.twitch-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
