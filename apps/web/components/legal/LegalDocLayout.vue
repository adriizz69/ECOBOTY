<template>
  <section class="legal-doc">
    <header class="legal-doc-hero">
      <p v-if="kicker" class="legal-doc-kicker">{{ kicker }}</p>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="legal-doc-lead">{{ subtitle }}</p>
      <div class="legal-doc-meta">
        <span v-if="updated">Dernière mise à jour : {{ updated }}</span>
        <span v-if="version">Version : {{ version }}</span>
      </div>
      <div v-if="$slots.links" class="legal-doc-links">
        <slot name="links" />
      </div>
    </header>

    <nav v-if="toc.length" class="legal-doc-toc" aria-label="Sommaire">
      <p class="legal-doc-toc-title">Sommaire</p>
      <ul>
        <li v-for="item in toc" :key="item.id">
          <a :href="`#${item.id}`">{{ item.label }}</a>
        </li>
      </ul>
    </nav>

    <div class="legal-doc-body">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({
  kicker: { type: String, default: "" },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  updated: { type: String, default: "" },
  version: { type: String, default: "" },
  toc: { type: Array, default: () => [] }
});
</script>

<style scoped>
.legal-doc {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 920px;
}

.legal-doc-hero {
  padding: 28px 26px;
  border-radius: 20px;
  border: 1px solid rgba(45, 212, 160, 0.22);
  background:
    radial-gradient(520px 240px at 0% 0%, rgba(45, 212, 160, 0.14), transparent 55%),
    radial-gradient(420px 200px at 100% 100%, rgba(56, 189, 248, 0.1), transparent 50%),
    var(--surface);
}

.legal-doc-kicker {
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.legal-doc-hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.65rem, 3vw, 2.15rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.legal-doc-lead {
  margin: 12px 0 0;
  color: var(--text-soft);
  line-height: 1.65;
  max-width: 72ch;
}

.legal-doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 16px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.legal-doc-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 14px;
  font-size: 0.9rem;
}

.legal-doc-links :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.legal-doc-links :deep(a:hover) {
  text-decoration: underline;
}

.legal-doc-toc {
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}

.legal-doc-toc-title {
  margin: 0 0 10px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.legal-doc-toc ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.legal-doc-toc a {
  color: var(--text);
  text-decoration: none;
  font-size: 0.92rem;
  line-height: 1.45;
}

.legal-doc-toc a:hover {
  color: var(--accent);
}

.legal-doc-body {
  display: grid;
  gap: 18px;
}

.legal-doc-body :deep(.doc-part) {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.02em;
}

.legal-doc-body :deep(.doc-section) {
  padding: 22px 22px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface);
  scroll-margin-top: 88px;
}

.legal-doc-body :deep(.doc-section h2) {
  margin: 0 0 12px;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.legal-doc-body :deep(.doc-section h3) {
  margin: 18px 0 8px;
  font-size: 0.95rem;
  font-weight: 700;
}

.legal-doc-body :deep(.doc-section h3:first-of-type) {
  margin-top: 0;
}

.legal-doc-body :deep(.doc-section p) {
  margin: 0 0 10px;
  color: var(--text);
  line-height: 1.7;
}

.legal-doc-body :deep(.doc-section p:last-child) {
  margin-bottom: 0;
}

.legal-doc-body :deep(.doc-section ul),
.legal-doc-body :deep(.doc-section ol) {
  margin: 0 0 10px;
  padding-left: 20px;
  color: var(--text);
  line-height: 1.65;
}

.legal-doc-body :deep(.doc-section li + li) {
  margin-top: 6px;
}

.legal-doc-body :deep(.doc-section a) {
  color: var(--accent);
}

.legal-doc-body :deep(.doc-table-wrap) {
  overflow-x: auto;
  margin: 10px 0;
}

.legal-doc-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.legal-doc-body :deep(th),
.legal-doc-body :deep(td) {
  padding: 10px 12px;
  border: 1px solid var(--border);
  text-align: left;
}

.legal-doc-body :deep(th) {
  background: var(--bg-elevated);
  font-weight: 700;
}

.legal-doc-body :deep(code) {
  font-size: 0.88em;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(45, 212, 160, 0.12);
}

@media (max-width: 720px) {
  .legal-doc-hero {
    padding: 22px 18px;
  }

  .legal-doc-body :deep(.doc-section) {
    padding: 18px 16px;
  }
}
</style>
