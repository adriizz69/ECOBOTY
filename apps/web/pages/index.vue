<template>
  <main class="landing">
    <section class="hero">
      <div class="hero-bg" aria-hidden="true">
        <span class="blob b1" />
        <span class="blob b2" />
        <span class="blob b3" />
      </div>
      <div class="hero-grid">
        <div class="hero-copy">
          <div class="brand-row eb-fade-up">
            <img src="/logo.png" alt="EcoBoty" class="brand-logo" />
            <p class="brand">ECOBOTY</p>
          </div>
          <h1 class="eb-fade-up-delay">{{ $t("landing.title") }}</h1>
          <p class="lede eb-fade-up-delay-2">{{ $t("landing.subtitle") }}</p>
          <div class="actions eb-fade-up-delay-2">
            <UButton v-if="!isLoggedIn" size="xl" color="primary" icon="i-lucide-log-in" @click="login">
              {{ $t("landing.login") }}
            </UButton>
            <UButton v-else size="xl" color="primary" icon="i-lucide-server" to="/servers">
              {{ $t("landing.servers") }}
            </UButton>
            <UButton
              size="xl"
              color="neutral"
              variant="outline"
              icon="i-lucide-bot"
              :to="inviteUrl"
              external
              target="_blank"
              rel="noreferrer"
            >
              {{ $t("landing.addBot") }}
            </UButton>
          </div>
        </div>
        <div class="hero-visual eb-fade-up-delay">
          <img src="/landing-hero.svg" :alt="$t('landing.heroAlt')" class="hero-img" />
        </div>
      </div>
    </section>

    <section class="section focus focus--economy">
      <div class="focus-copy">
        <p class="eb-kicker">{{ $t("landing.focusEconomy.kicker") }}</p>
        <h2>{{ $t("landing.focusEconomy.title") }}</h2>
        <p class="eb-muted">{{ $t("landing.focusEconomy.text") }}</p>
        <ul class="focus-list">
          <li>{{ $t("landing.focusEconomy.item1") }}</li>
          <li>{{ $t("landing.focusEconomy.item2") }}</li>
          <li>{{ $t("landing.focusEconomy.item3") }}</li>
        </ul>
      </div>
      <figure class="focus-media">
        <img src="/docs/admin-economie.png" :alt="$t('landing.focusEconomy.alt')" loading="lazy" />
      </figure>
    </section>

    <section class="section focus focus--ui focus--reverse">
      <div class="focus-copy">
        <p class="eb-kicker">{{ $t("landing.focusUi.kicker") }}</p>
        <h2>{{ $t("landing.focusUi.title") }}</h2>
        <p class="eb-muted">{{ $t("landing.focusUi.text") }}</p>
        <ul class="focus-list">
          <li>{{ $t("landing.focusUi.item1") }}</li>
          <li>{{ $t("landing.focusUi.item2") }}</li>
          <li>{{ $t("landing.focusUi.item3") }}</li>
        </ul>
      </div>
      <figure class="focus-media">
        <img src="/docs/user-home.png" :alt="$t('landing.focusUi.alt')" loading="lazy" />
      </figure>
    </section>

    <section class="section focus focus--twitch">
      <div class="focus-copy">
        <p class="eb-kicker">{{ $t("landing.focusTwitch.kicker") }}</p>
        <h2>{{ $t("landing.focusTwitch.title") }}</h2>
        <p class="eb-muted">{{ $t("landing.focusTwitch.text") }}</p>
        <ul class="focus-list">
          <li>{{ $t("landing.focusTwitch.item1") }}</li>
          <li>{{ $t("landing.focusTwitch.item2") }}</li>
          <li>{{ $t("landing.focusTwitch.item3") }}</li>
        </ul>
      </div>
      <figure class="focus-media">
        <img src="/docs/admin-twitch.png" :alt="$t('landing.focusTwitch.alt')" loading="lazy" />
      </figure>
    </section>

    <section class="section pricing-teaser">
      <div class="pricing-teaser-copy">
        <p class="eb-kicker">{{ $t("pricing.kicker") }}</p>
        <h2>{{ $t("pricing.homeTitle") }}</h2>
        <p class="eb-muted">{{ $t("pricing.homeText") }}</p>
        <div class="pricing-teaser-cards">
          <article>
            <strong>Free</strong>
            <span>0 €</span>
            <p>{{ $t("pricing.free.short") }}</p>
          </article>
          <article class="featured">
            <strong>Premium</strong>
            <span>{{ $t("billing.prices.monthly") }}</span>
            <p>{{ $t("pricing.premium.short") }}</p>
          </article>
        </div>
        <UButton color="primary" size="lg" to="/tarifs" icon="i-lucide-tags">
          {{ $t("pricing.homeCta") }}
        </UButton>
      </div>
    </section>

    <section class="section maker">
      <div class="maker-copy">
        <p class="eb-kicker">{{ $t("landing.maker.kicker") }}</p>
        <h2>{{ $t("landing.maker.title") }}</h2>
        <p class="eb-muted">{{ $t("landing.maker.text") }}</p>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-external-link"
          to="https://khaorys.com"
          external
          target="_blank"
          rel="noreferrer"
        >
          {{ $t("landing.maker.cta") }}
        </UButton>
      </div>
    </section>

    <section class="section cta">
      <div class="cta-box">
        <h2>{{ $t("landing.ctaTitle") }}</h2>
        <p class="eb-muted">{{ $t("landing.ctaText") }}</p>
        <div class="actions">
          <UButton v-if="!isLoggedIn" size="lg" color="primary" icon="i-lucide-log-in" @click="login">
            {{ $t("landing.start") }}
          </UButton>
          <UButton v-else size="lg" color="primary" icon="i-lucide-server" to="/servers">
            {{ $t("landing.servers") }}
          </UButton>
          <UButton
            size="lg"
            color="neutral"
            variant="ghost"
            icon="i-lucide-bot"
            :to="inviteUrl"
            external
            target="_blank"
            rel="noreferrer"
          >
            {{ $t("landing.addBot") }}
          </UButton>
        </div>
      </div>
    </section>

  </main>
</template>

<script setup>
const config = useRuntimeConfig();
const router = useRouter();
const { getToken, login } = useAuth();
const isLoggedIn = ref(false);

const inviteUrl = computed(() => {
  const clientId = config.public.discordClientId || "CLIENT_ID";
  const permissions = "9";
  const scopes = "bot%20applications.commands";
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
});

onMounted(async () => {
  const token = getToken();
  isLoggedIn.value = Boolean(token);
  if (!token) return;
  try {
    const res = await fetch(`${config.public.apiBase}/api/servers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      router.push("/servers");
      return;
    }
    if (res.status === 401) {
      isLoggedIn.value = false;
    }
  } catch {
    // stay on landing
  }
});
</script>

<style scoped>
.landing {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 clamp(12px, 2vw, 28px) 72px;
}

.hero {
  position: relative;
  min-height: min(78vh, 720px);
  padding: clamp(28px, 4vw, 52px) clamp(18px, 3vw, 40px) clamp(32px, 4vw, 56px);
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(45, 212, 160, 0.22);
  background: linear-gradient(165deg, rgba(13, 20, 28, 0.5), rgba(7, 11, 16, 0.92));
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.5;
  animation: floaty 8s ease-in-out infinite;
}

.b1 {
  width: 340px;
  height: 340px;
  left: -60px;
  top: -40px;
  background: rgba(45, 212, 160, 0.45);
}

.b2 {
  width: 280px;
  height: 280px;
  right: 8%;
  top: 10%;
  background: rgba(56, 189, 248, 0.35);
  animation-delay: -2s;
}

.b3 {
  width: 260px;
  height: 260px;
  right: 20%;
  bottom: -40px;
  background: rgba(251, 191, 36, 0.28);
  animation-delay: -4s;
}

@keyframes floaty {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-18px) scale(1.05);
  }
}

.hero-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(320px, 1.15fr) minmax(280px, 0.95fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: center;
  min-height: inherit;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 28px;
}

.brand-logo {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  object-fit: cover;
  box-shadow: 0 14px 30px rgba(45, 212, 160, 0.35);
}

.brand {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6.5vw, 4.4rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
  background: linear-gradient(120deg, #fff 10%, #9ff3d0 55%, #7dd3fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero h1 {
  margin: 0 0 16px;
  font-size: clamp(1.35rem, 2.8vw, 1.95rem);
  font-weight: 650;
  line-height: 1.25;
  color: var(--text);
}

.lede {
  margin: 0 0 28px;
  max-width: 46ch;
  font-size: 1.08rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-visual {
  position: relative;
}

.hero-img {
  width: 100%;
  display: block;
  border-radius: 22px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.35);
}

.section {
  margin-top: clamp(48px, 7vw, 88px);
}

.focus {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(340px, 1.05fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: center;
}

.focus--reverse {
  grid-template-columns: minmax(340px, 1.05fr) minmax(320px, 0.95fr);
}

.focus--reverse .focus-copy {
  order: 2;
}

.focus--reverse .focus-media {
  order: 1;
}

.focus-copy h2 {
  margin: 10px 0 14px;
  font-size: clamp(1.55rem, 2.8vw, 2.1rem);
  line-height: 1.2;
  max-width: 18ch;
}

.focus-copy .eb-muted {
  max-width: 42ch;
  line-height: 1.65;
  margin: 0 0 20px;
}

.focus-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.focus-list li {
  position: relative;
  padding-left: 22px;
  color: var(--text-soft);
  line-height: 1.5;
}

.focus-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.focus-media {
  margin: 0;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(45, 212, 160, 0.22);
  box-shadow: var(--shadow);
}

.focus-media img {
  width: 100%;
  display: block;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.maker {
  padding: clamp(24px, 3vw, 40px) clamp(20px, 3vw, 36px);
  border-radius: 24px;
  border: 1px solid rgba(45, 212, 160, 0.2);
  background:
    linear-gradient(120deg, rgba(45, 212, 160, 0.08), transparent 45%),
    var(--surface);
}

.maker-copy {
  max-width: 52ch;
}

.maker h2 {
  margin: 10px 0 12px;
  font-size: clamp(1.4rem, 2.4vw, 1.85rem);
}

.maker .eb-muted {
  margin: 0 0 22px;
  line-height: 1.6;
}

.cta-box {
  padding: clamp(24px, 3vw, 44px) clamp(20px, 3vw, 32px);
  border-radius: 24px;
  border: 1px solid rgba(45, 212, 160, 0.28);
  background:
    radial-gradient(500px 220px at 10% 0%, rgba(45, 212, 160, 0.2), transparent 55%),
    radial-gradient(420px 200px at 90% 100%, rgba(56, 189, 248, 0.14), transparent 50%),
    var(--surface);
}

.cta-box h2 {
  margin: 0 0 10px;
  font-size: clamp(1.5rem, 2.8vw, 2rem);
  max-width: 22ch;
}

.cta-box .eb-muted {
  max-width: 48ch;
  margin: 0;
}

.cta-box .actions {
  margin-top: 22px;
}

@media (max-width: 960px) {
  .hero-grid,
  .focus,
  .focus--reverse {
    grid-template-columns: 1fr;
  }

  .focus--reverse .focus-copy,
  .focus--reverse .focus-media {
    order: initial;
  }

  .hero {
    min-height: auto;
    padding: 28px 16px 32px;
    border-radius: 20px;
  }

  .brand-logo {
    width: 52px;
    height: 52px;
  }

  .section {
    margin-top: 52px;
  }

.focus {
  gap: 20px;
}

.pricing-teaser-copy {
  display: grid;
  gap: 16px;
}

.pricing-teaser-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pricing-teaser-cards article {
  border: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
  border-radius: 14px;
  padding: 16px;
  display: grid;
  gap: 6px;
}

.pricing-teaser-cards article.featured {
  border-color: color-mix(in srgb, var(--ui-primary) 40%, transparent);
}

.pricing-teaser-cards span {
  font-size: 1.4rem;
  font-weight: 700;
}

.maker,
  .cta-box {
    padding: 24px 18px;
  }

  .actions {
    width: 100%;
  }

  .actions :deep(button),
  .actions :deep(a) {
    flex: 1 1 auto;
    justify-content: center;
  }

}

@media (max-width: 560px) {
  .hero {
    padding: 22px 14px 28px;
  }

  .lede {
    font-size: 1rem;
  }

}

@media (prefers-reduced-motion: reduce) {
  .blob {
    animation: none;
  }
}
</style>
