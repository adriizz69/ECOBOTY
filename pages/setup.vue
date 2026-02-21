<template>
  <section class="status-page">
    <div class="page-head">
      <div>
        <h2>{{ $t("status.title") }}</h2>
        <p>{{ $t("status.subtitle") }}</p>
      </div>
    </div>

    <div class="status-grid">
      <div v-for="item in statusItems" :key="item.key" class="status-card" :class="item.ok ? 'ok' : 'ko'">
        <div class="status-icon">{{ item.icon }}</div>
        <div>
          <div class="status-title">{{ item.title }}</div>
          <div class="status-state">{{ item.message }}</div>
          <div class="status-desc">{{ item.description }}</div>
        </div>
      </div>
    </div>

    <div class="status-panel">
      <div>
        <h3>{{ $t("status.howTitle") }}</h3>
        <p>{{ $t("status.howText") }}</p>
      </div>
      <ol>
        <li>{{ $t("status.step1") }}</li>
        <li>{{ $t("status.step2") }}</li>
        <li>{{ $t("status.step3") }}</li>
        <li>{{ $t("status.step4") }}</li>
        <li>{{ $t("status.step5") }}</li>
      </ol>
    </div>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const { t } = useI18n();
const statusData = ref({});

const statusItems = computed(() => {
  const status = statusData.value || {};
  return [
    {
      key: "web",
      title: t("status.items.web"),
      icon: "🖥️",
      ok: Boolean(status.web?.ok),
      message: status.web?.message || t("status.messages.checking.web"),
      description: t("status.descriptions.web")
    },
    {
      key: "api",
      title: t("status.items.api"),
      icon: "🌐",
      ok: Boolean(status.api?.ok),
      message: status.api?.message || t("status.messages.checking.api"),
      description: t("status.descriptions.api")
    },
    {
      key: "db",
      title: t("status.items.db"),
      icon: "🗄️",
      ok: Boolean(status.db?.ok),
      message: status.db?.message || t("status.messages.checking.db"),
      description: t("status.descriptions.db")
    },
    {
      key: "bot",
      title: t("status.items.bot"),
      icon: "🤖",
      ok: Boolean(status.bot?.ok),
      message: status.bot?.message || t("status.messages.checking.bot"),
      description: t("status.descriptions.bot")
    },
    {
      key: "twitch",
      title: t("status.items.twitch"),
      icon: "🎥",
      ok: Boolean(status.twitch?.ok),
      message: status.twitch?.message || t("status.messages.checking.twitch"),
      description: t("status.descriptions.twitch")
    },
    {
      key: "games",
      title: t("status.items.games"),
      icon: "🎮",
      ok: Boolean(status.games?.ok),
      message: status.games?.message || t("status.messages.checking.games"),
      description: t("status.descriptions.games")
    }
  ];
});

onMounted(async () => {
  try {
    const res = await fetch(`${config.public.apiBase}/api/status`);
    if (!res.ok) {
      statusData.value = {
        web: { ok: true, message: t("status.messages.ok.web") },
        api: { ok: false, message: t("status.messages.down.api", { code: res.status }) },
        db: { ok: false, message: t("status.messages.down.generic") },
        bot: { ok: false, message: t("status.messages.down.generic") },
        twitch: { ok: false, message: t("status.messages.down.generic") },
        games: { ok: false, message: t("status.messages.down.generic") }
      };
      return;
    }
    const data = await res.json();
    statusData.value = data.status || {};
  } catch {
    statusData.value = {
      web: { ok: true, message: t("status.messages.ok.web") },
      api: { ok: false, message: t("status.messages.down.generic") },
      db: { ok: false, message: t("status.messages.down.generic") },
      bot: { ok: false, message: t("status.messages.down.generic") },
      twitch: { ok: false, message: t("status.messages.down.generic") },
      games: { ok: false, message: t("status.messages.down.generic") }
    };
  }
});
</script>

<style scoped>
.status-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.page-head p {
  color: var(--text-muted);
  margin-top: 4px;
}
.status-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.status-card {
  display: flex;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35);
}
.status-card.ok {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.08);
}
.status-card.ko {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
}
.status-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--border);
  font-size: 20px;
}
.status-title {
  font-weight: 700;
}
.status-state {
  margin-top: 4px;
  font-size: 14px;
  color: var(--text);
}
.status-desc {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 13px;
}
.status-panel {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  display: grid;
  gap: 12px;
}
.status-panel h3 {
  margin: 0;
}
.status-panel p {
  margin: 0;
  color: var(--text-muted);
}
.status-panel ol {
  margin: 0;
  padding-left: 18px;
  color: var(--text-soft);
  display: grid;
  gap: 6px;
}

:global(body.theme-light) .page-head p,
:global(body.theme-light) .status-desc,
:global(body.theme-light) .status-panel p,
:global(body.theme-light) .status-panel ol {
  color: var(--text-muted);
}
:global(body.theme-light) .status-card {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
:global(body.theme-light) .status-card.ok {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.25);
}
:global(body.theme-light) .status-card.ko {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
}
:global(body.theme-light) .status-state {
  color: #1e293b;
}
:global(body.theme-light) .status-panel {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
</style>
