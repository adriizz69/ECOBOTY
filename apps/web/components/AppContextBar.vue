<template>
  <header class="context-bar">
    <div class="context-left">
      <button
        v-if="showMenuToggle"
        type="button"
        class="context-menu-btn"
        :aria-label="menuLabel"
        :aria-expanded="menuOpen"
        @click.stop="$emit('toggle-menu')"
      >
        <UIcon :name="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" />
      </button>

      <NuxtLink v-if="showBrand" :to="brandTo" class="context-brand-link">
        <img src="/logo.png" alt="EcoBoty" class="context-logo" />
        <div class="context-brand-text">
          <div class="context-title">{{ brandTitle }}</div>
          <div v-if="brandSubtitle" class="context-sub">{{ brandSubtitle }}</div>
        </div>
      </NuxtLink>
    </div>

    <div class="context-actions">
      <NuxtLink
        v-if="showServersLink"
        to="/servers"
        class="context-chip"
        :title="$t('nav.servers')"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        <span class="context-chip-text">{{ $t("nav.servers") }}</span>
      </NuxtLink>

      <NuxtLink
        v-if="isLoggedIn"
        to="/compte"
        class="context-chip context-user"
        :title="username || $t('account.notConnected')"
      >
        <div
          class="context-avatar"
          :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}"
        >
          <UIcon v-if="!avatarUrl" name="i-lucide-user" class="size-3.5" />
        </div>
        <span class="context-chip-text context-user-name">{{ username || $t("account.notConnected") }}</span>
      </NuxtLink>
      <button
        v-else
        type="button"
        class="context-chip"
        @click="$emit('login')"
      >
        <UIcon name="i-lucide-log-in" class="size-4" />
        <span class="context-chip-text">{{ $t("nav.login") }}</span>
      </button>

      <div class="context-server-chip">
        <ClientOnly>
          <UDropdownMenu
            v-if="serverOptions.length"
            :items="serverMenuItems"
            :filter="serverOptions.length > 6 ? { placeholder: $t('server.searchPlaceholder') } : false"
            :content="{ align: 'end', sideOffset: 6 }"
            :ui="{ content: 'w-64' }"
            class="context-dropdown"
          >
            <button type="button" class="context-server-trigger">
              <span class="context-server-icon">
                <UIcon name="i-lucide-server" class="size-3.5" />
              </span>
              <span class="context-server-name">{{ activeServerLabel }}</span>
              <UIcon name="i-lucide-chevron-down" class="size-3.5 context-chevron" />
            </button>
          </UDropdownMenu>
          <NuxtLink v-else to="/servers" class="context-server-trigger">
            <span class="context-server-icon">
              <UIcon name="i-lucide-server" class="size-3.5" />
            </span>
            <span class="context-server-name">{{ $t("nav.servers") }}</span>
            <UIcon name="i-lucide-chevron-down" class="size-3.5 context-chevron" />
          </NuxtLink>
          <template #fallback>
            <div class="context-server-trigger is-fallback">
              <span class="context-server-icon">
                <UIcon name="i-lucide-server" class="size-3.5" />
              </span>
              <span class="context-server-name">{{ activeServerLabel }}</span>
            </div>
          </template>
        </ClientOnly>
      </div>

      <button
        v-if="showPlan"
        type="button"
        class="context-chip context-plan"
        :class="{ 'is-premium': isPremium }"
        @click="$emit('plan-click')"
      >
        <UIcon :name="isPremium ? 'i-lucide-badge-check' : 'i-lucide-crown'" class="size-4" />
        <span class="context-chip-text">{{ isPremium ? $t("billing.status.premium") : $t("billing.status.free") }}</span>
      </button>

      <ClientOnly>
        <UDropdownMenu
          :items="localeMenuItems"
          :content="{ align: 'end', sideOffset: 6 }"
          :ui="{ content: 'w-44' }"
          class="context-dropdown"
        >
          <button
            type="button"
            class="context-chip context-locale"
            :title="selectedLocaleItem?.label || $t('language.label')"
            :aria-label="selectedLocaleItem?.label || $t('language.label')"
          >
            <img
              :src="selectedLocaleItem?.flag"
              :alt=""
              class="locale-flag"
              width="18"
              height="12"
            />
            <span class="context-chip-text locale-label">{{ selectedLocaleItem?.label }}</span>
            <UIcon name="i-lucide-chevron-down" class="size-3.5 context-chevron" />
          </button>
        </UDropdownMenu>
        <template #fallback>
          <div class="context-chip context-locale">
            <img
              :src="selectedLocaleItem?.flag"
              :alt=""
              class="locale-flag"
              width="18"
              height="12"
            />
            <span class="context-chip-text locale-label">{{ selectedLocaleItem?.label }}</span>
            <UIcon name="i-lucide-chevron-down" class="size-3.5 context-chevron" />
          </div>
        </template>
      </ClientOnly>

      <slot name="trailing" />
    </div>
  </header>
</template>

<script setup>
const props = defineProps({
  showBrand: { type: Boolean, default: true },
  brandTitle: { type: String, default: "EcoBoty" },
  brandSubtitle: { type: String, default: "" },
  brandTo: { type: String, default: "/" },
  showMenuToggle: { type: Boolean, default: false },
  menuOpen: { type: Boolean, default: false },
  menuLabel: { type: String, default: "Menu" },
  showServersLink: { type: Boolean, default: false },
  isLoggedIn: { type: Boolean, default: false },
  username: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  serverOptions: { type: Array, default: () => [] },
  selectedServerId: { type: String, default: "" },
  isPremium: { type: Boolean, default: false },
  showPlan: { type: Boolean, default: true },
  selectedLocale: { type: String, default: "fr" },
  localeOptions: {
    type: Array,
    default: () => [
      { value: "fr", label: "Français", flag: "/flags/fr.svg" },
      { value: "en", label: "English", flag: "/flags/gb.svg" },
      { value: "es", label: "Español", flag: "/flags/es.svg" }
    ]
  }
});

const emit = defineEmits([
  "toggle-menu",
  "login",
  "plan-click",
  "update:selectedServerId",
  "update:selectedLocale"
]);

const selectedLocaleItem = computed(
  () => props.localeOptions.find((item) => item.value === props.selectedLocale) || props.localeOptions[0]
);

const activeServerLabel = computed(() => {
  const match = props.serverOptions.find((item) => String(item.value) === String(props.selectedServerId));
  if (match?.shortLabel) return match.shortLabel;
  if (match?.label) return String(match.label).split(" · ")[0];
  return props.selectedServerId || "—";
});

const serverMenuItems = computed(() =>
  props.serverOptions.map((item) => ({
    label: item.label || item.shortLabel || String(item.value),
    icon: "i-lucide-server",
    onSelect: () => emit("update:selectedServerId", String(item.value))
  }))
);

const localeMenuItems = computed(() =>
  props.localeOptions.map((item) => ({
    label: item.label,
    avatar: { src: item.flag, alt: item.label },
    onSelect: () => emit("update:selectedLocale", String(item.value))
  }))
);
</script>

<style scoped>
.context-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 80%, transparent);
  background:
    linear-gradient(120deg, rgba(45, 212, 160, 0.1), rgba(56, 189, 248, 0.06)),
    color-mix(in srgb, var(--ui-bg, #0f172a) 88%, #1e293b);
  box-shadow: 0 8px 20px rgba(2, 6, 23, 0.18);
  flex-wrap: nowrap;
}

.context-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
}

.context-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 70%, transparent);
  background: color-mix(in srgb, var(--ui-bg, #0f172a) 70%, transparent);
  color: inherit;
  cursor: pointer;
  flex: none;
}

.context-brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.context-logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  object-fit: cover;
  flex: none;
}

.context-brand-text {
  min-width: 0;
  line-height: 1.1;
}

.context-title {
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: 0.95rem;
}

.context-sub {
  font-size: 0.7rem;
  color: var(--ui-text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.context-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.context-chip,
.context-server-chip {
  position: relative;
  z-index: 0;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 75%, transparent);
  background: color-mix(in srgb, var(--ui-bg, #0f172a) 72%, #1e293b);
  color: inherit;
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  flex: 0 0 auto;
  box-sizing: border-box;
}

.context-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-primary, #2dd4a0) 20%, #1e293b) center / cover no-repeat;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.context-user-name {
  max-width: 100px;
}

.context-server-chip {
  gap: 0;
  min-width: 0;
  max-width: min(280px, 34vw);
  flex: 0 1 auto;
  padding: 0 6px 0 8px;
  cursor: default;
}

.context-dropdown {
  display: inline-flex !important;
  min-width: 0;
  max-width: 100%;
  flex: 1 1 auto;
  position: relative;
  z-index: 0;
}

.context-server-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  width: 100%;
  max-width: 180px;
  height: 28px;
  padding: 0 4px 0 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  font: inherit;
  position: relative;
  z-index: 0;
}

.context-server-trigger.is-fallback {
  cursor: default;
}

.context-server-icon {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.14);
  color: #38bdf8;
  flex: none;
}

.context-server-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 0.82rem;
  font-weight: 650;
  text-align: left;
}

.context-chevron {
  opacity: 0.65;
  flex: none;
}

.context-plan {
  z-index: 1;
  flex: 0 0 auto;
}

.context-plan.is-premium {
  border-color: rgba(250, 204, 21, 0.45);
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.35), rgba(202, 138, 4, 0.28));
  color: #fef3c7;
}

.context-locale {
  gap: 7px;
  padding-right: 8px;
  flex: 0 0 auto;
}

.locale-flag {
  width: 18px;
  height: 12px;
  border-radius: 2px;
  object-fit: cover;
  display: block;
  flex: none;
}

.locale-label {
  max-width: 78px;
  font-size: 0.78rem;
  font-weight: 650;
}

@media (max-width: 1100px) {
  .context-sub {
    display: none;
  }

  .context-user-name {
    max-width: 72px;
  }

  .context-server-chip {
    max-width: min(220px, 28vw);
  }
}

@media (max-width: 900px) {
  .context-chip-text.context-user-name {
    display: none;
  }

  .locale-label {
    max-width: 64px;
  }

  .context-server-chip {
    max-width: 160px;
  }
}

@media (max-width: 720px) {
  .context-bar {
    padding: 7px 8px;
    gap: 6px;
  }

  .context-actions {
    gap: 6px;
  }

  .context-chip-text:not(.locale-label) {
    display: none;
  }

  .context-chip,
  .context-server-chip {
    padding: 0 8px;
  }

  .context-locale {
    padding-right: 8px;
  }

  .context-server-chip {
    max-width: 120px;
    padding-right: 4px;
  }
}
</style>
