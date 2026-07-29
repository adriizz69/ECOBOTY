<template>
  <header class="context-bar" :class="{ compact }">
    <div v-if="showBrand" class="context-brand">
      <slot name="leading">
        <button
          v-if="showMenuToggle"
          type="button"
          class="context-menu-btn"
          :aria-label="menuLabel"
          :aria-expanded="menuOpen"
          @click="$emit('toggle-menu')"
        >
          <UIcon name="i-lucide-menu" class="size-5" />
        </button>
        <NuxtLink :to="brandTo" class="context-brand-link">
          <img src="/logo.png" alt="EcoBoty" class="context-logo" />
          <div class="context-brand-text">
            <div class="context-title">{{ brandTitle }}</div>
            <div v-if="brandSubtitle" class="context-sub">{{ brandSubtitle }}</div>
          </div>
        </NuxtLink>
      </slot>
    </div>

    <div class="context-spacer" />

    <div class="context-actions">
      <NuxtLink
        v-if="isLoggedIn"
        to="/compte"
        class="context-chip context-user"
        :title="$t('account.manage')"
      >
        <div
          class="context-avatar"
          :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}"
        >
          <UIcon v-if="!avatarUrl" name="i-lucide-user" class="size-3.5" />
        </div>
        <div class="context-chip-text">
          <span class="context-chip-label">{{ $t("account.label") }}</span>
          <span class="context-chip-value">{{ username || $t("account.notConnected") }}</span>
        </div>
      </NuxtLink>
      <button
        v-else
        type="button"
        class="context-chip context-user"
        @click="$emit('login')"
      >
        <div class="context-avatar">
          <UIcon name="i-lucide-log-in" class="size-3.5" />
        </div>
        <div class="context-chip-text">
          <span class="context-chip-label">{{ $t("account.label") }}</span>
          <span class="context-chip-value">{{ $t("nav.login") }}</span>
        </div>
      </button>

      <div class="context-chip context-server">
        <div class="context-server-icon">
          <UIcon name="i-lucide-server" class="size-4" />
        </div>
        <div class="context-chip-text context-server-text">
          <span class="context-chip-label">{{ $t("server.label") }}</span>
          <ClientOnly>
            <USelectMenu
              v-if="serverOptions.length"
              :model-value="selectedServerId"
              :items="serverOptions"
              label-key="label"
              value-key="value"
              :search-input="{ placeholder: $t('server.searchPlaceholder') }"
              size="sm"
              class="context-server-select"
              @update:model-value="$emit('update:selectedServerId', $event)"
            >
              <template #default>
                <span class="context-server-current">{{ activeServerLabel }}</span>
              </template>
            </USelectMenu>
            <NuxtLink v-else to="/servers" class="context-server-link">
              {{ $t("nav.servers") }}
            </NuxtLink>
          </ClientOnly>
        </div>
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
          :searchable="false"
          size="sm"
          class="context-locale"
          @update:model-value="$emit('update:selectedLocale', $event)"
        >
          <template #default>
            <div class="locale-selected">
              <img :src="selectedLocaleItem?.flag" :alt="selectedLocaleItem?.label" class="locale-flag" />
              <span class="locale-label">{{ selectedLocaleItem?.label }}</span>
            </div>
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
  compact: { type: Boolean, default: false },
  showMenuToggle: { type: Boolean, default: false },
  menuOpen: { type: Boolean, default: false },
  menuLabel: { type: String, default: "Menu" },
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
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 80%, transparent);
  background:
    linear-gradient(120deg, rgba(45, 212, 160, 0.1), rgba(56, 189, 248, 0.06)),
    color-mix(in srgb, var(--ui-bg, #0f172a) 88%, #1e293b);
  box-shadow: 0 10px 28px rgba(2, 6, 23, 0.22);
}

.context-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.context-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 70%, transparent);
  background: color-mix(in srgb, var(--ui-bg, #0f172a) 70%, transparent);
  color: inherit;
  cursor: pointer;
}

.context-brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.context-logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
  flex: none;
  box-shadow: 0 8px 16px rgba(45, 212, 160, 0.22);
}

.context-title {
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: 1.02rem;
  line-height: 1.15;
}

.context-sub {
  font-size: 0.75rem;
  color: var(--ui-text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.context-spacer {
  flex: 1 1 auto;
  min-width: 8px;
}

.context-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.context-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--ui-border, #334155) 75%, transparent);
  background: color-mix(in srgb, var(--ui-bg, #0f172a) 72%, #1e293b);
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.context-chip-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

.context-chip-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ui-text-muted, #94a3b8);
}

.context-chip-value,
.context-server-current,
.context-server-link {
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.context-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-primary, #2dd4a0) 20%, #1e293b) center / cover no-repeat;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.context-server-icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.14);
  color: #38bdf8;
  flex: none;
}

.context-server-select {
  min-width: 0;
}

.context-server-select :deep(button) {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  min-height: auto;
  height: auto;
}

.context-server-link {
  color: var(--ui-primary, #2dd4a0);
  text-decoration: none;
}

.context-plan {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.context-plan.is-premium {
  border-color: rgba(250, 204, 21, 0.45);
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.35), rgba(202, 138, 4, 0.28));
  color: #fef3c7;
}

.context-locale {
  min-width: 0;
}

.locale-selected {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 10px;
}

.locale-flag {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: cover;
}

.locale-label {
  font-size: 0.82rem;
  font-weight: 600;
}

@media (max-width: 900px) {
  .context-chip-label,
  .locale-label {
    display: none;
  }

  .context-chip-value,
  .context-server-current {
    max-width: 96px;
  }

  .context-sub {
    max-width: 120px;
  }
}

@media (max-width: 640px) {
  .context-bar {
    padding: 10px 12px;
    gap: 10px;
  }

  .context-actions {
    width: 100%;
    justify-content: stretch;
  }

  .context-chip,
  .context-plan {
    flex: 1 1 auto;
  }
}
</style>
