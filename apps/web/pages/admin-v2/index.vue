<template>
  <UDashboardPanel id="admin-v2-home">
    <template #header>
      <UDashboardNavbar title="Administration" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            @click="loadData"
          >
            Actualiser
          </UButton>
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

      <div v-else class="space-y-8">
        <div>
          <p class="eb-kicker mb-2">ECOBOTY</p>
          <h1 class="text-2xl font-semibold tracking-tight">Vue d’ensemble</h1>
          <p class="mt-1 text-muted">Serveurs, utilisateurs et activité récente.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="stat">
            <span>Serveurs actifs</span>
            <strong>{{ summary.totalGuilds }}</strong>
          </div>
          <div class="stat">
            <span>Serveurs bannis</span>
            <strong>{{ summary.bannedGuilds }}</strong>
          </div>
          <div class="stat">
            <span>Utilisateurs</span>
            <strong>{{ summary.totalUsers }}</strong>
          </div>
          <div class="stat">
            <span>Bot absent</span>
            <strong>{{ summary.botAbsent }}</strong>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <UCard>
            <template #header>
              <div class="font-semibold">Accès rapide</div>
            </template>
            <div class="grid grid-cols-1 gap-2">
              <UButton to="/admin-v2/global-settings" color="neutral" variant="soft" icon="i-lucide-sliders-horizontal" block>Réglages globaux</UButton>
              <UButton to="/admin-v2/games" color="neutral" variant="soft" icon="i-lucide-dices" block>Jeux</UButton>
              <UButton to="/admin-v2/users" color="neutral" variant="soft" icon="i-lucide-users" block>Utilisateurs</UButton>
              <UButton to="/admin-v2/servers" color="neutral" variant="soft" icon="i-lucide-server" block>Serveurs</UButton>
              <UButton to="/admin-v2/broadcast" color="neutral" variant="soft" icon="i-lucide-send" block>Broadcast</UButton>
              <UButton to="/admin-v2/stats" color="neutral" variant="soft" icon="i-lucide-chart-column" block>Statistiques</UButton>
              <UButton to="/admin-v2/logs" color="neutral" variant="soft" icon="i-lucide-scroll-text" block>Logs</UButton>
              <UButton to="/admin-v2/billing" color="primary" variant="solid" icon="i-lucide-credit-card" block>Stripe / Premium</UButton>
              <UButton to="/admin-v2/database" color="primary" variant="solid" icon="i-lucide-database" block>Debug BDD</UButton>
            </div>
          </UCard>

          <UCard class="xl:col-span-2">
            <template #header>
              <div class="font-semibold">Derniers logs admin</div>
            </template>
            <div v-if="!adminLogs.length" class="text-sm text-muted">Aucun log récent.</div>
            <ul v-else class="space-y-3">
              <li
                v-for="(log, idx) in adminLogs.slice(0, 8)"
                :key="idx"
                class="rounded-xl border border-default px-3 py-2 text-sm"
              >
                <div class="font-medium">{{ log.action || log.type || "Événement" }}</div>
                <div class="text-muted text-xs mt-1">{{ log.created_at || log.at || "—" }}</div>
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { requireAdmin, isAdmin } = useAdminV2Guard();
await requireAdmin();

const { summary, adminLogs, loadOverview } = useAdminV2Data();
const loading = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    await loadOverview();
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.stat {
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  display: grid;
  gap: 8px;
}
.stat span {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.stat strong {
  font-family: var(--font-display);
  font-size: 1.85rem;
  letter-spacing: -0.03em;
}
</style>
