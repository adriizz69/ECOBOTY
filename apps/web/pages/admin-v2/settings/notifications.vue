<template>
  <UPageCard title="Notifications" description="Message de bienvenue et communication globale" variant="naked" orientation="horizontal" class="mb-2" />

  <UPageCard title="Broadcast" description="Envoi global vers les salons log BOT" variant="subtle" class="mb-4">
    <div class="grid gap-3">
      <UTextarea v-model="broadcastMessage" :rows="4" placeholder="Message broadcast" />
      <div class="flex items-center gap-2">
        <USwitch v-model="broadcastIncludeBanned" />
        <span>Inclure les serveurs bannis</span>
      </div>
      <div class="flex justify-end">
        <UButton color="primary" :loading="broadcastLoading" @click="sendBroadcastNow">Envoyer</UButton>
      </div>
      <p v-if="broadcastStatus" class="text-sm text-muted">{{ broadcastStatus }}</p>
    </div>
  </UPageCard>

  <UPageCard title="Shortcut" description="Ouvrir la page broadcast dédiée" variant="subtle">
    <UButton to="/admin-v2/broadcast" color="neutral" variant="outline">Aller sur Broadcast</UButton>
  </UPageCard>
</template>

<script setup>
const { requireAdmin } = useAdminV2Guard();
const { sendBroadcast } = useAdminV2Data();

const broadcastMessage = ref("");
const broadcastIncludeBanned = ref(false);
const broadcastLoading = ref(false);
const broadcastStatus = ref("");

const sendBroadcastNow = async () => {
  const message = String(broadcastMessage.value || "").trim();
  if (!message) {
    broadcastStatus.value = "Message vide.";
    return;
  }
  broadcastLoading.value = true;
  try {
    const result = await sendBroadcast({ message, includeBanned: broadcastIncludeBanned.value });
    broadcastStatus.value = result?.message || "Terminé.";
    if (result?.ok) broadcastMessage.value = "";
  } finally {
    broadcastLoading.value = false;
  }
};

onMounted(async () => {
  await requireAdmin();
});
</script>
