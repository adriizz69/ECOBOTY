<template>
  <UDashboardPanel id="admin-v2-billing">
    <template #header>
      <UDashboardNavbar title="Stripe / Premium">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" @click="refreshAll">
            Rafraîchir
          </UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="tab in tabs"
              :key="tab.id"
              size="sm"
              :color="activeTab === tab.id ? 'primary' : 'neutral'"
              :variant="activeTab === tab.id ? 'solid' : 'ghost'"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </UButton>
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
        <!-- Vue d'ensemble -->
        <template v-if="activeTab === 'overview'">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <UPageCard title="MRR estimé" variant="subtle">
              <p class="text-3xl font-semibold">{{ dashboard?.mrrLabel || "—" }}</p>
            </UPageCard>
            <UPageCard title="Abonnements actifs" variant="subtle">
              <p class="text-3xl font-semibold">{{ dashboard?.activeSubscriptions ?? "—" }}</p>
            </UPageCard>
            <UPageCard title="Impayés" variant="subtle">
              <p class="text-3xl font-semibold text-warning">{{ dashboard?.unpaidInvoices ?? "—" }}</p>
            </UPageCard>
            <UPageCard title="Serveurs gratuits" variant="subtle">
              <p class="text-3xl font-semibold">{{ dashboard?.freeServers ?? "—" }}</p>
            </UPageCard>
            <UPageCard title="Erreurs webhook" variant="subtle">
              <p class="text-3xl font-semibold" :class="dashboard?.webhookConfigured ? '' : 'text-error'">
                {{ dashboard?.webhookConfigured ? dashboard?.webhookErrors ?? 0 : "!" }}
              </p>
            </UPageCard>
            <UPageCard title="Nettoyages en attente" variant="subtle">
              <p class="text-3xl font-semibold">{{ dashboard?.pendingCleanups ?? "—" }}</p>
            </UPageCard>
            <UPageCard title="Contrats actifs" variant="subtle">
              <p class="text-3xl font-semibold">{{ dashboard?.activeContracts ?? "—" }}</p>
            </UPageCard>
            <UPageCard title="Répartition plans" variant="subtle">
              <p class="text-sm text-muted">
                premium: {{ dashboard?.planDistribution?.premium || 0 }} ·
                free: {{ dashboard?.planDistribution?.free || 0 }}
              </p>
            </UPageCard>
          </div>

          <UPageCard title="Synchroniser un abonnement serveur" variant="subtle">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
              <UFormField label="ID Discord du serveur" class="flex-1">
                <UInput v-model="guildSyncId" placeholder="123456789012345678" inputmode="numeric" />
              </UFormField>
              <UButton color="primary" :loading="guildSyncLoading" :disabled="!guildSyncId.trim()" @click="syncGuild">
                Synchroniser l’abonnement
              </UButton>
            </div>
          </UPageCard>

          <UPageCard
            title="Catalogue produit / TVA 0 %"
            description="Actions manuelles sur le catalogue Stripe Premium."
            variant="subtle"
          >
            <div class="flex flex-wrap gap-3">
              <UButton color="primary" icon="i-lucide-refresh-cw" :loading="syncLoading" @click="syncCatalog">
                Synchroniser le catalogue
              </UButton>
              <UButton
                color="warning"
                variant="soft"
                icon="i-lucide-rotate-ccw"
                :loading="recreateLoading"
                @click="recreateZeroTaxCatalog"
              >
                Recréer à 0 % TVA
              </UButton>
              <UButton color="neutral" variant="outline" @click="activeTab = 'catalog'">
                Voir le détail catalogue
              </UButton>
            </div>
          </UPageCard>
        </template>

        <!-- Abonnements -->
        <template v-else-if="activeTab === 'subscriptions'">
          <UPageCard
            title="Comptes Stripe"
            description="Une seule action à la fois via modale. Les changements sont appliqués sur Stripe."
            variant="naked"
            orientation="horizontal"
          />

          <UPageCard variant="subtle">
            <div v-if="!accounts.length" class="text-sm text-muted">Aucun compte Stripe lié.</div>
            <UTable v-else :data="accounts" :columns="accountColumns" :ui="{ td: 'align-top' }" />
          </UPageCard>
        </template>

        <!-- Codes promo -->
        <template v-else-if="activeTab === 'promo'">
          <UPageCard title="Codes promo" description="Coupons Stripe pour l’abonnement Premium EcoBoty." variant="subtle">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <UFormField label="Code">
                <UInput v-model="promoForm.code" placeholder="ETE2026" />
              </UFormField>
              <UFormField label="Libellé">
                <UInput v-model="promoForm.label" placeholder="Promo été" />
              </UFormField>
              <UFormField label="Périodicité">
                <USelect v-model="promoForm.intervalKey" :items="intervalItems" />
              </UFormField>
              <UFormField label="Type de réduction">
                <USelect v-model="promoForm.discountType" :items="discountTypeItems" />
              </UFormField>
              <UFormField label="Valeur">
                <UInput v-model="promoForm.value" type="number" min="1" placeholder="20" />
              </UFormField>
              <UFormField label="Utilisations max">
                <UInput v-model="promoForm.maxRedemptions" type="number" min="1" placeholder="100" />
              </UFormField>
              <UFormField label="Valide jusqu’au" class="md:col-span-2">
                <UInput v-model="promoForm.expiresAt" type="date" />
              </UFormField>
            </div>
            <div class="mt-4">
              <UButton color="primary" :loading="promoCreating" @click="createPromo">
                Créer le code promo
              </UButton>
            </div>
          </UPageCard>

          <UPageCard variant="subtle">
            <div v-if="!promoCodes.length" class="text-sm text-muted">Aucun code promo.</div>
            <UTable v-else :data="promoCodes" :columns="promoColumns" :ui="{ td: 'align-top' }" />
          </UPageCard>
        </template>

        <!-- Webhooks -->
        <template v-else-if="activeTab === 'webhooks'">
          <UPageCard
            title="Santé webhooks"
            :description="dashboard?.webhookConfigured ? 'Webhook Stripe détecté.' : 'Aucun webhook Stripe actif détecté — configure STRIPE_WEBHOOK_SECRET.'"
            variant="subtle"
          >
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p class="text-xs text-muted">Événements reçus (échantillon)</p>
                <p class="text-2xl font-semibold">{{ webhookEvents.length }}</p>
              </div>
              <div>
                <p class="text-xs text-muted">Webhook configuré</p>
                <UBadge :color="dashboard?.webhookConfigured ? 'success' : 'error'" variant="soft">
                  {{ dashboard?.webhookConfigured ? "Oui" : "Non" }}
                </UBadge>
              </div>
            </div>
          </UPageCard>

          <UPageCard variant="subtle">
            <UTable :data="webhookEvents" :columns="webhookColumns" :ui="{ td: 'align-top' }" />
          </UPageCard>
        </template>

        <!-- Catalogue -->
        <template v-else-if="activeTab === 'catalog'">
          <UPageCard
            title="Catalogue Stripe Premium"
            description="Synchronise les IDs produit/prix, crée le taux TVA 0 %, ou archive et recrée tout le catalogue."
            variant="subtle"
          >
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap gap-3">
                <UButton color="primary" icon="i-lucide-refresh-cw" :loading="syncLoading" @click="syncCatalog">
                  Synchroniser le catalogue
                </UButton>
                <UButton
                  color="warning"
                  variant="soft"
                  icon="i-lucide-rotate-ccw"
                  :loading="recreateLoading"
                  @click="recreateZeroTaxCatalog"
                >
                  Recréer à 0 % TVA
                </UButton>
              </div>
              <p class="text-sm text-muted">
                « Synchroniser » crée/met à jour le produit, les prix et le taux TVA 0 % sans tout supprimer.
                « Recréer à 0 % TVA » archive l’ancien catalogue et en crée un nouveau (les abonnements déjà actifs restent sur les anciens prix).
              </p>
            </div>
          </UPageCard>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <UPageCard title="Product Premium" variant="subtle">
              <p class="font-mono text-sm break-all">{{ catalog?.premium?.stripeProductId || "—" }}</p>
            </UPageCard>
            <UPageCard title="Prices" variant="subtle">
              <ul class="space-y-1 text-xs font-mono break-all">
                <li>Mensuel : {{ catalog?.premium?.stripePriceMonthlyId || "—" }}</li>
                <li>3 mois : {{ catalog?.premium?.stripePriceQuarterlyId || "—" }}</li>
                <li>Annuel : {{ catalog?.premium?.stripePriceYearlyId || "—" }}</li>
              </ul>
            </UPageCard>
            <UPageCard title="TVA 0 %" variant="subtle">
              <p class="font-mono text-sm break-all">{{ catalog?.zeroVatTaxRateId || lastSync?.taxRateId || "—" }}</p>
              <p class="mt-2 text-xs text-muted">Taux manuel affiché sur factures</p>
            </UPageCard>
            <UPageCard title="Mode" variant="subtle">
              <p class="text-sm">{{ lastSync?.mode || "—" }}</p>
            </UPageCard>
          </div>
        </template>
      </div>

      <!-- Modal action compte -->
      <UModal
        v-model:open="actionModalOpen"
        :title="actionModalTitle"
        :description="actionModalDescription"
      >
        <template #body>
          <div class="space-y-4">
            <p v-if="selectedAccount" class="text-sm text-muted">
              {{ selectedAccount.guildName }} · {{ selectedAccount.guildId }}
            </p>

            <template v-if="actionType === 'cancel'">
              <label class="flex items-center gap-2 text-sm">
                <input v-model="cancelAtPeriodEnd" type="checkbox" />
                Annuler à la fin de la période (pas immédiat)
              </label>
            </template>

            <template v-else-if="actionType === 'refund'">
              <div v-if="refundQuoteLoading" class="text-sm text-muted">Calcul du remboursement…</div>
              <template v-else-if="refundQuote">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Remboursement</label>
                  <USelect v-model="refundMode" :items="refundModeItems" />
                </div>

                <UInput
                  v-if="refundMode === 'manual'"
                  v-model="manualAmountEur"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant en €"
                />

                <div class="space-y-1 rounded-lg border border-default p-3 text-sm">
                  <p>
                    Prorata théorique (jours restants) :
                    <span class="font-medium">{{ refundQuote.labels.prorata }}</span>
                    <span v-if="refundQuote.remainingDays > 0" class="text-muted">
                      ({{ refundQuote.remainingDays }} jour{{ refundQuote.remainingDays > 1 ? "s" : "" }})
                    </span>
                  </p>
                  <p>
                    Maximum remboursable :
                    <span class="font-medium">{{ refundQuote.labels.maxRefundable }}</span>
                  </p>
                </div>

                <UAlert
                  v-if="!refundQuote.hasRefundableCharge"
                  color="warning"
                  variant="soft"
                  title="Aucun paiement Stripe remboursable détecté pour cette période. Tu peux annuler sans remboursement."
                />

                <label class="flex items-center gap-2 text-sm">
                  <input v-model="refundCancelSubscription" type="checkbox" />
                  Annuler l’abonnement après le remboursement
                </label>

                <div class="space-y-2">
                  <label class="text-sm font-medium">Motif interne</label>
                  <UTextarea v-model="internalNote" :rows="3" placeholder="Optionnel" />
                </div>
              </template>
            </template>

            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="outline" @click="actionModalOpen = false">Annuler</UButton>
              <UButton
                :color="actionType === 'refund' ? 'error' : 'warning'"
                :loading="actionLoading"
                :disabled="actionType === 'refund' && refundConfirmDisabled"
                @click="confirmAccountAction"
              >
                {{ actionConfirmLabel }}
              </UButton>
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

const { requireAdmin, isAdmin } = useAdminV2Guard();
await requireAdmin();

const {
  loadBillingCatalogOverview,
  syncBillingCatalog,
  recreateBillingCatalogZeroTax,
  syncGuildBilling,
  loadBillingDashboard,
  loadBillingAccounts,
  loadBillingPromoCodes,
  loadBillingWebhookEvents,
  createBillingPromoCode,
  deactivateBillingPromoCode,
  cancelBillingGuildSubscription,
  refundBillingGuildSubscription,
  loadBillingRefundQuote
} = useAdminV2Data();

const toast = useToast();
const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UAvatar = resolveComponent("UAvatar");

const tabs = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "subscriptions", label: "Abonnements" },
  { id: "promo", label: "Codes promo" },
  { id: "webhooks", label: "Santé webhooks" },
  { id: "catalog", label: "Catalogue" }
];

const activeTab = ref("overview");
const loading = ref(false);
const dashboard = ref(null);
const catalog = ref(null);
const accounts = ref([]);
const promoCodes = ref([]);
const webhookEvents = ref([]);
const lastSync = ref(null);
const syncLoading = ref(false);
const recreateLoading = ref(false);
const guildSyncId = ref("");
const guildSyncLoading = ref(false);
const promoCreating = ref(false);
const actionModalOpen = ref(false);
const actionLoading = ref(false);
const actionType = ref("");
const selectedAccount = ref(null);
const cancelAtPeriodEnd = ref(false);
const refundQuoteLoading = ref(false);
const refundQuote = ref(null);
const refundMode = ref("prorata");
const manualAmountEur = ref("");
const internalNote = ref("");
const refundCancelSubscription = ref(false);

const refundModeItems = [
  { label: "Prorata (jours restants)", value: "prorata" },
  { label: "Montant manuel", value: "manual" }
];

const promoForm = reactive({
  code: "",
  label: "",
  intervalKey: "monthly",
  discountType: "percent",
  value: "",
  maxRedemptions: "",
  expiresAt: ""
});

const intervalItems = [
  { label: "Mensuel", value: "monthly" },
  { label: "3 mois", value: "quarterly" },
  { label: "Annuel", value: "yearly" }
];

const discountTypeItems = [
  { label: "Pourcentage", value: "percent" },
  { label: "Montant fixe (€)", value: "amount" }
];

const intervalLabel = (key) => {
  const map = { monthly: "Mensuel", quarterly: "3 mois", yearly: "Annuel" };
  return map[String(key || "")] || "—";
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fr-FR");
  } catch {
    return "—";
  }
};

const statusColor = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active" || normalized === "trialing") return "success";
  if (normalized === "past_due" || normalized === "unpaid") return "warning";
  return "neutral";
};

const openAccountAction = async (account, type, options = {}) => {
  selectedAccount.value = account;
  actionType.value = type;
  cancelAtPeriodEnd.value = false;
  refundMode.value = "prorata";
  manualAmountEur.value = "";
  internalNote.value = "";
  refundCancelSubscription.value = options.cancelSubscription === true;
  refundQuote.value = null;
  actionModalOpen.value = true;

  if (type !== "refund") return;

  refundQuoteLoading.value = true;
  try {
    const data = await loadBillingRefundQuote(account.guildId);
    refundQuote.value = data.quote || null;
  } catch (error) {
    toast.add({
      title: "Devis remboursement indisponible",
      description: String(error?.message || error),
      color: "error"
    });
  } finally {
    refundQuoteLoading.value = false;
  }
};

const refundAmountCents = computed(() => {
  if (!refundQuote.value) return 0;
  if (refundMode.value === "manual") {
    const euros = Number(String(manualAmountEur.value || "").replace(",", "."));
    if (!Number.isFinite(euros) || euros <= 0) return 0;
    return Math.round(euros * 100);
  }
  return Number(refundQuote.value.prorataCents || 0);
});

const refundConfirmDisabled = computed(() => {
  if (refundQuoteLoading.value || !refundQuote.value) return true;
  if (!refundQuote.value.hasRefundableCharge) return true;
  return refundAmountCents.value <= 0 || refundAmountCents.value > Number(refundQuote.value.maxRefundableCents || 0);
});

const actionConfirmLabel = computed(() => {
  if (actionType.value === "refund") return "Confirmer le remboursement";
  if (actionType.value === "sync") return "Synchroniser";
  return "Confirmer l’annulation";
});

const actionModalTitle = computed(() => {
  if (actionType.value === "refund") {
    return refundCancelSubscription.value ? "Rembourser et annuler" : "Rembourser sans annuler";
  }
  if (actionType.value === "sync") return "Synchroniser l’abonnement";
  return "Annuler l’abonnement";
});

const actionModalDescription = computed(() => {
  if (actionType.value === "refund") {
    return refundCancelSubscription.value
      ? "Remboursement partiel sur le dernier paiement, puis annulation Stripe et passage en Free."
      : "Remboursement partiel sur le dernier paiement. Le client reçoit l’avoir via Stripe.";
  }
  if (actionType.value === "sync") {
    return "Récupère l’état Premium depuis Stripe pour ce serveur.";
  }
  return "L’annulation est envoyée à Stripe. Le serveur sera rétrogradé selon le mode choisi.";
});

const accountColumns = [
  {
    accessorKey: "guildName",
    header: "Serveur",
    cell: ({ row }) =>
      h("div", { class: "space-y-1" }, [
        h("div", { class: "font-medium" }, row.original.guildName),
        h("div", { class: "text-xs text-muted font-mono" }, row.original.guildId)
      ])
  },
  {
    accessorKey: "planKey",
    header: "Plan",
    cell: ({ row }) => row.original.planKey
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) =>
      h(UBadge, { color: statusColor(row.original.status), variant: "soft" }, () =>
        String(row.original.status || "free").toUpperCase()
      )
  },
  {
    accessorKey: "intervalKey",
    header: "Périodicité",
    cell: ({ row }) => intervalLabel(row.original.intervalKey)
  },
  {
    accessorKey: "currentPeriodEnd",
    header: "Fin période",
    cell: ({ row }) => formatDate(row.original.currentPeriodEnd)
  },
  {
    id: "payer",
    header: "Payeur Premium",
    cell: ({ row }) => {
      const payerId = row.original.payerDiscordId;
      if (!payerId) return "—";
      const avatarHash = row.original.payerAvatar;
      const avatarUrl = avatarHash
        ? `https://cdn.discordapp.com/avatars/${payerId}/${avatarHash}.png?size=64`
        : "";
      const username = row.original.payerUsername || payerId;
      return h("div", { class: "flex items-center gap-2 min-w-0" }, [
        h(UAvatar, {
          src: avatarUrl || undefined,
          icon: avatarUrl ? undefined : "i-lucide-user",
          alt: username,
          size: "xs"
        }),
        h("div", { class: "min-w-0" }, [
          h("div", { class: "truncate text-sm font-medium" }, username),
          h("div", { class: "font-mono text-xs text-muted truncate" }, payerId)
        ])
      ]);
    }
  },
  {
    accessorKey: "stripeCustomerId",
    header: "Client Stripe",
    cell: ({ row }) => {
      const customerId = row.original.stripeCustomerId;
      const subId = row.original.stripeSubscriptionId;
      if (!customerId) return "—";
      return h("div", { class: "space-y-1" }, [
        h("div", { class: "font-mono text-xs text-primary" }, customerId),
        subId
          ? h(
              "a",
              {
                class: "text-xs text-muted underline",
                href: `https://dashboard.stripe.com/subscriptions/${subId}`,
                target: "_blank",
                rel: "noreferrer"
              },
              "Voir l’abonnement Stripe"
            )
          : null
      ]);
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const account = row.original;
      const items = [
        [
          {
            label: "Synchroniser",
            icon: "i-lucide-refresh-cw",
            onSelect: () => openAccountAction(account, "sync")
          }
        ],
        [
          {
            label: "Annuler",
            icon: "i-lucide-ban",
            disabled: !account.stripeSubscriptionId,
            onSelect: () => openAccountAction(account, "cancel")
          },
          {
            label: "Rembourser sans annuler",
            icon: "i-lucide-undo-2",
            disabled: !account.stripeSubscriptionId,
            onSelect: () => openAccountAction(account, "refund", { cancelSubscription: false })
          },
          {
            label: "Rembourser et annuler",
            icon: "i-lucide-circle-x",
            color: "error",
            disabled: !account.stripeSubscriptionId,
            onSelect: () => openAccountAction(account, "refund", { cancelSubscription: true })
          }
        ]
      ];
      return h(
        UDropdownMenu,
        { items },
        {
          default: () =>
            h(UButton, {
              color: "neutral",
              variant: "ghost",
              icon: "i-lucide-ellipsis-vertical",
              size: "sm"
            })
        }
      );
    }
  }
];

const promoColumns = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "planKey", header: "Plan" },
  {
    accessorKey: "intervalKey",
    header: "Périodicité",
    cell: ({ row }) => intervalLabel(row.original.intervalKey)
  },
  {
    accessorKey: "value",
    header: "Valeur",
    cell: ({ row }) =>
      row.original.discountType === "percent"
        ? `${row.original.value}%`
        : `${(Number(row.original.value || 0) / 100).toFixed(2)} €`
  },
  {
    accessorKey: "active",
    header: "Statut",
    cell: ({ row }) =>
      h(UBadge, { color: row.original.active ? "success" : "neutral", variant: "soft" }, () =>
        row.original.active ? "ACTIVE" : "INACTIVE"
      )
  },
  {
    id: "promoActions",
    header: "",
    cell: ({ row }) =>
      row.original.active
        ? h(
            UButton,
            {
              size: "xs",
              color: "neutral",
              variant: "soft",
              onClick: () => deactivatePromo(row.original.id)
            },
            () => "Désactiver"
          )
        : null
  }
];

const webhookColumns = [
  { accessorKey: "event_type", header: "Type" },
  { accessorKey: "guild_discord_id", header: "Serveur ID" },
  {
    accessorKey: "created_at",
    header: "Reçu le",
    cell: ({ row }) => formatDate(row.original.created_at)
  },
  { accessorKey: "stripe_event_id", header: "Event ID" }
];

const refreshOverviewData = async () => {
  dashboard.value = await loadBillingDashboard();
};

const refreshAccounts = async () => {
  const data = await loadBillingAccounts();
  accounts.value = Array.isArray(data.accounts) ? data.accounts : [];
};

const refreshPromoCodes = async () => {
  const data = await loadBillingPromoCodes();
  promoCodes.value = Array.isArray(data.promoCodes) ? data.promoCodes : [];
};

const refreshWebhooks = async () => {
  const data = await loadBillingWebhookEvents();
  webhookEvents.value = Array.isArray(data.events) ? data.events : [];
};

const refreshCatalog = async () => {
  catalog.value = await loadBillingCatalogOverview();
};

const refreshAll = async () => {
  loading.value = true;
  try {
    await Promise.all([
      refreshOverviewData(),
      refreshAccounts(),
      refreshPromoCodes(),
      refreshWebhooks(),
      refreshCatalog()
    ]);
  } catch (error) {
    toast.add({
      title: "Chargement Stripe échoué",
      description: String(error?.message || error),
      color: "error"
    });
  } finally {
    loading.value = false;
  }
};

const syncCatalog = async () => {
  syncLoading.value = true;
  try {
    const result = await syncBillingCatalog();
    lastSync.value = result;
    catalog.value = result.overview || catalog.value;
    toast.add({ title: "Catalogue synchronisé", color: "success" });
  } catch (error) {
    toast.add({ title: "Sync catalogue échouée", description: String(error?.message || error), color: "error" });
  } finally {
    syncLoading.value = false;
  }
};

const recreateZeroTaxCatalog = async () => {
  const confirmed = window.confirm(
    "Archiver l’ancien produit/prix Stripe et en recréer un nouveau à 0 % TVA ?\n\nLes abonnements déjà actifs restent sur les anciens tarifs."
  );
  if (!confirmed) return;

  recreateLoading.value = true;
  try {
    const result = await recreateBillingCatalogZeroTax();
    lastSync.value = result;
    catalog.value = result.overview || catalog.value;
    toast.add({
      title: "Catalogue recréé à 0 % TVA",
      description: `Produit ${result.productId || ""}`,
      color: "success"
    });
  } catch (error) {
    toast.add({
      title: "Recréation échouée",
      description: String(error?.message || error),
      color: "error"
    });
  } finally {
    recreateLoading.value = false;
  }
};

const syncGuild = async () => {
  guildSyncLoading.value = true;
  try {
    const result = await syncGuildBilling(guildSyncId.value);
    toast.add({
      title: result.billing?.isPremium ? "Serveur Premium" : "Sync terminée",
      color: result.billing?.isPremium ? "success" : "warning"
    });
    await refreshAll();
  } catch (error) {
    toast.add({ title: "Sync échouée", description: String(error?.message || error), color: "error" });
  } finally {
    guildSyncLoading.value = false;
  }
};

const createPromo = async () => {
  promoCreating.value = true;
  try {
    await createBillingPromoCode({
      code: promoForm.code,
      label: promoForm.label,
      intervalKey: promoForm.intervalKey,
      discountType: promoForm.discountType,
      value: Number(promoForm.value),
      maxRedemptions: promoForm.maxRedemptions ? Number(promoForm.maxRedemptions) : null,
      expiresAt: promoForm.expiresAt || null
    });
    promoForm.code = "";
    promoForm.label = "";
    promoForm.value = "";
    promoForm.maxRedemptions = "";
    promoForm.expiresAt = "";
    toast.add({ title: "Code promo créé", color: "success" });
    await refreshPromoCodes();
  } catch (error) {
    toast.add({ title: "Création échouée", description: String(error?.message || error), color: "error" });
  } finally {
    promoCreating.value = false;
  }
};

const deactivatePromo = async (id) => {
  try {
    await deactivateBillingPromoCode(id);
    toast.add({ title: "Code promo désactivé", color: "success" });
    await refreshPromoCodes();
  } catch (error) {
    toast.add({ title: "Désactivation échouée", description: String(error?.message || error), color: "error" });
  }
};

const confirmAccountAction = async () => {
  if (!selectedAccount.value) return;
  actionLoading.value = true;
  try {
    const guildId = selectedAccount.value.guildId;
    if (actionType.value === "sync") {
      await syncGuildBilling(guildId);
      toast.add({ title: "Abonnement synchronisé", color: "success" });
    } else if (actionType.value === "cancel") {
      await cancelBillingGuildSubscription(guildId, {
        immediate: !cancelAtPeriodEnd.value,
        atPeriodEnd: cancelAtPeriodEnd.value
      });
      toast.add({ title: "Annulation envoyée à Stripe", color: "warning" });
    } else if (actionType.value === "refund") {
      await refundBillingGuildSubscription(guildId, {
        mode: refundMode.value,
        amountCents: refundMode.value === "manual" ? refundAmountCents.value : undefined,
        cancelSubscription: refundCancelSubscription.value,
        internalNote: internalNote.value || null
      });
      toast.add({ title: "Remboursement effectué", color: "success" });
    }
    actionModalOpen.value = false;
    await refreshAll();
  } catch (error) {
    toast.add({ title: "Action échouée", description: String(error?.message || error), color: "error" });
  } finally {
    actionLoading.value = false;
  }
};

onMounted(async () => {
  if (isAdmin.value) await refreshAll();
});
</script>
