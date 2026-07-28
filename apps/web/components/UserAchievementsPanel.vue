<template>
  <UCard class="card achievements-user">
    <div class="achv-shell">
      <section v-if="enabled && !loading" class="head-stats-grid">
        <article class="head-stat-card">
          <span class="head-stat-label">Total</span>
          <strong>{{ achievements.length }}</strong>
        </article>
        <article class="head-stat-card done">
          <span class="head-stat-label">Termines</span>
          <strong>{{ completedCount }}</strong>
        </article>
        <article class="head-stat-card progress">
          <span class="head-stat-label">En cours</span>
          <strong>{{ inProgressCount }}</strong>
        </article>
        <article class="head-stat-card neutral">
          <span class="head-stat-label">Non commences</span>
          <strong>{{ notStartedCount }}</strong>
        </article>
      </section>

      <section class="filters-wrap">
        <div class="filters-head">
          <div class="filters-title">Filtres</div>
          <UButton color="neutral" variant="outline" :loading="loading" @click="loadAchievements">Actualiser</UButton>
        </div>
        <div class="filters">
          <label class="field">
            <span>Statut</span>
            <EbSelect v-model="statusFilter" :items="statusFilterItems" :searchable="false" />
          </label>
          <label class="field">
            <span>Type</span>
            <EbSelect v-model="typeFilter" :items="typeFilterItems" :searchable="false" />
          </label>
          <label class="field">
            <span>Recherche</span>
            <input v-model.trim="search" placeholder="Nom, description ou evenement..." />
          </label>
        </div>
      </section>

      <div v-if="loading" class="state muted">Chargement...</div>
      <div v-else-if="!enabled" class="state muted">Le module succes est desactive pour ce serveur.</div>
      <div v-else-if="!filteredAchievements.length" class="state muted">Aucun succes a afficher.</div>

      <div v-else class="section-list">
        <section v-for="section in paginatedSections" :key="section.key" class="section-block">
          <div class="section-head">
            <div>
              <h4>{{ section.title }}</h4>
              <p class="muted small">{{ section.items.length }} resultat(s) sur cette page</p>
            </div>
          </div>

          <div class="achievement-grid">
            <article v-for="item in section.items" :key="item.id" class="achievement-card" :class="`status-${item.status}`">
              <div class="card-top">
                <div :class="['achievement-badge', `shape-${item.badge?.shape || 'hexagon'}`]" :style="badgeStyle(item.badge?.color)">
                  <span>{{ iconGlyph(item.badge?.icon || defaultEventIcon(item.eventKey)) }}</span>
                </div>

                <div class="headline-main">
                  <h5>{{ item.title }}</h5>
                  <p class="muted small">{{ item.description || "Sans description" }}</p>
                  <div class="meta-row small">
                    <span class="meta-pill">{{ item.type === "tier" ? "Palier" : "Unique" }}</span>
                    <span class="meta-pill">{{ eventLabel(item.eventKey) }}</span>
                    <span v-if="item.expiresAt" class="meta-pill">Expire: {{ formatDate(item.expiresAt) }}</span>
                  </div>
                </div>

                <span class="status-pill" :class="item.status">{{ statusLabel(item.status) }}</span>
              </div>

              <div v-if="item.type === 'unique'" class="progress-block">
                <div class="progress-meta">
                  <span>Progression</span>
                  <strong>{{ item.progress.current }} / {{ item.progress.target }} ({{ item.progress.percent }}%)</strong>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${item.progress.percent}%` }"></div>
                </div>
                <div class="unlock-box" :class="{ completed: item.status === 'completed' }">
                  <div class="unlock-title">
                    <span class="unlock-icon">{{ item.status === "completed" ? "✅" : "🎁" }}</span>
                    <strong v-if="item.status === 'completed'">
                      Succes obtenu le {{ completionDateLabel(item.progress?.completedAt) }}
                    </strong>
                    <strong v-else>Recompense a gagner</strong>
                  </div>
                  <p class="muted small">{{ rewardPreviewText(item.rewardPreview) }}</p>
                </div>
              </div>

              <div v-else class="tier-block">
                <div class="progress-meta">
                  <span>{{ item.completion?.completed ? "Palier final valide" : "Progression globale" }}</span>
                  <strong>{{ item.progress.percent }}%</strong>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${item.progress.percent}%` }"></div>
                </div>
                <div class="unlock-box" :class="{ completed: Boolean(item.completion?.completed) }">
                  <div class="unlock-title">
                    <span class="unlock-icon">{{ item.completion?.completed ? "✅" : "🎁" }}</span>
                    <strong v-if="item.completion?.completed">
                      Palier final obtenu le {{ completionDateLabel(item.completion?.completedAt) }}
                    </strong>
                    <strong v-else>Recompense finale a gagner</strong>
                  </div>
                  <p class="muted small">{{ rewardPreviewText(item.completionRewardPreview) }}</p>
                </div>

                <div class="tiers-grid">
                  <div v-for="tier in item.tiers" :key="tier.id" class="tier-card" :class="{ completed: tier.completed }">
                    <div :class="['tier-badge', `shape-${tier.badge?.shape || 'hexagon'}`]" :style="badgeStyle(tier.badge?.color)">
                      <span>{{ iconGlyph(tier.badge?.icon || defaultEventIcon(item.eventKey)) }}</span>
                    </div>
                    <div class="tier-body">
                      <div class="tier-title-row">
                        <strong>{{ tier.title }}</strong>
                        <span class="small">{{ tier.percent }}%</span>
                      </div>
                      <div class="progress-bar slim">
                        <div class="progress-fill" :style="{ width: `${tier.percent}%` }"></div>
                      </div>
                      <div class="muted small">{{ tier.current }} / {{ tier.target }}</div>
                      <div class="muted small tier-reward-line">
                        <span v-if="tier.completed">✅ Obtenu le {{ completionDateLabel(tier.completedAt) }}</span>
                        <span v-else>🎁 A gagner</span>
                        <span>• {{ rewardPreviewText(tier.rewardPreview) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>

      <div v-if="enabled && totalPages > 1" class="pagination">
        <UButton color="neutral" variant="outline" :disabled="page <= 1" @click="page--">Precedent</UButton>
        <span>{{ page }} / {{ totalPages }}</span>
        <UButton color="neutral" variant="outline" :disabled="page >= totalPages" @click="page++">Suivant</UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup>
const props = defineProps({
  guildId: {
    type: [String, Number],
    required: true
  },
  refreshKey: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(["visibility"]);

const { getToken, login } = useAuth();
const config = useRuntimeConfig();

const colorMap = {
  purple: "#7c3aed",
  blue: "#2563eb",
  green: "#16a34a",
  mint: "#10b981",
  gold: "#d97706",
  orange: "#ea580c",
  red: "#dc2626",
  pink: "#db2777",
  cyan: "#0891b2",
  yellow: "#ca8a04",
  white: "#cbd5e1",
  peach: "#fb923c"
};

const iconMap = {
  paw: "🐾",
  cat: "🐱",
  trophy: "🏆",
  medal: "🏅",
  sparkle: "✨",
  planet: "🪐",
  crown: "👑",
  star: "⭐",
  rocket: "🚀",
  gift: "🎁",
  coin: "🪙",
  gamepad: "🎮",
  headset: "🎧",
  shop: "🏪",
  heart: "💖",
  chat: "💬",
  fire: "🔥",
  snow: "❄️",
  target: "🎯",
  dice: "🎲",
  drop: "💧",
  shield: "🛡️",
  tag: "🏷️",
  graduation: "🎓",
  basketball: "🏀",
  bone: "🦴",
  bug: "🐞",
  thumb: "👍",
  wheel: "🎡",
  bomb: "💣",
  chef: "👨‍🍳",
  burger: "🍔",
  ghost: "👻",
  book: "📘",
  spider: "🕷️",
  tree: "🌲"
};

const eventMetaMap = {
  message_count: { label: "Messages", icon: "chat" },
  server_boost: { label: "Boost serveur", icon: "rocket" },
  role_received: { label: "Role recu", icon: "shield" },
  twitch_authenticated: { label: "Twitch lie", icon: "sparkle" },
  twitch_sub_count: { label: "Abonnements Twitch", icon: "crown" },
  twitch_subgift_count: { label: "Subgifts Twitch", icon: "gift" },
  twitch_bits_sent: { label: "Bits Twitch", icon: "coin" },
  birthday_added: { label: "Anniversaire ajoute", icon: "gift" },
  birthday_announced: { label: "Anniversaire celebre", icon: "star" },
  voice_minutes: { label: "Vocal", icon: "headset" },
  reactions_added: { label: "Reactions", icon: "heart" },
  threads_created: { label: "Threads crees", icon: "book" },
  threads_participated: { label: "Participation threads", icon: "chat" },
  economy_purchases: { label: "Achats economie", icon: "shop" },
  economy_sales_count: { label: "Ventes economie", icon: "tag" },
  lootboxes_opened: { label: "Lootbox ouvertes", icon: "gift" },
  economy_balance_reached: { label: "Solde economie", icon: "coin" },
  daily_claims: { label: "Daily", icon: "gift" },
  shop_views: { label: "Vues shop", icon: "shop" },
  twitch_watch_live_minutes: { label: "Minutes live Twitch", icon: "headset" },
  games_played: { label: "Parties jouees", icon: "gamepad" },
  games_won: { label: "Parties gagnees", icon: "trophy" }
};

const loading = ref(false);
const enabled = ref(false);
const achievements = ref([]);
const statusFilter = ref("all");
const typeFilter = ref("all");
const search = ref("");
const page = ref(1);
const pageSize = 8;

const statusFilterItems = [
  { label: "Tous", value: "all" },
  { label: "Non commence", value: "not_started" },
  { label: "En cours", value: "in_progress" },
  { label: "Termine", value: "completed" },
  { label: "Expire", value: "expired" }
];

const typeFilterItems = [
  { label: "Tous", value: "all" },
  { label: "Succes a paliers", value: "tier" },
  { label: "Succes uniques", value: "unique" }
];

const fetchJson = async (url, options = {}) => {
  const token = getToken();
  if (!token) {
    login();
    return null;
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    login();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

const loadAchievements = async () => {
  loading.value = true;
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${props.guildId}/achievements`);
  loading.value = false;
  if (!res?.ok) {
    enabled.value = false;
    achievements.value = [];
    emit("visibility", false);
    return;
  }
  enabled.value = Boolean(res.data?.enabled);
  achievements.value = Array.isArray(res.data?.achievements) ? res.data.achievements : [];
  emit("visibility", enabled.value);
  page.value = 1;
};

const filteredAchievements = computed(() => {
  const query = String(search.value || "").trim().toLowerCase();
  return (achievements.value || []).filter((item) => {
    if (statusFilter.value !== "all" && item.status !== statusFilter.value) return false;
    if (typeFilter.value !== "all" && item.type !== typeFilter.value) return false;
    if (!query) return true;
    const haystack = [
      item?.title,
      item?.description,
      item?.eventKey,
      eventLabel(item?.eventKey)
    ]
      .map((part) => String(part || "").toLowerCase())
      .join(" ");
    return haystack.includes(query);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAchievements.value.length / pageSize)));

const paginatedAchievements = computed(() => {
  const current = Math.min(Math.max(1, page.value), totalPages.value);
  const start = (current - 1) * pageSize;
  return filteredAchievements.value.slice(start, start + pageSize);
});

const paginatedSections = computed(() => {
  const rows = paginatedAchievements.value || [];
  const tiers = rows.filter((item) => item.type === "tier");
  const unique = rows.filter((item) => item.type !== "tier");
  return [
    { key: "tier", title: "Succes a paliers", items: tiers },
    { key: "unique", title: "Succes uniques", items: unique }
  ].filter((section) => section.items.length > 0);
});

const completedCount = computed(
  () => (achievements.value || []).filter((item) => item.status === "completed").length
);

const inProgressCount = computed(
  () => (achievements.value || []).filter((item) => item.status === "in_progress").length
);

const notStartedCount = computed(
  () => (achievements.value || []).filter((item) => item.status === "not_started").length
);

watch(totalPages, (value) => {
  page.value = Math.min(Math.max(1, page.value), value);
});

const statusLabel = (status) => {
  if (status === "completed") return "Termine";
  if (status === "in_progress") return "En cours";
  if (status === "expired") return "Expire";
  return "Non commence";
};

const eventLabel = (eventKey) => {
  const key = String(eventKey || "").trim();
  if (!key) return "Evenement";
  if (eventMetaMap[key]?.label) return eventMetaMap[key].label;
  return key.replaceAll("_", " ");
};

const defaultEventIcon = (eventKey) => {
  const key = String(eventKey || "").trim();
  return eventMetaMap[key]?.icon || "trophy";
};

const iconGlyph = (icon) => iconMap[icon] || "🏆";

const parseHexToRgb = (hex) => {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length !== 6) return { r: 124, g: 58, b: 237 };
  const num = Number.parseInt(raw, 16);
  if (!Number.isFinite(num)) return { r: 124, g: 58, b: 237 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

const badgeStyle = (color) => {
  const accent = colorMap[String(color || "").trim()] || colorMap.purple;
  const { r, g, b } = parseHexToRgb(accent);
  return {
    borderColor: `rgba(${r}, ${g}, ${b}, 0.55)`,
    background: `radial-gradient(circle at 30% 24%, rgba(${r}, ${g}, ${b}, 0.42), rgba(15, 23, 42, 0.14) 62%), rgba(15, 23, 42, 0.7)`,
    boxShadow: `0 10px 22px rgba(${r}, ${g}, ${b}, 0.3), inset 0 0 0 1px rgba(${r}, ${g}, ${b}, 0.22)`
  };
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const completionDateLabel = (value) => {
  if (!value) return "date inconnue";
  return formatDate(value);
};

const rewardPreviewText = (preview) => {
  const text = String(preview?.text || "").trim();
  return text || "Aucune recompense configuree";
};

watch(
  () => [props.guildId, props.refreshKey],
  () => {
    loadAchievements();
  },
  { immediate: true }
);
</script>

<style scoped>
.achievements-user {
  overflow: hidden;
}

.achv-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.head-stats-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.head-stat-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.34);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.head-stat-card strong {
  font-size: 1.3rem;
  line-height: 1;
}

.head-stat-label {
  color: var(--text-muted);
  font-size: 12px;
}

.head-stat-card.done {
  border-color: rgba(16, 185, 129, 0.45);
  background: linear-gradient(160deg, rgba(16, 185, 129, 0.18), rgba(15, 23, 42, 0.32));
}

.head-stat-card.progress {
  border-color: rgba(245, 158, 11, 0.45);
  background: linear-gradient(160deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0.32));
}

.head-stat-card.neutral {
  border-color: rgba(148, 163, 184, 0.35);
}

.filters-wrap {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  padding: 14px;
  background: rgba(15, 23, 42, 0.3);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filters-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filters-title {
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #bfdbfe;
}

.filters {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}

.field input,
.field select {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.42);
  color: inherit;
  padding: 10px 12px;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.52);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
}

.state {
  border: 1px dashed rgba(148, 163, 184, 0.36);
  border-radius: 16px;
  padding: 16px;
}

.muted {
  color: var(--text-muted);
}

.small {
  font-size: 12px;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-block {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  padding: 14px;
  background: rgba(15, 23, 42, 0.24);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-head h4 {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.2;
}

.section-head p {
  margin: 4px 0 0;
}

.achievement-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.achievement-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  padding: 14px;
  background:
    linear-gradient(160deg, rgba(15, 23, 42, 0.62), rgba(2, 6, 23, 0.45)),
    radial-gradient(circle at 85% 0%, rgba(59, 130, 246, 0.12), transparent 35%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-card.status-completed {
  border-color: rgba(16, 185, 129, 0.45);
  box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.12);
}

.achievement-card.status-in_progress {
  border-color: rgba(245, 158, 11, 0.44);
}

.achievement-card.status-expired {
  border-color: rgba(244, 63, 94, 0.36);
}

.card-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.achievement-badge,
.tier-badge {
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #f8fafc;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.achievement-badge {
  width: 58px;
  height: 58px;
  border-radius: 14px;
}

.achievement-badge span {
  font-size: 24px;
}

.headline-main {
  min-width: 0;
  flex: 1;
}

.headline-main h5 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.28;
}

.headline-main p {
  margin: 6px 0 0;
}

.meta-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-pill {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.4);
  border-radius: 999px;
  padding: 3px 8px;
}

.status-pill {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill.completed {
  color: #34d399;
  background: rgba(16, 185, 129, 0.14);
}

.status-pill.in_progress {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.14);
}

.status-pill.expired {
  color: #fda4af;
  background: rgba(244, 63, 94, 0.14);
}

.status-pill.not_started {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.12);
}

.progress-block,
.tier-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unlock-box {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 12px;
  padding: 9px 10px;
  background: rgba(15, 23, 42, 0.38);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.unlock-box.completed {
  border-color: rgba(16, 185, 129, 0.48);
  background: linear-gradient(155deg, rgba(16, 185, 129, 0.18), rgba(15, 23, 42, 0.35));
}

.unlock-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
}

.unlock-icon {
  font-size: 15px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted);
}

.progress-meta strong {
  color: #e2e8f0;
}

.progress-bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  overflow: hidden;
}

.progress-bar.slim {
  height: 7px;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8, #6366f1);
}

.tiers-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.tier-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.35);
}

.tier-card.completed {
  border-color: rgba(16, 185, 129, 0.5);
  background: linear-gradient(155deg, rgba(16, 185, 129, 0.18), rgba(15, 23, 42, 0.34));
}

.tier-badge {
  width: 42px;
  height: 42px;
  border-radius: 11px;
}

.tier-badge span {
  font-size: 18px;
}

.tier-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tier-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tier-reward-line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.shape-token,
.shape-hexagon {
  clip-path: polygon(25% 6%, 75% 6%, 94% 50%, 75% 94%, 25% 94%, 6% 50%);
}

.shape-pentagon {
  clip-path: polygon(50% 2%, 96% 35%, 78% 96%, 22% 96%, 4% 35%);
}

.shape-circle {
  clip-path: none;
  border-radius: 999px;
}

.shape-diamond {
  clip-path: polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%);
}

.shape-square {
  clip-path: none;
  border-radius: 8px;
}

.shape-star {
  clip-path: polygon(50% 2%, 61% 36%, 98% 36%, 68% 58%, 80% 95%, 50% 72%, 20% 95%, 32% 58%, 2% 36%, 39% 36%);
}

.shape-heart {
  clip-path: polygon(50% 94%, 8% 56%, 8% 30%, 26% 12%, 50% 22%, 74% 12%, 92% 30%, 92% 56%);
}

.shape-octagon {
  clip-path: polygon(30% 2%, 70% 2%, 98% 30%, 98% 70%, 70% 98%, 30% 98%, 2% 70%, 2% 30%);
}

.shape-shield {
  clip-path: polygon(50% 2%, 90% 18%, 84% 72%, 50% 98%, 16% 72%, 10% 18%);
}

.shape-ticket {
  clip-path: polygon(8% 14%, 20% 14%, 26% 6%, 74% 6%, 80% 14%, 92% 14%, 92% 86%, 80% 86%, 74% 94%, 26% 94%, 20% 86%, 8% 86%);
}

@media (max-width: 980px) {
  .achievement-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .achv-hero {
    padding: 14px;
  }

  .card-top {
    flex-direction: column;
  }

  .status-pill {
    align-self: flex-start;
  }

  .pagination {
    justify-content: center;
  }
}
</style>
