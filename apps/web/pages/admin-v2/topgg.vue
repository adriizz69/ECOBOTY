<template>
  <UDashboardPanel id="admin-v2-topgg">
    <template #header>
      <UDashboardNavbar title="Top.gg">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
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
          title="Intégration Top.gg"
          description="Sync du nombre de serveurs, votes, récompenses claimables via /vote."
          variant="naked"
          orientation="horizontal"
        >
          <template #trailing>
            <div class="flex flex-wrap gap-2">
              <UButton
                color="primary"
                variant="solid"
                icon="i-lucide-external-link"
                :to="votePageUrl"
                target="_blank"
                rel="noreferrer"
              >
                Voter sur Top.gg
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="syncLoading"
                @click="forceSync"
              >
                Forcer sync
              </UButton>
            </div>
          </template>
        </UPageCard>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UPageCard title="Statut" variant="subtle">
            <p class="text-sm">
              <UBadge :color="overview?.active ? 'success' : 'warning'" variant="soft">
                {{ overview?.active ? "Actif" : "Inactif" }}
              </UBadge>
            </p>
            <p class="mt-2 text-xs text-muted">
              Token : {{ overview?.configured ? "configuré" : "manquant (.env TOPGG_TOKEN)" }}
            </p>
            <p class="text-xs text-muted">
              Webhook : {{ overview?.webhookConfigured ? "configuré" : "manquant (.env TOPGG_WEBHOOK_SECRET)" }}
            </p>
          </UPageCard>

          <UPageCard title="Serveurs (local)" variant="subtle">
            <p class="text-2xl font-semibold">{{ overview?.localServerCount ?? "—" }}</p>
            <p class="mt-1 text-xs text-muted">
              Dernière sync :
              {{ formatDate(overview?.settings?.last_metrics_sync_at) }}
            </p>
            <p v-if="overview?.settings?.last_metrics_error" class="mt-1 text-xs text-error">
              {{ overview.settings.last_metrics_error }}
            </p>
          </UPageCard>

          <UPageCard title="Votes (Top.gg)" variant="subtle">
            <p class="text-sm">Mois : <strong>{{ projectVotes }}</strong></p>
            <p class="text-sm">Total : <strong>{{ projectVotesTotal }}</strong></p>
            <p class="text-sm">Note : <strong>{{ projectScore }}</strong></p>
            <p v-if="overview?.projectError" class="mt-1 text-xs text-error">{{ overview.projectError }}</p>
          </UPageCard>

          <UPageCard title="Votes non claimés" variant="subtle">
            <p class="text-2xl font-semibold">{{ overview?.unclaimedVotes ?? 0 }}</p>
            <p class="mt-1 text-xs text-muted">En attente de `/vote claim`</p>
          </UPageCard>
        </div>

        <UPageCard title="Récompenses" description="Montant crédité sur le serveur où le membre claim." variant="subtle">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-medium">Activer l’intégration</div>
                <div class="text-xs text-muted">Coupe sync + claims (token .env toujours requis).</div>
              </div>
              <USwitch v-model="enabled" />
            </div>
            <UFormField label="Récompense de base (coins)">
              <UInput v-model.number="rewardAmount" type="number" min="0" step="1" />
              <p class="mt-1 text-xs text-muted">Le weekend Top.gg (weight ×2) multiplie automatiquement.</p>
            </UFormField>
          </div>
          <div class="mt-4 flex items-center gap-3">
            <UButton color="primary" :loading="saveLoading" @click="saveSettings">Enregistrer</UButton>
            <p v-if="statusMessage" class="text-sm text-muted">{{ statusMessage }}</p>
          </div>
        </UPageCard>

        <UPageCard title="Derniers votes" description="Événements reçus via le webhook Top.gg." variant="subtle">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-left text-sm">
              <thead class="text-xs text-muted">
                <tr>
                  <th class="py-2 pr-3">Utilisateur</th>
                  <th class="py-2 pr-3">Discord ID</th>
                  <th class="py-2 pr-3">Poids</th>
                  <th class="py-2 pr-3">Vote</th>
                  <th class="py-2 pr-3">Claim</th>
                  <th class="py-2">Récompense</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="vote in votes" :key="vote.id" class="border-t border-default">
                  <td class="py-2 pr-3">{{ vote.username || "—" }}</td>
                  <td class="py-2 pr-3 font-mono text-xs">{{ vote.discord_user_id }}</td>
                  <td class="py-2 pr-3">×{{ vote.weight }}</td>
                  <td class="py-2 pr-3">{{ formatDate(vote.voted_at) }}</td>
                  <td class="py-2 pr-3">
                    <UBadge :color="vote.claimed_at ? 'success' : 'neutral'" variant="soft">
                      {{ vote.claimed_at ? "Claimé" : "En attente" }}
                    </UBadge>
                    <div v-if="vote.claimed_guild_id" class="mt-1 font-mono text-[11px] text-muted">
                      {{ vote.claimed_guild_id }}
                    </div>
                  </td>
                  <td class="py-2">{{ vote.reward_amount ?? "—" }}</td>
                </tr>
                <tr v-if="!votes.length">
                  <td colspan="6" class="py-6 text-center text-muted">Aucun vote reçu pour le moment.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const { loadTopggOverview, saveTopggSettings, syncTopggMetrics } = useAdminV2Data();

const overview = ref(null);
const enabled = ref(true);
const rewardAmount = ref(500);
const saveLoading = ref(false);
const syncLoading = ref(false);
const statusMessage = ref("");

const votePageUrl = computed(
  () => overview.value?.votePageUrl || "https://top.gg/fr/bot/1465377603090383161"
);
const votes = computed(() => overview.value?.recentVotes || []);
const projectVotes = computed(() => overview.value?.project?.votes ?? "—");
const projectVotesTotal = computed(() => overview.value?.project?.votes_total ?? "—");
const projectScore = computed(() => {
  const score = overview.value?.project?.review_score;
  return score === null || score === undefined ? "—" : Number(score).toFixed(2);
});

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
};

const refresh = async () => {
  overview.value = await loadTopggOverview();
  if (overview.value?.settings) {
    enabled.value = Boolean(overview.value.settings.enabled);
    rewardAmount.value = Number(overview.value.settings.reward_amount || 0);
  }
};

const saveSettings = async () => {
  saveLoading.value = true;
  statusMessage.value = "";
  try {
    const result = await saveTopggSettings({
      enabled: enabled.value,
      rewardAmount: rewardAmount.value
    });
    statusMessage.value = result.ok ? "Réglages enregistrés." : result.message || "Erreur";
    if (result.ok) await refresh();
  } finally {
    saveLoading.value = false;
  }
};

const forceSync = async () => {
  syncLoading.value = true;
  statusMessage.value = "";
  try {
    const result = await syncTopggMetrics();
    if (result.ok) {
      statusMessage.value = `Sync OK (${result.serverCount ?? "?"} serveurs).`;
    } else if (result.skipped) {
      statusMessage.value = `Sync ignorée : ${result.reason || "disabled"}`;
    } else {
      statusMessage.value = result.message || result.error || "Sync échouée";
    }
    await refresh();
  } finally {
    syncLoading.value = false;
  }
};

onMounted(async () => {
  await requireAdmin();
  if (isAdmin.value) await refresh();
});
</script>
