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

      <!-- Confirmation Twitch détecté -->
      <div v-if="pendingAccounts.length" class="confirm-box">
        <h2>Compte Twitch détecté</h2>
        <p v-if="pendingAccounts.length === 1">
          Nous avons détecté que le compte Twitch lié à Discord est
          <strong>@{{ pendingAccounts[0].login }}</strong>.
          Confirmes-tu ?
        </p>
        <p v-else>
          Plusieurs comptes Twitch sont liés à ton Discord. Choisis celui qui sera
          <strong>le seul</strong> utilisé par EcoBoty pour la monnaie virtuelle chez les streameurs.
        </p>

        <div v-if="pendingAccounts.length > 1" class="account-list">
          <label
            v-for="acc in pendingAccounts"
            :key="acc.id"
            class="account-option"
            :class="{ selected: selectedTwitchId === acc.id }"
          >
            <input v-model="selectedTwitchId" type="radio" name="twitch" :value="acc.id" />
            <span>@{{ acc.login }}</span>
          </label>
        </div>

        <p v-if="rejectMessage" class="warn">{{ rejectMessage }}</p>
        <p v-if="confirmError" class="warn">{{ confirmError }}</p>

        <div class="actions">
          <button
            type="button"
            class="btn primary"
            :disabled="confirmBusy || (pendingAccounts.length > 1 && !selectedTwitchId)"
            @click="confirmTwitch(true)"
          >
            {{ confirmBusy ? "Validation…" : "Oui, confirmer" }}
          </button>
          <button
            type="button"
            class="btn ghost"
            :disabled="confirmBusy"
            @click="confirmTwitch(false)"
          >
            Non
          </button>
        </div>
        <p class="hint">
          Ce Twitch sera le seul compte détecté par EcoBoty pour cumuler la monnaie chez tous les streameurs EcoBoty.
        </p>
      </div>

      <ol v-else-if="info" class="steps">
        <li :class="stepClass(1)">
          <div class="step-head">
            <span class="num">{{ step > 1 ? "✓" : "1" }}</span>
            <strong>Vérifie que ton Discord est lié à Twitch</strong>
          </div>
          <template v-if="step === 1">
            <p>
              Dans Discord → Paramètres → Connexions, ton compte Twitch doit apparaître.
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

        <li :class="stepClass(2)">
          <div class="step-head">
            <span class="num">{{ step > 2 ? "✓" : "2" }}</span>
            <strong>Lie ton Discord à EcoBoty</strong>
          </div>
          <template v-if="step === 2">
            <p>
              Une seule liaison pour tous les lives EcoBoty.
              On vérifie le Twitch connecté dans Discord, puis tu confirmes.
            </p>
            <p v-if="flowError" class="warn">{{ flowError }}</p>
            <p v-if="rejectMessage" class="warn">{{ rejectMessage }}</p>
            <p v-if="linked" class="ok">
              Compte lié
              <span v-if="confirmedLogin"> (@{{ confirmedLogin }})</span> ✓
            </p>
            <div v-else class="actions">
              <a
                v-if="oauthLink"
                class="btn primary"
                :href="oauthLink"
              >
                Lier mon Discord
              </a>
            </div>
            <p v-if="statusHint" class="hint">{{ statusHint }}</p>
          </template>
          <p v-else-if="step > 2" class="ok">
            Compte lié
            <span v-if="confirmedLogin"> (@{{ confirmedLogin }})</span> ✓
          </p>
          <p v-else class="muted-line">Valide d’abord l’étape 1.</p>
        </li>

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
const router = useRouter();
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
const flowError = ref("");
const confirmedLogin = ref("");
const pendingToken = ref("");
const pendingAccounts = ref([]);
const selectedTwitchId = ref("");
const rejectMessage = ref("");
const confirmError = ref("");
const confirmBusy = ref(false);
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

const fetchStatus = async (login = twitchLogin.value || confirmedLogin.value) => {
  const safe = String(login || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 25);
  if (!safe || !slug.value) return null;
  const res = await fetch(
    `${apiBase.value}/public/link/${encodeURIComponent(slug.value)}/status?twitch=${encodeURIComponent(safe)}`
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
    if (data.linked && !confirmedLogin.value) {
      confirmedLogin.value = String(twitchLogin.value || "");
    }
    if (!data.linked) {
      statusHint.value = "Compte pas encore lié. Clique sur « Lier mon Discord ».";
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
      if (data.linked && data.inGuild) stopPolling();
    } catch {
      // ignore
    }
  }, 4000);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const loadPending = async (token) => {
  const res = await fetch(
    `${apiBase.value}/public/link/pending?token=${encodeURIComponent(token)}`
  );
  if (!res.ok) {
    flowError.value = "Session de confirmation expirée. Relie à nouveau ton Discord.";
    return;
  }
  const data = await res.json();
  pendingToken.value = token;
  pendingAccounts.value = Array.isArray(data.accounts) ? data.accounts : [];
  selectedTwitchId.value = pendingAccounts.value[0]?.id || "";
  step1Done.value = true;
};

const confirmTwitch = async (accepted) => {
  if (!pendingToken.value || confirmBusy.value) return;
  confirmBusy.value = true;
  confirmError.value = "";
  rejectMessage.value = "";
  try {
    const body = accepted
      ? {
          token: pendingToken.value,
          action: "confirm",
          twitchId: selectedTwitchId.value || pendingAccounts.value[0]?.id
        }
      : { token: pendingToken.value, action: "reject" };
    const res = await fetch(`${apiBase.value}/public/link/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.error === "twitch_already_linked") {
        confirmError.value =
          "Ce Twitch est déjà lié à un autre Discord EcoBoty. Choisis un autre compte ou contacte le support.";
      } else {
        confirmError.value = "Impossible de valider. Réessaie.";
      }
      return;
    }
    if (data.rejected) {
      rejectMessage.value = String(
        data.message ||
          "Alors il faudra délier ton compte Twitch dans Discord (Paramètres → Connexions), puis le relier avec le bon compte, et recommencer."
      );
      pendingAccounts.value = [];
      pendingToken.value = "";
      return;
    }
    confirmedLogin.value = String(data.twitchLogin || "");
    linked.value = true;
    pendingAccounts.value = [];
    pendingToken.value = "";
    step1Done.value = true;
    await router.replace({
      path: confirmedLogin.value
        ? `/link/${slug.value}/${confirmedLogin.value}`
        : `/link/${slug.value}`,
      query: { done: "1" }
    });
    await refreshStatus();
    startPolling();
  } catch {
    confirmError.value = "Impossible de valider. Réessaie.";
  } finally {
    confirmBusy.value = false;
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
    const err = String(route.query.error || "");
    if (err === "no_twitch") {
      step1Done.value = true;
      flowError.value =
        "Aucun Twitch trouvé sur ton Discord. Relie Twitch dans Paramètres → Connexions, puis réessaie.";
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

    const pending = String(route.query.pending || "");
    if (pending) {
      await loadPending(pending);
      return;
    }

    if (twitchLogin.value || confirmedLogin.value) {
      await refreshStatus();
      if (String(route.query.done || "") === "1" || linked.value) {
        step1Done.value = true;
        if (linked.value) confirmedLogin.value = confirmedLogin.value || twitchLogin.value;
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
h2 {
  margin: 0 0 10px;
  font-size: 1.15rem;
}
.lead {
  margin: 0 0 22px;
  color: #9aa3b5;
  font-size: 0.95rem;
}
.lead.error {
  color: #f87171;
}
.confirm-box {
  border: 1px solid rgba(167, 139, 250, 0.45);
  background: rgba(124, 58, 237, 0.14);
  border-radius: 14px;
  padding: 16px;
}
.confirm-box p {
  margin: 0 0 12px;
  color: #b7bfd0;
  line-height: 1.45;
}
.account-list {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}
.account-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
}
.account-option.selected {
  border-color: rgba(167, 139, 250, 0.6);
  background: rgba(124, 58, 237, 0.18);
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
}
.hint {
  margin: 10px 0 0 !important;
  color: #9aa3b5 !important;
  font-size: 0.85rem !important;
}
</style>
