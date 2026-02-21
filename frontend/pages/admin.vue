<template>
  <section class="page">
    <UCard v-if="!isAdmin" class="card">
      <h3>Accès refusé</h3>
      <p class="muted">Cette page est réservée à l’administrateur du bot.</p>
    </UCard>

    <template v-else>
      <header class="page-hero">
        <div>
          <div class="eyebrow">Admin Bot</div>
          <h1>Tableau de bord</h1>
          <p class="muted">
            Supervision globale des serveurs, messages et comptes. Toutes les actions sensibles sont regroupées ici.
          </p>
        </div>
        <div class="hero-actions">
          <UButton color="neutral" variant="outline" @click="loadAll">Actualiser tout</UButton>
        </div>
      </header>

      <div class="admin-tabs">
        <button
          v-for="tab in adminTabs"
          :key="tab.key"
          type="button"
          :class="['tab-pill', activeAdminTab === tab.key && 'active']"
          @click="activeAdminTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-show="activeAdminTab === 'overview'" class="stat-grid">
        <UCard class="card stat-card">
          <div class="stat-title">Serveurs actifs</div>
          <div class="stat-value">{{ summary.totalGuilds }}</div>
          <div class="stat-foot">Total connus</div>
        </UCard>
        <UCard class="card stat-card">
          <div class="stat-title">Serveurs absents</div>
          <div class="stat-value">{{ summary.botAbsent }}</div>
          <div class="stat-foot">Bot non présent</div>
        </UCard>
        <UCard class="card stat-card">
          <div class="stat-title">Serveurs bannis</div>
          <div class="stat-value">{{ summary.bannedGuilds }}</div>
          <div class="stat-foot">Protection globale</div>
        </UCard>
        <UCard class="card stat-card">
          <div class="stat-title">Utilisateurs</div>
          <div class="stat-value">{{ summary.totalUsers }}</div>
          <div class="stat-foot">Discord connectés</div>
        </UCard>
      </div>

      <UCard v-show="activeAdminTab === 'broadcast'" class="card">
        <div class="card-head">
          <div>
            <h3>Broadcast</h3>
            <p class="muted">Envoie un message dans le salon log gestion bot.</p>
          </div>
        </div>
        <div class="grid">
          <label class="full">
            Message
            <textarea v-model="broadcastMessage" rows="3" placeholder="Message à envoyer"></textarea>
          </label>
          <div class="inline">
            <label class="checkbox">
              <input v-model="broadcastIncludeBanned" type="checkbox" />
              <span>Inclure les serveurs bannis</span>
            </label>
            <UButton color="primary" :loading="broadcastSending" @click="sendBroadcast">
              {{ broadcastSending ? "Envoi..." : "Envoyer" }}
            </UButton>
          </div>
        </div>
        <p v-if="broadcastStatus" class="muted">{{ broadcastStatus }}</p>
      </UCard>

      <UCard v-show="activeAdminTab === 'welcome'" class="card">
        <div class="card-head">
          <div>
            <h3>Message de bienvenue (global)</h3>
            <p class="muted">Envoyé quand le bot est ajouté. Message configuré par l’admin bot.</p>
          </div>
        </div>
        <div class="switch-field" style="margin-bottom: 12px;">
          <span>Activer le message</span>
          <label class="switch">
            <input v-model="welcomeEnabled" type="checkbox" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="grid">
          <label>
            Message FR
            <textarea
              v-model="welcomeMessageFr"
              rows="4"
              placeholder="Message en français (laisser vide pour le défaut)."
            ></textarea>
          </label>
          <label>
            Message EN
            <textarea
              v-model="welcomeMessageEn"
              rows="4"
              placeholder="Message in English (leave empty for default)."
            ></textarea>
          </label>
          <label>
            Message ES
            <textarea
              v-model="welcomeMessageEs"
              rows="4"
              placeholder="Mensaje en español (dejar vacío para el predeterminado)."
            ></textarea>
          </label>
        </div>
        <div class="sub-card">
          <h4>Aperçu (embed)</h4>
          <div class="grid">
            <div class="code-block">
              <strong>FR</strong>
              <div style="margin-top: 6px; white-space: pre-wrap;">{{ welcomePreview.fr }}</div>
            </div>
            <div class="code-block">
              <strong>EN</strong>
              <div style="margin-top: 6px; white-space: pre-wrap;">{{ welcomePreview.en }}</div>
            </div>
            <div class="code-block">
              <strong>ES</strong>
              <div style="margin-top: 6px; white-space: pre-wrap;">{{ welcomePreview.es }}</div>
            </div>
          </div>
        </div>
        <div class="actions" style="justify-content: flex-end;">
          <UButton color="primary" :loading="welcomeSaving" @click="saveWelcomeSettings">
            {{ welcomeSaving ? "Enregistrement..." : "Enregistrer" }}
          </UButton>
        </div>
        <p v-if="welcomeStatus" class="muted">{{ welcomeStatus }}</p>
      </UCard>

      <UCard v-show="activeAdminTab === 'database'" class="card">
        <div class="card-head">
          <div>
            <h3>Debug base de données</h3>
            <p class="muted">Vérifie que l’API écrit bien dans la bonne base.</p>
          </div>
          <UButton color="neutral" variant="outline" @click="loadDbInfo">Rafraîchir</UButton>
        </div>
        <div v-if="dbInfoLoading" class="muted">Chargement...</div>
        <div v-else-if="dbInfo" class="list">
          <div class="list-row">
            <span>Base active</span>
            <span class="mono">{{ dbInfo.database || "—" }}</span>
          </div>
          <div class="list-row">
            <span>Table user_oauth_state</span>
            <span>{{ dbInfo.hasUserOauthState ? "OK" : "Manquante" }}</span>
          </div>
          <div class="list-row">
            <span>Table user_guilds</span>
            <span>{{ dbInfo.hasUserGuilds ? "OK" : "Manquante" }}</span>
          </div>
          <div class="list-row">
            <span>Table users</span>
            <span>{{ dbInfo.hasUsers ? "OK" : "Manquante" }}</span>
          </div>
          <div class="list-row">
            <span>Dernière migration</span>
            <span class="mono">{{ dbInfo.latestMigration || "—" }}</span>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeAdminTab === 'settings'" class="card">
        <div class="card-head">
          <div>
            <h3>Réglages globaux</h3>
            <p class="muted">Active ou désactive des modules pour tous les serveurs.</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="setting-tile">
            <div>
              <div class="setting-title">Accès API</div>
              <div class="muted">Masque ou affiche l’onglet API côté serveurs.</div>
            </div>
            <div class="actions">
              <UButton color="error" variant="solid" :loading="apiTabGlobalLoading" @click="setApiTabGlobal(true)">
                {{ apiTabGlobalLoading ? "Mise à jour..." : "Désactiver" }}
              </UButton>
              <UButton color="neutral" variant="outline" :disabled="apiTabGlobalLoading" @click="setApiTabGlobal(false)">
                Activer
              </UButton>
            </div>
            <p v-if="apiTabGlobalStatus" class="muted">{{ apiTabGlobalStatus }}</p>
          </div>
          <div class="setting-tile">
            <div>
              <div class="setting-title">Interface utilisateur</div>
              <div class="muted">Coupe ou réactive l’espace utilisateur global.</div>
            </div>
            <div class="actions">
              <UButton color="error" variant="solid" :loading="userUiGlobalLoading" @click="setUserUiGlobal(true)">
                {{ userUiGlobalLoading ? "Mise à jour..." : "Désactiver" }}
              </UButton>
              <UButton color="neutral" variant="outline" :disabled="userUiGlobalLoading" @click="setUserUiGlobal(false)">
                Activer
              </UButton>
            </div>
            <p v-if="userUiGlobalStatus" class="muted">{{ userUiGlobalStatus }}</p>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeAdminTab === 'guilds'" class="card">
        <div class="card-head">
          <div>
            <h3>Serveurs</h3>
            <p class="muted">Liste complète des serveurs utilisant le bot.</p>
          </div>
        </div>
        <div class="filters">
          <input v-model="guildSearch" class="search" placeholder="Rechercher un serveur ou ID..." />
          <label class="checkbox">
            <input v-model="showOnlyBanned" type="checkbox" />
            <span>Afficher uniquement les bannis</span>
          </label>
          <label class="checkbox">
            <input v-model="showBotPresent" type="checkbox" />
            <span>Bot présent</span>
          </label>
          <label class="checkbox">
            <input v-model="showBotAbsent" type="checkbox" />
            <span>Bot absent</span>
          </label>
        </div>
        <div class="table">
          <div class="table-head">
            <span>Serveur</span>
            <span>ID</span>
            <span>Ajouté par</span>
            <span>Ajouté le</span>
            <span>Log BOT</span>
            <span>API</span>
            <span>UI</span>
            <span>Présence</span>
            <span>Statut</span>
            <span>Lien</span>
            <span>Action</span>
          </div>
          <div v-if="!filteredGuilds.length" class="muted">Aucun serveur trouvé.</div>
          <div v-for="guild in filteredGuilds" :key="guild.discord_guild_id" class="table-row">
            <div class="server-cell">
              <div class="icon" :style="{ backgroundImage: guild.iconUrl ? `url(${guild.iconUrl})` : '' }">
                <span v-if="!guild.iconUrl">🛰️</span>
              </div>
              <div>
                <div class="server-name">{{ guild.displayName || guild.name || 'Sans nom' }}</div>
                <div class="muted small">Owner: {{ guild.owner_discord_id || guild.bot_owner || '—' }}</div>
              </div>
            </div>
            <span class="mono">{{ guild.discord_guild_id }}</span>
            <span>
              {{ guild.added_by_username || guild.added_by_discord_id || "—" }}
            </span>
            <span>{{ formatDate(guild.added_at) }}</span>
            <span>
              <span class="mono">{{ guild.bot_log_channel_id || "—" }}</span>
              <span
                class="pill"
                :class="guild.bot_log_channel_id ? 'success' : 'danger'"
                style="margin-left: 8px;"
              >
                {{ guild.bot_log_channel_id ? "Configuré" : "Non configuré" }}
              </span>
            </span>
            <span>
              <UButton
                color="neutral"
                variant="solid"
                :disabled="apiTabSaving[guild.discord_guild_id]"
                @click="toggleApiTab(guild)"
              >
                {{ guild.api_tab_disabled ? "Activer" : "Désactiver" }}
              </UButton>
              <span
                class="pill"
                :class="guild.api_tab_disabled ? 'danger' : 'success'"
                style="margin-left: 8px;"
              >
                {{ guild.api_tab_disabled ? "Désactivé" : "Actif" }}
              </span>
            </span>
            <span>
              <UButton
                color="neutral"
                variant="solid"
                :disabled="userUiSaving[guild.discord_guild_id]"
                @click="toggleUserUi(guild)"
              >
                {{ guild.user_ui_disabled ? "Activer" : "Désactiver" }}
              </UButton>
              <span
                class="pill"
                :class="guild.user_ui_disabled ? 'danger' : 'success'"
                style="margin-left: 8px;"
              >
                {{ guild.user_ui_disabled ? "Désactivée" : "Active" }}
              </span>
            </span>
            <span>
              <span v-if="guild.bot_present" class="pill success">Présent</span>
              <span v-else class="pill danger">Absent</span>
            </span>
            <span>
              <span v-if="guild.banned" class="pill danger">Banni</span>
              <span v-else class="pill success">Actif</span>
            </span>
            <span>
              <UButton
                v-if="inviteLinks[guild.discord_guild_id]"
                color="neutral"
                variant="solid"
                :to="inviteLinks[guild.discord_guild_id]"
                external
                target="_blank"
                rel="noopener"
              >
                Ouvrir
              </UButton>
              <UButton
                v-else
                color="neutral"
                variant="solid"
                :disabled="!guild.bot_present || inviteLoading[guild.discord_guild_id]"
                @click="createInvite(guild)"
              >
                {{ inviteLoading[guild.discord_guild_id] ? "Création..." : "Créer lien" }}
              </UButton>
            </span>
            <span>
              <UButton
                v-if="!guild.banned"
                color="error"
                variant="solid"
                @click="openBanModal(guild)"
              >
                Bannir
              </UButton>
              <UButton
                v-else
                color="neutral"
                variant="solid"
                @click="unbanGuild(guild)"
              >
                Dé‑bannir
              </UButton>
            </span>
          </div>
        </div>
        <p v-if="selectedBanReason" class="muted">Raison: {{ selectedBanReason }}</p>
      </UCard>

      <UCard v-show="activeAdminTab === 'users'" class="card">
        <div class="card-head">
          <div>
            <h3>Utilisateurs authentifiés</h3>
            <p class="muted">Discord / Twitch liés, avec détail des serveurs et infos Discord.</p>
          </div>
          <div class="inline">
            <input v-model="userSearch" class="search" placeholder="Rechercher un utilisateur..." />
            <input
              v-model="userGuildSearch"
              class="search"
              placeholder="Serveur (nom ou ID)..."
              style="max-width: 240px;"
            />
            <select v-model.number="usersLimit" class="select">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <UButton color="neutral" variant="outline" @click="applyUserFilters">Rechercher</UButton>
          </div>
        </div>
        <div class="table users-table">
          <div class="table-head">
            <span>Utilisateur</span>
            <span>ID</span>
            <span>Twitch</span>
            <span>Serveurs</span>
            <span>Auth</span>
            <span>Action</span>
          </div>
          <div v-if="usersLoading" class="muted">Chargement...</div>
          <div v-else-if="!filteredUsers.length" class="muted">Aucun utilisateur trouvé.</div>
          <div v-for="user in filteredUsers" :key="user.discord_id" class="table-row">
            <div class="server-cell">
              <div class="icon" :style="{ backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : '' }">
                <span v-if="!user.avatarUrl">👤</span>
              </div>
              <div>
                <div class="server-name">{{ user.displayName }}</div>
                <div class="muted small">Créé le {{ formatDate(user.created_at) }}</div>
              </div>
            </div>
            <span class="mono">{{ user.discord_id }}</span>
            <span>{{ user.twitch_login || "—" }}</span>
            <span>{{ user.guilds?.length || 0 }}</span>
            <span>
              <span class="pill success">Discord</span>
              <span v-if="user.twitch_login" class="pill" style="margin-left: 6px;">Twitch</span>
            </span>
            <span>
              <UButton color="neutral" variant="outline" @click="openUserDetails(user)">Voir</UButton>
            </span>
          </div>
        </div>
        <div class="pagination">
          <UButton color="neutral" variant="outline" :disabled="usersPage <= 1" @click="changeUsersPage(-1)">
            Précédent
          </UButton>
          <span>Page {{ usersPage }} / {{ usersTotalPages }}</span>
          <UButton
            color="neutral"
            variant="solid"
            :disabled="usersPage >= usersTotalPages"
            @click="changeUsersPage(1)"
          >
            Suivant
          </UButton>
        </div>
      </UCard>

      <UCard v-show="activeAdminTab === 'logs'" class="card">
        <div class="card-head">
          <div>
            <h3>Logs admin</h3>
            <p class="muted">Historique des actions administrateur.</p>
          </div>
        </div>
        <div class="table">
          <div class="table-head">
            <span>Date</span>
            <span>Action</span>
            <span>Serveur</span>
            <span>Détails</span>
          </div>
          <div v-if="!adminLogs.length" class="muted">Aucun log.</div>
          <div v-for="log in adminLogs" :key="log.id" class="table-row">
            <span>{{ formatDate(log.created_at) }}</span>
            <span class="mono">{{ log.action }}</span>
            <span>{{ log.guild_name || log.guild_discord_id || "—" }}</span>
            <span class="muted">{{ formatLogData(log.data) }}</span>
          </div>
        </div>
      </UCard>
    </template>

    <div v-if="showBanModal" class="modal">
      <UCard class="modal-card">
        <div class="modal-head">
          <div>
            <h3>Bannir le serveur</h3>
            <p class="muted">Indique la raison du bannissement.</p>
          </div>
          <UButton color="neutral" variant="outline" @click="closeBanModal">✕</UButton>
        </div>
        <label>
          Raison
          <textarea v-model="banReason" rows="3" placeholder="Raison du bannissement"></textarea>
        </label>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="closeBanModal">Annuler</UButton>
          <UButton color="error" variant="solid" :loading="banSaving" @click="confirmBan">
            {{ banSaving ? "Bannissement..." : "Confirmer" }}
          </UButton>
        </div>
      </UCard>
    </div>

    <div v-if="showUserModal" class="modal">
      <UCard class="modal-card modal-card--large">
        <div class="modal-head">
          <div>
            <h3>Détails utilisateur</h3>
            <p class="muted">Informations Discord et serveurs associés.</p>
          </div>
          <UButton color="neutral" variant="outline" @click="closeUserModal">✕</UButton>
        </div>
        <div v-if="userDetailsLoading" class="muted">Chargement...</div>
        <template v-else-if="selectedUserDetails">
          <div class="list">
            <div class="list-row">
              <span>Utilisateur</span>
              <span>{{ selectedUserDetails.user.username }}</span>
            </div>
            <div class="list-row">
              <span>Discord ID</span>
              <span class="mono">{{ selectedUserDetails.user.discord_id }}</span>
            </div>
            <div class="list-row">
              <span>Twitch</span>
              <span>{{ selectedUserDetails.user.twitch_login || "—" }}</span>
            </div>
            <div class="list-row">
              <span>Inscrit</span>
              <span>{{ formatDate(selectedUserDetails.user.created_at) }}</span>
            </div>
          </div>

          <div class="sub-card">
            <h4>Interface utilisateur</h4>
            <p class="muted">Ouvrir l’interface utilisateur comme ce membre.</p>
            <label>
              Serveur
              <select v-model="impersonateGuildId" class="select">
                <option value="">Accueil utilisateur</option>
                <option
                  v-for="guild in impersonateGuildOptions"
                  :key="guild.guild_id"
                  :value="guild.guild_id"
                >
                  {{ guild.guild_name }} — {{ guild.guild_id }}
                </option>
              </select>
            </label>
            <p v-if="selectedUserDetails?.guilds?.length && !impersonateGuildOptions.length" class="muted">
              Aucun serveur avec le bot pour cet utilisateur.
            </p>
            <div class="actions">
              <UButton color="primary" :loading="impersonateLoading" @click="openUserInterfaceAs">
                {{ impersonateLoading ? "Ouverture..." : "Se connecter en tant que" }}
              </UButton>
            </div>
            <p v-if="impersonateStatus" class="muted">{{ impersonateStatus }}</p>
          </div>

          <div class="sub-card">
            <h4>Serveurs</h4>
            <div v-if="!selectedUserDetails.guilds?.length" class="muted">
              Aucun serveur trouvé via l’OAuth. Demandez à l’utilisateur de se reconnecter pour
              rafraîchir ses serveurs.
            </div>
            <div v-else class="list">
              <div v-for="guild in displayedUserGuilds" :key="guild.guild_id" class="list-row">
                <span>{{ guild.guild_name }}</span>
                <span class="mono">{{ guild.guild_id }}</span>
              </div>
            </div>
            <div v-if="userGuildsTotalPages > 1" class="pagination">
              <UButton color="neutral" variant="outline" :disabled="userGuildsPage <= 1" @click="changeUserGuildsPage(-1)">
                Précédent
              </UButton>
              <span>Page {{ userGuildsPage }} / {{ userGuildsTotalPages }}</span>
              <UButton
                color="neutral"
                variant="solid"
                :disabled="userGuildsPage >= userGuildsTotalPages"
                @click="changeUserGuildsPage(1)"
              >
                Suivant
              </UButton>
            </div>
          </div>

          <div class="sub-card">
            <h4>Informations Discord</h4>
            <div class="list">
              <div class="list-row">
                <span>Global name</span>
                <span>{{ selectedUserDetails.discord?.global_name || "—" }}</span>
              </div>
              <div class="list-row">
                <span>Discriminator</span>
                <span>{{ selectedUserDetails.discord?.discriminator || "—" }}</span>
              </div>
              <div class="list-row">
                <span>Bot</span>
                <span>{{ selectedUserDetails.discord?.bot ? "Oui" : "Non" }}</span>
              </div>
              <div class="list-row">
                <span>System</span>
                <span>{{ selectedUserDetails.discord?.system ? "Oui" : "Non" }}</span>
              </div>
              <div class="list-row">
                <span>Flags</span>
                <span>{{ selectedUserDetails.discord?.flags ?? "—" }}</span>
              </div>
              <div class="list-row">
                <span>Public flags</span>
                <span>{{ selectedUserDetails.discord?.public_flags ?? "—" }}</span>
              </div>
              <div class="list-row">
                <span>Premium type</span>
                <span>{{ selectedUserDetails.discord?.premium_type ?? "—" }}</span>
              </div>
              <div class="list-row">
                <span>Locale</span>
                <span>{{ selectedUserDetails.discord?.locale || "—" }}</span>
              </div>
              <div class="list-row">
                <span>MFA</span>
                <span>{{ selectedUserDetails.discord?.mfa_enabled ? "Oui" : "Non" }}</span>
              </div>
              <div class="list-row">
                <span>Verified</span>
                <span>{{ selectedUserDetails.discord?.verified ? "Oui" : "Non" }}</span>
              </div>
              <div class="list-row">
                <span>Avatar</span>
                <span class="mono">{{ selectedUserDetails.discord?.avatar || "—" }}</span>
              </div>
              <div class="list-row">
                <span>Banner</span>
                <span class="mono">{{ selectedUserDetails.discord?.banner || "—" }}</span>
              </div>
              <div class="list-row">
                <span>Accent color</span>
                <span>{{ selectedUserDetails.discord?.accent_color ?? "—" }}</span>
              </div>
            </div>
            <pre class="code-block">{{ formatDiscordDetails(selectedUserDetails.discord) }}</pre>
          </div>

        </template>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="closeUserModal">Fermer</UButton>
        </div>
      </UCard>
    </div>
  </section>
</template>

<script setup>
const config = useRuntimeConfig();
const { getToken } = useAuth();
const router = useRouter();

const adminUserId = String(config.public.adminUserId || "1328058083246608407");
const me = ref(null);
const isAdmin = computed(() => String(me.value?.discord_id || "") === adminUserId);
const adminTabs = [
  { key: "overview", label: "Vue d’ensemble" },
  { key: "broadcast", label: "Broadcast" },
  { key: "welcome", label: "Bienvenue" },
  { key: "settings", label: "Réglages globaux" },
  { key: "guilds", label: "Serveurs" },
  { key: "users", label: "Utilisateurs" },
  { key: "logs", label: "Logs admin" },
  { key: "database", label: "Debug BDD" }
];
const activeAdminTab = ref("overview");

const summary = reactive({
  totalGuilds: 0,
  bannedGuilds: 0,
  totalUsers: 0,
  botAbsent: 0
});
const guilds = ref([]);
const adminLogs = ref([]);
const guildSearch = ref("");
const showOnlyBanned = ref(false);
const showBotPresent = ref(true);
const showBotAbsent = ref(true);
const selectedBanReason = ref("");
const inviteLinks = reactive({});
const inviteLoading = reactive({});
const apiTabSaving = reactive({});

const showBanModal = ref(false);
const banTarget = ref(null);
const banReason = ref("");
const banSaving = ref(false);

const broadcastMessage = ref("");
const broadcastIncludeBanned = ref(false);
const broadcastSending = ref(false);
const broadcastStatus = ref("");
const welcomeEnabled = ref(true);
const welcomeMessageFr = ref("");
const welcomeMessageEn = ref("");
const welcomeMessageEs = ref("");
const welcomeSaving = ref(false);
const welcomeStatus = ref("");
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
const apiTabGlobalLoading = ref(false);
const apiTabGlobalStatus = ref("");
const userUiGlobalLoading = ref(false);
const userUiGlobalStatus = ref("");
const userUiSaving = reactive({});
const users = ref([]);
const usersLoading = ref(false);
const userSearch = ref("");
const userGuildSearch = ref("");
const usersPage = ref(1);
const usersLimit = ref(20);
const usersTotal = ref(0);
const dbInfo = ref(null);
const dbInfoLoading = ref(false);
const selectedUserDetails = ref(null);
const showUserModal = ref(false);
const userDetailsLoading = ref(false);
const userGuildsPage = ref(1);
const userGuildsPageSize = 10;
const impersonateGuildId = ref("");
const impersonateLoading = ref(false);
const impersonateStatus = ref("");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatLogData = (value) => {
  if (!value) return "—";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed?.reason) return parsed.reason;
    if (parsed?.message) return parsed.message;
    return JSON.stringify(parsed);
  } catch {
    return String(value);
  }
};

const normalizeGuild = (row) => {
  const botPresent = Boolean(row.bot_present);
  const displayName =
    row.name && row.name !== "Unknown" ? row.name : row.bot_name || row.name || "Unknown";
  const icon = row.icon || row.bot_icon || null;
  return {
    ...row,
    bot_present: botPresent,
    api_tab_disabled: Boolean(row.api_tab_disabled),
    user_ui_disabled: Boolean(row.user_ui_disabled),
    displayName,
    iconUrl: icon ? `https://cdn.discordapp.com/icons/${row.discord_guild_id}/${icon}.png` : ""
  };
};

const normalizeUser = (row) => {
  const avatarUrl = row.avatar
    ? `https://cdn.discordapp.com/avatars/${row.discord_id}/${row.avatar}.png`
    : "";
  return {
    ...row,
    displayName: row.username || row.discord_id,
    avatarUrl
  };
};

const loadMe = async () => {
  const token = getToken();
  if (!token) {
    me.value = null;
    return;
  }
  const res = await fetch(`${config.public.apiBase}/api/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    me.value = null;
    return;
  }
  const data = await res.json();
  me.value = data.user || null;
};

const applyOverviewData = (data) => {
  const normalizedGuilds = (data.guilds || []).map(normalizeGuild);
  const activeCount = normalizedGuilds.filter((guild) => guild.bot_present).length;
  const absentCount = normalizedGuilds.length - activeCount;
  summary.totalGuilds = activeCount;
  summary.botAbsent = absentCount;
  summary.bannedGuilds = data.summary?.bannedGuilds || 0;
  summary.totalUsers = data.summary?.totalUsers || 0;
  guilds.value = normalizedGuilds;
  adminLogs.value = data.logs || [];
};

const loadOverview = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const data = await res.json();
  applyOverviewData(data);
};

const loadAll = async () => {
  await loadOverview();
  await loadWelcomeSettings();
  await loadUsers();
  await loadDbInfo();
};

const loadWelcomeSettings = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/welcome-message`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const data = await res.json();
  welcomeEnabled.value = data.settings?.welcome_enabled !== false;
  welcomeMessageFr.value = data.settings?.welcome_message_fr || "";
  welcomeMessageEn.value = data.settings?.welcome_message_en || "";
  welcomeMessageEs.value = data.settings?.welcome_message_es || "";
};

const saveWelcomeSettings = async () => {
  const token = getToken();
  welcomeSaving.value = true;
  welcomeStatus.value = "";
  const res = await fetch(`${config.public.apiBase}/api/admin/welcome-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      welcome_enabled: Boolean(welcomeEnabled.value),
      welcome_message_fr: String(welcomeMessageFr.value || "").trim(),
      welcome_message_en: String(welcomeMessageEn.value || "").trim(),
      welcome_message_es: String(welcomeMessageEs.value || "").trim()
    })
  });
  if (res.ok) {
    welcomeStatus.value = "Message de bienvenue mis à jour.";
  } else {
    welcomeStatus.value = "Erreur lors de l'enregistrement.";
  }
  welcomeSaving.value = false;
};

const loadUsers = async () => {
  const token = getToken();
  usersLoading.value = true;
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
  usersLoading.value = false;
};

const loadDbInfo = async () => {
  const token = getToken();
  dbInfoLoading.value = true;
  const res = await fetch(`${config.public.apiBase}/api/admin/db-info`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    const data = await res.json();
    dbInfo.value = data.info || null;
  }
  dbInfoLoading.value = false;
};

const filteredGuilds = computed(() => {
  const query = guildSearch.value.trim().toLowerCase();
  return guilds.value.filter((guild) => {
    if (showOnlyBanned.value && !guild.banned) return false;
    if (!showBotPresent.value && guild.bot_present) return false;
    if (!showBotAbsent.value && !guild.bot_present) return false;
    if (!query) return true;
    return (
      String(guild.discord_guild_id || "").includes(query) ||
      String(guild.displayName || guild.name || "").toLowerCase().includes(query)
    );
  });
});

const botGuildIdSet = computed(() => {
  const set = new Set();
  guilds.value.forEach((guild) => {
    if (guild.bot_present) set.add(String(guild.discord_guild_id));
  });
  return set;
});

const filterUserGuildsWithBot = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const botIds = botGuildIdSet.value;
  return list.filter((guild) => botIds.has(String(guild.guild_id)));
};

const impersonateGuildOptions = computed(() => {
  return filterUserGuildsWithBot(selectedUserDetails.value?.guilds || []);
});

const filteredUsers = computed(() => users.value);

const usersTotalPages = computed(() => {
  const total = Number(usersTotal.value || 0);
  const limit = Math.max(1, Number(usersLimit.value || 20));
  return Math.max(1, Math.ceil(total / limit));
});

const openBanModal = (guild) => {
  banTarget.value = guild;
  banReason.value = "";
  showBanModal.value = true;
};

const closeBanModal = () => {
  showBanModal.value = false;
  banTarget.value = null;
  banReason.value = "";
};

const confirmBan = async () => {
  if (!banTarget.value) return;
  banSaving.value = true;
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/admin/guilds/${banTarget.value.discord_guild_id}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason: banReason.value })
  });
  banSaving.value = false;
  showBanModal.value = false;
  selectedBanReason.value = banReason.value;
  await loadAll();
};

const unbanGuild = async (guild) => {
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/admin/guilds/${guild.discord_guild_id}/unban`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  await loadAll();
};

const sendBroadcast = async () => {
  if (!broadcastMessage.value.trim()) {
    broadcastStatus.value = "Message vide.";
    return;
  }
  broadcastSending.value = true;
  broadcastStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      message: broadcastMessage.value.trim(),
      includeBanned: broadcastIncludeBanned.value
    })
  });
  if (res.ok) {
    const data = await res.json();
    const sent = data.sent || 0;
    const total = data.totalConfigured || 0;
    const eligible = data.eligible || 0;
    const failed = data.failed || 0;
    const skipped = data.skippedBanned || 0;
    if (total === 0) {
      broadcastStatus.value = "Aucun serveur n’a de salon log bot configuré.";
    } else if (eligible === 0) {
      broadcastStatus.value = "Aucun serveur éligible (bannis exclus).";
    } else if (sent === 0) {
      broadcastStatus.value = `0/${eligible} envoyés (échec ${failed}).`;
    } else {
      broadcastStatus.value = `Message envoyé à ${sent}/${eligible} serveurs.`;
      if (skipped > 0) broadcastStatus.value += ` (${skipped} bannis ignorés)`;
    }
    broadcastMessage.value = "";
  } else {
    broadcastStatus.value = "Erreur lors de l'envoi.";
  }
  broadcastSending.value = false;
  await loadOverview();
};

const createInvite = async (guild) => {
  if (!guild?.discord_guild_id) return;
  inviteLoading[guild.discord_guild_id] = true;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/guilds/${guild.discord_guild_id}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ maxAge: 3600, maxUses: 1 })
  });
  if (res.ok) {
    const data = await res.json();
    inviteLinks[guild.discord_guild_id] = data.invite?.url || "";
  }
  inviteLoading[guild.discord_guild_id] = false;
};

const setApiTabGlobal = async (disabled) => {
  apiTabGlobalLoading.value = true;
  apiTabGlobalStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/api-tab/global`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ disabled })
  });
  if (res.ok) {
    const data = await res.json();
    guilds.value = guilds.value.map((g) => ({ ...g, api_tab_disabled: disabled }));
    apiTabGlobalStatus.value = disabled
      ? `Onglet API désactivé pour ${data.totalGuilds} serveurs.`
      : `Onglet API activé pour ${data.totalGuilds} serveurs.`;
  } else {
    apiTabGlobalStatus.value = "Erreur lors de la mise à jour globale.";
  }
  apiTabGlobalLoading.value = false;
};

const toggleApiTab = async (guild) => {
  if (!guild?.discord_guild_id) return;
  const nextDisabled = !guild.api_tab_disabled;
  apiTabSaving[guild.discord_guild_id] = true;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/guilds/${guild.discord_guild_id}/api-tab`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ disabled: nextDisabled })
  });
  if (res.ok) {
    guild.api_tab_disabled = nextDisabled;
  }
  apiTabSaving[guild.discord_guild_id] = false;
};

const setUserUiGlobal = async (disabled) => {
  userUiGlobalLoading.value = true;
  userUiGlobalStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/user-ui/global`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ disabled })
  });
  if (res.ok) {
    const data = await res.json();
    guilds.value = guilds.value.map((g) => ({ ...g, user_ui_disabled: disabled }));
    userUiGlobalStatus.value = disabled
      ? `Interface désactivée pour ${data.totalGuilds} serveurs.`
      : `Interface activée pour ${data.totalGuilds} serveurs.`;
  } else {
    userUiGlobalStatus.value = "Erreur lors de la mise à jour globale.";
  }
  userUiGlobalLoading.value = false;
};

const toggleUserUi = async (guild) => {
  if (!guild?.discord_guild_id) return;
  const nextDisabled = !guild.user_ui_disabled;
  userUiSaving[guild.discord_guild_id] = true;
  const token = getToken();
  const res = await fetch(
    `${config.public.apiBase}/api/admin/guilds/${guild.discord_guild_id}/user-ui`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ disabled: nextDisabled })
    }
  );
  if (res.ok) {
    guild.user_ui_disabled = nextDisabled;
  }
  userUiSaving[guild.discord_guild_id] = false;
};

const openUserDetails = async (user) => {
  if (!user?.discord_id) return;
  showUserModal.value = true;
  userDetailsLoading.value = true;
  selectedUserDetails.value = null;
  userGuildsPage.value = 1;
  impersonateGuildId.value = "";
  impersonateStatus.value = "";
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
  userDetailsLoading.value = false;
};

const closeUserModal = () => {
  showUserModal.value = false;
  selectedUserDetails.value = null;
  userGuildsPage.value = 1;
  impersonateGuildId.value = "";
  impersonateStatus.value = "";
};

const openUserInterfaceAs = async () => {
  const target = selectedUserDetails.value?.user?.discord_id;
  if (!target) return;
  impersonateLoading.value = true;
  impersonateStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/admin/impersonate/${target}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    const data = await res.json();
    const redirect = impersonateGuildId.value
      ? `/user/guild/${impersonateGuildId.value}`
      : "/user";
    const url = `${redirect}?token=${encodeURIComponent(data.token)}&impersonate=1`;
    if (process.client) {
      window.open(url, "_blank", "noopener");
    }
    impersonateStatus.value = "Interface ouverte dans un nouvel onglet.";
  } else {
    impersonateStatus.value = "Erreur lors de l’ouverture de l’interface.";
  }
  impersonateLoading.value = false;
};

const userGuildsTotalPages = computed(() => {
  const total = selectedUserDetails.value?.guilds?.length || 0;
  return Math.max(1, Math.ceil(total / userGuildsPageSize));
});

const displayedUserGuilds = computed(() => {
  const list = selectedUserDetails.value?.guilds || [];
  const page = Math.min(Math.max(1, userGuildsPage.value), userGuildsTotalPages.value);
  const start = (page - 1) * userGuildsPageSize;
  return list.slice(start, start + userGuildsPageSize);
});

const changeUserGuildsPage = (delta) => {
  const next = Math.min(
    userGuildsTotalPages.value,
    Math.max(1, Number(userGuildsPage.value || 1) + delta)
  );
  if (next === userGuildsPage.value) return;
  userGuildsPage.value = next;
};

const applyUserFilters = async () => {
  usersPage.value = 1;
  await loadUsers();
};

const changeUsersPage = async (delta) => {
  const next = Math.min(
    usersTotalPages.value,
    Math.max(1, Number(usersPage.value || 1) + delta)
  );
  if (next === usersPage.value) return;
  usersPage.value = next;
  await loadUsers();
};

watch(usersLimit, async () => {
  await applyUserFilters();
});
const formatDiscordDetails = (value) => {
  if (!value) return "Aucune donnée Discord.";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

onMounted(async () => {
  await loadMe();
  if (!isAdmin.value) {
    router.push("/servers");
    return;
  }
  await loadAll();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: "Space Grotesk", "Manrope", "Noto Sans", ui-sans-serif, sans-serif;
  color: #e5e7eb;
  background: radial-gradient(1200px 400px at 10% 0%, rgba(34, 197, 94, 0.12), transparent 60%),
    radial-gradient(900px 400px at 90% 10%, rgba(59, 130, 246, 0.12), transparent 60%);
}
.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.page-hero h1 {
  margin: 6px 0 6px;
  font-size: 28px;
  letter-spacing: -0.02em;
}
.eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-muted);
}
.hero-actions {
  display: flex;
  gap: 8px;
}
.admin-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 6px 4px;
}
.tab-pill {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-soft);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab-pill.active {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(59, 130, 246, 0.4));
  border-color: var(--border);
  color: #ffffff;
}
.grid,
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px;
  box-shadow: var(--shadow);
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-title {
  color: var(--text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
}
.stat-foot {
  color: var(--text-muted);
  font-size: 12px;
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: 12px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.search {
  flex: 1;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: inherit;
}
.select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: inherit;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
    linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position: calc(100% - 18px) 55%, calc(100% - 12px) 55%;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  padding-right: 32px;
}
.select option {
  background-color: var(--surface);
  color: #e5e7eb;
}
.select option:checked,
.select option:hover {
  background-color: var(--surface-2);
}
.table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.users-table .table-head,
.users-table .table-row {
  grid-template-columns: 1.6fr 1fr 1fr 0.6fr 1fr 0.6fr;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.list-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
}
.sub-card {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-2);
}
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.setting-tile {
  display: grid;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-2);
}
.setting-title {
  font-weight: 600;
}
.code-block {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  font-size: 12px;
  white-space: pre-wrap;
  color: var(--text);
}
.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr 1fr 1fr 0.7fr 0.8fr 0.9fr 0.8fr;
  gap: 12px;
  align-items: center;
}
.table-head {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}
.table-row {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-2);
  transition: background 0.2s ease;
}
.table-row:hover {
  background: var(--border);
}
.server-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--border);
  background-size: cover;
  background-position: center;
}
.server-name {
  font-weight: 600;
}
.mono {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.pill.success {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}
.pill.danger {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}
.inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 12px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.checkbox input {
  accent-color: #22c55e;
}
.link-button {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
textarea {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  color: inherit;
}
.full {
  grid-column: 1 / -1;
}
.modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  z-index: 50;
  overflow: auto;
}
.modal-card {
  width: min(520px, 90vw);
  background: var(--surface);
  border-radius: 18px;
  padding: 18px;
  border: 1px solid var(--border);
}
.modal-card--large {
  width: min(980px, 96vw);
  max-height: 85vh;
  overflow: auto;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}
:global(body.theme-light) .page {
  color: var(--text);
  background: radial-gradient(1200px 400px at 10% 0%, rgba(34, 197, 94, 0.08), transparent 60%),
    radial-gradient(900px 400px at 90% 10%, rgba(59, 130, 246, 0.08), transparent 60%);
}
:global(body.theme-light) .page-hero,
:global(body.theme-light) .card,
:global(body.theme-light) .modal-card {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
:global(body.theme-light) .tab-pill {
  background: #f1f5f9;
  border-color: var(--border);
  color: var(--text);
}
:global(body.theme-light) .tab-pill.active {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(59, 130, 246, 0.2));
  border-color: rgba(148, 163, 184, 0.3);
  color: var(--text);
}
:global(body.theme-light) .muted,
:global(body.theme-light) .eyebrow,
:global(body.theme-light) .stat-title,
:global(body.theme-light) .stat-foot {
  color: var(--text-muted);
}
:global(body.theme-light) .search,
:global(body.theme-light) .select {
  background: var(--surface);
  border-color: var(--border);
}
:global(body.theme-light) .select option {
  background-color: #ffffff;
  color: var(--text);
}
:global(body.theme-light) .modal {
  background: rgba(15, 23, 42, 0.6);
}
@media (max-width: 900px) {
  .table-head,
  .table-row {
    grid-template-columns: 1fr;
  }
}
</style>
