<template>
  <UCard class="card birthday-user">
    <section class="birthday-hero">
      <div class="hero-main">
        <span class="hero-kicker">MON COMPTE</span>
        <h3>Anniversaire</h3>
        <p class="muted">
          Ta date d'anniversaire sert aux annonces serveur et aux succes relies a l'anniversaire.
        </p>
      </div>

      <div class="hero-meta">
        <article class="hero-pill" :class="moduleEnabled ? 'on' : 'off'">
          <span>Module</span>
          <strong>{{ moduleEnabled ? "Actif" : "Inactif" }}</strong>
        </article>
        <article class="hero-pill" :class="entry ? 'on' : 'pending'">
          <span>Ton profil</span>
          <strong>{{ entry ? "Date enregistree" : "A completer" }}</strong>
        </article>
      </div>

      <div class="hero-actions">
        <UButton color="neutral" variant="outline" :loading="loading" @click="loadData">Actualiser</UButton>
      </div>
    </section>

    <div v-if="statusMessage" class="status-banner">{{ statusMessage }}</div>

    <div v-if="loading" class="state-card muted">Chargement...</div>

    <div v-else-if="!moduleEnabled" class="sub-card state-card muted">
      Le module anniversaire est desactive sur ce serveur.
    </div>

    <template v-else>
      <section class="content-grid">
        <article class="sub-card panel-card">
          <div class="panel-head">
            <h4>Mon anniversaire</h4>
            <span class="status-pill" :class="entry ? 'ok' : 'todo'">
              {{ entry ? "Enregistre" : "Non configure" }}
            </span>
          </div>

          <div v-if="entry" class="facts-grid">
            <div class="fact-item">
              <span class="fact-label">Date enregistree</span>
              <strong>{{ formatDate(entry.birthDate) }}</strong>
            </div>
            <div class="fact-item">
              <span class="fact-label">Prochain anniversaire</span>
              <strong>{{ formatDate(entry.nextBirthdayDate) }}</strong>
            </div>
            <div class="fact-item">
              <span class="fact-label">Compte a rebours</span>
              <strong>{{ daysUntilText(entry.daysUntil) }}</strong>
            </div>
            <div v-if="showAgeInList && hasAgeValue(entry.age)" class="fact-item">
              <span class="fact-label">Age affiche dans /anniversaire-list</span>
              <strong>{{ Number(entry.age) }}</strong>
            </div>
          </div>

          <div v-else class="empty-note muted">
            Aucune date enregistree pour le moment.
          </div>
        </article>

        <article class="sub-card panel-card" :class="entry ? 'lock-card' : 'setup-card'">
          <div class="panel-head">
            <h4>{{ entry ? "Date verrouillee" : "Ajouter ma date" }}</h4>
            <p class="muted small">
              {{
                entry
                  ? "Ta date est verrouillee apres validation. Seul un administrateur peut corriger ou supprimer ensuite."
                  : "Verifie bien ta date: une fois enregistree, tu ne pourras plus la modifier toi-meme."
              }}
            </p>
          </div>

          <template v-if="entry">
            <ul class="hint-list muted small">
              <li>En cas d'erreur, contacte un administrateur du serveur.</li>
              <li>Suppression de date: uniquement via un administrateur du serveur.</li>
              <li>Les modifications admin sont possibles depuis l'onglet Anniversaire.</li>
              <li>Le module respecte le fuseau horaire configure sur le bot.</li>
            </ul>
          </template>

          <template v-else>
            <div class="warning-banner">Attention: cette action est definitive une fois validee.</div>

            <div class="form-grid">
              <label class="field">
                <span>Date d'anniversaire</span>
                <input v-model="birthDate" type="date" />
              </label>
            </div>

            <div class="actions-inline">
              <UButton color="primary" :loading="saving" @click="saveAction">Enregistrer ma date</UButton>
            </div>
          </template>
        </article>
      </section>
    </template>
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
const saving = ref(false);
const moduleEnabled = ref(false);
const showAgeInList = ref(true);
const entry = ref(null);
const birthDate = ref("");
const statusMessage = ref("");

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

const formatDate = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw || "-";
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const hasAgeValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
};

const daysUntilText = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const days = Number(value);
  if (!Number.isFinite(days)) return "-";
  if (days <= 0) return "Aujourd'hui";
  return `Dans ${Math.floor(days)} jour(s)`;
};

const loadData = async () => {
  loading.value = true;
  statusMessage.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${props.guildId}/birthday`);
  loading.value = false;
  if (!res?.ok) {
    moduleEnabled.value = false;
    entry.value = null;
    birthDate.value = "";
    return;
  }
  moduleEnabled.value = Boolean(res.data?.settings?.enabled);
  showAgeInList.value = Boolean(res.data?.settings?.showAgeInList ?? true);
  entry.value = res.data?.entry || null;
  birthDate.value = entry.value?.birthDate ? String(entry.value.birthDate) : "";
};

const saveAction = async () => {
  if (!birthDate.value) {
    statusMessage.value = "Selectionne une date valide.";
    return;
  }
  saving.value = true;
  statusMessage.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${props.guildId}/birthday`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ birthDate: birthDate.value })
  });
  saving.value = false;
  if (!res?.ok) {
    if (String(res?.data?.error || "") === "birthday_user_locked") {
      statusMessage.value = "Date deja enregistree. Contacte un administrateur pour la corriger.";
      await loadData();
      return;
    }
    statusMessage.value = "Impossible d'enregistrer ta date.";
    return;
  }
  statusMessage.value = "Date d'anniversaire enregistree.";
  entry.value = res.data?.entry || null;
  birthDate.value = entry.value?.birthDate ? String(entry.value.birthDate) : birthDate.value;
  moduleEnabled.value = Boolean(res.data?.settings?.enabled ?? moduleEnabled.value);
  showAgeInList.value = Boolean(res.data?.settings?.showAgeInList ?? showAgeInList.value);
};

watch(
  () => props.guildId,
  () => {
    loadData();
  },
  { immediate: true }
);
</script>

<style scoped>
.birthday-user {
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
  padding: 16px;
  background:
    linear-gradient(150deg, rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.24)),
    radial-gradient(circle at 10% 12%, rgba(59, 130, 246, 0.2), transparent 56%);
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(240px, 1fr) auto auto;
  align-items: start;
}

.hero-main h3 {
  margin: 8px 0 0;
}

.hero-main p {
  margin: 8px 0 0;
  max-width: 60ch;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(59, 130, 246, 0.42);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #bfdbfe;
}

.hero-meta {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
}

.hero-pill {
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 12px;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-pill span {
  font-size: 12px;
  color: var(--text-muted);
}

.hero-pill strong {
  font-size: 0.95rem;
}

.hero-pill.on {
  border-color: rgba(16, 185, 129, 0.5);
}

.hero-pill.off {
  border-color: rgba(239, 68, 68, 0.4);
}

.hero-pill.pending {
  border-color: rgba(245, 158, 11, 0.45);
}

.hero-actions {
  display: flex;
}

.status-banner {
  border: 1px solid rgba(59, 130, 246, 0.32);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.12);
  color: #bfdbfe;
  font-size: 13px;
}

.sub-card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.2));
}

.panel-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-head h4 {
  margin: 0;
  line-height: 1.25;
}

.panel-head p {
  margin: 6px 0 0;
}

.status-pill {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill.ok {
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.48);
  background: rgba(16, 185, 129, 0.14);
}

.status-pill.todo {
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.48);
  background: rgba(245, 158, 11, 0.14);
}

.content-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.facts-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.fact-item {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fact-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.fact-item strong {
  font-size: 14px;
}

.empty-note {
  border: 1px dashed rgba(148, 163, 184, 0.32);
  border-radius: 12px;
  padding: 12px;
}

.setup-card {
  background:
    linear-gradient(150deg, rgba(15, 23, 42, 0.58), rgba(15, 23, 42, 0.24)),
    radial-gradient(circle at 88% 12%, rgba(245, 158, 11, 0.16), transparent 55%);
}

.lock-card {
  background:
    linear-gradient(150deg, rgba(15, 23, 42, 0.58), rgba(15, 23, 42, 0.24)),
    radial-gradient(circle at 88% 12%, rgba(59, 130, 246, 0.16), transparent 55%);
  border-color: rgba(59, 130, 246, 0.34);
}

.hint-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-banner {
  border: 1px solid rgba(245, 158, 11, 0.38);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.12);
  color: #fde68a;
  font-size: 13px;
}

.form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(220px, 340px);
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

input {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.32);
  color: inherit;
  padding: 10px 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.actions-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.state-card {
  border: 1px dashed rgba(148, 163, 184, 0.34);
  border-radius: 14px;
  padding: 14px;
}

@media (max-width: 1080px) {
  .birthday-hero {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-meta {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
