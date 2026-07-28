<script setup>
const props = defineProps({
  content: {
    type: String,
    default: ""
  },
  html: {
    type: String,
    default: ""
  },
  author: {
    type: String,
    default: "EcoBoty"
  },
  avatarUrl: {
    type: String,
    default: "/logo.png"
  },
  emptyText: {
    type: String,
    default: ""
  }
});

const bodyHtml = computed(() => props.html || "");
</script>

<template>
  <div class="discord-msg" role="article" aria-label="Aperçu message Discord">
    <img class="discord-msg__avatar" :src="avatarUrl" :alt="author" />
    <div class="discord-msg__body">
      <div class="discord-msg__meta">
        <span class="discord-msg__author">{{ author }}</span>
        <span class="discord-msg__bot">BOT</span>
        <span class="discord-msg__time">Aujourd’hui à {{ new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }}</span>
      </div>
      <div
        v-if="bodyHtml"
        class="discord-msg__content"
        v-html="bodyHtml"
      />
      <div v-else class="discord-msg__content discord-msg__empty">
        {{ emptyText || content || "—" }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.discord-msg {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 16px;
  margin-top: 10px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #313338;
  color: #dbdee1;
  font-family: "gg sans", "Source Sans 3", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  line-height: 1.375;
  word-break: break-word;
}

.discord-msg__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #1e1f22;
}

.discord-msg__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  line-height: 1.2;
}

.discord-msg__author {
  font-weight: 560;
  color: #f2f3f5;
  font-size: 1rem;
}

.discord-msg__bot {
  display: inline-flex;
  align-items: center;
  height: 15px;
  padding: 0 4px;
  border-radius: 3px;
  background: #5865f2;
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.discord-msg__time {
  color: #949ba4;
  font-size: 0.75rem;
  font-weight: 500;
}

.discord-msg__content {
  white-space: normal;
}

.discord-msg__empty {
  color: #949ba4;
  font-style: italic;
}

.discord-msg__content :deep(strong) {
  font-weight: 700;
  color: #f2f3f5;
}

.discord-msg__content :deep(em) {
  font-style: italic;
}

.discord-msg__content :deep(u) {
  text-decoration: underline;
}

.discord-msg__content :deep(s) {
  text-decoration: line-through;
  color: #b5bac1;
}

.discord-msg__content :deep(.d-link) {
  color: #00a8fc;
  text-decoration: none;
}

.discord-msg__content :deep(.d-link:hover) {
  text-decoration: underline;
}

.discord-msg__content :deep(.d-inline-code),
.discord-msg__content :deep(code.d-inline-code) {
  padding: 0.1em 0.3em;
  border-radius: 4px;
  background: #1e1f22;
  color: #dbdee1;
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.85em;
}

.discord-msg__content :deep(.d-codeblock) {
  margin: 6px 0;
  padding: 8px;
  border-radius: 5px;
  background: #1e1f22;
  border: 1px solid rgba(255, 255, 255, 0.04);
  overflow-x: auto;
  white-space: pre;
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.85em;
  line-height: 1.3;
}

.discord-msg__content :deep(.d-emoji) {
  width: 1.375em;
  height: 1.375em;
  vertical-align: -0.25em;
  object-fit: contain;
  display: inline-block;
}

.discord-msg__content :deep(.d-mention) {
  display: inline;
  padding: 0 2px;
  border-radius: 3px;
  background: rgba(88, 101, 242, 0.3);
  color: #c9cdfb;
  font-weight: 500;
}

.discord-msg__content :deep(.d-mention-everyone) {
  background: rgba(250, 166, 26, 0.18);
  color: #f9c169;
}

.discord-msg__content :deep(.d-quote) {
  margin: 4px 0;
  padding: 0 0 0 10px;
  border-left: 4px solid #4e5058;
  color: #dbdee1;
}

.discord-msg__content :deep(.d-heading) {
  color: #f2f3f5;
  line-height: 1.25;
  margin: 8px 0 4px;
}

.discord-msg__content :deep(.d-heading-1) {
  font-size: 1.5rem;
  font-weight: 700;
}

.discord-msg__content :deep(.d-heading-2) {
  font-size: 1.25rem;
  font-weight: 700;
}

.discord-msg__content :deep(.d-heading-3) {
  font-size: 1.1rem;
  font-weight: 650;
}

.discord-msg__content :deep(.d-spoiler) {
  background: #1e1f22;
  color: transparent;
  border-radius: 3px;
  cursor: pointer;
  transition: color 0.12s ease, background 0.12s ease;
}

.discord-msg__content :deep(.d-spoiler:hover),
.discord-msg__content :deep(.d-spoiler:focus) {
  color: #dbdee1;
  background: rgba(0, 0, 0, 0.35);
}

:global(html.light) .discord-msg {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.1);
  color: #2e3338;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

:global(html.light) .discord-msg__author {
  color: #060607;
}

:global(html.light) .discord-msg__time {
  color: #5c5e66;
}
</style>
