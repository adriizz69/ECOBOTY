<template>
  <section class="page">
    <div class="page-hero">
      <div class="hero-copy">
        <span class="hero-kicker">USER HUB</span>
        <h2>{{ $t("userHome.title") }}</h2>
        <p class="muted">
          {{ $t("userHome.subtitle") }}
        </p>
      </div>
      <div class="hero-actions">
        <div class="hero-stat">
          <span class="muted small">SERVERS</span>
          <strong>{{ loading ? "--" : servers.length }}</strong>
        </div>
        <div class="hero-stat">
          <span class="muted small">STATUS</span>
          <strong>{{ loading ? "LOADING" : disabled ? "LOCKED" : "READY" }}</strong>
        </div>
        <UButton class="hero-refresh" color="neutral" variant="outline" @click="refresh">
          {{ $t("common.refresh") }}
        </UButton>
      </div>
    </div>

    <UCard v-if="loading" class="card state-card">{{ $t("common.loading") }}</UCard>

    <UCard v-else-if="disabled" class="card state-card state-card--warning">
      <h3>{{ $t("userHome.disabledTitle") }}</h3>
      <p class="muted">
        {{ $t("userHome.disabledText") }}
        <span v-if="disabledReason">({{ disabledReason }})</span>.
      </p>
    </UCard>

    <div v-else class="grid server-grid">
      <UCard v-if="botGuildsWarning" class="card state-card muted">{{ botGuildsWarning }}</UCard>
      <UCard v-if="!servers.length" class="card state-card muted">
        {{ $t("userHome.noServers") }}
      </UCard>
      <UCard v-for="server in servers" :key="server.guild_id" class="card server-card">
        <span class="server-card-glow" aria-hidden="true"></span>
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
        <div class="server-footer">
          <div class="muted small">{{ $t("userHome.openHint") }}</div>
          <UButton color="primary" @click="openServer(server)">{{ $t("common.open") }}</UButton>
        </div>
      </UCard>
    </div>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const router = useRouter();
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

const openServer = async (server) => {
  const guildId = String(server?.guild_id || "");
  if (!guildId) return;
  if (process.client) {
    const payload = {
      id: guildId,
      name: server?.guild_name || guildId
    };
    localStorage.setItem("selectedGuild", JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("ecoboty:selected-guild"));
  }
  await router.push(`/user/guild/${guildId}`);
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
    if (process.client && servers.value.length) {
      let selectedId = "";
      try {
        const raw = localStorage.getItem("selectedGuild");
        const parsed = raw ? JSON.parse(raw) : null;
        selectedId = String(parsed?.id || parsed?.guild_id || "");
      } catch {
        selectedId = "";
      }
      const selectedExists = servers.value.some((server) => String(server.guild_id) === selectedId);
      if (!selectedExists) {
        const first = servers.value[0];
        localStorage.setItem(
          "selectedGuild",
          JSON.stringify({
            id: String(first.guild_id),
            name: first.guild_name || String(first.guild_id)
          })
        );
        window.dispatchEvent(new CustomEvent("ecoboty:selected-guild"));
      }
    }
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
  padding: 12px 4px 34px;
  font-family: "Space Grotesk", "Sora", "Poppins", sans-serif;
  background: transparent;
}
.page > * {
  position: relative;
  z-index: 1;
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
  overflow: hidden;
}
.page-hero::after {
  content: "";
  position: absolute;
  width: 180px;
  height: 180px;
  right: -44px;
  bottom: -70px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.28), transparent 72%);
  pointer-events: none;
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
.hero-stat strong {
  line-height: 1.1;
}
.hero-refresh {
  border-radius: 12px;
}
.server-grid {
  margin-top: 2px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.card {
  display: block;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.84), rgba(30, 41, 59, 0.68));
  box-shadow: 0 20px 34px rgba(2, 6, 23, 0.22);
}
.state-card {
  text-align: center;
  padding: 18px;
}
.state-card--warning {
  border-color: rgba(245, 158, 11, 0.38);
  background: linear-gradient(160deg, rgba(69, 26, 3, 0.36), rgba(30, 41, 59, 0.74));
}
.server-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}
.server-card-glow {
  position: absolute;
  width: 160px;
  height: 160px;
  right: -56px;
  top: -68px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.22), transparent 74%);
  pointer-events: none;
}
.server-card:hover {
  transform: translateY(-3px) scale(1.005);
  transition: transform 0.2s ease;
}
.server-head {
  display: flex;
  gap: 12px;
  align-items: center;
}
.server-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(167, 139, 250, 0.32);
  background: radial-gradient(circle at top, rgba(124, 58, 237, 0.34), rgba(30, 41, 59, 0.95));
  background-size: cover;
  background-position: center;
  color: #dbeafe;
  font-weight: 700;
}
.server-name {
  font-weight: 700;
  font-size: 15px;
}
.server-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: 12px;
}

:global(body.theme-light) .page-hero {
  background: linear-gradient(130deg, #ffffff, rgba(237, 233, 254, 0.88), rgba(219, 234, 254, 0.82));
  border-color: rgba(167, 139, 250, 0.4);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
}
:global(body.theme-light) .hero-kicker {
  background: rgba(241, 245, 249, 0.9);
  color: #0f172a;
}
:global(body.theme-light) .hero-stat {
  background: linear-gradient(130deg, rgba(245, 243, 255, 0.94), rgba(224, 231, 255, 0.82));
  border-color: rgba(124, 58, 237, 0.34);
}
:global(body.theme-light) .card {
  background: linear-gradient(150deg, #ffffff, rgba(240, 249, 255, 0.9));
  border-color: rgba(148, 163, 184, 0.26);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}
:global(body.theme-light) .state-card--warning {
  background: linear-gradient(155deg, rgba(255, 247, 237, 0.96), rgba(254, 243, 199, 0.66));
  border-color: rgba(245, 158, 11, 0.34);
}
:global(body.theme-light) .muted {
  color: var(--text-muted);
}
:global(body.theme-light) .server-icon {
  color: #0f172a;
}

@media (max-width: 780px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  .hero-stat {
    flex: 1 1 120px;
  }
  .server-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
