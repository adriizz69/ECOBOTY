<template>
  <main class="landing">
    <section class="hero">
      <div class="hero-content">
        <UBadge class="pill" variant="soft" color="primary">{{ $t("landing.pill") }}</UBadge>
        <h1>{{ $t("landing.title") }}</h1>
        <p>
          {{ $t("landing.subtitle") }}
        </p>

        <div class="actions">
          <UButton v-if="!isLoggedIn" color="primary" @click="login">{{ $t("landing.login") }}</UButton>
          <UButton v-if="isLoggedIn" color="neutral" variant="outline" to="/servers">
            {{ $t("landing.servers") }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            :to="inviteUrl"
            external
            target="_blank"
            rel="noreferrer"
          >
            {{ $t("landing.addBot") }}
          </UButton>
        </div>

        <div class="badges">
          <UBadge color="neutral" variant="outline">Discord.js v14</UBadge>
          <UBadge color="neutral" variant="outline">Nuxt 4</UBadge>
          <UBadge color="neutral" variant="outline">MySQL</UBadge>
          <UBadge color="neutral" variant="outline">Twitch</UBadge>
        </div>
      </div>
      <div class="hero-visual">
        <img src="/landing-hero.svg" :alt="$t('landing.heroAlt')" />
      </div>
    </section>

    <section class="features">
      <div class="section-head">
        <h2>{{ $t("landing.featuresTitle") }}</h2>
        <p>{{ $t("landing.featuresSubtitle") }}</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card">
          <div class="icon purple">💸</div>
          <h3>{{ $t("landing.feature1.title") }}</h3>
          <p>{{ $t("landing.feature1.text") }}</p>
        </article>
        <article class="feature-card">
          <div class="icon green">🎮</div>
          <h3>{{ $t("landing.feature2.title") }}</h3>
          <p>{{ $t("landing.feature2.text") }}</p>
        </article>
        <article class="feature-card">
          <div class="icon blue">📊</div>
          <h3>{{ $t("landing.feature3.title") }}</h3>
          <p>{{ $t("landing.feature3.text") }}</p>
        </article>
        <article class="feature-card">
          <div class="icon amber">🛒</div>
          <h3>{{ $t("landing.feature4.title") }}</h3>
          <p>{{ $t("landing.feature4.text") }}</p>
        </article>
        <article class="feature-card">
          <div class="icon cyan">🎥</div>
          <h3>{{ $t("landing.feature5.title") }}</h3>
          <p>{{ $t("landing.feature5.text") }}</p>
        </article>
        <article class="feature-card">
          <div class="icon pink">🧩</div>
          <h3>{{ $t("landing.feature6.title") }}</h3>
          <p>{{ $t("landing.feature6.text") }}</p>
        </article>
      </div>
    </section>

    <section class="split">
      <div class="split-content">
        <h2>{{ $t("landing.splitTitle") }}</h2>
        <p>
          {{ $t("landing.splitText") }}
        </p>
        <ul>
          <li>{{ $t("landing.splitItem1") }}</li>
          <li>{{ $t("landing.splitItem2") }}</li>
          <li>{{ $t("landing.splitItem3") }}</li>
        </ul>
      </div>
      <div class="split-visual">
        <img src="/landing-features.svg" :alt="$t('landing.splitAlt')" />
      </div>
    </section>

    <section class="cta">
      <div>
        <h2>{{ $t("landing.ctaTitle") }}</h2>
        <p>{{ $t("landing.ctaText") }}</p>
      </div>
      <div class="actions">
        <UButton v-if="!isLoggedIn" color="primary" @click="login">{{ $t("landing.start") }}</UButton>
        <UButton v-if="isLoggedIn" color="neutral" variant="outline" to="/servers">
          {{ $t("landing.servers") }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          :to="inviteUrl"
          external
          target="_blank"
          rel="noreferrer"
        >
          {{ $t("landing.addBot") }}
        </UButton>
      </div>
    </section>

    <footer class="legal">
      <div class="legal-inner">
        <NuxtLink class="legal-link" to="/mentions-legales">{{ $t("landing.legal") }}</NuxtLink>
        <NuxtLink class="legal-link" to="/conditions">{{ $t("landing.terms") }}</NuxtLink>
        <NuxtLink class="legal-link" to="/confidentialite">{{ $t("landing.privacy") }}</NuxtLink>
      </div>
    </footer>
  </main>
</template>

<script setup>
const config = useRuntimeConfig();
const router = useRouter();

const inviteUrl = computed(() => {
  const clientId = config.public.discordClientId || "CLIENT_ID";
  const permissions = "9";
  const scopes = "bot%20applications.commands";
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
});

const { getToken, login, logout } = useAuth();
const isLoggedIn = ref(false);

onMounted(async () => {
  const token = getToken();
  isLoggedIn.value = Boolean(token);
  if (!token) return;

  try {
    const res = await fetch(`${config.public.apiBase}/api/servers`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      router.push("/servers");
      return;
    }

    if (res.status === 401) {
      logout();
      isLoggedIn.value = false;
    }
  } catch {
    // ignore
  }
});
</script>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  gap: 96px;
}
.hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 48px;
  align-items: center;
}
.hero-content h1 {
  font-size: clamp(36px, 4vw, 54px);
  margin: 12px 0 16px;
}
.hero-content p {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 24px;
  color: var(--text-soft);
}
.hero-visual img {
  width: 100%;
  border-radius: 28px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.pill {
  font-size: 12px;
  font-weight: 600;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}
.badges {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.badges span {
  font-size: 12px;
}
.features {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.section-head h2 {
  margin: 0 0 8px;
  font-size: clamp(28px, 3vw, 36px);
}
.section-head p {
  color: var(--text-muted);
  margin: 0;
}
.feature-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}
.feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 180px;
}
.feature-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.feature-card h3 {
  margin: 0;
}
.feature-card p {
  color: var(--text-soft);
  margin: 0;
}
.icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: var(--border);
}
.icon.purple {
  background: rgba(124, 58, 237, 0.2);
}
.icon.green {
  background: rgba(34, 197, 94, 0.2);
}
.icon.blue {
  background: rgba(37, 99, 235, 0.2);
}
.icon.amber {
  background: rgba(251, 191, 36, 0.2);
}
.icon.cyan {
  background: rgba(34, 211, 238, 0.2);
}
.icon.pink {
  background: rgba(236, 72, 153, 0.2);
}
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
}
.split-content h2 {
  margin: 0 0 12px;
}
.split-content p {
  color: var(--text-soft);
  line-height: 1.6;
}
.split-content ul {
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--text-muted);
  display: grid;
  gap: 8px;
}
.split-visual img {
  width: 100%;
  border-radius: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.cta {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 32px;
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
}
.cta h2 {
  margin: 0 0 8px;
}
.cta p {
  color: var(--text-soft);
  margin: 0;
}


:global(body.theme-light) .hero-visual img,
:global(html.light body) .hero-visual img,
:global(body.theme-light) .split-visual img,
:global(html.light body) .split-visual img {
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

:global(body.theme-light) .feature-card,
:global(html.light body) .feature-card,
:global(body.theme-light) .cta,
:global(html.light body) .cta {
  background: var(--surface);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

:global(body.theme-light) .icon,
:global(html.light body) .icon {
  background: var(--surface-2);
}

:global(body.theme-light) .legal,
:global(html.light body) .legal {
  border-top-color: var(--border-strong);
}
.legal {
  border-top: 1px solid var(--border);
  padding-top: 24px;
  color: var(--text-muted);
  font-size: 13px;
}
.legal-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}
.legal-link {
  color: var(--text-soft);
  text-decoration: none;
  font-weight: 600;
}
.legal-link:hover {
  color: var(--text);
}
@media (max-width: 1000px) {
  .hero,
  .split {
    grid-template-columns: 1fr;
  }
  .hero-visual,
  .split-visual {
    order: -1;
  }
}
@media (max-width: 640px) {
  .landing {
    gap: 64px;
  }
  .hero-content p {
    font-size: 16px;
  }
  .cta {
    padding: 24px;
  }
}
</style>
