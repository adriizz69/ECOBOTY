<template>
  <section class="doc-page">
    <header class="doc-hero">
      <div>
        <h2>{{ $t("docHub.title") }}</h2>
        <p>
          <i18n-t keypath="docHub.subtitle">
            <strong>{{ $t("docHub.subtitleAdmin") }}</strong>
            <strong>{{ $t("docHub.subtitleUser") }}</strong>
          </i18n-t>
        </p>
        <div class="doc-badges">
          <span>{{ $t("docHub.badge1") }}</span>
          <span>{{ $t("docHub.badge2") }}</span>
          <span>{{ $t("docHub.badge3") }}</span>
          <span>{{ $t("docHub.badge4") }}</span>
          <span>{{ $t("docHub.badge5") }}</span>
        </div>
      </div>
      <div class="hero-panel">
        <div class="panel-card">
          <div class="panel-title">{{ $t("docHub.chooseTitle") }}</div>
          <p class="muted">{{ $t("docHub.chooseText") }}</p>
        </div>
        <div class="panel-card subtle">
          <div class="panel-title">{{ $t("docHub.importantTitle") }}</div>
          <p>{{ $t("docHub.importantText") }}</p>
        </div>
      </div>
    </header>

    <div class="doc-split">
      <NuxtLink to="/documentation/admin" class="doc-split-card">
        <div class="doc-split-title">{{ $t("docHub.adminTitle") }}</div>
        <p>
          {{ $t("docHub.adminText") }}
        </p>
        <span class="doc-split-action">{{ $t("docHub.adminAction") }}</span>
      </NuxtLink>
      <NuxtLink to="/documentation/utilisateur" class="doc-split-card">
        <div class="doc-split-title">{{ $t("docHub.userTitle") }}</div>
        <p>
          {{ $t("docHub.userText") }}
        </p>
        <span class="doc-split-action">{{ $t("docHub.userAction") }}</span>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.doc-hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
  align-items: start;
}
.doc-hero p {
  color: var(--text-soft);
  line-height: 1.6;
}
.doc-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.doc-badges span {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--border);
}
.hero-panel {
  display: grid;
  gap: 12px;
}
.panel-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px;
}
.panel-card.subtle {
  background: var(--surface-2);
}
.panel-title {
  font-weight: 700;
  margin-bottom: 8px;
}
.doc-split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.doc-split-card {
  background: rgba(10, 16, 26, 0.75);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 22px;
  display: grid;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.doc-split-card:hover {
  transform: translateY(-3px);
  border-color: rgba(92, 225, 255, 0.6);
}
.doc-split-title {
  font-size: 18px;
  font-weight: 700;
}
.doc-split-card p {
  margin: 0;
  color: #c9d4f7;
}
.doc-split-action {
  color: #5ce1ff;
  font-weight: 600;
}

:global(body.theme-light) .doc-hero p,
:global(body.theme-light) .doc-split-card p {
  color: var(--text-soft);
}
:global(body.theme-light) .doc-badges span {
  background: #eef2ff;
}
:global(body.theme-light) .panel-card,
:global(body.theme-light) .doc-split-card {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
:global(body.theme-light) .doc-split-card:hover {
  border-color: rgba(14, 116, 144, 0.35);
}
:global(body.theme-light) .doc-split-action {
  color: #0e7490;
}

@media (max-width: 960px) {
  .doc-hero {
    grid-template-columns: 1fr;
  }
}
</style>
