<template>
  <UDashboardPanel id="admin-v2-welcome">
    <template #header>
      <UDashboardNavbar title="Bienvenue">
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
          title="Message de bienvenue global"
          description="Envoyé automatiquement quand le bot est ajouté à un serveur."
          variant="naked"
          orientation="horizontal"
        />

        <UPageCard variant="subtle">
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm text-muted">Activer ou couper l’envoi automatique.</div>
              <USwitch v-model="welcomeEnabled" />
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <UFormField label="Message FR">
                <UTextarea v-model="welcomeMessageFr" :rows="6" placeholder="Message FR" />
              </UFormField>
              <UFormField label="Message EN">
                <UTextarea v-model="welcomeMessageEn" :rows="6" placeholder="Message EN" />
              </UFormField>
              <UFormField label="Message ES">
                <UTextarea v-model="welcomeMessageEs" :rows="6" placeholder="Message ES" />
              </UFormField>
            </div>

            <UPageCard title="Variables disponibles" variant="soft">
              <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div
                  v-for="token in welcomeTokens"
                  :key="token.key"
                  class="rounded-lg border border-default bg-elevated/30 px-3 py-2"
                >
                  <div class="font-mono text-xs text-primary">{{ token.key }}</div>
                  <div class="text-xs text-muted">{{ token.label }}</div>
                </div>
              </div>
            </UPageCard>
          </div>
        </UPageCard>

        <UPageCard title="Aperçu" description="Prévisualisation complète de l'embed envoyé sur Discord." variant="subtle">
          <div class="rounded-xl border border-default bg-elevated/30 p-4">
            <div class="text-base font-semibold">Bienvenue / Welcome / Bienvenido</div>
            <p class="mt-1 text-sm text-muted">📌 Choisis ta langue ci-dessous. Le bot est configurable depuis ecoboty.eu.</p>

            <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div class="rounded-lg border border-default bg-default/30 p-3">
                <div class="mb-2 text-xs font-semibold text-primary">🇫🇷 FR</div>
                <pre class="welcome-preview-text">{{ welcomePreviewRendered.fr }}</pre>
              </div>

              <div class="rounded-lg border border-default bg-default/30 p-3">
                <div class="mb-2 text-xs font-semibold text-primary">🇬🇧 EN</div>
                <pre class="welcome-preview-text">{{ welcomePreviewRendered.en }}</pre>
              </div>

              <div class="rounded-lg border border-default bg-default/30 p-3">
                <div class="mb-2 text-xs font-semibold text-primary">🇪🇸 ES</div>
                <pre class="welcome-preview-text">{{ welcomePreviewRendered.es }}</pre>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center justify-end gap-2">
              <UButton color="neutral" variant="outline" :loading="loading" @click="loadSettings">Actualiser</UButton>
              <UButton color="primary" :loading="saving" @click="save">Enregistrer</UButton>
            </div>
            <p v-if="status" class="mt-2 text-sm text-muted">{{ status }}</p>
          </template>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();
const { loadWelcomeSettings: fetchWelcomeSettings, saveWelcomeSettings } = useAdminV2Data();

const loading = ref(false);
const saving = ref(false);
const status = ref("");

const welcomeEnabled = ref(true);
const welcomeMessageFr = ref("");
const welcomeMessageEn = ref("");
const welcomeMessageEs = ref("");

const defaultWelcomeMessages = {
  fr:
    "🎉 **Bienvenue sur ECOBOTY**\n" +
    "Merci d'avoir ajoute ECOBOTY.\n\n" +
    "⚙️ **Configuration**\n" +
    "Tout se configure sur **[ecoboty.eu](https://ecoboty.eu)** (dashboard serveur).\n" +
    "🌐 La langue du bot se regle dans **Parametres du bot**.\n\n" +
    "🟣 **Twitch**\n" +
    "Pour relier les viewers, chacun doit faire **!daily** une premiere fois pour lier son compte et commencer a cumuler.\n\n" +
    "📘 **Documentation & Support**\n" +
    "Documentation: **[ecoboty.eu/documentation](https://ecoboty.eu/documentation)**\n" +
    "Support Discord: **[discord.gg/e6eUHaqyGt](https://discord.gg/e6eUHaqyGt)**",
  en:
    "🎉 **Welcome to ECOBOTY**\n" +
    "Thanks for adding ECOBOTY.\n\n" +
    "⚙️ **Configuration**\n" +
    "Everything is configured on **[ecoboty.eu](https://ecoboty.eu)** (server dashboard).\n" +
    "🌐 You can change the bot language in **Bot settings**.\n\n" +
    "🟣 **Twitch**\n" +
    "To link viewers, each user must run **!daily** once to connect their account and start earning.\n\n" +
    "📘 **Documentation & Support**\n" +
    "Documentation: **[ecoboty.eu/documentation](https://ecoboty.eu/documentation)**\n" +
    "Discord support: **[discord.gg/e6eUHaqyGt](https://discord.gg/e6eUHaqyGt)**",
  es:
    "🎉 **Bienvenido a ECOBOTY**\n" +
    "Gracias por anadir ECOBOTY.\n\n" +
    "⚙️ **Configuracion**\n" +
    "Todo se configura en **[ecoboty.eu](https://ecoboty.eu)** (panel del servidor).\n" +
    "🌐 Puedes cambiar el idioma del bot en **Ajustes del bot**.\n\n" +
    "🟣 **Twitch**\n" +
    "Para vincular viewers, cada usuario debe usar **!daily** una primera vez para enlazar su cuenta y empezar a acumular.\n\n" +
    "📘 **Documentacion y Soporte**\n" +
    "Documentacion: **[ecoboty.eu/documentation](https://ecoboty.eu/documentation)**\n" +
    "Soporte Discord: **[discord.gg/e6eUHaqyGt](https://discord.gg/e6eUHaqyGt)**"
};

const welcomePreview = computed(() => ({
  fr: String(welcomeMessageFr.value || "").trim() || defaultWelcomeMessages.fr,
  en: String(welcomeMessageEn.value || "").trim() || defaultWelcomeMessages.en,
  es: String(welcomeMessageEs.value || "").trim() || defaultWelcomeMessages.es
}));

const welcomeTemplateContext = {
  server: "ECOBOTY Community",
  guild: "ECOBOTY Community",
  server_name: "ECOBOTY Community",
  guild_name: "ECOBOTY Community",
  server_id: "123456789012345678",
  guild_id: "123456789012345678",
  owner: "Adriizz#0001",
  owner_tag: "Adriizz#0001",
  owner_id: "987654321098765432",
  owner_mention: "<@987654321098765432>",
  dashboard_url: "https://ecoboty.eu/servers",
  dashboard: "https://ecoboty.eu/servers",
  docs_url: "https://ecoboty.eu/documentation",
  documentation_url: "https://ecoboty.eu/documentation",
  support_url: "https://discord.gg/e6eUHaqyGt"
};

const welcomeTokens = [
  { key: "{server_name}", label: "Nom du serveur" },
  { key: "{server_id}", label: "ID du serveur" },
  { key: "{owner_tag}", label: "Tag Discord du propriétaire" },
  { key: "{owner_id}", label: "ID Discord du propriétaire" },
  { key: "{owner_mention}", label: "Mention Discord du propriétaire" },
  { key: "{dashboard_url}", label: "Lien vers l'interface serveur" },
  { key: "{docs_url}", label: "Lien vers la documentation" },
  { key: "{support_url}", label: "Lien vers le support Discord" }
];

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyWelcomeTemplate = (value) => {
  let text = String(value || "");
  Object.entries(welcomeTemplateContext).forEach(([token, tokenValue]) => {
    text = text.replace(new RegExp(`\\{${escapeRegex(token)}\\}`, "gi"), String(tokenValue || ""));
  });
  return text;
};

const welcomePreviewRendered = computed(() => ({
  fr: applyWelcomeTemplate(welcomePreview.value.fr),
  en: applyWelcomeTemplate(welcomePreview.value.en),
  es: applyWelcomeTemplate(welcomePreview.value.es)
}));

const loadSettings = async () => {
  loading.value = true;
  status.value = "";
  try {
    const settings = await fetchWelcomeSettings();
    if (!settings) return;
    welcomeEnabled.value = settings.welcome_enabled !== false;
    welcomeMessageFr.value = settings.welcome_message_fr || "";
    welcomeMessageEn.value = settings.welcome_message_en || "";
    welcomeMessageEs.value = settings.welcome_message_es || "";
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  saving.value = true;
  status.value = "";
  try {
    const ok = await saveWelcomeSettings({
      welcome_enabled: Boolean(welcomeEnabled.value),
      welcome_message_fr: String(welcomeMessageFr.value || "").trim(),
      welcome_message_en: String(welcomeMessageEn.value || "").trim(),
      welcome_message_es: String(welcomeMessageEs.value || "").trim()
    });
    status.value = ok ? "Message de bienvenue mis à jour." : "Erreur lors de l'enregistrement.";
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  const ok = await requireAdmin();
  if (!ok) return;
  await loadSettings();
});
</script>

<style scoped>
.welcome-preview-text {
  max-height: 20rem;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 12px;
  color: var(--ui-text-toned);
}
</style>
