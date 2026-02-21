<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ $t("userHome.title") }}</h2>
        <p class="muted">
          {{ $t("userHome.subtitle") }}
        </p>
      </div>
      <UButton color="neutral" variant="outline" @click="refresh">{{ $t("common.refresh") }}</UButton>
    </div>

    <UCard v-if="loading" class="card">{{ $t("common.loading") }}</UCard>

    <UCard v-else-if="disabled" class="card">
      <h3>{{ $t("userHome.disabledTitle") }}</h3>
      <p class="muted">
        {{ $t("userHome.disabledText") }}
        <span v-if="disabledReason">({{ disabledReason }})</span>.
      </p>
    </UCard>

    <div v-else class="grid">
      <UCard v-if="botGuildsWarning" class="card muted">{{ botGuildsWarning }}</UCard>
      <UCard v-if="!servers.length" class="card muted">
        {{ $t("userHome.noServers") }}
      </UCard>
      <UCard v-for="server in servers" :key="server.guild_id" class="card server-card">
        <div class="server-head">
          <div
            class="server-icon"
            :style="server.icon ? { backgroundImage: `url(${guildIcon(server)})` } : {}"
          >
            <span v-if="!server.icon">{{ server.guild_name?.slice(0, 1) || "?" }}</span>
          </div>
          <div>
            <div class="server-name">{{ server.guild_name || $t("userHome.serverFallback") }}</div>
            <div class="muted small">{{ $t("userHome.serverId") }}: {{ server.guild_id }}</div>
          </div>
        </div>
        <div class="muted small">{{ $t("userHome.openHint") }}</div>
        <UButton color="primary" :to="`/user/guild/${server.guild_id}`">{{ $t("common.open") }}</UButton>
      </UCard>
    </div>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const { getToken, login } = useAuth();
const { t } = useI18n();
const servers = ref([]);
const loading = ref(true);
const disabled = ref(false);
const disabledReason = ref("");
const botGuildsWarning = ref("");

const guildIcon = (server) => {
  if (!server?.icon) return "";
  return `https://cdn.discordapp.com/icons/${server.guild_id}/${server.icon}.png`;
};

const fetchServers = async () => {
  const token = getToken();
  if (!token) {
    login();
    return;
  }
  loading.value = true;
  try {
    const res = await fetch(`${config.public.apiBase}/api/user/servers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      login();
      return;
    }
    const data = await res.json();
    disabled.value = Boolean(data.disabled);
    disabledReason.value = data.reason || "";
    botGuildsWarning.value = data.bot_guilds_error
      ? t("userHome.botCheckError")
      : "";
    servers.value = data.servers || [];
  } catch {
    servers.value = [];
  } finally {
    loading.value = false;
  }
};

const refresh = async () => {
  await fetchServers();
};

onMounted(fetchServers);
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding: 8px 4px 32px;
}
.page::before {
  content: "";
  position: absolute;
  inset: -120px -40px auto;
  height: 320px;
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.35), transparent 60%),
    radial-gradient(circle at 80% 0%, rgba(56, 189, 248, 0.25), transparent 55%);
  z-index: 0;
  pointer-events: none;
}
.page > * {
  position: relative;
  z-index: 1;
}
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(120deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.6));
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.card {
  display: block;
}
.server-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.server-head {
  display: flex;
  gap: 12px;
  align-items: center;
}
.server-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.35), rgba(15, 23, 42, 0.9));
  background-size: cover;
  background-position: center;
  color: #c7d2fe;
  font-weight: 700;
}
.server-name {
  font-weight: 700;
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: 12px;
}

:global(body.theme-light) .page::before {
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.18), transparent 60%),
    radial-gradient(circle at 80% 0%, rgba(56, 189, 248, 0.16), transparent 55%);
}
:global(body.theme-light) .page-head {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
:global(body.theme-light) .muted {
  color: var(--text-muted);
}
:global(body.theme-light) .server-icon {
  color: #4338ca;
}
</style>
