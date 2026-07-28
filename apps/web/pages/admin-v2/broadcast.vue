<template>
  <UDashboardPanel id="admin-v2-broadcast">
    <template #header>
      <UDashboardNavbar title="Broadcast">
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
          title="Annonce globale"
          description="Envoie un message à tous les salons log BOT configurés."
          variant="naked"
          orientation="horizontal"
        />

        <UPageCard variant="subtle">
          <div class="space-y-4">
            <UFormField label="Message global">
              <UTextarea
                v-model="message"
                :rows="6"
                placeholder="Message à envoyer dans les salons log BOT"
              />
            </UFormField>

            <div class="flex items-center gap-2">
              <USwitch v-model="includeBanned" />
              <span class="text-sm text-muted">Inclure les serveurs bannis</span>
            </div>

            <div class="flex justify-end">
              <UButton color="primary" :loading="sending" @click="send">Envoyer le broadcast</UButton>
            </div>

            <UAlert v-if="status" :title="status" color="neutral" variant="subtle" />
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const { sendBroadcast: sendBroadcastApi } = useAdminV2Data();

const message = ref("");
const includeBanned = ref(false);
const sending = ref(false);
const status = ref("");

const send = async () => {
  const payload = String(message.value || "").trim();
  if (!payload) {
    status.value = "Message vide.";
    return;
  }
  sending.value = true;
  status.value = "";
  try {
    const result = await sendBroadcastApi({ message: payload, includeBanned: includeBanned.value });
    status.value = result?.message || "Terminé.";
    if (result?.ok) message.value = "";
  } finally {
    sending.value = false;
  }
};

onMounted(async () => {
  await requireAdmin();
});
</script>
