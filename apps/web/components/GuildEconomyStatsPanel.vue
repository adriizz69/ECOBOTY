<template>
  <UCard class="card stats-admin">
    <div class="card-head">
      <div>
        <h3>{{ $t("adminGuild.stats.title") }}</h3>
        <p class="muted">{{ $t("adminGuild.stats.subtitle") }}</p>
      </div>
      <div class="head-actions">
        <div class="period-pills">
          <button
            v-for="option in periodOptions"
            :key="option"
            type="button"
            :class="['tab-pill', days === option && 'active']"
            @click="setDays(option)"
          >
            {{ $t("adminGuild.stats.days", { n: option }) }}
          </button>
        </div>
        <UButton color="neutral" variant="outline" :loading="loading" @click="load({ force: true })">
          {{ $t("common.refresh") }}
        </UButton>
      </div>
    </div>

    <div v-if="stats?.period?.historyDays" class="notice">
      {{ $t("adminGuild.stats.historyHint", { days: stats.period.historyDays }) }}
    </div>

    <div v-if="loading && !stats" class="stats-state">
      <UIcon name="i-lucide-loader-circle" class="spin" />
      <span>{{ $t("common.loading") }}</span>
    </div>
    <div v-else-if="error" class="stats-state error">
      <UIcon name="i-lucide-circle-alert" />
      <span>{{ error }}</span>
    </div>

    <template v-else-if="stats">
      <div class="stats-grid">
        <article v-for="kpi in kpis" :key="kpi.label" class="stat-tile">
          <span>{{ kpi.label }}</span>
          <strong :class="kpi.tone">{{ kpi.value }}</strong>
        </article>
      </div>

      <div class="sub-card">
        <div class="sub-card-head">
          <div>
            <h4>{{ $t("adminGuild.stats.chart.title") }}</h4>
            <p class="muted">{{ $t("adminGuild.stats.chart.help") }}</p>
          </div>
          <div class="legend">
            <span class="legend-item gained">{{ $t("adminGuild.stats.chart.gained") }}</span>
            <span class="legend-item lost">{{ $t("adminGuild.stats.chart.lost") }}</span>
            <span class="legend-item net">{{ $t("adminGuild.stats.chart.net") }}</span>
          </div>
        </div>

        <div v-if="!chartModel.rows.length" class="stats-state">{{ $t("adminGuild.stats.empty") }}</div>
        <div
          v-else
          ref="chartEl"
          class="chart-wrap"
          @mousemove="onChartMove"
          @mouseleave="hoverIndex = -1"
        >
          <svg :viewBox="`0 0 ${chartModel.width} ${chartModel.height}`" role="img" :aria-label="$t('adminGuild.stats.chart.title')">
            <defs>
              <linearGradient :id="`${chartUid}-gained`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2dd4a0" />
                <stop offset="100%" stop-color="#0f766e" />
              </linearGradient>
              <linearGradient :id="`${chartUid}-lost`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fb7185" />
                <stop offset="100%" stop-color="#9f1239" />
              </linearGradient>
              <linearGradient :id="`${chartUid}-fade`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(45,212,160,0.08)" />
                <stop offset="100%" stop-color="rgba(15,23,42,0)" />
              </linearGradient>
            </defs>
            <rect
              class="plot-bg"
              :x="chartModel.pad.left"
              :y="chartModel.pad.top"
              :width="chartModel.plotW"
              :height="chartModel.plotH"
              :fill="`url(#${chartUid}-fade)`"
              rx="12"
            />
            <g class="grid">
              <g v-for="tick in chartModel.ticks" :key="tick.value">
                <line
                  :x1="chartModel.pad.left"
                  :x2="chartModel.pad.left + chartModel.plotW"
                  :y1="tick.y"
                  :y2="tick.y"
                />
                <text class="axis-y" :x="chartModel.pad.left - 8" :y="tick.y + 4">{{ tick.label }}</text>
              </g>
            </g>
            <g v-if="hovered" class="hover-col">
              <rect
                :x="hovered.colX"
                :y="chartModel.pad.top"
                :width="hovered.colW"
                :height="chartModel.plotH"
                rx="8"
              />
            </g>
            <g class="bars">
              <g v-for="(bar, index) in chartModel.bars" :key="bar.date">
                <rect
                  class="bar"
                  :class="{ dim: hoverIndex >= 0 && hoverIndex !== index }"
                  :x="bar.gainedX"
                  :y="bar.gainedY"
                  :width="bar.w"
                  :height="bar.gainedH"
                  rx="4"
                  :fill="`url(#${chartUid}-gained)`"
                />
                <rect
                  class="bar"
                  :class="{ dim: hoverIndex >= 0 && hoverIndex !== index }"
                  :x="bar.lostX"
                  :y="bar.lostY"
                  :width="bar.w"
                  :height="bar.lostH"
                  rx="4"
                  :fill="`url(#${chartUid}-lost)`"
                />
              </g>
            </g>
            <path class="net-line" :d="chartModel.netPath" />
            <circle
              v-for="(dot, index) in chartModel.bars"
              :key="`net-${dot.date}`"
              class="net-dot"
              :class="{ on: hoverIndex === index }"
              :cx="dot.midX"
              :cy="dot.netY"
              :r="hoverIndex === index ? 5.5 : 3.5"
            />
            <g class="axis-x">
              <text
                v-for="label in chartModel.xLabels"
                :key="label.date"
                :x="label.x"
                :y="chartModel.height - 14"
              >
                {{ label.text }}
              </text>
            </g>
          </svg>
          <div v-if="hovered" class="tooltip" :style="{ left: `${hovered.left}%` }">
            <div class="tooltip-date">{{ formatDay(hovered.date) }}</div>
            <div class="tooltip-row pos">
              <span>{{ $t("adminGuild.stats.chart.gained") }}</span>
              <strong>{{ money(hovered.gained) }}</strong>
            </div>
            <div class="tooltip-row neg">
              <span>{{ $t("adminGuild.stats.chart.lost") }}</span>
              <strong>{{ money(hovered.lost) }}</strong>
            </div>
            <div class="tooltip-row" :class="hovered.net >= 0 ? 'pos' : 'neg'">
              <span>{{ $t("adminGuild.stats.chart.net") }}</span>
              <strong>{{ signed(hovered.net) }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="details">
      <div class="section-tabs">
        <button
          v-for="tab in sectionTabs"
          :key="tab.id"
          type="button"
          :class="['tab-pill', sectionTab === tab.id && 'active']"
          @click="sectionTab = tab.id"
        >
          <UIcon :name="tab.icon" class="tab-ico" />
          {{ tab.label }}
        </button>
      </div>

      <div v-if="sectionTab === 'sources'" class="sub-card">
        <h4>{{ $t("adminGuild.stats.sources.title") }}</h4>
        <p class="muted">{{ $t("adminGuild.stats.sources.help") }}</p>
        <div v-if="!sourceRows.length" class="stats-state">{{ $t("adminGuild.stats.empty") }}</div>
        <div v-else class="source-list">
          <div v-for="row in sourceRows" :key="row.source" class="source-row">
            <div class="source-copy">
              <strong>{{ sourceLabel(row.source) }}</strong>
              <span class="muted">{{ row.count }} {{ $t("adminGuild.stats.sources.count") }} · +{{ money(row.gained) }} / −{{ money(row.spent) }}</span>
            </div>
            <div class="source-track">
              <span class="source-fill gained" :style="{ width: `${row.gainedPct}%` }" />
              <span class="source-fill lost" :style="{ width: `${row.spentPct}%` }" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="sectionTab === 'shops'" class="shop-grid">
        <article class="sub-card shop-card">
          <h4>{{ $t("adminGuild.stats.shops.official") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.stats.shops.summary", { n: stats.shops.official.purchases, amount: money(stats.shops.official.volume) }) }}
          </p>
          <ol class="rank">
            <li v-for="item in stats.shops.official.topItems" :key="item.name">
              <span>{{ item.name }}</span>
              <strong>{{ item.count }} · {{ money(item.volume) }}</strong>
            </li>
            <li v-if="!stats.shops.official.topItems.length" class="empty-row muted">{{ $t("adminGuild.stats.empty") }}</li>
          </ol>
        </article>
        <article class="sub-card shop-card">
          <h4>{{ $t("adminGuild.stats.shops.user") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.stats.shops.summary", { n: stats.shops.user.purchases, amount: money(stats.shops.user.volume) }) }}
          </p>
          <ol class="rank">
            <li v-for="item in stats.shops.user.topItems" :key="item.name">
              <span>{{ item.name }}</span>
              <strong>{{ item.count }} · {{ money(item.volume) }}</strong>
            </li>
            <li v-if="!stats.shops.user.topItems.length" class="empty-row muted">{{ $t("adminGuild.stats.empty") }}</li>
          </ol>
        </article>
        <article class="sub-card shop-card">
          <h4>{{ $t("adminGuild.stats.shops.market") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.stats.shops.marketSummary", { n: stats.shops.market.sales, amount: money(stats.shops.market.volume) }) }}
          </p>
          <ol class="rank">
            <li v-for="item in stats.shops.market.topItems" :key="item.name">
              <span>{{ item.name }}</span>
              <strong>{{ item.count }} · {{ money(item.volume) }}</strong>
            </li>
            <li v-if="!stats.shops.market.topItems.length" class="empty-row muted">{{ $t("adminGuild.stats.empty") }}</li>
          </ol>
        </article>
      </div>

      <div v-else-if="sectionTab === 'games'" class="sub-card">
        <h4>{{ $t("adminGuild.stats.games.title") }}</h4>
        <p class="muted">
          {{
            $t("adminGuild.stats.games.summary", {
              rounds: stats.games.rounds,
              bets: money(stats.games.bets),
              payouts: money(stats.games.payouts),
              house: money(stats.games.houseKeep)
            })
          }}
        </p>
        <div v-if="!stats.games.byGame.length" class="stats-state">{{ $t("adminGuild.stats.empty") }}</div>
        <div v-else class="game-list">
          <article v-for="game in stats.games.byGame" :key="game.gameId" class="game-row">
            <div>
              <strong>{{ gameLabel(game.gameId) }}</strong>
              <p class="muted">{{ game.rounds }} · {{ game.wins }} {{ $t("adminGuild.stats.games.wins") }}</p>
            </div>
            <div class="game-metrics">
              <span>{{ $t("adminGuild.stats.games.bets") }} · {{ money(game.bets) }}</span>
              <span class="neg">{{ $t("adminGuild.stats.games.house") }} · {{ money(Math.max(0, game.bets - game.payouts)) }}</span>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="activity-grid">
        <article class="sub-card">
          <h4>{{ $t("adminGuild.stats.more.twitch") }}</h4>
          <p class="hero-metric">{{ money(stats.twitch.gained) }}</p>
          <p class="muted">{{ stats.twitch.count }}</p>
          <ul class="rank">
            <li v-for="row in stats.twitch.bySource" :key="row.source">
              <span>{{ sourceLabel(row.source) }}</span>
              <strong class="pos">{{ money(row.gained) }}</strong>
            </li>
            <li v-if="!stats.twitch.bySource.length" class="empty-row muted">{{ $t("adminGuild.stats.empty") }}</li>
          </ul>
        </article>
        <article class="sub-card">
          <h4>{{ $t("adminGuild.stats.more.daily") }}</h4>
          <p class="hero-metric">{{ money(stats.dailyClaims.amount) }}</p>
          <p class="muted">{{ stats.dailyClaims.count }}</p>
          <div class="mini-stats">
            <div>
              <span class="muted">{{ $t("adminGuild.stats.more.lootboxes") }}</span>
              <strong>{{ stats.lootboxes.currencyRewards }} · {{ money(stats.lootboxes.amount) }}</strong>
            </div>
            <div>
              <span class="muted">{{ $t("adminGuild.stats.more.inventories") }}</span>
              <strong>{{ $t("adminGuild.stats.more.inventorySummary", { members: stats.inventories.members, items: stats.inventories.items }) }}</strong>
            </div>
          </div>
        </article>
        <article class="sub-card">
          <h4>{{ $t("adminGuild.stats.users.earners") }}</h4>
          <ol class="rank people">
            <li v-for="user in stats.users.topEarners" :key="user.userId">
              <div class="person">
                <div class="person-avatar">
                  <DiscordAvatar :user-id="user.userId" :avatar="user.avatar" :alt="user.username" />
                </div>
                <span>{{ user.username }}</span>
              </div>
              <strong class="pos">{{ money(user.amount) }}</strong>
            </li>
            <li v-if="!stats.users.topEarners.length" class="empty-row muted">{{ $t("adminGuild.stats.empty") }}</li>
          </ol>
          <h4 class="sub-title">{{ $t("adminGuild.stats.users.spenders") }}</h4>
          <ol class="rank people">
            <li v-for="user in stats.users.topSpenders" :key="user.userId">
              <div class="person">
                <div class="person-avatar">
                  <DiscordAvatar :user-id="user.userId" :avatar="user.avatar" :alt="user.username" />
                </div>
                <span>{{ user.username }}</span>
              </div>
              <strong class="neg">{{ money(user.amount) }}</strong>
            </li>
            <li v-if="!stats.users.topSpenders.length" class="empty-row muted">{{ $t("adminGuild.stats.empty") }}</li>
          </ol>
        </article>
      </div>
      </div>
    </template>
  </UCard>
</template>

<script setup>
const props = defineProps({
  guildId: { type: String, required: true },
  active: { type: Boolean, default: false }
});

const config = useRuntimeConfig();
const { getToken } = useAuth();
const { t } = useI18n();

const loading = ref(false);
const loadedOnce = ref(false);
const error = ref("");
const stats = ref(null);
const days = ref(30);
const sectionTab = ref("sources");
const hoverIndex = ref(-1);
const chartEl = ref(null);
const chartUid = `econ-chart-${useId().replace(/:/g, "")}`;
const periodOptions = [7, 14, 30, 90];

const sectionTabs = computed(() => [
  { id: "sources", label: t("adminGuild.stats.sections.sources"), icon: "i-lucide-layers" },
  { id: "shops", label: t("adminGuild.stats.sections.shops"), icon: "i-lucide-store" },
  { id: "games", label: t("adminGuild.stats.sections.games"), icon: "i-lucide-gamepad-2" },
  { id: "activity", label: t("adminGuild.stats.sections.activity"), icon: "i-lucide-users" }
]);

const kpis = computed(() => {
  const overview = stats.value?.overview || {};
  return [
    { label: t("adminGuild.stats.kpis.circulating"), value: money(overview.circulating) },
    { label: t("adminGuild.stats.kpis.gained"), value: `+${money(overview.gained)}`, tone: "pos" },
    { label: t("adminGuild.stats.kpis.lost"), value: `−${money(overview.lost)}`, tone: "neg" },
    { label: t("adminGuild.stats.kpis.net"), value: signed(overview.net), tone: overview.net >= 0 ? "pos" : "neg" },
    { label: t("adminGuild.stats.kpis.avgLost"), value: money(overview.avgLostPerDay) },
    { label: t("adminGuild.stats.kpis.holders"), value: String(overview.holders || 0) }
  ];
});

const sourceRows = computed(() => {
  const rows = stats.value?.bySource || [];
  const max = Math.max(1, ...rows.map((row) => Number(row.gained || 0) + Number(row.spent || 0)));
  return rows.map((row) => ({
    ...row,
    gainedPct: Math.round((Number(row.gained || 0) / max) * 100),
    spentPct: Math.round((Number(row.spent || 0) / max) * 100)
  }));
});

const money = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
};

const compactMoney = (value) => {
  const n = Math.abs(Number(value || 0));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
};

const signed = (value) => {
  const n = Number(value || 0);
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${money(n)}`;
};

const formatDay = (value) => {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString();
  } catch {
    return String(value);
  }
};

const formatDayShort = (value) => {
  if (!value) return "";
  const parts = String(value).split("-");
  if (parts.length !== 3) return formatDay(value);
  return `${parts[2]}/${parts[1]}`;
};

const niceMax = (raw) => {
  const value = Math.max(1, Number(raw || 1));
  const mag = 10 ** Math.floor(Math.log10(value));
  const norm = value / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
};

const chartModel = computed(() => {
  const rows = (stats.value?.daily || []).map((row) => ({
    date: row.date,
    gained: Number(row.gained || 0),
    lost: Number(row.lost || 0),
    net: Number(row.net || 0)
  }));
  const width = 1000;
  const height = 320;
  const pad = { top: 18, right: 18, bottom: 42, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...rows.map((row) => Math.max(row.gained, row.lost, Math.abs(row.net)))));
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const value = (max / tickCount) * (tickCount - i);
    return {
      value,
      label: compactMoney(value),
      y: pad.top + (plotH / tickCount) * i
    };
  });
  const colW = rows.length ? plotW / rows.length : plotW;
  const barW = Math.max(3, Math.min(18, colW * 0.32));
  const gap = Math.max(1, barW * 0.12);
  const yFor = (value) => pad.top + plotH - (Math.max(0, value) / max) * plotH;
  const bars = rows.map((row, index) => {
    const colX = pad.left + index * colW;
    const midX = colX + colW / 2;
    const gainedH = Math.max(row.gained > 0 ? 3 : 0, (row.gained / max) * plotH);
    const lostH = Math.max(row.lost > 0 ? 3 : 0, (row.lost / max) * plotH);
    return {
      ...row,
      colX,
      colW,
      midX,
      w: barW,
      gainedX: midX - barW - gap,
      lostX: midX + gap,
      gainedY: pad.top + plotH - gainedH,
      lostY: pad.top + plotH - lostH,
      gainedH,
      lostH,
      netY: yFor(Math.max(0, row.net)),
      left: Math.max(10, Math.min(90, (midX / width) * 100))
    };
  });
  const step = Math.max(1, Math.ceil(rows.length / 7));
  const xLabels = bars
    .filter((_, index) => index === 0 || index === bars.length - 1 || index % step === 0)
    .map((bar) => ({ date: bar.date, x: bar.midX, text: formatDayShort(bar.date) }));
  const netPath = bars.map((bar, index) => `${index === 0 ? "M" : "L"} ${bar.midX} ${bar.netY}`).join(" ");
  return { rows, width, height, pad, plotW, plotH, max, ticks, bars, xLabels, netPath };
});

const hovered = computed(() => (hoverIndex.value >= 0 ? chartModel.value.bars[hoverIndex.value] || null : null));

const sourceLabel = (source) => {
  const key = `adminGuild.stats.sources.keys.${source}`;
  const label = t(key);
  return label === key ? source : label;
};
const gameLabel = (gameId) => {
  const key = `adminGuild.stats.games.keys.${gameId}`;
  const label = t(key);
  return label === key ? gameId : label;
};

const onChartMove = (event) => {
  const el = chartEl.value;
  const bars = chartModel.value.bars;
  if (!el || !bars.length) return;
  const rect = el.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * chartModel.value.width;
  let best = 0;
  let bestDist = Infinity;
  bars.forEach((bar, index) => {
    const dist = Math.abs(bar.midX - x);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  hoverIndex.value = best;
};

const load = async ({ force = false } = {}) => {
  if (!props.guildId) return;
  if (!force && loadedOnce.value && stats.value) return;
  const token = getToken();
  if (!token) return;
  loading.value = true;
  error.value = "";
  try {
    const res = await fetch(
      `${config.public.apiBase}/api/guilds/${props.guildId}/economy-stats?days=${days.value}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      error.value = data.error || t("adminGuild.stats.error");
      return;
    }
    stats.value = data.stats || null;
    loadedOnce.value = true;
  } catch {
    error.value = t("adminGuild.stats.error");
  } finally {
    loading.value = false;
  }
};

const setDays = (value) => {
  days.value = Number(value);
  loadedOnce.value = false;
  load({ force: true });
};

watch(
  () => props.active,
  (isActive) => {
    if (isActive) load({ force: false });
  },
  { immediate: true }
);

watch(
  () => props.guildId,
  () => {
    loadedOnce.value = false;
    stats.value = null;
    if (props.active) load({ force: true });
  }
);

defineExpose({ load });
</script>

<style scoped>
.stats-admin :deep([data-slot="body"]) {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.card-head h3,
.sub-card h4 {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-weight: 750;
  letter-spacing: -0.025em;
}
.card-head h3 {
  font-size: 1.2rem;
}
.card-head p,
.sub-card > p,
.sub-card-head p,
.game-row p {
  margin: 0;
}
.details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head-actions,
.period-pills,
.section-tabs,
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-soft);
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
  transition: background 0.18s var(--ease), border-color 0.18s var(--ease), color 0.18s var(--ease), transform 0.18s var(--ease);
}
.tab-pill:hover {
  transform: translateY(-1px);
  border-color: rgba(45, 212, 160, 0.3);
}
.tab-pill.active {
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.22), rgba(56, 189, 248, 0.12));
  border-color: rgba(45, 212, 160, 0.45);
  color: var(--accent);
  box-shadow: 0 6px 14px rgba(45, 212, 160, 0.12);
}
.tab-ico {
  width: 14px;
  height: 14px;
}
.notice {
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(129, 140, 248, 0.35);
  color: var(--text-soft);
  font-size: 0.9rem;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat-tile {
  position: relative;
  overflow: hidden;
  padding: 14px 16px 14px 18px;
  border-radius: 14px;
  border: 1px solid rgba(45, 212, 160, 0.22);
  background:
    linear-gradient(135deg, rgba(45, 212, 160, 0.12), rgba(56, 189, 248, 0.05)),
    var(--surface-2);
}
.stat-tile:nth-child(2) { border-color: rgba(56, 189, 248, 0.24); }
.stat-tile:nth-child(3) { border-color: rgba(251, 113, 133, 0.28); }
.stat-tile:nth-child(4) { border-color: rgba(167, 139, 250, 0.28); }
.stat-tile:nth-child(5) { border-color: rgba(251, 191, 36, 0.28); }
.stat-tile:nth-child(6) { border-color: rgba(56, 189, 248, 0.22); }
.stat-tile::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--accent), #38bdf8);
}
.stat-tile:nth-child(2)::before { background: linear-gradient(180deg, #38bdf8, #818cf8); }
.stat-tile:nth-child(3)::before { background: linear-gradient(180deg, #fb7185, #fb923c); }
.stat-tile:nth-child(4)::before { background: linear-gradient(180deg, #a78bfa, #38bdf8); }
.stat-tile:nth-child(5)::before { background: linear-gradient(180deg, #fbbf24, #fb923c); }
.stat-tile span {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.stat-tile strong {
  display: block;
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}
.sub-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
}
.person-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}
.sub-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-soft);
}
.legend-item::before {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
.legend-item.gained::before { background: linear-gradient(180deg, #2dd4a0, #0f766e); }
.legend-item.lost::before { background: linear-gradient(180deg, #fb7185, #9f1239); }
.legend-item.net::before {
  width: 14px;
  height: 0;
  border-radius: 0;
  border-top: 2px dashed #38bdf8;
}
.chart-wrap {
  position: relative;
  cursor: crosshair;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  overflow: hidden;
}
.chart-wrap svg {
  width: 100%;
  height: 320px;
  display: block;
}
.plot-bg,
.bar {
  pointer-events: none;
}
.grid line { stroke: var(--border); }
.axis-y,
.axis-x text {
  fill: var(--text-muted);
  font-size: 11px;
}
.axis-y { text-anchor: end; }
.axis-x text { text-anchor: middle; }
.hover-col rect { fill: rgba(45, 212, 160, 0.08); }
.bar { transition: opacity 0.15s var(--ease); }
.bar.dim { opacity: 0.35; }
.net-line {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 2.25;
  stroke-dasharray: 5 5;
  stroke-linejoin: round;
}
.net-dot {
  fill: #38bdf8;
  stroke: var(--bg);
  stroke-width: 1.5;
  opacity: 0.35;
}
.net-dot.on { opacity: 1; }
.tooltip {
  position: absolute;
  top: 16px;
  transform: translateX(-50%);
  min-width: 180px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow);
  font-size: 12px;
  pointer-events: none;
  display: grid;
  gap: 4px;
}
.tooltip-date {
  font-weight: 700;
  font-family: var(--font-display);
}
.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.source-list,
.game-list,
.rank,
.mini-stats {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.source-row,
.game-row,
.rank li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.source-row,
.game-row {
  flex-direction: column;
  align-items: stretch;
}
.source-copy,
.game-row > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.source-track {
  display: flex;
  height: 8px;
  border-radius: 99px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.12);
}
.source-fill { display: block; height: 100%; }
.source-fill.gained { background: var(--accent); }
.source-fill.lost { background: var(--fun-rose); }
.shop-grid,
.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.game-metrics {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  font-weight: 700;
}
.hero-metric {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 800;
}
.mini-stats > div {
  display: grid;
  gap: 2px;
}
.people li {
  align-items: center;
}
.person {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.person span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub-title {
  margin: 16px 0 0;
}
.empty-row {
  justify-content: center;
}
.stats-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 4px;
  color: var(--text-muted);
}
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.pos { color: var(--accent); }
.neg { color: var(--danger); }
.muted { color: var(--text-muted); font-size: 0.9rem; }
.error { color: var(--danger); }
@media (max-width: 720px) {
  .source-copy,
  .game-row > div:first-child {
    flex-direction: column;
  }
}
</style>
