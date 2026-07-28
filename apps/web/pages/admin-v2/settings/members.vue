<template>
  <UPageCard title="Membres" description="Aperçu rapide des utilisateurs authentifiés" variant="naked" orientation="horizontal" class="mb-2" />

  <UPageCard variant="subtle">
    <div class="flex items-center justify-between gap-2 mb-3">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher utilisateur" class="max-w-sm" />
      <UButton color="neutral" variant="outline" :loading="loading" @click="load">Actualiser</UButton>
    </div>
    <UTable :data="users" :columns="columns" />
    <div class="mt-3 flex justify-end">
      <UButton to="/admin-v2/users" color="primary" variant="solid">Ouvrir la page utilisateurs complète</UButton>
    </div>
  </UPageCard>
</template>

<script setup>
const config = useRuntimeConfig();
const { getToken } = useAuth();
const { requireAdmin } = useAdminV2Guard();

const users = ref([]);
const loading = ref(false);
const search = ref("");

const columns = [
  { accessorKey: "username", header: "Utilisateur" },
  { accessorKey: "discord_id", header: "ID" },
  { accessorKey: "twitch_login", header: "Twitch" }
];

const load = async () => {
  loading.value = true;
  try {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams({ limit: "20", offset: "0", search: search.value || "" });
    const res = await fetch(`${config.public.apiBase}/api/admin/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    users.value = Array.isArray(data.users) ? data.users : [];
  } finally {
    loading.value = false;
  }
};

watch(search, () => {
  load();
});

onMounted(async () => {
  const ok = await requireAdmin();
  if (!ok) return;
  await load();
});
</script>
