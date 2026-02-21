<template>
  <section>
    <div class="page-head">
      <div>
        <h2>{{ $t("servers.title") }}</h2>
        <p>{{ $t("servers.subtitle") }}</p>
      </div>
      <UButton color="error" variant="solid" @click="handleLogout">{{ $t("servers.logout") }}</UButton>
    </div>
    <div v-if="loading" class="loading">{{ $t("servers.loading") }}</div>
    <UCard v-else-if="impersonating" class="card warning-card">
      <h3>{{ $t("servers.impersonationTitle") }}</h3>
      <p class="muted">
        {{ $t("servers.impersonationText", { name: impersonatedName }) }}
      </p>
      <UButton color="error" variant="solid" @click="stopImpersonation">
        {{ $t("servers.impersonationQuit") }}
      </UButton>
    </UCard>
    <div v-else class="grid">
      <UCard v-for="guild in guilds" :key="guild.id" class="card">
        <div class="card-top">
          <div
            class="avatar"
            :style="guild.icon ? { backgroundImage: `url(${guildIconUrl(guild)})` } : {}"
          >
            <span v-if="!guild.icon">{{ guild.name?.slice(0, 1) }}</span>
          </div>
          <div>
            <strong>{{ guild.name }}</strong>
            <div
              class="status"
              :class="guild.botPresent === null ? 'warn' : guild.botPresent ? 'ok' : 'ko'"
            >
              {{
                guild.botPresent === null
                  ? $t("servers.botUnknown")
                  : guild.botPresent
                    ? $t("servers.botPresent")
                    : $t("servers.botAbsent")
              }}
            </div>
            <div v-if="guild.botCheckError" class="hint">
              {{
                guild.botCheckError.type === 'bot_token_missing'
                  ? $t("servers.botTokenMissing")
                  : $t("servers.botTokenInvalid")
              }}
            </div>
          </div>
        </div>
        <UButton color="primary" block class="card-cta" :to="`/guild/${guild.id}`" @click="selectGuild(guild)">
          {{ $t("servers.configure") }}
        </UButton>
      </UCard>
    </div>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const guilds = ref([]);
const loading = ref(true);

const router = useRouter();
const { getToken, login, logout } = useAuth();
const { t } = useI18n();
const me = ref(null);

const impersonating = computed(() => Boolean(me.value?.impersonated));
const impersonatedName = computed(() =>
  me.value?.impersonated_username || me.value?.impersonated || t("account.user")
);

const guildIconUrl = (guild) => {
  if (!guild?.icon) return "";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
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
    me.value = null;
    return false;
  }
  const data = await res.json();
  me.value = data.user || null;
  return true;
};

const fetchServers = async () => {
  try {
    const token = getToken();
    if (!token) {
      login();
      return;
    }

    const res = await fetch(`${config.public.apiBase}/api/servers`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      if (!impersonating.value) login();
      return;
    }

    const data = await res.json();
    guilds.value = data.servers || [];
  } catch {
    guilds.value = [];
  } finally {
    loading.value = false;
  }
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
  const ok = await loadMe();
  if (!ok) {
    login();
    return;
  }
  if (!impersonating.value) {
    loading.value = true;
    await fetchServers();
  }
};

onMounted(async () => {
  const ok = await loadMe();
  if (!ok) {
    login();
    return;
  }
  if (impersonating.value) {
    loading.value = false;
    return;
  }
  await fetchServers();
});
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.page-head p {
  color: var(--text-muted);
  margin: 4px 0 0;
}
.loading {
  padding: 32px 0;
  color: var(--text-muted);
}
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.card {
  display: grid;
  gap: 14px;
  height: 100%;
}
.card-cta {
  margin-top: auto;
}
.card-cta {
  justify-content: center;
}
.card-cta :global(.u-button),
.card-cta a,
.card-cta button {
  border-radius: 14px !important;
}

:global(body.theme-light) .card-cta :global(.u-button),
:global(html.light body) .card-cta :global(.u-button),
:global(body.theme-light) .card-cta a,
:global(html.light body) .card-cta a {
  background: #2563eb !important;
  color: #ffffff !important;
  border-color: #1d4ed8 !important;
}
.warning-card {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.08);
}
.card-top {
  display: flex;
  gap: 12px;
  align-items: center;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  background-size: cover;
  background-position: center;
  font-weight: 700;
}
.status {
  margin-top: 6px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(148, 163, 184, 0.18);
  color: var(--text-soft);
  border: 1px solid rgba(148, 163, 184, 0.3);
  font-weight: 600;
}
.status.ok {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}
.status.ko {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}
.status.warn {
  background: rgba(245, 158, 11, 0.2);
  color: #fde68a;
}

:global(body.theme-light) .status.ok,
:global(html.light body) .status.ok {
  background: #22c55e !important;
  color: #ffffff !important;
  border: 1px solid #16a34a !important;
}

:global(body.theme-light) .status.ko,
:global(html.light body) .status.ko {
  background: #ef4444 !important;
  color: #ffffff !important;
  border: 1px solid #dc2626 !important;
}

:global(body.theme-light) .status.warn,
:global(html.light body) .status.warn {
  background: rgba(245, 158, 11, 0.18);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.35);
}
.hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}
.cta {
  text-decoration: none;
  text-align: center;
}

:global(body.theme-light) .page-head p,
:global(body.theme-light) .loading {
  color: var(--text-muted);
}
</style>
