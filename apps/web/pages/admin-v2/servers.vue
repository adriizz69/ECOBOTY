<template>
  <UDashboardPanel id="admin-v2-servers">
    <template #header>
      <UDashboardNavbar title="Serveurs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
          <UButton color="neutral" variant="outline" :loading="loading" @click="loadData">Actualiser</UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex flex-wrap items-center gap-3">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Rechercher un serveur ou ID..."
              class="w-80"
            />

            <div class="flex items-center gap-2 rounded-lg border border-default bg-elevated/30 px-3 py-2">
              <USwitch v-model="showOnlyBanned" />
              <span class="text-xs text-muted">Bannis seulement</span>
            </div>

            <div class="flex items-center gap-2 rounded-lg border border-default bg-elevated/30 px-3 py-2">
              <USwitch v-model="showBotPresent" />
              <span class="text-xs text-muted">Bot présent</span>
            </div>

            <div class="flex items-center gap-2 rounded-lg border border-default bg-elevated/30 px-3 py-2">
              <USwitch v-model="showBotAbsent" />
              <span class="text-xs text-muted">Bot absent</span>
            </div>

            <UButton color="neutral" variant="ghost" @click="resetFilters">Réinitialiser</UButton>
          </div>
        </template>
      </UDashboardToolbar>
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
          title="Gestion des serveurs"
          description="Clique un serveur pour voir les rôles, permissions et configurations. Contrôle aussi présence bot, ban et UI membre."
          variant="naked"
          orientation="horizontal"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UPageCard title="Total serveurs" variant="subtle">
            <p class="text-3xl font-semibold">{{ stats.total }}</p>
          </UPageCard>
          <UPageCard title="Serveurs filtrés" variant="subtle">
            <p class="text-3xl font-semibold">{{ stats.filtered }}</p>
          </UPageCard>
          <UPageCard title="Bannis (filtre)" variant="subtle">
            <p class="text-3xl font-semibold">{{ stats.banned }}</p>
          </UPageCard>
          <UPageCard title="Bot absent (filtre)" variant="subtle">
            <p class="text-3xl font-semibold">{{ stats.botAbsent }}</p>
          </UPageCard>
        </div>

        <UPageCard variant="subtle">
          <div v-if="!rows.length" class="text-sm text-muted">Aucun serveur.</div>
          <UTable v-else :data="rows" :columns="columns" :ui="{ td: 'align-top' }" />
        </UPageCard>
      </div>

      <UModal v-model:open="showBanModal" title="Bannir le serveur" description="Indique une raison pour tracer l’action.">
        <template #body>
          <div class="space-y-4">
            <UFormField label="Raison">
              <UTextarea v-model="banReason" :rows="4" placeholder="Raison du bannissement" />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="outline" @click="showBanModal = false">Annuler</UButton>
              <UButton color="error" :loading="banSaving" @click="confirmBan">Confirmer</UButton>
            </div>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="showDetailsModal"
        :title="details?.guild?.name || 'Détail serveur'"
        :description="details?.guild?.id || ''"
        :ui="{ content: 'sm:max-w-4xl' }"
      >
        <template #body>
          <div v-if="detailsLoading" class="py-8 text-center text-sm text-muted">Chargement des détails…</div>
          <div v-else-if="detailsError" class="space-y-3">
            <p class="text-sm text-error">{{ detailsError }}</p>
            <UButton color="neutral" variant="outline" @click="reloadDetails">Réessayer</UButton>
          </div>
          <div v-else-if="details" class="space-y-6">
            <div class="flex flex-wrap items-start gap-4">
              <UAvatar
                :src="details.guild.iconUrl || undefined"
                :icon="details.guild.iconUrl ? undefined : 'i-lucide-shield'"
                size="lg"
              />
              <div class="min-w-0 flex-1 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-semibold">{{ details.guild.name }}</h3>
                  <UBadge :color="details.billing?.isPremium ? 'primary' : 'neutral'" variant="subtle">
                    {{ details.billing?.isPremium ? "Premium" : "Free" }}
                  </UBadge>
                  <UBadge :color="details.guild.botPresent ? 'success' : 'error'" variant="subtle">
                    {{ details.guild.botPresent ? "Bot présent" : "Bot absent" }}
                  </UBadge>
                  <UBadge :color="details.guild.banned ? 'error' : 'success'" variant="subtle">
                    {{ details.guild.banned ? "Banni" : "Actif" }}
                  </UBadge>
                </div>
                <p class="font-mono text-xs text-muted">{{ details.guild.id }}</p>
                <p class="text-sm text-muted">
                  {{ formatMembers(details.guild.memberCount) }}
                  <span v-if="details.guild.presenceCount != null"> · {{ details.guild.presenceCount }} en ligne</span>
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Plan</p>
                <p class="font-medium">{{ details.billing?.planKey || "free" }} · {{ details.billing?.status || "—" }}</p>
              </div>
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Monnaie</p>
                <p class="font-medium">
                  {{ details.config?.currencySymbol || "—" }}
                  {{ details.config?.currencyName || "" }}
                </p>
              </div>
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Boutiques</p>
                <p class="font-medium">
                  {{ details.config?.shopsCount || 0 }}
                  <span class="text-muted">({{ details.config?.userShopsCount || 0 }} user)</span>
                </p>
              </div>
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Soldes / items</p>
                <p class="font-medium">
                  {{ details.config?.balancesCount || 0 }} / {{ details.config?.itemsCount || 0 }}
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="text-sm font-semibold">Configuration</h4>
              <ul class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <li class="rounded-lg border border-default px-3 py-2">
                  Fuseau : <span class="font-medium">{{ details.config?.timezone || "—" }}</span>
                </li>
                <li class="rounded-lg border border-default px-3 py-2">
                  Salon logs :
                  <span class="font-mono text-xs">{{ details.config?.logChannelId || "—" }}</span>
                </li>
                <li class="rounded-lg border border-default px-3 py-2">
                  Économie :
                  <span class="font-medium">{{ boolLabel(details.config?.economyEnabled) }}</span>
                </li>
                <li class="rounded-lg border border-default px-3 py-2">
                  Jeux configurés :
                  <span class="font-medium">{{ details.config?.gamesConfigured ? "Oui" : "Non" }}</span>
                </li>
                <li class="rounded-lg border border-default px-3 py-2">
                  Twitch :
                  <span class="font-medium">
                    {{
                      details.config?.twitchConnected
                        ? `@${details.config.twitchLogin || "lié"}`
                        : "Non lié"
                    }}
                  </span>
                </li>
                <li class="rounded-lg border border-default px-3 py-2">
                  Anniversaires :
                  <span class="font-medium">{{ boolLabel(details.config?.birthdayEnabled) }}</span>
                </li>
                <li class="rounded-lg border border-default px-3 py-2">
                  Succès définis :
                  <span class="font-medium">{{ details.config?.achievementsCount || 0 }}</span>
                </li>
                <li class="rounded-lg border border-default px-3 py-2">
                  UI membre :
                  <span class="font-medium">{{ details.guild.userUiDisabled ? "Désactivée" : "Active" }}</span>
                </li>
              </ul>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h4 class="text-sm font-semibold">Rôles & permissions ({{ filteredRoles.length }})</h4>
                <UInput
                  v-model="roleSearch"
                  icon="i-lucide-search"
                  size="sm"
                  placeholder="Filtrer un rôle…"
                  class="w-56"
                />
              </div>
              <div v-if="!filteredRoles.length" class="text-sm text-muted">Aucun rôle trouvé.</div>
              <div v-else class="max-h-80 space-y-2 overflow-y-auto pr-1">
                <div
                  v-for="role in filteredRoles"
                  :key="role.id"
                  class="rounded-lg border border-default px-3 py-2"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-block size-2.5 rounded-full"
                      :style="{ background: roleColor(role.color) }"
                    />
                    <span class="font-medium">{{ role.name }}</span>
                    <UBadge v-if="role.isAdmin" color="warning" variant="subtle" size="sm">Admin</UBadge>
                    <UBadge v-if="role.managed" color="neutral" variant="subtle" size="sm">Géré</UBadge>
                    <span class="font-mono text-[11px] text-muted">{{ role.id }}</span>
                  </div>
                  <p class="mt-1 text-xs text-muted">
                    {{
                      role.permissionLabels?.length
                        ? role.permissionLabels.join(" · ")
                        : "Aucune permission sensible listée"
                    }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :to="`/guild/${details.guild.id}`"
                target="_blank"
              >
                Ouvrir le dashboard
              </UButton>
              <UButton color="neutral" variant="soft" @click="showDetailsModal = false">Fermer</UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup>
import { h, resolveComponent } from "vue";

definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const {
  guilds,
  loadOverview,
  banGuild,
  unbanGuild,
  createInvite,
  setUserUiForGuild,
  loadGuildDetails
} = useAdminV2Data();

const toast = useToast();
const UBadge = resolveComponent("UBadge");
const UAvatar = resolveComponent("UAvatar");
const USwitch = resolveComponent("USwitch");
const UButton = resolveComponent("UButton");

const loading = ref(false);
const search = ref("");
const showOnlyBanned = ref(false);
const showBotPresent = ref(true);
const showBotAbsent = ref(true);

const uiSaving = reactive({});
const inviteLoading = reactive({});

const showBanModal = ref(false);
const banTarget = ref(null);
const banReason = ref("");
const banSaving = ref(false);

const showDetailsModal = ref(false);
const detailsLoading = ref(false);
const detailsError = ref("");
const details = ref(null);
const detailsGuildId = ref("");
const roleSearch = ref("");

const filteredGuilds = computed(() => {
  const q = String(search.value || "").trim().toLowerCase();
  const list = Array.isArray(guilds.value) ? guilds.value : [];
  return list.filter((guild) => {
    if (showOnlyBanned.value && !guild.banned) return false;
    if (!showBotPresent.value && guild.bot_present) return false;
    if (!showBotAbsent.value && !guild.bot_present) return false;
    if (!q) return true;
    return (
      String(guild.discord_guild_id || "").includes(q) ||
      String(guild.displayName || guild.name || "").toLowerCase().includes(q)
    );
  });
});

const rows = computed(() => filteredGuilds.value);

const stats = computed(() => {
  const all = Array.isArray(guilds.value) ? guilds.value : [];
  const filtered = filteredGuilds.value;
  return {
    total: all.length,
    filtered: filtered.length,
    banned: filtered.filter((guild) => Boolean(guild.banned)).length,
    botAbsent: filtered.filter((guild) => !guild.bot_present).length
  };
});

const filteredRoles = computed(() => {
  const roles = Array.isArray(details.value?.roles) ? details.value.roles : [];
  const q = String(roleSearch.value || "").trim().toLowerCase();
  if (!q) return roles.filter((role) => !role.isEveryone);
  return roles.filter(
    (role) =>
      !role.isEveryone &&
      (String(role.name || "").toLowerCase().includes(q) || String(role.id || "").includes(q))
  );
});

const formatMembers = (count) => {
  const value = Number(count || 0);
  if (!Number.isFinite(value) || value <= 0) return "Membres indisponibles";
  return `${value.toLocaleString("fr-FR")} membre${value > 1 ? "s" : ""}`;
};

const boolLabel = (value) => {
  if (value === true) return "Activée";
  if (value === false) return "Désactivée";
  return "—";
};

const roleColor = (color) => {
  const numeric = Number(color || 0);
  if (!numeric) return "#94a3b8";
  return `#${numeric.toString(16).padStart(6, "0")}`;
};

const resetFilters = () => {
  search.value = "";
  showOnlyBanned.value = false;
  showBotPresent.value = true;
  showBotAbsent.value = true;
};

const openInvite = async (guild) => {
  inviteLoading[guild.discord_guild_id] = true;
  try {
    const url = await createInvite(guild.discord_guild_id);
    if (url && import.meta.client) window.open(url, "_blank", "noopener");
  } finally {
    inviteLoading[guild.discord_guild_id] = false;
  }
};

const toggleUserUi = async (guild, enabled) => {
  uiSaving[guild.discord_guild_id] = true;
  try {
    const ok = await setUserUiForGuild(guild.discord_guild_id, !enabled);
    if (ok) guild.user_ui_disabled = !enabled;
  } finally {
    uiSaving[guild.discord_guild_id] = false;
  }
};

const openBanModal = (guild) => {
  banTarget.value = guild;
  banReason.value = "";
  showBanModal.value = true;
};

const confirmBan = async () => {
  if (!banTarget.value) return;
  banSaving.value = true;
  try {
    await banGuild(banTarget.value.discord_guild_id, String(banReason.value || ""));
    showBanModal.value = false;
    await loadData();
  } finally {
    banSaving.value = false;
  }
};

const unban = async (guild) => {
  await unbanGuild(guild.discord_guild_id);
  await loadData();
};

const openDetails = async (guild) => {
  detailsGuildId.value = String(guild.discord_guild_id || "");
  showDetailsModal.value = true;
  roleSearch.value = "";
  await reloadDetails();
};

const reloadDetails = async () => {
  if (!detailsGuildId.value) return;
  detailsLoading.value = true;
  detailsError.value = "";
  details.value = null;
  try {
    details.value = await loadGuildDetails(detailsGuildId.value);
  } catch (error) {
    detailsError.value = String(error?.message || error);
    toast.add({
      title: "Détails serveur indisponibles",
      description: detailsError.value,
      color: "error"
    });
  } finally {
    detailsLoading.value = false;
  }
};

const columns = [
  {
    id: "server",
    header: "Serveur",
    cell: ({ row }) =>
      h(
        "button",
        {
          type: "button",
          class: "flex w-full items-center gap-3 rounded-lg text-left transition hover:bg-elevated/60",
          onClick: () => openDetails(row.original)
        },
        [
          h(UAvatar, {
            src: row.original.iconUrl || undefined,
            icon: row.original.iconUrl ? undefined : "i-lucide-shield",
            alt: row.original.displayName,
            size: "sm"
          }),
          h("div", { class: "min-w-0" }, [
            h("div", { class: "truncate text-sm font-medium" }, row.original.displayName),
            h(
              "div",
              { class: "text-xs text-muted" },
              formatMembers(row.original.member_count)
            )
          ])
        ]
      )
  },
  { accessorKey: "discord_guild_id", header: "ID" },
  {
    id: "presence",
    header: "Présence",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.bot_present ? "success" : "error",
          variant: "subtle"
        },
        () => (row.original.bot_present ? "Présent" : "Absent")
      )
  },
  {
    id: "status",
    header: "Statut",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.banned ? "error" : "success",
          variant: "subtle"
        },
        () => (row.original.banned ? "Banni" : "Actif")
      )
  },
  {
    id: "userui",
    header: "User UI",
    cell: ({ row }) =>
      h(USwitch, {
        modelValue: !row.original.user_ui_disabled,
        disabled: Boolean(uiSaving[row.original.discord_guild_id]),
        "onUpdate:modelValue": (value) => toggleUserUi(row.original, value)
      })
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) =>
      h("div", { class: "flex flex-wrap justify-end gap-2" }, [
        h(
          UButton,
          {
            color: "primary",
            variant: "soft",
            size: "xs",
            onClick: () => openDetails(row.original)
          },
          () => "Détails"
        ),
        h(
          UButton,
          {
            color: "neutral",
            variant: "outline",
            size: "xs",
            loading: Boolean(inviteLoading[row.original.discord_guild_id]),
            onClick: () => openInvite(row.original)
          },
          () => "Invite"
        ),
        !row.original.banned
          ? h(
              UButton,
              {
                color: "error",
                variant: "outline",
                size: "xs",
                onClick: () => openBanModal(row.original)
              },
              () => "Bannir"
            )
          : h(
              UButton,
              {
                color: "neutral",
                variant: "outline",
                size: "xs",
                onClick: () => unban(row.original)
              },
              () => "Dé-bannir"
            )
      ])
  }
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
