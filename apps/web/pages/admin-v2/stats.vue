<template>
  <UDashboardPanel id="admin-v2-stats">
    <template #header>
      <UDashboardNavbar title="Statistiques">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
          <UButton color="neutral" variant="outline" :loading="loading" @click="loadData">
            Actualiser
          </UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-for="tab in tabs"
              :key="tab.key"
              :color="activeTab === tab.key ? 'primary' : 'neutral'"
              :variant="activeTab === tab.key ? 'solid' : 'ghost'"
              size="sm"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </UButton>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UPageCard
        v-if="!isAdmin"
        title="Accès refusé"
        description="Cette page est réservée à l’administrateur du bot."
        variant="subtle"
      />

      <div v-else class="space-y-6">
        <UPageCard
          title="Centre statistiques"
          description="Vue par onglet avec indicateurs ciblés, graphique lisible et détails chronologiques."
          variant="naked"
          orientation="horizontal"
        />

        <UPageCard title="Filtres" variant="subtle">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <UFormField label="Période">
              <USelectMenu
                v-model="preset"
                :items="presetOptions"
                label-key="label"
                value-key="value"
                :searchable="false"
              />
            </UFormField>

            <UFormField v-if="preset === 'month'" label="Mois">
              <UInput v-model="month" type="month" />
            </UFormField>

            <UFormField v-if="preset === 'year'" label="Année">
              <UInput v-model="year" type="number" min="2000" max="2100" step="1" />
            </UFormField>

            <UFormField v-if="preset === 'custom'" label="Date début">
              <UInput v-model="startDate" type="date" />
            </UFormField>

            <UFormField v-if="preset === 'custom'" label="Date fin">
              <UInput v-model="endDate" type="date" />
            </UFormField>

            <UFormField label="Granularité">
              <USelectMenu
                v-model="granularity"
                :items="granularityOptions"
                label-key="label"
                value-key="value"
                :searchable="false"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="text-xs text-muted">
                Fenêtre active:
                <span class="font-medium text-default">{{ filterSummary }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UButton color="neutral" variant="outline" @click="resetFilters">
                  Réinitialiser
                </UButton>
                <UButton color="primary" :loading="loading" @click="loadData">
                  Appliquer
                </UButton>
              </div>
            </div>
          </template>
        </UPageCard>

        <UPageCard :title="activeTabMeta.label" :description="activeTabMeta.description" variant="subtle">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="metric in activeKpis"
              :key="metric.label"
              class="rounded-xl border border-default bg-elevated/40 p-4"
            >
              <p class="text-xs uppercase tracking-wide text-muted">{{ metric.label }}</p>
              <p class="mt-1 text-3xl font-semibold text-default">{{ metric.value }}</p>
              <p class="mt-1 text-xs text-muted">{{ metric.hint }}</p>
            </div>
          </div>
        </UPageCard>

        <UPageCard
          :title="`Graphique • ${activeTabMeta.chartTitle || activeTabMeta.label}`"
          :description="activeTabMeta.chartDescription"
          variant="subtle"
        >
          <AdminV2StatsSeriesChart
            :labels="chartLabels"
            :values="chartValues"
            :color="activeTabMeta.color"
            :value-label="activeTabMeta.valueLabel"
          />
        </UPageCard>

        <UPageCard
          :title="`Détail • ${activeTabMeta.label}`"
          :description="activeTabMeta.listDescription"
          variant="subtle"
        >
          <div v-if="loading && !activeItems.length" class="text-sm text-muted">Chargement...</div>

          <div v-else-if="!activeItems.length" class="text-sm text-muted">
            Aucune donnée sur la période sélectionnée pour ce sous-onglet. Ajuste les filtres puis réessaie.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="item in activeItems"
              :key="item.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-default bg-elevated/30 px-3 py-2"
            >
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ item.label || '—' }}</div>
                <div class="truncate text-xs text-muted">{{ item.value || '—' }}</div>
              </div>
              <span class="shrink-0 text-xs text-muted">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </UPageCard>

        <UPageCard v-if="activeTab === 'bot_inactive'" title="Santé BOT/API" variant="subtle">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div class="rounded-lg border border-default bg-elevated/30 px-3 py-2">
              <div class="text-xs text-muted">Statut</div>
              <div class="mt-1">
                <UBadge :color="health.is_inactive ? 'error' : 'success'" variant="subtle">
                  {{ health.is_inactive ? 'Inactif' : 'Actif' }}
                </UBadge>
              </div>
            </div>
            <div class="rounded-lg border border-default bg-elevated/30 px-3 py-2">
              <div class="text-xs text-muted">Dernier heartbeat</div>
              <div class="mt-1 text-sm font-medium">{{ formatDate(health.last_heartbeat_at) }}</div>
            </div>
            <div class="rounded-lg border border-default bg-elevated/30 px-3 py-2">
              <div class="text-xs text-muted">Dernier changement</div>
              <div class="mt-1 text-sm font-medium">{{ formatDate(health.last_status_change_at) }}</div>
            </div>
            <div class="rounded-lg border border-default bg-elevated/30 px-3 py-2">
              <div class="text-xs text-muted">Timeout</div>
              <div class="mt-1 text-sm font-medium">{{ health.timeout_seconds || 0 }} sec</div>
            </div>
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const { loadDashboardStats } = useAdminV2Data();

const now = new Date();
const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
const defaultYear = String(now.getUTCFullYear());
const localTimeZone = process.client ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC";

const preset = ref("last_15_days");
const month = ref(defaultMonth);
const year = ref(defaultYear);
const startDate = ref("");
const endDate = ref("");
const granularity = ref("auto");

const presetOptions = [
  { label: "Mois", value: "month" },
  { label: "Année", value: "year" },
  { label: "7 derniers jours", value: "last_7_days" },
  { label: "15 derniers jours", value: "last_15_days" },
  { label: "30 derniers jours", value: "last_30_days" },
  { label: "Période personnalisée", value: "custom" }
];

const granularityOptions = [
  { label: "Auto", value: "auto" },
  { label: "Jour", value: "day" },
  { label: "Mois", value: "month" }
];

const loading = ref(false);
const activeTab = ref("servers_joined");
const counters = ref({
  servers_joined: 0,
  servers_left: 0,
  servers_left_total: 0,
  servers_total: 0,
  servers_active: 0,
  users_joined: 0,
  bot_inactive: 0,
  bot_inactive_incidents: 0
});
const groups = ref({
  servers_joined: [],
  servers_left: [],
  servers_active: [],
  users_joined: [],
  bot_inactive: []
});
const series = ref({
  labels: [],
  datasets: {
    servers_joined: [],
    servers_left: [],
    servers_total: [],
    servers_active: [],
    users_joined: [],
    bot_inactive: []
  }
});
const appliedFilters = ref({
  preset: "last_15_days",
  month: null,
  year: null,
  start: null,
  end: null,
  granularity: "auto",
  timezone: localTimeZone
});
const health = ref({
  is_inactive: false,
  last_heartbeat_at: null,
  last_status_change_at: null,
  timeout_seconds: 0
});

const tabs = [
  {
    key: "servers_joined",
    label: "Serveurs rejoints",
    description: "Nouveaux serveurs rejoints, comptés par jour (ou par mois selon granularité).",
    chartTitle: "Serveurs rejoints par période",
    chartDescription: "Nombre de serveurs ajoutés sur chaque point de la période.",
    listDescription: "Derniers serveurs ayant rejoint ECOBOTY.",
    datasetKey: "servers_joined",
    valueLabel: "Serveurs",
    color: "#2563eb"
  },
  {
    key: "servers_active",
    label: "Serveurs actifs",
    description: "Nombre de serveurs actifs actuellement, avec évolution sur la période.",
    chartTitle: "Évolution des serveurs actifs",
    chartDescription: "Nombre de serveurs actifs à chaque point de la période.",
    listDescription: "Serveurs actuellement actifs.",
    datasetKey: "servers_active",
    valueLabel: "Serveurs actifs",
    color: "#14b8a6"
  },
  {
    key: "servers_left",
    label: "Serveurs partis",
    description: "Serveurs qui ont retiré ECOBOTY sur la période.",
    chartTitle: "Départs serveurs",
    chartDescription: "Nombre de départs par point de la période.",
    listDescription: "Derniers serveurs partis.",
    datasetKey: "servers_left",
    valueLabel: "Départs",
    color: "#f97316"
  },
  {
    key: "users_joined",
    label: "Utilisateurs rejoints",
    description: "Comptes utilisateurs connectés au service sur la période.",
    chartTitle: "Connexions utilisateurs",
    chartDescription: "Nombre de nouveaux utilisateurs par point de la période.",
    listDescription: "Derniers utilisateurs rejoints.",
    datasetKey: "users_joined",
    valueLabel: "Utilisateurs",
    color: "#10b981"
  },
  {
    key: "bot_inactive",
    label: "BOT inactifs",
    description: "Incidents BOT/API (heartbeat manquant) et état actuel.",
    chartTitle: "Incidents BOT",
    chartDescription: "Incidents détectés sur la période.",
    listDescription: "Derniers incidents et état BOT.",
    datasetKey: "bot_inactive",
    valueLabel: "Incidents",
    color: "#ef4444"
  }
];

const activeTabMeta = computed(() => tabs.find((tab) => tab.key === activeTab.value) || tabs[0]);
const activeItems = computed(() => groups.value?.[activeTab.value] || []);
const chartLabels = computed(() => (Array.isArray(series.value?.labels) ? series.value.labels : []));
const chartValues = computed(() => {
  const datasetKey = activeTabMeta.value?.datasetKey || activeTab.value;
  const list = series.value?.datasets?.[datasetKey];
  if (!Array.isArray(list)) return [];

  if (activeTab.value === "servers_active" && list.length && list.every((v) => Number(v || 0) === 0)) {
    return list.map(() => Number(counters.value.servers_active || 0));
  }

  return list;
});

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR");
};

const formatInteger = (value) => Number(value || 0).toLocaleString("fr-FR");

const activeKpis = computed(() => {
  if (activeTab.value === "servers_joined") {
    return [
      {
        label: "Nouveaux sur la période",
        value: formatInteger(counters.value.servers_joined),
        hint: "Serveurs ajoutés pendant la fenêtre filtrée."
      },
      {
        label: "Total serveurs connus",
        value: formatInteger(counters.value.servers_total),
        hint: "Base globale des serveurs enregistrés."
      },
      {
        label: "Serveurs actifs",
        value: formatInteger(counters.value.servers_active),
        hint: "Serveurs actifs actuellement."
      }
    ];
  }

  if (activeTab.value === "servers_active") {
    return [
      {
        label: "Serveurs actifs",
        value: formatInteger(counters.value.servers_active),
        hint: "Actifs maintenant."
      },
      {
        label: "Total serveurs connus",
        value: formatInteger(counters.value.servers_total),
        hint: "Actifs + inactifs / partis."
      },
      {
        label: "Serveurs partis (période)",
        value: formatInteger(counters.value.servers_left),
        hint: "Sorties sur la fenêtre filtrée."
      }
    ];
  }

  if (activeTab.value === "servers_left") {
    return [
      {
        label: "Départs sur la période",
        value: formatInteger(counters.value.servers_left),
        hint: "Serveurs ayant retiré ECOBOTY."
      },
      {
        label: "Départs globaux",
        value: formatInteger(counters.value.servers_left_total),
        hint: "Total cumulé des serveurs partis."
      },
      {
        label: "Serveurs actifs",
        value: formatInteger(counters.value.servers_active),
        hint: "Actifs actuellement."
      }
    ];
  }

  if (activeTab.value === "users_joined") {
    return [
      {
        label: "Nouveaux utilisateurs",
        value: formatInteger(counters.value.users_joined),
        hint: "Comptes connectés sur la période."
      },
      {
        label: "Serveurs actifs",
        value: formatInteger(counters.value.servers_active),
        hint: "Contexte actuel de diffusion du bot."
      }
    ];
  }

  return [
    {
      label: "État BOT",
      value: health.value.is_inactive ? "Inactif" : "Actif",
      hint: "État courant basé sur le heartbeat."
    },
    {
      label: "Incidents (période)",
      value: formatInteger(counters.value.bot_inactive_incidents),
      hint: "Nombre d’incidents relevés sur la période."
    },
    {
      label: "Timeout heartbeat",
      value: `${formatInteger(health.value.timeout_seconds || 0)} sec`,
      hint: "Seuil de bascule en inactif."
    }
  ];
});

const filterSummary = computed(() => {
  if (appliedFilters.value.preset === "month" && appliedFilters.value.month) {
    return `Mois ${appliedFilters.value.month} • granularité ${appliedFilters.value.granularity}`;
  }
  if (appliedFilters.value.preset === "year" && appliedFilters.value.year) {
    return `Année ${appliedFilters.value.year} • granularité ${appliedFilters.value.granularity}`;
  }
  if (appliedFilters.value.preset === "custom") {
    const start = appliedFilters.value.start ? formatDate(appliedFilters.value.start) : "—";
    const end = appliedFilters.value.end ? formatDate(appliedFilters.value.end) : "—";
    return `Custom: ${start} → ${end} • granularité ${appliedFilters.value.granularity}`;
  }
  if (appliedFilters.value.preset === "last_7_days") {
    return `7 derniers jours • granularité ${appliedFilters.value.granularity}`;
  }
  if (appliedFilters.value.preset === "last_15_days") {
    return `15 derniers jours • granularité ${appliedFilters.value.granularity}`;
  }
  if (appliedFilters.value.preset === "last_30_days") {
    return `30 derniers jours • granularité ${appliedFilters.value.granularity}`;
  }
  return "Fenêtre active";
});

const buildPayload = () => ({
  limit: 160,
  preset: String(preset.value || "last_15_days"),
  month: preset.value === "month" ? String(month.value || defaultMonth) : null,
  year: preset.value === "year" ? String(year.value || defaultYear) : null,
  start: preset.value === "custom" ? String(startDate.value || "") : null,
  end: preset.value === "custom" ? String(endDate.value || "") : null,
  granularity: String(granularity.value || "auto"),
  timeZone: localTimeZone
});

const resetFilters = () => {
  preset.value = "last_15_days";
  month.value = defaultMonth;
  year.value = defaultYear;
  startDate.value = "";
  endDate.value = "";
  granularity.value = "auto";
};

const loadData = async () => {
  loading.value = true;
  try {
    const payload = buildPayload();
    const stats = await loadDashboardStats(payload);
    if (!stats) return;

    counters.value = {
      servers_joined: Number(stats?.counters?.servers_joined || 0),
      servers_left: Number(stats?.counters?.servers_left || 0),
      servers_left_total: Number(stats?.counters?.servers_left_total || 0),
      servers_total: Number(stats?.counters?.servers_total || 0),
      servers_active: Number(stats?.counters?.servers_active || 0),
      users_joined: Number(stats?.counters?.users_joined || 0),
      bot_inactive: Number(stats?.counters?.bot_inactive || 0),
      bot_inactive_incidents: Number(stats?.counters?.bot_inactive_incidents || 0)
    };

    groups.value = {
      servers_joined: Array.isArray(stats?.groups?.servers_joined) ? stats.groups.servers_joined : [],
      servers_left: Array.isArray(stats?.groups?.servers_left) ? stats.groups.servers_left : [],
      servers_active: Array.isArray(stats?.groups?.servers_active) ? stats.groups.servers_active : [],
      users_joined: Array.isArray(stats?.groups?.users_joined) ? stats.groups.users_joined : [],
      bot_inactive: Array.isArray(stats?.groups?.bot_inactive) ? stats.groups.bot_inactive : []
    };

    series.value = {
      labels: Array.isArray(stats?.series?.labels) ? stats.series.labels : [],
      datasets: {
        servers_joined: Array.isArray(stats?.series?.datasets?.servers_joined)
          ? stats.series.datasets.servers_joined
          : [],
        servers_left: Array.isArray(stats?.series?.datasets?.servers_left) ? stats.series.datasets.servers_left : [],
        servers_total: Array.isArray(stats?.series?.datasets?.servers_total)
          ? stats.series.datasets.servers_total
          : [],
        servers_active: Array.isArray(stats?.series?.datasets?.servers_active)
          ? stats.series.datasets.servers_active
          : [],
        users_joined: Array.isArray(stats?.series?.datasets?.users_joined)
          ? stats.series.datasets.users_joined
          : [],
        bot_inactive: Array.isArray(stats?.series?.datasets?.bot_inactive)
          ? stats.series.datasets.bot_inactive
          : []
      }
    };

    health.value = {
      is_inactive: Boolean(stats?.health?.is_inactive),
      last_heartbeat_at: stats?.health?.last_heartbeat_at || null,
      last_status_change_at: stats?.health?.last_status_change_at || null,
      timeout_seconds: Number(stats?.health?.timeout_seconds || 0)
    };

    appliedFilters.value = {
      preset: stats?.filters?.preset || payload.preset,
      month: stats?.filters?.month || payload.month,
      year: stats?.filters?.year || payload.year || null,
      start: stats?.filters?.start || null,
      end: stats?.filters?.end || null,
      granularity: stats?.filters?.granularity || payload.granularity,
      timezone: stats?.filters?.timezone || localTimeZone
    };
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  const ok = await requireAdmin();
  if (!ok) return;
  await loadData();
});
</script>
