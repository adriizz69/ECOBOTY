<template>
  <UDashboardPanel id="admin-v2-global-settings">
    <template #header>
      <UDashboardNavbar title="Réglages globaux">
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
          title="Règles globales"
          description="Paramètres appliqués à tous les serveurs liés au bot."
          variant="naked"
          orientation="horizontal"
        />

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <UPageCard title="Interface utilisateur" description="Coupe ou réactive l’espace utilisateur global." variant="subtle">
            <div class="flex items-center justify-end gap-2">
              <UButton color="error" variant="solid" :loading="uiLoading" @click="updateUserUi(true)">Désactiver</UButton>
              <UButton color="neutral" variant="outline" :disabled="uiLoading" @click="updateUserUi(false)">Activer</UButton>
            </div>
            <p v-if="uiStatus" class="mt-2 text-sm text-muted">{{ uiStatus }}</p>
          </UPageCard>

        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const { guilds, loadOverview, setUserUiGlobal } = useAdminV2Data();

const uiLoading = ref(false);
const uiStatus = ref("");

const updateUserUi = async (disabled) => {
  uiLoading.value = true;
  uiStatus.value = "";
  try {
    const ok = await setUserUiGlobal(disabled);
    if (ok) {
      guilds.value = guilds.value.map((g) => ({ ...g, user_ui_disabled: disabled }));
      uiStatus.value = disabled
        ? "Interface utilisateur désactivée globalement."
        : "Interface utilisateur activée globalement.";
    } else {
      uiStatus.value = "Erreur lors de la mise à jour globale.";
    }
  } finally {
    uiLoading.value = false;
  }
};

onMounted(async () => {
  const ok = await requireAdmin();
  if (!ok) return;
  await loadOverview();
});
</script>
