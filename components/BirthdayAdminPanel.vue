<template>
  <UCard class="card birthday-admin">
    <section class="birthday-hero">
      <div class="hero-main">
        <span class="hero-kicker">ANNIVERSAIRES</span>
        <h3>Module anniversaire du serveur</h3>
        <p class="muted">
          Configuration en blocs: activation, role, salon d'annonce, gestion manuelle des dates et synchronisation.
        </p>
      </div>

      <div class="hero-stats">
        <article class="hero-stat" :class="settings.enabled ? 'is-active' : 'is-inactive'">
          <span>Statut module</span>
          <strong>{{ settings.enabled ? "Actif" : "Inactif" }}</strong>
        </article>
        <article class="hero-stat">
          <span>Membres enregistres</span>
          <strong>{{ birthdays.length }}</strong>
        </article>
      </div>

      <div class="hero-actions">
        <UButton color="neutral" variant="outline" :loading="loading" @click="loadAll">Actualiser</UButton>
        <UButton color="primary" :loading="savingSettings" @click="saveSettingsAction">Sauver</UButton>
      </div>
    </section>

    <div v-if="statusMessage" class="status-banner">{{ statusMessage }}</div>

    <section class="birthday-dashboard">
      <div class="birthday-main">
        <article class="sub-card panel-card">
          <div class="panel-head">
            <h4>Activation du module</h4>
            <p class="muted small">Active ou desactive les fonctions anniversaires pour ce serveur.</p>
          </div>

          <div class="switch-stack">
            <div class="switch-row">
              <div class="switch-copy">
                <strong>Activer le module anniversaire</strong>
                <span class="muted small">Quand desactive, aucun traitement anniversaire n'est execute.</span>
              </div>
              <label class="switch" title="Activer ou desactiver le module anniversaire">
                <input v-model="settings.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="switch-row">
              <div class="switch-copy">
                <strong>Afficher l'age dans /anniversaire-list</strong>
                <span class="muted small">Permet d'afficher l'age calcule dans la liste des prochains anniversaires.</span>
              </div>
              <label class="switch" title="Afficher ou masquer l'age dans la commande anniversaire-list">
                <input v-model="settings.showAgeInList" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </article>

        <article class="sub-card panel-card">
          <div class="panel-head">
            <h4>Role et annonces</h4>
            <p class="muted small">Definis le role applique le jour J et le salon de notification publique.</p>
          </div>

          <div class="setting-grid">
            <label class="field">
              <span>Role anniversaire (optionnel)</span>
              <select v-model="settings.birthdayRoleId">
                <option value="">Aucun role</option>
                <option v-for="role in roles" :key="role.id" :value="String(role.id)">
                  {{ role.name }}
                </option>
              </select>
              <small class="field-help muted">Ajoute le jour J, retire le lendemain a 00h selon le fuseau du bot.</small>
            </label>

            <label class="field">
              <span>Salon d'annonce anniversaire</span>
              <select v-model="settings.announceChannelId">
                <option value="">Aucun salon</option>
                <option v-for="channel in channels" :key="channel.id" :value="String(channel.id)">
                  #{{ channel.name }}
                </option>
              </select>
              <small class="field-help muted">Annonce chaque anniversaire avec mention du membre et du role configure.</small>
            </label>
          </div>
        </article>

        <article class="sub-card panel-card">
          <div class="panel-head">
            <h4>Gestion manuelle des dates</h4>
            <p class="muted small">L'utilisateur ne peut saisir sa date qu'une seule fois. Les corrections passent par l'admin.</p>
          </div>

          <div class="entry-grid">
            <label ref="memberSearchFieldRef" class="field member-search-field">
              <span>Rechercher un membre</span>
              <input
                v-model.trim="memberSearch"
                placeholder="Tape au moins 2 lettres"
                @focus="handleMemberSearchInput"
                @input="handleMemberSearchInput"
              />
              <small class="field-help muted">Recherche par pseudo, nom global ou ID.</small>
              <div v-if="searchingMembers" class="member-search-state muted small">Recherche...</div>
              <div v-if="memberSearchOpen && searchResults.length" class="member-search-results">
                <button
                  v-for="member in searchResults"
                  :key="member.id"
                  type="button"
                  class="member-result"
                  @click="selectMember(member)"
                >
                  <img v-if="member.avatar" :src="member.avatar" alt="" />
                  <span v-else class="member-fallback">{{ initials(member.displayName || member.username || member.id) }}</span>
                  <span class="member-result-main">
                    <strong>{{ member.displayName || member.username || member.id }}</strong>
                    <span class="muted small">{{ member.id }}</span>
                  </span>
                </button>
              </div>
            </label>

            <label class="field">
              <span>Date d'anniversaire</span>
              <input v-model="entryBirthDate" type="date" />
              <small class="field-help muted">Utilise le format date natif du navigateur.</small>
            </label>

            <div class="selected-member">
              <span class="muted small">Membre selectionne</span>
              <template v-if="selectedMemberId">
                <strong>{{ selectedMemberName }}</strong>
                <span class="muted small">{{ selectedMemberId }}</span>
              </template>
              <template v-else>
                <strong>Aucun membre</strong>
                <span class="muted small">Selectionne un membre avant de sauver.</span>
              </template>
            </div>
          </div>

          <div class="actions-inline entry-actions">
            <UButton color="neutral" variant="outline" @click="clearEntryForm">Vider</UButton>
            <UButton color="primary" :loading="savingEntry" @click="saveEntryAction">Ajouter la date</UButton>
          </div>
        </article>
      </div>

      <aside class="birthday-side">
        <article class="sub-card panel-card side-card sync-card">
          <div class="panel-head">
            <h4>Synchronisation anniversaire</h4>
            <p class="muted small">Rattrape immediatement les attributions/retraits du role anniversaire.</p>
          </div>

          <ul class="sync-list muted small">
            <li>Utilise ce bouton apres avoir defini un role anniversaire.</li>
            <li>Le bot ignore les membres deja correctement synchronises.</li>
            <li>Les erreurs de role sont remontees dans le resultat de sync.</li>
          </ul>

          <UButton color="neutral" variant="outline" :loading="syncingRoles" @click="syncRolesAction">
            Synchroniser maintenant
          </UButton>
        </article>

        <article class="sub-card panel-card side-card info-card">
          <div class="panel-head compact">
            <h4>Rappels utiles</h4>
          </div>
          <ul class="info-list muted small">
            <li>La date membre est definitive apres la premiere saisie utilisateur.</li>
            <li>L'admin peut corriger une date depuis ce panneau.</li>
            <li>Si le role est deja present, aucun retrait/ajout inutile n'est force.</li>
          </ul>
        </article>
      </aside>
    </section>

    <article class="sub-card panel-card birthday-list-card">
      <div class="panel-head list-head">
        <div>
          <h4>Anniversaires enregistres</h4>
          <p class="muted small">Vue de controle pour verifier les prochaines dates.</p>
        </div>
        <span class="list-count">{{ birthdays.length }} membre(s)</span>
      </div>

      <div v-if="loading" class="state muted">Chargement...</div>
      <div v-else-if="!birthdays.length" class="state muted">Aucun anniversaire enregistre.</div>

      <div v-else class="birthday-list">
        <article v-for="entry in birthdays" :key="entry.userId" class="birthday-row">
          <div class="birthday-row-member">
            <div class="member-avatar compact">
              <img v-if="memberAvatar(entry.userId)" :src="memberAvatar(entry.userId)" alt="" />
              <span v-else>{{ initials(memberName(entry.userId)) }}</span>
            </div>
            <div class="member-copy">
              <strong>{{ memberName(entry.userId) }}</strong>
              <span class="muted small">{{ entry.userId }}</span>
            </div>
          </div>

          <div class="birthday-row-meta">
            <span><strong>Date:</strong> {{ formatDate(entry.birthDate) }}</span>
            <span><strong>Prochain:</strong> {{ formatDate(entry.nextBirthdayDate) }}</span>
            <span v-if="settings.showAgeInList && hasAgeValue(entry.age)"><strong>Age:</strong> {{ Number(entry.age) }}</span>
            <span><strong>Compte a rebours:</strong> {{ daysLabel(entry.daysUntil) }}</span>
          </div>

          <div class="birthday-row-actions">
            <UButton color="neutral" variant="outline" size="xs" @click="openEditModal(entry)">Modifier</UButton>
            <UButton
              color="error"
              variant="outline"
              size="xs"
              :loading="deletingUserId === String(entry.userId)"
              @click="deleteEntryAction(entry)"
            >
              Supprimer
            </UButton>
          </div>
        </article>
      </div>
    </article>

    <Teleport to="body">
      <div v-if="editModalOpen" class="birthday-edit-modal" @click.self="closeEditModal">
        <UCard class="birthday-edit-modal-card">
          <div class="card-head">
            <div>
              <h4>Modifier un anniversaire</h4>
              <p class="muted small">Edite la date ou supprime-la completement pour ce membre.</p>
            </div>
            <UButton color="neutral" variant="outline" @click="closeEditModal">Fermer</UButton>
          </div>

          <div class="edit-modal-grid">
            <div class="selected-member compact">
              <span class="muted small">Membre cible</span>
              <strong>{{ editMemberName || "Membre inconnu" }}</strong>
              <span class="muted small">{{ editUserId || "-" }}</span>
            </div>

            <label class="field">
              <span>Date d'anniversaire</span>
              <input v-model="editBirthDate" type="date" />
              <small class="field-help muted">Sauvegarde pour appliquer la nouvelle date.</small>
            </label>
          </div>

          <div class="actions-inline" style="justify-content: flex-end;">
            <UButton
              color="error"
              variant="outline"
              :loading="deletingUserId === editUserId"
              :disabled="!editUserId"
              @click="deleteEntryFromModal"
            >
              Supprimer la date
            </UButton>
            <UButton color="primary" :loading="savingEditEntry" :disabled="!editUserId" @click="saveEditEntryAction">
              Sauver la modification
            </UButton>
          </div>
        </UCard>
      </div>
    </Teleport>
  </UCard>
</template>

<script setup>
const props = defineProps({
  guildId: {
    type: [String, Number],
    required: true
  }
});

const { getToken, login } = useAuth();
const config = useRuntimeConfig();

const loading = ref(false);
const savingSettings = ref(false);
const savingEntry = ref(false);
const syncingRoles = ref(false);
const statusMessage = ref("");

const settings = reactive({
  enabled: true,
  birthdayRoleId: "",
  announceChannelId: "",
  showAgeInList: true
});

const roles = ref([]);
const channels = ref([]);
const birthdays = ref([]);
const memberMap = reactive({});

const memberSearch = ref("");
const searchResults = ref([]);
const searchingMembers = ref(false);
const memberSearchOpen = ref(false);
const skipMemberSearchOnce = ref(false);
const memberSearchFieldRef = ref(null);
const selectedMemberId = ref("");
const entryBirthDate = ref("");
const editModalOpen = ref(false);
const editUserId = ref("");
const editMemberName = ref("");
const editBirthDate = ref("");
const savingEditEntry = ref(false);
const deletingUserId = ref("");
let searchTimer = null;

const fetchJson = async (url, options = {}) => {
  const token = getToken();
  if (!token) {
    login();
    return null;
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    login();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

const initials = (value) => {
  const text = String(value || "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const formatDate = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw || "-";
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const daysLabel = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const days = Number(value);
  if (!Number.isFinite(days)) return "-";
  if (days <= 0) return "aujourd'hui";
  return `dans ${Math.floor(days)}j`;
};

const hasAgeValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
};

const selectedMemberName = computed(() => {
  const id = String(selectedMemberId.value || "");
  if (!id) return "";
  const profile = memberMap[id];
  return profile?.displayName || profile?.username || id;
});

const memberName = (userId) => {
  const key = String(userId || "");
  const profile = memberMap[key];
  return profile?.displayName || profile?.username || key;
};

const memberAvatar = (userId) => {
  const key = String(userId || "");
  return String(memberMap[key]?.avatar || "");
};

const upsertMemberMap = (entries = []) => {
  for (const member of entries || []) {
    const id = String(member?.id || "").trim();
    if (!id) continue;
    memberMap[id] = {
      id,
      displayName: String(member?.displayName || member?.username || id),
      username: String(member?.username || ""),
      avatar: String(member?.avatar || "")
    };
  }
};

const hydrateKnownMembers = async () => {
  const userIds = birthdays.value.map((entry) => String(entry.userId || "")).filter(Boolean);
  const uniqueIds = Array.from(new Set(userIds));
  if (!uniqueIds.length) return;
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds: uniqueIds })
  });
  if (!res?.ok) return;
  const users = res.data?.users || {};
  const mapped = Object.entries(users).map(([id, profile]) => ({
    id,
    displayName: profile?.displayName || id,
    username: profile?.username || "",
    avatar: profile?.avatar || ""
  }));
  upsertMemberMap(mapped);
};

const loadRoles = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/roles`);
  if (!res?.ok) {
    roles.value = [];
    return;
  }
  roles.value = Array.isArray(res.data?.roles) ? res.data.roles : [];
};

const loadChannels = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/channels`);
  if (!res?.ok) {
    channels.value = [];
    return;
  }
  channels.value = Array.isArray(res.data?.channels) ? res.data.channels : [];
};

const loadBirthdays = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/birthdays`);
  if (!res?.ok) {
    birthdays.value = [];
    return;
  }
  settings.enabled = Boolean(res.data?.settings?.enabled);
  settings.birthdayRoleId = String(res.data?.settings?.birthdayRoleId || "");
  settings.announceChannelId = String(res.data?.settings?.announceChannelId || "");
  settings.showAgeInList = Boolean(res.data?.settings?.showAgeInList ?? true);
  birthdays.value = Array.isArray(res.data?.birthdays) ? res.data.birthdays : [];
  await hydrateKnownMembers();
};

const loadAll = async () => {
  loading.value = true;
  statusMessage.value = "";
  await Promise.all([loadRoles(), loadChannels(), loadBirthdays()]);
  loading.value = false;
};

const saveSettingsAction = async () => {
  savingSettings.value = true;
  statusMessage.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/birthdays/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      enabled: settings.enabled,
      birthdayRoleId: settings.birthdayRoleId,
      announceChannelId: settings.announceChannelId,
      showAgeInList: settings.showAgeInList
    })
  });
  savingSettings.value = false;
  statusMessage.value = res?.ok ? "Parametres anniversaire sauvegardes." : "Echec de sauvegarde.";
  if (res?.ok) {
    settings.enabled = Boolean(res.data?.settings?.enabled);
    settings.birthdayRoleId = String(res.data?.settings?.birthdayRoleId || "");
    settings.announceChannelId = String(res.data?.settings?.announceChannelId || "");
    settings.showAgeInList = Boolean(res.data?.settings?.showAgeInList ?? true);
  }
};

const runMemberSearch = () => {
  if (skipMemberSearchOnce.value) {
    skipMemberSearchOnce.value = false;
    return;
  }
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const query = String(memberSearch.value || "").trim();
    if (query.length < 2) {
      searchResults.value = [];
      searchingMembers.value = false;
      return;
    }
    searchingMembers.value = true;
    const res = await fetchJson(
      `${config.public.apiBase}/api/guilds/${props.guildId}/members/search?q=${encodeURIComponent(query)}&limit=10`
    );
    searchingMembers.value = false;
    if (!res?.ok) {
      searchResults.value = [];
      return;
    }
    const members = Array.isArray(res.data?.members) ? res.data.members : [];
    const existingBirthdayUserIds = new Set(
      (birthdays.value || []).map((entry) => String(entry?.userId || "").trim()).filter(Boolean)
    );
    searchResults.value = members.filter((member) => {
      const id = String(member?.id || "").trim();
      if (!id) return false;
      return !existingBirthdayUserIds.has(id);
    });
    upsertMemberMap(members);
  }, 220);
};

const handleMemberSearchInput = () => {
  memberSearchOpen.value = true;
  runMemberSearch();
};

const selectMember = (member) => {
  const id = String(member?.id || "").trim();
  if (!id) return;
  selectedMemberId.value = id;
  upsertMemberMap([member]);
  memberSearch.value = member.displayName || member.username || id;
  searchResults.value = [];
  memberSearchOpen.value = false;
  skipMemberSearchOnce.value = true;
};

const clearEntryForm = () => {
  selectedMemberId.value = "";
  memberSearch.value = "";
  searchResults.value = [];
  memberSearchOpen.value = false;
  skipMemberSearchOnce.value = false;
  entryBirthDate.value = "";
};

const saveEntryAction = async () => {
  if (!selectedMemberId.value || !entryBirthDate.value) {
    statusMessage.value = "Selectionne un membre et une date.";
    return;
  }
  savingEntry.value = true;
  statusMessage.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/birthdays/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: selectedMemberId.value,
      birthDate: entryBirthDate.value
    })
  });
  savingEntry.value = false;
  if (!res?.ok) {
    statusMessage.value = "Impossible d'enregistrer cette date.";
    return;
  }
  statusMessage.value = "Date ajoutee.";
  clearEntryForm();
  await loadBirthdays();
};

const openEditModal = (entry) => {
  const userId = String(entry?.userId || "").trim();
  if (!userId) return;
  editUserId.value = userId;
  editMemberName.value = memberName(userId);
  editBirthDate.value = String(entry?.birthDate || "");
  editModalOpen.value = true;
};

const closeEditModal = () => {
  editModalOpen.value = false;
  editUserId.value = "";
  editMemberName.value = "";
  editBirthDate.value = "";
};

const saveEditEntryAction = async () => {
  if (!editUserId.value || !editBirthDate.value) {
    statusMessage.value = "Selectionne une date valide.";
    return;
  }
  savingEditEntry.value = true;
  statusMessage.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/birthdays/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: editUserId.value,
      birthDate: editBirthDate.value
    })
  });
  savingEditEntry.value = false;
  if (!res?.ok) {
    statusMessage.value = "Impossible de modifier cette date.";
    return;
  }
  statusMessage.value = "Date modifiee.";
  closeEditModal();
  await loadBirthdays();
};

const deleteBirthdayEntryAction = async (userId, memberLabel = "") => {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) return;
  const safeName = String(memberLabel || memberName(safeUserId) || safeUserId).trim();
  const confirmed = window.confirm(`Supprimer la date d'anniversaire de ${safeName} ?`);
  if (!confirmed) return;
  deletingUserId.value = safeUserId;
  statusMessage.value = "";
  const res = await fetchJson(
    `${config.public.apiBase}/api/guilds/${props.guildId}/birthdays/entries/${encodeURIComponent(safeUserId)}`,
    { method: "DELETE" }
  );
  deletingUserId.value = "";
  if (!res?.ok) {
    statusMessage.value = "Impossible de supprimer cette date.";
    return;
  }
  if (editUserId.value === safeUserId) {
    closeEditModal();
  }
  statusMessage.value = "Date supprimee.";
  await loadBirthdays();
};

const deleteEntryAction = async (entry) => {
  await deleteBirthdayEntryAction(entry?.userId, memberName(entry?.userId));
};

const deleteEntryFromModal = async () => {
  await deleteBirthdayEntryAction(editUserId.value, editMemberName.value);
};

const onMemberSearchPointerDown = (event) => {
  const root = memberSearchFieldRef.value;
  if (!root) return;
  if (root.contains(event?.target)) return;
  memberSearchOpen.value = false;
  searchResults.value = [];
};

const syncRolesAction = async () => {
  syncingRoles.value = true;
  statusMessage.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/birthdays/sync-role`, {
    method: "POST"
  });
  syncingRoles.value = false;
  if (!res?.ok) {
    statusMessage.value = "Synchronisation des roles anniversaire impossible.";
    return;
  }
  const details = res.data || {};
  statusMessage.value = `Sync terminee: +${Number(details.added || 0)} ajoutes, ${Number(details.removed || 0)} retires, ${Number(details.preexisting || 0)} deja presents, ${Number(details.failed || 0)} erreurs.`;
};

watch(
  () => props.guildId,
  () => {
    clearEntryForm();
    closeEditModal();
    loadAll();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener("pointerdown", onMemberSearchPointerDown);
  }
  if (searchTimer) clearTimeout(searchTimer);
});

onMounted(() => {
  if (!process.client) return;
  window.addEventListener("pointerdown", onMemberSearchPointerDown);
});
</script>

<style scoped>
.birthday-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.muted {
  color: var(--text-muted);
}

.small {
  font-size: 12px;
}

.birthday-hero {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 20px;
  padding: 18px;
  background:
    linear-gradient(148deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.26)),
    radial-gradient(circle at 12% 14%, rgba(245, 158, 11, 0.2), transparent 58%);
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  align-items: start;
}

.hero-main h3 {
  margin: 8px 0 0;
  line-height: 1.2;
}

.hero-main p {
  margin: 8px 0 0;
  max-width: 68ch;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(245, 158, 11, 0.42);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #fde68a;
}

.hero-stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(132px, 1fr));
}

.hero-stat {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-stat span {
  font-size: 12px;
  color: var(--text-muted);
}

.hero-stat strong {
  font-size: 1.05rem;
}

.hero-stat.is-active {
  border-color: rgba(16, 185, 129, 0.5);
  background: linear-gradient(150deg, rgba(16, 185, 129, 0.16), rgba(15, 23, 42, 0.36));
}

.hero-stat.is-inactive {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(150deg, rgba(239, 68, 68, 0.14), rgba(15, 23, 42, 0.36));
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.status-banner {
  border: 1px solid rgba(59, 130, 246, 0.32);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.12);
  color: #bfdbfe;
  font-size: 13px;
}

.birthday-dashboard {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
}

.birthday-main,
.birthday-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sub-card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.2));
}

.panel-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-head.compact {
  gap: 2px;
}

.panel-head h4 {
  margin: 0;
  line-height: 1.25;
}

.panel-head p {
  margin: 0;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.card-head h4 {
  margin: 0;
}

.card-head p {
  margin: 4px 0 0;
}

.switch-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.switch-row {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.switch {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  padding: 0;
  border: 0;
}

.slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
  transition: 0.2s;
}

.slider::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: 0.2s;
}

.switch input:checked + .slider {
  background: rgba(59, 130, 246, 0.9);
}

.switch input:checked + .slider::before {
  transform: translateX(18px);
}

.setting-grid,
.entry-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field > span {
  font-size: 13px;
  font-weight: 700;
}

.field-help {
  margin: 0;
  line-height: 1.35;
}

input,
select {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.32);
  color: inherit;
  padding: 10px 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.member-search-field {
  position: relative;
}

.member-search-state {
  margin-top: -2px;
}

.member-search-results {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  background: #0f172a;
  box-shadow: 0 12px 22px rgba(2, 6, 23, 0.45);
  max-height: 260px;
  overflow-y: auto;
  z-index: 10;
}

.member-result {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  text-align: left;
}

.member-result:hover {
  background: rgba(59, 130, 246, 0.14);
}

.member-result img,
.member-fallback {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.member-fallback {
  display: grid;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.34);
  background: rgba(15, 23, 42, 0.52);
  font-size: 12px;
  font-weight: 700;
}

.member-result-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.selected-member {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.34);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.selected-member.compact {
  padding: 10px 12px;
}

.actions-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.entry-actions {
  justify-content: flex-start;
}

.side-card {
  gap: 12px;
}

.sync-card {
  background:
    linear-gradient(160deg, rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.28)),
    radial-gradient(circle at 12% 12%, rgba(59, 130, 246, 0.16), transparent 55%);
}

.sync-list,
.info-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.birthday-list-card {
  gap: 14px;
}

.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.list-count {
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.36);
}

.state {
  border: 1px dashed rgba(148, 163, 184, 0.34);
  border-radius: 14px;
  padding: 14px;
}

.birthday-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.birthday-row {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  padding: 10px 12px;
  background:
    linear-gradient(160deg, rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.3)),
    radial-gradient(circle at 10% 12%, rgba(245, 158, 11, 0.14), transparent 56%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
}

.birthday-row-member {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.5);
  font-weight: 700;
  flex-shrink: 0;
}

.member-avatar.compact {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.birthday-row-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
}

.birthday-row-meta strong {
  color: #e2e8f0;
  font-weight: 700;
}

.birthday-row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
}

.birthday-edit-modal {
  position: fixed;
  inset: 0;
  z-index: 260;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.birthday-edit-modal-card {
  width: min(760px, 96vw);
  max-height: calc(100vh - 32px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.edit-modal-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

@media (max-width: 1100px) {
  .birthday-hero {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .birthday-dashboard {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-stats {
    grid-template-columns: 1fr;
  }

  .switch-row {
    align-items: flex-start;
  }

  .birthday-row {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .birthday-row-actions {
    justify-content: flex-start;
  }

  .birthday-row-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
