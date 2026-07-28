<template>
  <UDashboardPanel id="admin-v2-users">
    <template #header>
      <UDashboardNavbar title="Utilisateurs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
          <UButton color="neutral" variant="outline" :loading="usersLoading" @click="loadUsers">Actualiser</UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex flex-wrap items-center gap-3">
            <UInput
              v-model="userSearch"
              icon="i-lucide-search"
              placeholder="Rechercher un utilisateur..."
              class="w-80"
            />
            <UInput
              v-model="userGuildSearch"
              icon="i-lucide-server"
              placeholder="Serveur (nom ou ID)..."
              class="w-72"
            />
            <USelectMenu
              v-model="usersLimit"
              :items="limitOptions"
              label-key="label"
              value-key="value"
              :searchable="false"
              class="w-36"
            />
            <UButton color="neutral" variant="outline" @click="applyUserFilters">Rechercher</UButton>
            <UButton color="neutral" variant="ghost" @click="resetUserFilters">Réinitialiser</UButton>
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
          title="Utilisateurs authentifiés"
          description="Comptes Discord/Twitch liés et accès au détail complet."
          variant="naked"
          orientation="horizontal"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <UPageCard title="Total résultats" variant="subtle">
            <p class="text-3xl font-semibold">{{ usersStats.total }}</p>
          </UPageCard>
          <UPageCard title="Affichés (page)" variant="subtle">
            <p class="text-3xl font-semibold">{{ usersStats.currentPageCount }}</p>
          </UPageCard>
          <UPageCard title="Connectés Twitch (page)" variant="subtle">
            <p class="text-3xl font-semibold">{{ usersStats.twitchLinked }}</p>
          </UPageCard>
          <UPageCard title="Admin serveur (page)" variant="subtle">
            <p class="text-3xl font-semibold">{{ usersStats.serverAdmins }}</p>
          </UPageCard>
          <UPageCard title="Pages" variant="subtle">
            <p class="text-3xl font-semibold">{{ usersStats.pages }}</p>
          </UPageCard>
        </div>

        <UPageCard variant="subtle">
          <div v-if="!rows.length" class="text-sm text-muted">
            {{ usersLoading ? "Chargement..." : "Aucun utilisateur trouvé." }}
          </div>
          <UTable v-else :data="rows" :columns="columns" :ui="{ td: 'align-top' }" />

          <template #footer>
            <div class="flex items-center justify-center gap-2">
              <UButton color="neutral" variant="outline" :disabled="usersPage <= 1" @click="changeUsersPage(-1)">
                Précédent
              </UButton>
              <span class="text-xs text-muted">Page {{ usersPage }} / {{ usersTotalPages }}</span>
              <UButton color="neutral" variant="outline" :disabled="usersPage >= usersTotalPages" @click="changeUsersPage(1)">
                Suivant
              </UButton>
            </div>
          </template>
        </UPageCard>
      </div>

      <UModal
        v-model:open="showUserModal"
        title="Détails utilisateur"
        description="Profil Discord, facturation Premium et serveurs EcoBoty."
        :ui="{ content: 'sm:max-w-4xl' }"
      >
        <template #body>
          <div v-if="userDetailsLoading" class="text-sm text-muted">Chargement...</div>

          <div v-else-if="selectedUserDetails" class="space-y-4">
            <div class="flex flex-wrap items-start gap-4 rounded-xl border border-default bg-elevated/40 p-4">
              <UAvatar
                :src="userAvatarUrl || undefined"
                :alt="selectedUserDetails.user.username"
                icon="i-lucide-user"
                size="3xl"
              />
              <div class="min-w-0 flex-1 space-y-2">
                <div>
                  <h3 class="text-lg font-semibold">{{ selectedUserDetails.user.username }}</h3>
                  <p v-if="selectedUserDetails.discord?.global_name" class="text-sm text-muted">
                    {{ selectedUserDetails.discord.global_name }}
                  </p>
                  <p class="font-mono text-xs text-muted">{{ selectedUserDetails.user.discord_id }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UBadge v-if="selectedUserDetails.flags?.is_premium_purchaser" color="warning" variant="subtle">
                    Acheteur Premium
                  </UBadge>
                  <UBadge v-if="selectedUserDetails.flags?.is_platform_admin" color="error" variant="subtle">
                    Admin plateforme
                  </UBadge>
                  <UBadge v-if="selectedUserDetails.flags?.is_server_owner" color="primary" variant="subtle">
                    Propriétaire serveur
                  </UBadge>
                  <UBadge v-else-if="selectedUserDetails.flags?.is_guild_manager" color="info" variant="subtle">
                    Gestionnaire serveur
                  </UBadge>
                  <UBadge v-if="selectedUserDetails.user.twitch_login" color="neutral" variant="subtle">
                    Twitch: {{ selectedUserDetails.user.twitch_login }}
                  </UBadge>
                </div>
              </div>
            </div>

            <UPageCard title="Profil" variant="subtle">
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="text-sm"><span class="font-medium">Utilisateur:</span> {{ selectedUserDetails.user.username }}</div>
                <div class="text-sm"><span class="font-medium">Discord ID:</span> <span class="font-mono text-xs">{{ selectedUserDetails.user.discord_id }}</span></div>
                <div class="text-sm"><span class="font-medium">Twitch:</span> {{ selectedUserDetails.user.twitch_login || "—" }}</div>
                <div class="text-sm"><span class="font-medium">Inscrit EcoBoty:</span> {{ formatDate(selectedUserDetails.user.created_at) }}</div>
                <div class="text-sm"><span class="font-medium">Nitro Discord:</span> {{ discordPremiumLabel(selectedUserDetails.discord?.premium_type) }}</div>
                <div class="text-sm"><span class="font-medium">Compte vérifié:</span> {{ formatBool(selectedUserDetails.discord?.verified) }}</div>
                <div class="text-sm"><span class="font-medium">2FA Discord:</span> {{ formatBool(selectedUserDetails.discord?.mfa_enabled) }}</div>
                <div class="text-sm"><span class="font-medium">Locale Discord:</span> {{ selectedUserDetails.discord?.locale || "—" }}</div>
              </div>
            </UPageCard>

            <UPageCard
              title="Facturation Premium"
              description="Abonnements souscrits par cet utilisateur (payeur Stripe)."
              variant="subtle"
            >
              <div v-if="!selectedUserDetails.billing?.is_premium_purchaser" class="text-sm text-muted">
                Cet utilisateur n’est pas enregistré comme payeur Premium sur EcoBoty.
              </div>
              <div v-else class="space-y-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div class="rounded-lg border border-default bg-elevated/30 px-3 py-2">
                    <p class="text-xs text-muted">Serveurs payés</p>
                    <p class="text-xl font-semibold">{{ selectedUserDetails.billing.premium_guilds_purchased }}</p>
                  </div>
                  <div class="rounded-lg border border-default bg-elevated/30 px-3 py-2">
                    <p class="text-xs text-muted">Premium actifs</p>
                    <p class="text-xl font-semibold">{{ selectedUserDetails.billing.active_premium_guilds }}</p>
                  </div>
                  <div class="rounded-lg border border-default bg-elevated/30 px-3 py-2">
                    <p class="text-xs text-muted">Clients Stripe</p>
                    <p class="text-sm font-mono">{{ (selectedUserDetails.billing.stripe_customer_ids || []).join(", ") || "—" }}</p>
                  </div>
                </div>

                <UTable
                  v-if="selectedUserDetails.billing.subscriptions?.length"
                  :data="selectedUserDetails.billing.subscriptions"
                  :columns="billingColumns"
                  :ui="{ td: 'align-top' }"
                />
              </div>
            </UPageCard>

            <UPageCard
              title="Serveurs EcoBoty"
              description="Serveurs référencés chez EcoBoty où l’utilisateur est membre, propriétaire ou modérateur."
              variant="subtle"
            >
              <div v-if="!selectedUserDetails.ecoboty_guilds?.length" class="text-sm text-muted">
                Aucun serveur EcoBoty trouvé pour cet utilisateur. Il doit être membre du serveur (OAuth) ou en être le propriétaire.
              </div>
              <UTable
                v-else
                :data="selectedUserDetails.ecoboty_guilds"
                :columns="ecobotyGuildColumns"
                :ui="{ td: 'align-top' }"
              />
            </UPageCard>

            <UPageCard title="Interface utilisateur" description="Ouvrir l’interface comme ce membre." variant="subtle">
              <div class="space-y-3">
                <UFormField label="Serveur">
                  <USelectMenu
                    v-model="impersonateGuildId"
                    :items="impersonateGuildSelectOptions"
                    label-key="label"
                    value-key="value"
                    searchable
                    class="w-full"
                  />
                </UFormField>

                <p v-if="selectedUserDetails?.guilds?.length && !impersonateGuildOptions.length" class="text-sm text-muted">
                  Aucun serveur avec le bot pour cet utilisateur.
                </p>

                <div class="flex justify-end">
                  <UButton color="primary" :loading="impersonateLoading" @click="openUserInterfaceAs">
                    {{ impersonateLoading ? "Ouverture..." : "Se connecter en tant que" }}
                  </UButton>
                </div>

                <UAlert v-if="impersonateStatus" :title="impersonateStatus" color="neutral" variant="subtle" />
              </div>
            </UPageCard>

            <UPageCard title="Synchronisation OAuth" variant="subtle">
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="text-sm"><span class="font-medium">Serveurs récupérés:</span> {{ formatBool(selectedUserDetails.oauth?.guilds_fetched) }}</div>
                <div class="text-sm"><span class="font-medium">Nombre Discord:</span> {{ selectedUserDetails.oauth?.guilds_count ?? "—" }}</div>
                <div class="text-sm"><span class="font-medium">Enregistrés:</span> {{ selectedUserDetails.oauth?.guilds_saved_count ?? "—" }}</div>
                <div class="text-sm"><span class="font-medium">Dernière sync:</span> {{ formatDate(selectedUserDetails.oauth?.updated_at) }}</div>
                <div v-if="selectedUserDetails.oauth?.guilds_error" class="md:col-span-2 text-sm text-error">
                  <span class="font-medium">Erreur:</span> {{ selectedUserDetails.oauth.guilds_error }}
                </div>
              </div>
            </UPageCard>

            <UPageCard title="Informations Discord (API)" variant="subtle">
              <UTable :data="discordRows" :columns="discordColumns" />
            </UPageCard>

            <UPageCard title="Payload brut Discord" variant="soft">
              <pre class="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-toned">{{ formatDiscordDetails(selectedUserDetails.discord) }}</pre>
            </UPageCard>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup>
import { h } from "vue";

definePageMeta({ layout: "admin-v2" });

const config = useRuntimeConfig();
const { getToken } = useAuth();
const { isAdmin, requireAdmin } = useAdminV2Guard();
const { guilds, loadOverview } = useAdminV2Data();

const UAvatar = resolveComponent("UAvatar");
const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

const users = ref([]);
const usersLoading = ref(false);
const userSearch = ref("");
const userGuildSearch = ref("");
const usersPage = ref(1);
const usersLimit = ref(20);
const usersTotal = ref(0);
const limitOptions = [
  { label: "20 / page", value: 20 },
  { label: "50 / page", value: 50 },
  { label: "100 / page", value: 100 }
];

const selectedUserDetails = ref(null);
const showUserModal = ref(false);
const userDetailsLoading = ref(false);
const impersonateGuildId = ref("");
const impersonateLoading = ref(false);
const impersonateStatus = ref("");

const normalizeUser = (row) => {
  const avatarUrl = row.avatar
    ? `https://cdn.discordapp.com/avatars/${row.discord_id}/${row.avatar}.png`
    : "";
  return {
    ...row,
    is_server_admin: Boolean(row.is_server_admin),
    displayName: row.username || row.discord_id,
    avatarUrl
  };
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR");
};

const formatBool = (value) => {
  if (value === true || value === 1 || value === "1") return "Oui";
  if (value === false || value === 0 || value === "0") return "Non";
  return "—";
};

const discordPremiumLabel = (value) => {
  const map = {
    0: "Aucun",
    1: "Nitro Classic",
    2: "Nitro",
    3: "Nitro Basic"
  };
  if (value == null || value === "") return "—";
  return map[Number(value)] || String(value);
};

const billingIntervalLabel = (key) => {
  const map = { monthly: "Mensuel", quarterly: "3 mois", yearly: "Annuel" };
  return map[String(key || "")] || "—";
};

const guildRoleColor = (role) => {
  const map = { owner: "primary", admin: "error", manager: "warning", moderator: "info", member: "neutral" };
  return map[String(role || "member")] || "neutral";
};

const billingStatusColor = (status, planKey) => {
  const normalized = String(status || "").toLowerCase();
  if (planKey === "premium" && (normalized === "active" || normalized === "trialing")) return "success";
  if (normalized === "past_due" || normalized === "unpaid") return "warning";
  return "neutral";
};

const formatDiscordDetails = (value) => {
  if (!value) return "Aucune donnée Discord.";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const loadUsers = async () => {
  const token = getToken();
  usersLoading.value = true;
  try {
    const offset = (usersPage.value - 1) * usersLimit.value;
    const params = new URLSearchParams({
      limit: String(usersLimit.value),
      offset: String(offset),
      search: userSearch.value || "",
      guildSearch: userGuildSearch.value || ""
    });
    const res = await fetch(`${config.public.apiBase}/api/admin/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      users.value = (data.users || []).map(normalizeUser);
      usersTotal.value = Number(data.total || 0);
    }
  } finally {
    usersLoading.value = false;
  }
};

const usersTotalPages = computed(() => {
  const total = Number(usersTotal.value || 0);
  const limit = Math.max(1, Number(usersLimit.value || 20));
  return Math.max(1, Math.ceil(total / limit));
});

const botGuildIdSet = computed(() => {
  const set = new Set();
  (guilds.value || []).forEach((guild) => {
    if (guild.bot_present) set.add(String(guild.discord_guild_id));
  });
  return set;
});

const filterUserGuildsWithBot = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const botIds = botGuildIdSet.value;
  return list.filter((guild) => botIds.has(String(guild.guild_id)));
};

const impersonateGuildOptions = computed(() => filterUserGuildsWithBot(selectedUserDetails.value?.guilds || []));
const impersonateGuildSelectOptions = computed(() => [
  { label: "Accueil utilisateur", value: "" },
  ...impersonateGuildOptions.value.map((guild) => ({
    label: `${guild.guild_name} — ${guild.guild_id}`,
    value: guild.guild_id
  }))
]);

const rows = computed(() => users.value);
const usersStats = computed(() => ({
  total: Number(usersTotal.value || 0),
  currentPageCount: rows.value.length,
  twitchLinked: rows.value.filter((user) => Boolean(user.twitch_login)).length,
  serverAdmins: rows.value.filter((user) => Boolean(user.is_server_admin)).length,
  pages: usersTotalPages.value
}));

const openUserDetails = async (user) => {
  if (!user?.discord_id) return;
  showUserModal.value = true;
  userDetailsLoading.value = true;
  selectedUserDetails.value = null;
  impersonateGuildId.value = "";
  impersonateStatus.value = "";

  try {
    const token = getToken();
    const res = await fetch(`${config.public.apiBase}/api/admin/users/${user.discord_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      selectedUserDetails.value = data.details || null;
      const eligibleGuilds = filterUserGuildsWithBot(data.details?.guilds || []);
      impersonateGuildId.value = eligibleGuilds[0]?.guild_id || "";
    }
  } finally {
    userDetailsLoading.value = false;
  }
};

const closeUserModal = () => {
  showUserModal.value = false;
  selectedUserDetails.value = null;
  impersonateGuildId.value = "";
  impersonateStatus.value = "";
};

watch(showUserModal, (value) => {
  if (!value) closeUserModal();
});

const openUserInterfaceAs = async () => {
  const target = selectedUserDetails.value?.user?.discord_id;
  if (!target) return;
  impersonateLoading.value = true;
  impersonateStatus.value = "";
  try {
    const token = getToken();
    const res = await fetch(`${config.public.apiBase}/api/admin/impersonate/${target}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const redirect = impersonateGuildId.value ? `/user/guild/${impersonateGuildId.value}` : "/user";
      const url = `${redirect}?token=${encodeURIComponent(data.token)}&impersonate=1`;
      if (process.client) window.open(url, "_blank", "noopener");
      impersonateStatus.value = "Interface ouverte dans un nouvel onglet.";
    } else {
      impersonateStatus.value = "Erreur lors de l’ouverture de l’interface.";
    }
  } finally {
    impersonateLoading.value = false;
  }
};

const userAvatarUrl = computed(() => {
  const user = selectedUserDetails.value?.user;
  const discord = selectedUserDetails.value?.discord;
  const discordId = user?.discord_id;
  const hash = discord?.avatar || user?.avatar;
  if (!discordId || !hash) return "";
  const ext = String(hash).startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${ext}?size=128`;
});

const applyUserFilters = async () => {
  usersPage.value = 1;
  await loadUsers();
};

const resetUserFilters = async () => {
  const previousLimit = usersLimit.value;
  userSearch.value = "";
  userGuildSearch.value = "";
  usersLimit.value = 20;
  usersPage.value = 1;
  if (previousLimit === 20) {
    await loadUsers();
  }
};

const changeUsersPage = async (delta) => {
  const next = Math.min(usersTotalPages.value, Math.max(1, Number(usersPage.value || 1) + delta));
  if (next === usersPage.value) return;
  usersPage.value = next;
  await loadUsers();
};

watch(usersLimit, async () => {
  await applyUserFilters();
});

const columns = [
  {
    id: "user",
    header: "Utilisateur",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-3" }, [
        h(UAvatar, {
          src: row.original.avatarUrl || undefined,
          icon: row.original.avatarUrl ? undefined : "i-lucide-user",
          alt: row.original.displayName,
          size: "sm"
        }),
        h("div", { class: "min-w-0" }, [
          h("div", { class: "truncate text-sm font-medium" }, row.original.displayName),
          h("div", { class: "text-xs text-muted" }, `Créé le ${formatDate(row.original.created_at)}`)
        ])
      ])
  },
  { accessorKey: "discord_id", header: "ID" },
  {
    id: "server_admin",
    header: "Admin serveur",
    cell: ({ row }) =>
      h(
        UBadge,
        { color: row.original.is_server_admin ? "primary" : "neutral", variant: "subtle" },
        () => (row.original.is_server_admin ? "Oui" : "Non")
      )
  },
  {
    id: "twitch_login",
    header: "Twitch",
    cell: ({ row }) => row.original.twitch_login || "—"
  },
  {
    id: "guilds",
    header: "Serveurs",
    cell: ({ row }) => row.original.guilds?.length || 0
  },
  {
    id: "auth",
    header: "Auth",
    cell: ({ row }) =>
      h("div", { class: "flex flex-wrap gap-1" }, [
        h(UBadge, { color: "success", variant: "subtle" }, () => "Discord"),
        row.original.twitch_login
          ? h(UBadge, { color: "neutral", variant: "subtle" }, () => "Twitch")
          : null
      ])
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) =>
      h(
        UButton,
        {
          color: "neutral",
          variant: "outline",
          size: "xs",
          onClick: () => openUserDetails(row.original)
        },
        () => "Voir"
      )
  }
];

const discordRows = computed(() => {
  const d = selectedUserDetails.value?.discord;
  if (!d) return [];
  return [
    { label: "Global name", value: d.global_name || "—" },
    { label: "Discriminator", value: d.discriminator || "—" },
    { label: "Bot", value: d.bot ? "Oui" : "Non" },
    { label: "System", value: d.system ? "Oui" : "Non" },
    { label: "Flags", value: d.flags ?? "—" },
    { label: "Public flags", value: d.public_flags ?? "—" },
    { label: "Premium type", value: d.premium_type ?? "—" },
    { label: "Locale", value: d.locale || "—" },
    { label: "MFA", value: d.mfa_enabled ? "Oui" : "Non" },
    { label: "Verified", value: d.verified ? "Oui" : "Non" },
    { label: "Avatar", value: d.avatar || "—" },
    { label: "Banner", value: d.banner || "—" },
    { label: "Accent color", value: d.accent_color ?? "—" }
  ];
});

const discordColumns = [
  { accessorKey: "label", header: "Champ" },
  { accessorKey: "value", header: "Valeur" }
];

const billingColumns = [
  {
    accessorKey: "guild_name",
    header: "Serveur",
    cell: ({ row }) =>
      h("div", { class: "space-y-1" }, [
        h("div", { class: "font-medium" }, row.original.guild_name),
        h("div", { class: "font-mono text-xs text-muted" }, row.original.guild_id)
      ])
  },
  {
    accessorKey: "plan_key",
    header: "Plan",
    cell: ({ row }) =>
      h(
        UBadge,
        { color: row.original.plan_key === "premium" ? "warning" : "neutral", variant: "subtle" },
        () => String(row.original.plan_key || "free").toUpperCase()
      )
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) =>
      h(
        UBadge,
        { color: billingStatusColor(row.original.status, row.original.plan_key), variant: "soft" },
        () => String(row.original.status || "free").toUpperCase()
      )
  },
  {
    accessorKey: "interval_key",
    header: "Périodicité",
    cell: ({ row }) => billingIntervalLabel(row.original.interval_key)
  },
  {
    accessorKey: "current_period_end",
    header: "Fin période",
    cell: ({ row }) => formatDate(row.original.current_period_end)
  },
  {
    accessorKey: "stripe_customer_id",
    header: "Stripe",
    cell: ({ row }) => {
      const customerId = row.original.stripe_customer_id;
      const subId = row.original.stripe_subscription_id;
      if (!customerId && !subId) return "—";
      return h("div", { class: "space-y-1" }, [
        customerId ? h("div", { class: "font-mono text-xs" }, customerId) : null,
        subId
          ? h(
              "a",
              {
                class: "text-xs text-primary underline",
                href: `https://dashboard.stripe.com/subscriptions/${subId}`,
                target: "_blank",
                rel: "noreferrer"
              },
              "Abonnement Stripe"
            )
          : null
      ]);
    }
  }
];

const ecobotyGuildColumns = [
  {
    accessorKey: "guild_name",
    header: "Serveur",
    cell: ({ row }) =>
      h("div", { class: "space-y-1" }, [
        h("div", { class: "font-medium" }, row.original.guild_name),
        h("div", { class: "font-mono text-xs text-muted" }, row.original.guild_id)
      ])
  },
  {
    id: "role",
    header: "Rôle",
    cell: ({ row }) =>
      h("div", { class: "flex flex-wrap gap-1" }, [
        h(
          UBadge,
          { color: guildRoleColor(row.original.role), variant: "subtle" },
          () => row.original.role_label || "Membre"
        ),
        row.original.is_premium_purchaser
          ? h(UBadge, { color: "warning", variant: "subtle" }, () => "Payeur Premium")
          : null
      ])
  },
  {
    id: "permissions",
    header: "Permissions",
    cell: ({ row }) => {
      const labels = row.original.permission_labels || [];
      if (!labels.length) return "—";
      return h(
        "div",
        { class: "flex flex-wrap gap-1" },
        labels.map((label) => h(UBadge, { color: "neutral", variant: "outline", size: "xs" }, () => label))
      );
    }
  },
  {
    accessorKey: "plan_key",
    header: "Premium",
    cell: ({ row }) =>
      h(
        UBadge,
        { color: row.original.plan_key === "premium" ? "warning" : "neutral", variant: "soft" },
        () => (row.original.plan_key === "premium" ? "Premium" : "Free")
      )
  },
  {
    accessorKey: "billing_period_end",
    header: "Fin période",
    cell: ({ row }) => formatDate(row.original.billing_period_end)
  }
];

onMounted(async () => {
  const ok = await requireAdmin();
  if (!ok) return;
  await loadOverview();
  await loadUsers();
});
</script>
