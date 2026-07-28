<template>
  <UDashboardPanel id="admin-v2-logs">
    <template #header>
      <UDashboardNavbar title="Logs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
          <UButton color="neutral" variant="outline" :loading="loading" @click="loadData">Actualiser</UButton>
        </template>
      </UDashboardNavbar>
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
          title="Historique admin"
          description="Historique des actions administrateur BOT."
          variant="naked"
          orientation="horizontal"
        />

        <UPageCard variant="subtle">
          <div v-if="!rows.length" class="text-sm text-muted">Aucun log.</div>
          <UTable v-else :data="rows" :columns="columns" :ui="{ td: 'align-top' }" />
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const { adminLogs, loadOverview } = useAdminV2Data();

const loading = ref(false);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR");
};

const formatLogData = (value) => {
  if (!value) return "—";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed?.reason) return parsed.reason;
    if (parsed?.message) return parsed.message;
    return JSON.stringify(parsed);
  } catch {
    return String(value);
  }
};

const rows = computed(() =>
  (adminLogs.value || []).map((log) => ({
    ...log,
    date: formatDate(log.created_at),
    actionLabel: String(log.action || "—"),
    guildLabel: log.guild_name || log.guild_discord_id || "—",
    detailsLabel: formatLogData(log.data)
  }))
);

const columns = [
  { accessorKey: "date", header: "Date" },
  { accessorKey: "actionLabel", header: "Action" },
  { accessorKey: "guildLabel", header: "Serveur" },
  { accessorKey: "detailsLabel", header: "Détails" }
];

const loadData = async () => {
  loading.value = true;
  try {
    await loadOverview();
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
