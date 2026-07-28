<template>
  <UDashboardPanel id="admin-v2-database">
    <template #header>
      <UDashboardNavbar title="Debug BDD">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
          <UButton color="neutral" variant="outline" :loading="loading" @click="loadData">Rafraîchir</UButton>
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
          title="Contrôle base de données"
          description="Vérifie la base active, la présence des tables critiques et la migration courante."
          variant="naked"
          orientation="horizontal"
        />

        <UPageCard variant="subtle">
          <div v-if="loading" class="text-sm text-muted">Chargement...</div>

          <div v-else-if="dbInfo" class="space-y-2">
            <div v-for="item in checks" :key="item.label" class="rounded-lg border border-default bg-elevated/40 p-3">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-medium">{{ item.label }}</div>
                <UBadge :color="item.ok ? 'success' : 'neutral'" variant="subtle">{{ item.value }}</UBadge>
              </div>
            </div>
          </div>

          <UAlert
            v-else
            title="Impossible de charger les informations de base"
            description="Vérifie la connexion API et relance la récupération."
            color="warning"
            variant="subtle"
          />
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const { loadDbInfo } = useAdminV2Data();

const loading = ref(false);
const dbInfo = ref(null);

const checks = computed(() => {
  if (!dbInfo.value) return [];
  return [
    {
      label: "Base active",
      value: dbInfo.value.database || "—",
      ok: Boolean(dbInfo.value.database)
    },
    {
      label: "Table user_oauth_state",
      value: dbInfo.value.hasUserOauthState ? "OK" : "Manquante",
      ok: Boolean(dbInfo.value.hasUserOauthState)
    },
    {
      label: "Table user_guilds",
      value: dbInfo.value.hasUserGuilds ? "OK" : "Manquante",
      ok: Boolean(dbInfo.value.hasUserGuilds)
    },
    {
      label: "Table users",
      value: dbInfo.value.hasUsers ? "OK" : "Manquante",
      ok: Boolean(dbInfo.value.hasUsers)
    },
    {
      label: "Dernière migration",
      value: dbInfo.value.latestMigration || "—",
      ok: Boolean(dbInfo.value.latestMigration)
    }
  ];
});

const loadData = async () => {
  loading.value = true;
  try {
    dbInfo.value = await loadDbInfo();
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
