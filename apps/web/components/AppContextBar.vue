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
        class="context-btn"
        :title="$t('nav.servers')"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        <span>{{ $t("nav.servers") }}</span>
      </NuxtLink>

      <NuxtLink
        v-if="isLoggedIn"
        to="/compte"
        class="context-btn context-user"
        :title="username || $t('account.notConnected')"
      >
        <div
          class="context-avatar"
          :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}"
        >
          <UIcon v-if="!avatarUrl" name="i-lucide-user" class="size-3.5" />
        </div>
        <span class="context-user-name">{{ username || $t("account.notConnected") }}</span>
      </NuxtLink>
      <button
        v-else
        type="button"
        class="context-btn"
        @click="$emit('login')"
      >
        <UIcon name="i-lucide-log-in" class="size-4" />
        <span>{{ $t("nav.login") }}</span>
      </button>

      <div class="context-server-wrap">
        <span class="context-server-label">{{ $t("server.label") }}</span>
        <ClientOnly>
          <USelectMenu
            v-if="serverOptions.length"
            :model-value="selectedServerId"
            :items="serverOptions"
            label-key="shortLabel"
            value-key="value"
            :filter-fields="['shortLabel', 'label']"
            :search-input="{ placeholder: $t('server.searchPlaceholder') }"
            size="sm"
            color="neutral"
            variant="ghost"
            class="context-server-select"
            :ui="{
              base: 'context-server-base',
              trailingIcon: 'size-3.5 opacity-60',
              content: 'min-w-56'
            }"
            @update:model-value="$emit('update:selectedServerId', $event)"
          >
            <template #leading>
              <span class="context-server-icon">
                <UIcon name="i-lucide-server" class="size-3.5" />
              </span>
            </template>
            <template #default>
              <span class="context-server-name">{{ activeServerLabel }}</span>
            </template>
            <template #item-label="{ item }">
              <span>{{ item.label || item.shortLabel }}</span>
            </template>
          </USelectMenu>
          <NuxtLink v-else to="/servers" class="context-server-fallback">
            <span class="context-server-icon">
              <UIcon name="i-lucide-server" class="size-3.5" />
            </span>
            <span class="context-server-name">{{ $t("nav.servers") }}</span>
          </NuxtLink>
        </ClientOnly>
      </div>

      <button
        v-if="showPlan"
        type="button"
        class="context-plan"
        :class="{ 'is-premium': isPremium }"
        @click="$emit('plan-click')"
      >
        <UIcon :name="isPremium ? 'i-lucide-badge-check' : 'i-lucide-crown'" class="size-4" />
        <span>{{ isPremium ? $t("billing.status.premium") : $t("billing.status.free") }}</span>
      </button>

      <ClientOnly>
        <USelectMenu
          :model-value="selectedLocale"
          :items="localeOptions"
          label-key="label"
          value-key="value"
          :search-input="false"
          :trailing="false"
          size="xs"
          color="neutral"
          variant="ghost"
          class="context-locale"
          :ui="{
            base: 'context-locale-base',
            trailing: 'hidden',
            content: 'min-w-40'
          }"
          :title="selectedLocaleItem?.label || $t('language.label')"
          @update:model-value="$emit('update:selectedLocale', $event)"
        >
          <template #leading>
            <img
              :src="selectedLocaleItem?.flag"
              :alt="selectedLocaleItem?.label"
              class="locale-flag"
            />
          </template>
          <template #default>
            <span class="sr-only">{{ selectedLocaleItem?.label }}</span>
          </template>
          <template #item-leading="{ item }">
            <img :src="item.flag" :alt="item.label" class="locale-flag" />
          </template>
        </USelectMenu>
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

defineEmits([
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
</script>

<style scoped>
.context-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 52px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 80%, transparent);
  background:
    linear-gradient(120deg, rgba(45, 212, 160, 0.1), rgba(56, 189, 248, 0.06)),
    color-mix(in srgb, var(--ui-bg, #0f172a) 88%, #1e293b);
  box-shadow: 0 8px 20px rgba(2, 6, 23, 0.18);
  flex-wrap: nowrap;
  overflow: visible;
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
  gap: 6px;
  flex: 0 1 auto;
  min-width: 0;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.context-btn {
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
  flex: none;
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
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-server-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 280px;
  height: 34px;
  padding: 0 4px 0 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 75%, transparent);
  background: color-mix(in srgb, var(--ui-bg, #0f172a) 72%, #1e293b);
  flex: 0 1 auto;
  position: relative;
  z-index: 1;
}

.context-server-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ui-text-muted, #94a3b8);
  white-space: nowrap;
  flex: none;
}

.context-server-select {
  min-width: 0;
  flex: 1 1 auto;
  max-width: 180px;
}

.context-server-select :deep(.context-server-base),
.context-server-select :deep(button) {
  width: 100%;
  min-width: 0;
  height: 28px;
  min-height: 28px;
  padding: 0 6px 0 0;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  justify-content: flex-start;
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
  font-size: 0.82rem;
  font-weight: 650;
}

.context-server-fallback {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 650;
}

.context-plan {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  flex: none;
}

.context-plan.is-premium {
  border-color: rgba(250, 204, 21, 0.45);
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.35), rgba(202, 138, 4, 0.28));
  color: #fef3c7;
}

.context-locale {
  width: 28px;
  min-width: 28px;
  max-width: 28px;
  flex: none;
}

.context-locale :deep(.context-locale-base),
.context-locale :deep(button) {
  width: 28px !important;
  min-width: 28px !important;
  max-width: 28px !important;
  height: 28px !important;
  min-height: 28px !important;
  padding: 0 !important;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 60%, transparent) !important;
  border-radius: 8px !important;
  background: transparent !important;
  box-shadow: none !important;
  justify-content: center;
}

.locale-flag {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  object-fit: cover;
  flex: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 860px) {
  .context-user-name,
  .context-sub,
  .context-server-label {
    display: none;
  }

  .context-server-wrap {
    max-width: 160px;
  }

  .context-server-select {
    max-width: 150px;
  }
}

@media (max-width: 640px) {
  .context-bar {
    padding: 7px 8px;
    gap: 6px;
  }

  .context-btn span,
  .context-plan span {
    display: none;
  }

  .context-btn,
  .context-plan {
    padding: 0 8px;
  }

  .context-server-wrap {
    padding: 0 4px;
    max-width: 120px;
  }
}
</style>
