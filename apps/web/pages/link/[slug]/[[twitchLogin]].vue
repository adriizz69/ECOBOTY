<template>
  <div class="link-page">
    <div class="link-shell">
      <h1>{{ allDone ? "C’est bon !" : "Lie ton Twitch à EcoBoty" }}</h1>
      <p v-if="info && !loading" class="lead">
        <template v-if="info.streamerLogin">Live <strong>@{{ info.streamerLogin }}</strong></template>
        <template v-if="info.guildName">
          <span v-if="info.streamerLogin"> · </span>
          {{ info.guildName }}
        </template>
      </p>
      <p v-else-if="loading" class="lead">Chargement…</p>
      <p v-else class="lead error">{{ error || "Lien introuvable." }}</p>

      <ol v-if="info" class="steps">
        <!-- Étape 1 -->
        <li :class="stepClass(1)">
          <div class="step-head">
            <span class="num">{{ step > 1 ? "✓" : "1" }}</span>
            <strong>Vérifie que ton Discord est lié à Twitch</strong>
          </div>
          <template v-if="step === 1">
            <p>
              Dans Discord → Paramètres → Connexions, ton compte Twitch doit apparaître
              <span v-if="twitchLogin">(<strong>@{{ twitchLogin }}</strong>)</span>.
            </p>
            <div class="actions">
              <a
                class="btn ghost"
                :href="info.connectionsTutorialUrl"
                target="_blank"
                rel="noreferrer"
              >
                Voir le tuto
              </a>
              <button type="button" class="btn primary" @click="markStep1Done">
                C’est fait
              </button>
            </div>
          </template>
          <p v-else class="ok">Étape validée</p>
        </li>

        <!-- Étape 2 -->
        <li :class="stepClass(2)">
          <div class="step-head">
            <span class="num">{{ step > 2 ? "✓" : "2" }}</span>
            <strong>Lie ton Discord à EcoBoty</strong>
          </div>
          <template v-if="step === 2">
            <p>
              Une seule liaison pour tous les lives EcoBoty.
              <span v-if="twitchLogin">
                On vérifie le Twitch <strong>@{{ twitchLogin }}</strong>.
              </span>
            </p>
            <p v-if="linked" class="ok">Compte déjà lié ✓</p>
            <div v-else class="actions">
              <a
                v-if="oauthLink"
                class="btn primary"
                :href="oauthLink"
                target="_blank"
                rel="noreferrer"
                @click="onOauthOpened"
              >
                Lier mon Discord
              </a>
              <p v-else class="warn">
                Ouvre ce lien depuis le chat Twitch pour identifier ton pseudo.
              </p>
              <button
                v-if="oauthLink"
                type="button"
                class="btn ghost"
                :disabled="statusChecking"
                @click="refreshStatus"
              >
                {{ statusChecking ? "Vérification…" : "J’ai terminé" }}
              </button>
            </div>
            <p v-if="statusHint" class="hint">{{ statusHint }}</p>
          </template>
          <p v-else-if="step > 2" class="ok">Compte lié ✓</p>
          <p v-else class="muted-line">Valide d’abord l’étape 1.</p>
        </li>

        <!-- Étape 3 -->
        <li :class="stepClass(3)">
          <div class="step-head">
            <span class="num">{{ step > 3 ? "✓" : "3" }}</span>
            <strong>Rejoins le Discord</strong>
          </div>
          <template v-if="step === 3">
            <p>
              Entre sur le serveur
              <strong>{{ info.guildName }}</strong>
              pour débloquer les récompenses.
            </p>
            <p v-if="inGuild" class="ok">Tu es bien sur le serveur ✓</p>
            <div v-else class="actions">
              <a
                v-if="info.discordInvite"
                class="btn primary"
                :href="info.discordInvite"
                target="_blank"
                rel="noreferrer"
              >
                Rejoindre le Discord
              </a>
              <p v-else class="warn">Pas d’invitation Discord configurée pour ce serveur.</p>
              <button
                type="button"
                class="btn ghost"
                :disabled="statusChecking"
                @click="refreshStatus"
              >
                {{ statusChecking ? "Vérification…" : "Vérifier" }}
              </button>
            </div>
            <p v-if="membershipHint" class="hint">{{ membershipHint }}</p>
          </template>
          <p v-else-if="step > 3" class="ok">Présent sur le serveur ✓</p>
          <p v-else class="muted-line">Complète d’abord la liaison.</p>
        </li>

        <!-- Étape 4 -->
        <li :class="stepClass(4)">
          <div class="step-head">
            <span class="num">{{ allDone ? "✓" : "4" }}</span>
            <strong>Valide ta récompense</strong>
          </div>
          <template v-if="step === 4">
            <p>
              Maintenant tape <code>!daily</code> dans le tchat
              <strong v-if="info.streamerLogin">@{{ info.streamerLogin }}</strong>
              <span v-else>du streameur</span>
              <span v-if="info.currency"> ({{ info.currency }})</span>.
            </p>
            <div class="actions">
              <a
                v-if="info.streamerLogin"
                class="btn primary"
                :href="`https://www.twitch.tv/${info.streamerLogin}`"
                target="_blank"
                rel="noreferrer"
              >
                Retourner sur le live
              </a>
            </div>
          </template>
          <p v-else class="muted-line">Presque fini — termine les étapes précédentes.</p>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false
});

useHead({
  title: "Lie ton Twitch",
  meta: [{ name: "robots", content: "noindex,nofollow" }]
});

const route = useRoute();
const config = useRuntimeConfig();

const slug = computed(() => String(route.params.slug || "").trim().toLowerCase());
const twitchLogin = computed(() => {
  const fromParam = String(route.params.twitchLogin || "").trim().toLowerCase();
  if (fromParam) return fromParam.replace(/[^a-z0-9_]/g, "").slice(0, 25);
  return String(route.query.twitch || route.query.u || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 25);
});

const info = ref(null);
const loading = ref(true);
const error = ref("");
const step1Done = ref(false);
const linked = ref(false);
const inGuild = ref(false);
const statusChecking = ref(false);
const statusHint = ref("");
const membershipHint = ref("");
const oauthOpened = ref(false);
let pollTimer = null;

const apiBase = computed(() => String(config.public.apiBase || "").replace(/\/$/, ""));

const oauthLink = computed(() => {
  const raw = String(info.value?.linkUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }
  const site = String(config.public.baseUrl || "").replace(/\/$/, "");
  return site ? `${site}${raw.startsWith("/") ? raw : `/${raw}`}` : raw;
});

const step = computed(() => {
  if (linked.value && inGuild.value) return 4;
  if (linked.value) return 3;
  if (step1Done.value) return 2;
  return 1;
});

const allDone = computed(() => step.value === 4);

const stepClass = (n) => ({
  done: step.value > n,
  current: step.value === n
});

const storageKey = computed(
  () => `ecoboty_link_step1_${slug.value}_${twitchLogin.value || "anon"}`
);

const markStep1Done = () => {
  step1Done.value = true;
  try {
    sessionStorage.setItem(storageKey.value, "1");
  } catch {
    // ignore
  }
};

const onOauthOpened = () => {
  oauthOpened.value = true;
  statusHint.value = "Termine la connexion dans le nouvel onglet, puis clique sur « J’ai terminé ».";
  startPolling();
};

const fetchStatus = async () => {
  if (!twitchLogin.value || !slug.value) return null;
  const res = await fetch(
    `${apiBase.value}/public/link/${encodeURIComponent(slug.value)}/status?twitch=${encodeURIComponent(twitchLogin.value)}`
  );
  if (!res.ok) return null;
  return res.json();
};

const refreshStatus = async () => {
  statusChecking.value = true;
  statusHint.value = "";
  membershipHint.value = "";
  try {
    const data = await fetchStatus();
    if (!data) {
      statusHint.value = "Impossible de vérifier pour le moment. Réessaie dans quelques secondes.";
      return;
    }
    linked.value = Boolean(data.linked);
    inGuild.value = Boolean(data.inGuild);
    if (!data.linked) {
      statusHint.value = oauthOpened.value
        ? "Liaison pas encore détectée. Termine Discord dans l’autre onglet, puis réessaie."
        : "Compte pas encore lié. Clique sur « Lier mon Discord ».";
    } else if (!data.inGuild) {
      membershipHint.value =
        data.membershipChecked === false
          ? "Liaison OK. Rejoins le Discord puis clique sur Vérifier."
          : "Tu n’es pas encore détecté sur le serveur. Rejoins-le puis vérifie à nouveau.";
    }
  } catch {
    statusHint.value = "Impossible de vérifier pour le moment.";
  } finally {
    statusChecking.value = false;
  }
};

const startPolling = () => {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (linked.value && inGuild.value) {
      stopPolling();
      return;
    }
    try {
      const data = await fetchStatus();
      if (!data) return;
      linked.value = Boolean(data.linked);
      inGuild.value = Boolean(data.inGuild);
      if (data.linked && step.value === 2) {
        statusHint.value = "Compte lié ✓";
      }
      if (data.linked && data.inGuild) {
        stopPolling();
      }
    } catch {
      // ignore poll errors
    }
  }, 4000);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

onMounted(async () => {
  loading.value = true;
  error.value = "";
  try {
    try {
      if (sessionStorage.getItem(storageKey.value) === "1") {
        step1Done.value = true;
      }
    } catch {
      // ignore
    }
    if (String(route.query.done || "") === "1") {
      step1Done.value = true;
    }

    const qs = twitchLogin.value ? `?twitch=${encodeURIComponent(twitchLogin.value)}` : "";
    const res = await fetch(`${apiBase.value}/public/link/${encodeURIComponent(slug.value)}${qs}`);
    if (!res.ok) {
      error.value =
        res.status === 404 ? "Ce lien ne correspond à aucun serveur." : "Impossible de charger le lien.";
      info.value = null;
      return;
    }
    info.value = await res.json();

    if (twitchLogin.value) {
      await refreshStatus();
      if (String(route.query.done || "") === "1" || linked.value) {
        step1Done.value = true;
        startPolling();
      }
    }
  } catch {
    error.value = "Impossible de charger le lien.";
    info.value = null;
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<style scoped>
.link-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 28px 16px;
  background:
    radial-gradient(ellipse 70% 45% at 50% -10%, rgba(124, 58, 237, 0.28), transparent 60%),
    #0b0d12;
  color: #e8eaf0;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.link-shell {
  width: min(560px, 100%);
  background: rgba(18, 20, 28, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 28px 22px 30px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}
h1 {
  margin: 0 0 8px;
  font-size: clamp(1.35rem, 4vw, 1.7rem);
  line-height: 1.2;
  font-weight: 750;
}
.lead {
  margin: 0 0 22px;
  color: #9aa3b5;
  font-size: 0.95rem;
}
.lead.error {
  color: #f87171;
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.steps li {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  opacity: 0.55;
  transition: opacity 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.steps li.current,
.steps li.done {
  opacity: 1;
}
.steps li.current {
  border-color: rgba(167, 139, 250, 0.5);
  background: rgba(124, 58, 237, 0.14);
}
.steps li.done {
  border-color: rgba(52, 211, 153, 0.28);
  background: rgba(52, 211, 153, 0.06);
}
.step-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.num {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #7c3aed;
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
}
.steps li.done .num {
  background: #059669;
}
.steps p {
  margin: 0 0 12px;
  color: #b7bfd0;
  font-size: 0.94rem;
  line-height: 1.45;
}
.muted-line {
  margin: 0 !important;
  color: #6b7280 !important;
  font-size: 0.88rem !important;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 6px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 650;
  font-size: 0.92rem;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn.primary {
  background: #7c3aed;
  color: white;
}
.btn.ghost {
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #e8eaf0;
  background: transparent;
}
.ok {
  color: #34d399 !important;
  margin-bottom: 0 !important;
}
.warn {
  color: #fbbf24 !important;
  margin: 0 !important;
}
.hint {
  margin: 10px 0 0 !important;
  color: #9aa3b5 !important;
  font-size: 0.85rem !important;
}
</style>
