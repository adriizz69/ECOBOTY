<template>
  <UPageCard title="Réglages globaux" description="Configuration système BOT V2" variant="naked" orientation="horizontal" class="mb-2" />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <UPageCard title="Interface utilisateur" description="Coupe ou réactive l'espace utilisateur global" variant="subtle">
      <div class="flex gap-2 justify-end">
        <UButton color="error" :loading="uiLoading" @click="toggleUi(true)">Désactiver</UButton>
        <UButton color="neutral" variant="outline" :disabled="uiLoading" @click="toggleUi(false)">Activer</UButton>
      </div>
      <p v-if="uiStatus" class="text-sm text-muted mt-2">{{ uiStatus }}</p>
    </UPageCard>
  </div>
</template>

<script setup>
const { isAdmin, requireAdmin } = useAdminV2Guard();
const { setUserUiGlobal } = useAdminV2Data();

const uiLoading = ref(false);
const uiStatus = ref("");

const toggleUi = async (disabled) => {
  uiLoading.value = true;
  try {
    const ok = await setUserUiGlobal(disabled);
    uiStatus.value = ok
      ? `Interface utilisateur ${disabled ? "désactivée" : "activée"}.`
      : "Erreur de mise à jour interface utilisateur.";
  } finally {
    uiLoading.value = false;
  }
};

onMounted(async () => {
  await requireAdmin();
});
</script>
