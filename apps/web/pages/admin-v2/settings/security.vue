<template>
  <UPageCard title="Sécurité" description="Contrôle d'accès admin BOT" variant="naked" orientation="horizontal" class="mb-2" />

  <UPageCard title="Compte admin" variant="subtle" class="mb-4">
    <div class="grid gap-2 text-sm">
      <div><strong>Discord ID:</strong> {{ me?.discord_id || '—' }}</div>
      <div><strong>Username:</strong> {{ me?.username || '—' }}</div>
      <div><strong>Statut admin:</strong> {{ isAdmin ? 'Autorisé' : 'Refusé' }}</div>
    </div>
  </UPageCard>

  <UPageCard title="Actions sensibles" description="Accès direct aux modules à risque" variant="subtle">
    <div class="flex flex-wrap gap-2">
      <UButton to="/admin-v2/servers" color="error" variant="outline">Bans serveurs</UButton>
      <UButton to="/admin-v2/database" color="neutral" variant="outline">Debug BDD</UButton>
      <UButton to="/admin-v2/logs" color="neutral" variant="outline">Logs admin</UButton>
    </div>
  </UPageCard>
</template>

<script setup>
const { me, isAdmin, requireAdmin } = useAdminV2Guard();

onMounted(async () => {
  await requireAdmin();
});
</script>
