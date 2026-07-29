<template>
  <section class="servers-page">
    <div class="hero">
      <div class="hero-copy">
        <div class="brand-row">
          <img src="/logo.png" alt="EcoBoty" class="brand-logo" />
          <span class="eb-kicker">{{ $t("servers.kicker") }}</span>
        </div>
        <h2>{{ $t("servers.title") }}</h2>
        <p class="eb-muted">{{ $t("servers.subtitle") }}</p>
      </div>
      <div class="hero-actions">
        <UButton
          v-if="needsAuth"
          color="primary"
          icon="i-lucide-log-in"
          @click="login"
        >
          {{ $t("nav.login") }}
        </UButton>
        <template v-else>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="refreshing || loading"
            :disabled="impersonating"
            @click="refreshServers"
          >
            {{ $t("common.refresh") }}
          </UButton>
          <UButton color="error" variant="soft" icon="i-lucide-log-out" @click="handleLogout">
            {{ $t("servers.logout") }}
          </UButton>
        </template>
      </div>
    </div>

    <UCard v-if="needsAuth && !loading" class="warning-card">
      <h3>{{ $t("servers.loginRequiredTitle") }}</h3>
      <p class="muted">{{ authErrorMessage || $t("servers.loginRequiredText") }}</p>
      <UButton color="primary" icon="i-lucide-log-in" @click="login">
        {{ $t("nav.login") }}
      </UButton>
    </UCard>

    <UCard v-else-if="serversError && !loading && !impersonating" class="warning-card">
      <h3>{{ $t("servers.loadErrorTitle") }}</h3>
      <p class="muted">{{ serversError }}</p>
      <UButton color="neutral" variant="soft" icon="i-lucide-refresh-cw" @click="refreshServers">
        {{ $t("common.refresh") }}
      </UButton>
    </UCard>

    <div v-else-if="loading" class="loading-shell">
      <div class="loading-title">{{ $t("servers.loading") }}</div>
      <div class="loading-grid">
        <div v-for="n in 6" :key="n" class="loading-card"></div>
      </div>
    </div>

    <UCard v-else-if="impersonating" class="warning-card">
      <h3>{{ $t("servers.impersonationTitle") }}</h3>
      <p class="muted">
        {{ $t("servers.impersonationText", { name: impersonatedName }) }}
      </p>
      <UButton color="error" variant="solid" @click="stopImpersonation">
        {{ $t("servers.impersonationQuit") }}
      </UButton>
    </UCard>

    <div v-else class="servers-shell">
      <div class="stats-row">
        <div class="stat-chip">
          <span>{{ $t("servers.statTotal") }}</span>
          <strong>{{ guilds.length }}</strong>
        </div>
        <div class="stat-chip ok">
          <span>{{ $t("servers.statPresent") }}</span>
          <strong>{{ stats.present }}</strong>
        </div>
        <div class="stat-chip ko">
          <span>{{ $t("servers.statAbsent") }}</span>
          <strong>{{ stats.absent }}</strong>
        </div>
      </div>

      <div class="toolbar">
        <label class="search-wrap">
          <span>🔎</span>
          <input v-model.trim="searchQuery" type="text" :placeholder="$t('servers.searchPlaceholder')" />
        </label>
        <div class="filters">
          <button
            type="button"
            class="filter-btn"
            :class="{ active: statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >
            {{ $t("servers.filterAll") }}
          </button>
          <button
            type="button"
            class="filter-btn"
            :class="{ active: statusFilter === 'present' }"
            @click="statusFilter = 'present'"
          >
            {{ $t("servers.filterPresent") }}
          </button>
          <button
            type="button"
            class="filter-btn"
            :class="{ active: statusFilter === 'absent' }"
            @click="statusFilter = 'absent'"
          >
            {{ $t("servers.filterAbsent") }}
          </button>
          <button
            type="button"
            class="filter-btn"
            :class="{ active: statusFilter === 'premium' }"
            @click="statusFilter = 'premium'"
          >
            {{ $t("servers.filterPremium") }}
          </button>
          <button
            type="button"
            class="filter-btn"
            :class="{ active: statusFilter === 'free' }"
            @click="statusFilter = 'free'"
          >
            {{ $t("servers.filterFree") }}
          </button>
        </div>
      </div>

      <UCard v-if="filteredGuilds.length === 0" class="empty-card">
        <h3>{{ $t("servers.emptyTitle") }}</h3>
        <p class="muted">{{ $t("servers.emptyText") }}</p>
      </UCard>

      <div v-else class="servers-grid">
        <article v-for="guild in filteredGuilds" :key="guild.id" class="server-card">
          <div class="card-head">
            <div
              class="avatar"
              :style="guild.icon ? { backgroundImage: `url(${guildIconUrl(guild)})` } : {}"
            >
              <span v-if="!guild.icon">{{ guild.name?.slice(0, 1) }}</span>
            </div>
            <div class="card-main">
              <strong class="server-name">{{ guild.name }}</strong>
              <span class="server-id">ID: {{ guild.id }}</span>
            </div>
            <UBadge :color="guild.billing?.isPremium ? 'primary' : 'neutral'" variant="subtle">
              {{ guild.billing?.isPremium ? $t("billing.status.premium") : $t("billing.status.free") }}
            </UBadge>
          </div>

          <div class="status-line">
            <span class="status-dot" :class="statusClass(guild)"></span>
            <span class="status-text">{{ botStatusLabel(guild) }}</span>
          </div>

          <p class="card-text">{{ cardText(guild) }}</p>

          <div v-if="guild.botCheckError" class="hint">
            {{
              guild.botCheckError.type === "bot_token_missing"
                ? $t("servers.botTokenMissing")
                : $t("servers.botTokenInvalid")
            }}
          </div>

          <button
            v-if="guild.botPresent === false"
            type="button"
            class="add-bot-tile"
            @click="addBotToGuild(guild)"
          >
            <span class="add-bot-icon" aria-hidden="true">+</span>
            <span class="add-bot-copy">
              <strong>{{ $t("servers.ctaAddBot") }}</strong>
              <span>{{ $t("servers.ctaAddBotHint") }}</span>
            </span>
          </button>

          <UButton
            v-else
            color="primary"
            variant="solid"
            block
            class="server-cta"
            :to="`/guild/${guild.id}`"
            @click="selectGuild(guild)"
          >
            {{ $t("servers.ctaManage") }}
          </UButton>
          <UButton
            v-if="guild.botPresent !== false && !guild.billing?.isPremium"
            color="primary"
            variant="outline"
            block
            class="server-cta-secondary"
            :to="`/guild/${guild.id}?tab=billing`"
          >
            {{ $t("servers.upgradePremium") }}
          </UButton>
          <UButton
            v-else-if="guild.botPresent !== false && guild.billing?.isPremium"
            color="neutral"
            variant="outline"
            block
            class="server-cta-secondary"
            :to="`/guild/${guild.id}?tab=billing`"
          >
            {{ $t("servers.managePremium") }}
          </UButton>
        </article>
      </div>
    </div>

    <UModal
      v-model:open="inviteWatchOpen"
      :title="$t('servers.inviteWatchTitle')"
      :description="$t('servers.inviteWatchText')"
    >
      <template #body>
        <div class="invite-watch-body">
          <p v-if="inviteNotDetected" class="invite-watch-error">
            {{ $t("servers.inviteWatchNotDetected") }}
          </p>
          <div class="invite-watch-actions">
            <UButton color="primary" :loading="inviteChecking" @click="manualContinueInvite">
              {{ $t("servers.inviteWatchContinue") }}
            </UButton>
            <UButton color="neutral" variant="outline" @click="cancelInviteWatch">
              {{ $t("common.cancel") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const guilds = ref([]);
const loading = ref(true);
const refreshing = ref(false);
const searchQuery = ref("");
const statusFilter = ref("all");

const router = useRouter();
const { getToken, setToken, login, logout, consumeJustAuthed } = useAuth();
const { t } = useI18n();
const me = ref(null);
const needsAuth = ref(false);
const authErrorMessage = ref("");
const serversError = ref("");

const impersonating = computed(() => Boolean(me.value?.impersonated));
const impersonatedName = computed(() =>
  me.value?.impersonated_username || me.value?.impersonated || t("account.user")
);

const stats = computed(() => {
  let present = 0;
  let absent = 0;
  for (const guild of guilds.value) {
    if (guild.botPresent === true) present += 1;
    if (guild.botPresent === false) absent += 1;
  }
  return { present, absent };
});

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const botRank = (guild) => {
  if (guild.botPresent === true) return 0;
  if (guild.botPresent === null) return 1;
  return 2;
};

const filteredGuilds = computed(() => {
  const query = normalizeText(searchQuery.value);

  return [...guilds.value]
    .filter((guild) => {
      if (statusFilter.value === "present") return guild.botPresent === true;
      if (statusFilter.value === "absent") return guild.botPresent === false;
      if (statusFilter.value === "premium") return guild.billing?.isPremium === true;
      if (statusFilter.value === "free") return !guild.billing?.isPremium;
      return true;
    })
    .filter((guild) => {
      if (!query) return true;
      const name = normalizeText(guild.name);
      const id = normalizeText(guild.id);
      return name.includes(query) || id.includes(query);
    })
    .sort((a, b) => {
      const rankDiff = botRank(a) - botRank(b);
      if (rankDiff !== 0) return rankDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" });
    });
});

const guildIconUrl = (guild) => {
  if (!guild?.icon) return "";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
};

const statusClass = (guild) => {
  if (guild.botPresent === true) return "ok";
  if (guild.botPresent === false) return "ko";
  return "warn";
};

const botStatusLabel = (guild) => {
  if (guild.botPresent === true) return t("servers.botPresent");
  if (guild.botPresent === false) return t("servers.botAbsent");
  return t("servers.botUnknown");
};

const cardText = (guild) => {
  if (guild.botPresent === true) return t("servers.cardPresentText");
  if (guild.botPresent === false) return t("servers.cardAbsentText");
  return t("servers.cardUnknownText");
};

const inviteWatchOpen = ref(false);
const inviteWatchGuildId = ref("");
const inviteWatchGuildName = ref("");
const inviteChecking = ref(false);
const inviteNotDetected = ref(false);
let invitePollTimer = null;

const botInviteUrl = (guildId) => {
  const clientId = config.public.discordClientId || "CLIENT_ID";
  const permissions = "9";
  const scopes = "bot%20applications.commands";
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}&guild_id=${encodeURIComponent(String(guildId))}&disable_guild_select=true`;
};

const stopInviteWatch = () => {
  if (invitePollTimer) {
    clearInterval(invitePollTimer);
    invitePollTimer = null;
  }
};

const goToInvitedGuild = (guildId, guildName = "") => {
  stopInviteWatch();
  inviteWatchOpen.value = false;
  inviteChecking.value = false;
  if (process.client) {
    localStorage.setItem(
      "selectedGuild",
      JSON.stringify({ id: String(guildId), name: guildName || inviteWatchGuildName.value || "" })
    );
  }
  router.push(`/guild/${guildId}`);
};

const checkInvitePresence = async (guildId = inviteWatchGuildId.value) => {
  if (!guildId) return false;
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${config.public.apiBase}/api/servers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    const servers = data.servers || [];
    guilds.value = servers;
    const current = servers.find((g) => String(g.id) === String(guildId));
    if (current?.botPresent === true) {
      goToInvitedGuild(guildId, current.name);
      return true;
    }
  } catch {
    // keep waiting
  }
  return false;
};

const startInviteWatch = (guild) => {
  inviteWatchGuildId.value = String(guild.id);
  inviteWatchGuildName.value = guild.name || "";
  inviteNotDetected.value = false;
  inviteWatchOpen.value = true;
  stopInviteWatch();
  invitePollTimer = setInterval(() => {
    checkInvitePresence(guild.id);
  }, 2500);
  setTimeout(() => checkInvitePresence(guild.id), 1200);
};

const addBotToGuild = (guild) => {
  if (!guild?.id || !process.client) return;
  selectGuild(guild);
  window.open(botInviteUrl(guild.id), "_blank", "noopener,noreferrer");
  startInviteWatch(guild);
};

const manualContinueInvite = async () => {
  inviteChecking.value = true;
  inviteNotDetected.value = false;
  const ok = await checkInvitePresence(inviteWatchGuildId.value);
  inviteChecking.value = false;
  if (!ok) inviteNotDetected.value = true;
};

const cancelInviteWatch = () => {
  stopInviteWatch();
  inviteWatchOpen.value = false;
  inviteWatchGuildId.value = "";
  inviteWatchGuildName.value = "";
  inviteNotDetected.value = false;
};

const loadMe = async () => {
  const token = getToken();
  if (!token) {
    me.value = null;
    return false;
  }
  const res = await fetch(`${config.public.apiBase}/api/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    if (res.status === 401) {
      logout();
    }
    me.value = null;
    return false;
  }
  const data = await res.json();
  me.value = data.user || null;
  return true;
};

const fetchServers = async () => {
  serversError.value = "";
  try {
    const token = getToken();
    if (!token) {
      needsAuth.value = true;
      return;
    }

    const res = await fetch(`${config.public.apiBase}/api/servers`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      let errorCode = "";
      try {
        const body = await res.json();
        errorCode = String(body?.error || "");
      } catch {
        // ignore
      }
      logout();
      needsAuth.value = true;
      authErrorMessage.value =
        errorCode === "discord_token_expired"
          ? t("servers.loginExpiredText")
          : t("servers.loginRequiredText");
      guilds.value = [];
      return;
    }

    if (!res.ok) {
      serversError.value = t("servers.loadErrorText");
      guilds.value = [];
      return;
    }

    const data = await res.json();
    if (data?.token) setToken(data.token);
    guilds.value = data.servers || [];
    needsAuth.value = false;
    authErrorMessage.value = "";
  } catch {
    guilds.value = [];
    serversError.value = t("servers.loadErrorText");
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

const refreshServers = async () => {
  if (loading.value || refreshing.value || impersonating.value || needsAuth.value) return;
  refreshing.value = true;
  await fetchServers();
};

const selectGuild = (guild) => {
  if (!process.client) return;
  const payload = {
    id: guild.id,
    name: guild.name
  };
  localStorage.setItem("selectedGuild", JSON.stringify(payload));
};

const handleLogout = () => {
  logout();
  router.push("/");
};

const stopImpersonation = async () => {
  logout();
  needsAuth.value = false;
  const ok = await loadMe();
  if (!ok) {
    needsAuth.value = true;
    return;
  }
  if (!impersonating.value) {
    loading.value = true;
    await fetchServers();
  }
};

onMounted(async () => {
  // Prevent OAuth reconnect loops: never auto-redirect to Discord from this page.
  consumeJustAuthed();
  const ok = await loadMe();
  if (!ok) {
    needsAuth.value = true;
    loading.value = false;
    return;
  }
  if (impersonating.value) {
    loading.value = false;
    return;
  }
  await fetchServers();
});

watch(inviteWatchOpen, (open) => {
  if (!open) {
    stopInviteWatch();
    inviteNotDetected.value = false;
  }
});

onUnmounted(() => {
  stopInviteWatch();
});
</script>

<style scoped>
.servers-page {
  display: grid;
  gap: 22px;
}

.hero {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(45, 212, 160, 0.28);
  border-radius: 24px;
  padding: 26px 28px;
  background:
    radial-gradient(circle at top right, rgba(45, 212, 160, 0.22), transparent 48%),
    radial-gradient(circle at 20% 100%, rgba(56, 189, 248, 0.12), transparent 45%),
    linear-gradient(145deg, rgba(13, 20, 28, 0.95), rgba(13, 20, 28, 0.7));
  display: flex;
  justify-content: space-between;
  gap: 18px;
  box-shadow: var(--shadow);
}

.hero::before {
  content: "";
  position: absolute;
  right: -120px;
  top: -120px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 212, 160, 0.22), transparent 68%);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: 0 10px 22px rgba(45, 212, 160, 0.3);
}

.hero h2 {
  margin: 6px 0;
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero p {
  margin: 0;
  color: var(--text-soft);
  max-width: 620px;
}

.hero-actions {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.servers-shell {
  display: grid;
  gap: 14px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-chip {
  border: 1px solid rgba(45, 212, 160, 0.22);
  background: linear-gradient(160deg, rgba(45, 212, 160, 0.1), transparent 50%), var(--surface);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stat-chip span {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 650;
}

.stat-chip strong {
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1;
}

.stat-chip.ok {
  border-color: rgba(34, 197, 94, 0.32);
  background: linear-gradient(160deg, rgba(34, 197, 94, 0.12), transparent 50%), var(--surface);
}

.stat-chip.ko {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.11);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.search-wrap {
  min-width: 260px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  border-radius: 14px;
  padding: 10px 12px;
}

.search-wrap span {
  font-size: 14px;
}

.search-wrap input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text);
  outline: none;
  font-weight: 500;
}

.filters {
  display: flex;
  gap: 8px;
}

.filter-btn {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-soft);
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.filter-btn.active {
  color: #dbeafe;
  background: rgba(37, 99, 235, 0.18);
  border-color: rgba(59, 130, 246, 0.45);
}

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.server-card {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 18px;
  padding: 14px;
  display: grid;
  gap: 12px;
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.2);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.server-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: 0 16px 34px rgba(2, 6, 23, 0.28);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.server-cta-secondary {
  margin-top: 8px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  background-size: cover;
  background-position: center;
  font-weight: 700;
  color: var(--text-soft);
  border: 1px solid var(--border);
}

.card-main {
  min-width: 0;
  display: grid;
}

.server-name {
  font-size: 15px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server-id {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #94a3b8;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.16);
}

.status-dot.ok {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
}

.status-dot.ko {
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.16);
}

.status-dot.warn {
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
}

.status-text {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-soft);
}

.card-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  min-height: 36px;
}

.hint {
  font-size: 12px;
  color: #fbbf24;
}

.add-bot-tile {
  margin-top: auto;
  width: 100%;
  border: 1px dashed rgba(45, 212, 160, 0.55);
  background: linear-gradient(160deg, rgba(45, 212, 160, 0.14), rgba(45, 212, 160, 0.04));
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.add-bot-tile:hover {
  border-color: rgba(45, 212, 160, 0.9);
  background: linear-gradient(160deg, rgba(45, 212, 160, 0.2), rgba(45, 212, 160, 0.06));
  transform: translateY(-1px);
}

.add-bot-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: #0f172a;
  background: #2dd4a0;
  box-shadow: 0 8px 18px rgba(45, 212, 160, 0.28);
}

.add-bot-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.add-bot-copy strong {
  font-size: 14px;
  color: var(--text);
}

.add-bot-copy span {
  font-size: 12px;
  color: var(--text-muted);
}

.invite-watch-body {
  display: grid;
  gap: 14px;
}

.invite-watch-error {
  margin: 0;
  font-size: 13px;
  color: #fbbf24;
}

.invite-watch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.server-cta {
  margin-top: auto;
}

.warning-card {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.08);
}

.empty-card h3 {
  margin: 0;
}

.loading-shell {
  display: grid;
  gap: 12px;
}

.loading-title {
  color: var(--text-muted);
  font-weight: 600;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.loading-card {
  border-radius: 16px;
  height: 160px;
  border: 1px solid var(--border);
  background: linear-gradient(
    110deg,
    rgba(148, 163, 184, 0.12) 8%,
    rgba(148, 163, 184, 0.22) 18%,
    rgba(148, 163, 184, 0.12) 33%
  );
  background-size: 220% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  to {
    background-position-x: -220%;
  }
}

:global(body.theme-light) .hero,
:global(html.light body) .hero {
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 52%),
    linear-gradient(145deg, #ffffff, #f8fafc);
  border-color: rgba(148, 163, 184, 0.4);
}

:global(body.theme-light) .hero-kicker,
:global(html.light body) .hero-kicker {
  color: #1d4ed8;
}

:global(body.theme-light) .filter-btn.active,
:global(html.light body) .filter-btn.active {
  color: #1e3a8a;
  background: rgba(59, 130, 246, 0.14);
  border-color: rgba(59, 130, 246, 0.45);
}

@media (max-width: 920px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filter-btn {
    width: 100%;
  }

  .hero-actions {
    grid-template-columns: 1fr;
  }
}
</style>
