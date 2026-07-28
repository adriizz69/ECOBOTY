<template>
  <footer class="site-footer">
    <div class="site-footer-cols">
      <div class="site-footer-col">
        <p class="site-footer-label">{{ $t("landing.footer.legal") }}</p>
        <NuxtLink to="/mentions-legales">{{ $t("landing.legal") }}</NuxtLink>
        <NuxtLink to="/conditions">{{ $t("landing.legalDocs") }}</NuxtLink>
        <NuxtLink to="/documentation">{{ $t("nav.documentation") }}</NuxtLink>
      </div>
      <div class="site-footer-col">
        <p class="site-footer-label">{{ $t("landing.footer.sites") }}</p>
        <a href="https://khaorys.com" target="_blank" rel="noreferrer">khaorys.com</a>
      </div>
      <div class="site-footer-col site-footer-brand">
        <img src="/logo.png" alt="EcoBoty" class="site-footer-logo" />
        <p>{{ $t("landing.footer.credit") }}</p>
      </div>
    </div>
    <PaymentMethodsStrip />
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.site-footer-cols {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.2fr;
  gap: 32px;
  margin-bottom: 18px;
}

.site-footer-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.site-footer-label {
  margin: 0 0 4px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.site-footer a {
  color: var(--text-soft);
  font-size: 0.95rem;
  text-decoration: none;
}

.site-footer a:hover {
  color: var(--accent);
}

.site-footer-brand {
  justify-content: flex-start;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.site-footer-logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
  margin-bottom: 4px;
}

.site-footer-brand p {
  margin: 0;
  max-width: 36ch;
}

@media (max-width: 960px) {
  .site-footer-cols {
    grid-template-columns: 1fr;
  }
}
</style>
