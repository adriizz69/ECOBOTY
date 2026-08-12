<template>
  <div class="link-page">
    <div class="link-shell">
      <p class="brand">EcoBoty</p>
      <h1>{{ done ? "C’est bon !" : "Lie ton Twitch à EcoBoty" }}</h1>
      <p v-if="info" class="lead">
        Serveur <strong>{{ info.guildName }}</strong>
        <span v-if="info.streamerLogin"> · live <strong>@{{ info.streamerLogin }}</strong></span>
      </p>
      <p v-else-if="loading" class="lead">Chargement…</p>
      <p v-else class="lead error">{{ error || "Lien introuvable." }}</p>

      <ol v-if="info" class="steps">
        <li :class="{ done: step > 1, current: step === 1 }">
          <div class="step-head">
            <span class="num">1</span>
            <strong>Étape 1 — Vérifie que ton Discord est bien lié à Twitch</strong>
          </div>
          <p>
            Dans Discord → Paramètres → Connexions, ton compte Twitch doit apparaître.
          </p>
          <a
            class="btn ghost"
            :href="info.connectionsTutorialUrl"
            target="_blank"
            rel="noreferrer"
          >
            Voir le tuto Discord
          </a>
        </li>

        <li :class="{ done: step > 2, current: step === 2 }">
          <div class="step-head">
            <span class="num">2</span>
            <strong>Étape 2 — Lie ton Discord à EcoBoty</strong>
          </div>
          <p>
            Une seule liaison pour tout EcoBoty (tous les streameurs / serveurs).
            <span v-if="twitchLogin">
              On vérifie que c’est bien le Twitch <strong>@{{ twitchLogin }}</strong>.
            </span>
          </p>
          <a
            v-if="!done && info.linkUrl"
            class="btn primary"
            :href="info.linkUrl"
          >
            Lier mon Discord
          </a>
          <p v-else-if="done" class="ok">Discord déjà lié à EcoBoty ✓</p>
          <p v-else class="warn">Ouvre le lien depuis le chat Twitch pour identifier ton pseudo.</p>
        </li>

        <li :class="{ done: step > 3, current: step === 3 }">
          <div class="step-head">
            <span class="num">3</span>
            <strong>Étape 3 — Rejoins le Discord du streameur</strong>
          </div>
          <p>Entre sur le serveur pour débloquer les récompenses.</p>
          <a
            v-if="info.discordInvite"
            class="btn primary"
            :href="info.discordInvite"
            target="_blank"
            rel="noreferrer"
          >
            Rejoindre {{ info.guildName }}
          </a>
          <p v-else class="warn">Pas d’invitation Discord configurée pour ce serveur.</p>
        </li>

        <li :class="{ done: done, current: step === 4 }">
          <div class="step-head">
            <span class="num">4</span>
            <strong>C’est bon — valide ta récompense</strong>
          </div>
          <p v-if="done">
            Maintenant tape <code>!daily</code> dans le tchat de
            <strong>@{{ info.streamerLogin || "le streameur" }}</strong>
            pour valider ta première récompense Twitch
            <span v-if="info.currency">({{ info.currency }})</span>.
          </p>
          <p v-else>
            Une fois les étapes 1–3 faites, retourne sur le live et tape
            <code>!daily</code>.
          </p>
          <a
            v-if="info.streamerLogin"
            class="btn ghost"
            :href="`https://www.twitch.tv/${info.streamerLogin}`"
            target="_blank"
            rel="noreferrer"
          >
            Retourner sur le live
          </a>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup>
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
const done = computed(() => String(route.query.done || "") === "1");

const info = ref(null);
const loading = ref(true);
const error = ref("");

const step = computed(() => {
  if (done.value) return 4;
  if (info.value?.linkUrl) return 2;
  return 1;
});

const apiBase = computed(() => String(config.public.apiBase || "").replace(/\/$/, ""));

onMounted(async () => {
  loading.value = true;
  error.value = "";
  try {
    const qs = twitchLogin.value ? `?twitch=${encodeURIComponent(twitchLogin.value)}` : "";
    const res = await fetch(`${apiBase.value}/public/link/${encodeURIComponent(slug.value)}${qs}`);
    if (!res.ok) {
      error.value = res.status === 404 ? "Ce lien ne correspond à aucun serveur." : "Impossible de charger le lien.";
      info.value = null;
      return;
    }
    info.value = await res.json();
  } catch {
    error.value = "Impossible de charger le lien.";
    info.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.link-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.25), transparent),
    #0b0d12;
  color: #e8eaf0;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.link-shell {
  width: min(640px, 100%);
  background: rgba(18, 20, 28, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 28px 24px 32px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}
.brand {
  margin: 0 0 8px;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a78bfa;
}
h1 {
  margin: 0 0 8px;
  font-size: 1.65rem;
  line-height: 1.2;
}
.lead {
  margin: 0 0 24px;
  color: #9aa3b5;
}
.lead.error {
  color: #f87171;
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.steps li {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  opacity: 0.72;
}
.steps li.current,
.steps li.done {
  opacity: 1;
}
.steps li.current {
  border-color: rgba(167, 139, 250, 0.45);
  background: rgba(124, 58, 237, 0.12);
}
.step-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.num {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #7c3aed;
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
}
.steps p {
  margin: 0 0 12px;
  color: #b7bfd0;
  font-size: 0.95rem;
  line-height: 1.45;
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
  font-weight: 600;
  font-size: 0.95rem;
}
.btn.primary {
  background: #7c3aed;
  color: white;
}
.btn.ghost {
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #e8eaf0;
}
.ok {
  color: #34d399 !important;
}
.warn {
  color: #fbbf24 !important;
}
</style>
