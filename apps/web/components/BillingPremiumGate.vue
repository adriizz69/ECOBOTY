<script setup>
const props = defineProps({
  featureKey: { type: String, default: "" },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  icon: { type: String, default: "" },
  locked: { type: Boolean, default: false },
  modalOnly: { type: Boolean, default: false },
  benefits: { type: Array, default: null },
  open: { type: Boolean, default: undefined }
});

const emit = defineEmits(["update:open", "upgrade"]);

const { t, te, tm } = useI18n();
const route = useRoute();
const guildId = computed(() => String(route.params.id || ""));

const featurePrefix = computed(() => {
  const key = String(props.featureKey || "").trim();
  return key ? `billing.gate.features.${key}` : "";
});

const resolvedIcon = computed(() => {
  if (props.icon) return props.icon;
  const key = String(props.featureKey || "").trim();
  const map = {
    economy_daily_bonus: "i-lucide-flame",
    games_advanced_modes: "i-lucide-dice-5",
    twitch_module: "i-lucide-twitch",
    economy_automation_advanced: "i-lucide-zap",
    economy_user_shops: "i-lucide-store",
    community_message_sections: "i-lucide-messages-square",
    community_logs_extended: "i-lucide-scroll-text",
    economy_multi_shops: "i-lucide-shopping-bag",
    economy_lootbox: "i-lucide-gift",
    achievements_tiers: "i-lucide-trophy",
    premium_restore_content: "i-lucide-lock-keyhole",
    default: "i-lucide-sparkles"
  };
  return map[key] || map.default;
});

const displayTitle = computed(() => {
  if (props.title) return props.title;
  const prefix = featurePrefix.value;
  if (prefix && te(`${prefix}.title`)) return t(`${prefix}.title`);
  return t("billing.gate.title");
});

const displayDescription = computed(() => {
  if (props.description) return props.description;
  const prefix = featurePrefix.value;
  if (prefix && te(`${prefix}.description`)) return t(`${prefix}.description`);
  return t("billing.gate.description");
});

function normalizeI18nList(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        return item.source || item.body?.static || item.loc?.source || String(item);
      }
      return String(item);
    })
    .filter(Boolean);
}

const benefitItems = computed(() => {
  if (Array.isArray(props.benefits) && props.benefits.length) {
    return props.benefits.map((item) => String(item));
  }

  const prefix = featurePrefix.value;
  if (prefix) {
    const fromTm = normalizeI18nList(tm(`${prefix}.benefits`));
    if (fromTm.length) return fromTm;

    const indexed = [];
    for (let i = 0; i < 24; i += 1) {
      const key = `${prefix}.benefits.${i}`;
      if (!te(key)) break;
      indexed.push(t(key));
    }
    if (indexed.length) return indexed;
  }

  return [];
});

const internalOpen = ref(false);
const modalOpen = computed({
  get: () => (props.open === undefined ? internalOpen.value : Boolean(props.open)),
  set: (value) => {
    internalOpen.value = Boolean(value);
    emit("update:open", Boolean(value));
  }
});

const goBilling = () => {
  modalOpen.value = false;
  emit("upgrade");
  navigateTo(`/guild/${guildId.value}?tab=billing`);
};

const goPricing = () => {
  modalOpen.value = false;
  navigateTo("/tarifs");
};

const openModal = () => {
  modalOpen.value = true;
};

defineExpose({ openModal });
</script>

<template>
  <div class="billing-gate-wrap">
    <template v-if="!modalOnly">
      <slot v-if="!locked" />
      <div v-else class="billing-gate-scene">
        <div class="billing-gate-backdrop" aria-hidden="true">
          <slot />
        </div>
        <div class="billing-gate-blur" aria-hidden="true" />
        <div class="billing-gate-panel" role="dialog" aria-modal="true">
          <div class="billing-gate-card">
            <div class="billing-gate-panel-head">
              <div class="billing-gate-icon-wrap">
                <UIcon :name="resolvedIcon" class="billing-gate-feature-icon" />
              </div>
              <div class="billing-gate-copy">
                <div class="billing-gate-kicker">{{ $t("billing.gate.kicker") }}</div>
                <h3 class="billing-gate-title">{{ displayTitle }}</h3>
                <p class="billing-gate-description">{{ displayDescription }}</p>
              </div>
            </div>

            <div v-if="benefitItems.length" class="billing-gate-benefits-box">
              <div class="billing-gate-benefits-kicker">{{ $t("billing.gate.unlockedOnPage") }}</div>
              <ul class="billing-gate-benefits">
                <li v-for="(item, index) in benefitItems" :key="`${featureKey || 'b'}-${index}`">
                  <UIcon name="i-lucide-lock-open" class="billing-gate-benefit-icon" />
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>

            <div class="billing-gate-actions">
              <UButton color="primary" icon="i-lucide-zap" @click="goBilling">
                {{ $t("billing.gate.ctaBilling") }}
              </UButton>
              <UButton color="neutral" variant="outline" icon="i-lucide-badge-euro" @click="goPricing">
                {{ $t("billing.gate.viewPricing") }}
              </UButton>
            </div>

            <p class="billing-gate-footer">{{ $t("billing.gate.footerHint") }}</p>
          </div>
        </div>
      </div>
    </template>

    <UModal
      v-model:open="modalOpen"
      :ui="{ content: 'sm:max-w-xl billing-gate-modal' }"
      :title="undefined"
      :description="undefined"
    >
      <template #body>
        <div class="billing-gate-card billing-gate-card--modal">
          <div class="billing-gate-panel-head">
            <div class="billing-gate-icon-wrap">
              <UIcon :name="resolvedIcon" class="billing-gate-feature-icon" />
            </div>
            <div class="billing-gate-copy">
              <div class="billing-gate-kicker">{{ $t("billing.gate.kicker") }}</div>
              <h3 class="billing-gate-title">{{ displayTitle }}</h3>
              <p class="billing-gate-description">{{ displayDescription }}</p>
            </div>
          </div>

          <div v-if="benefitItems.length" class="billing-gate-benefits-box">
            <div class="billing-gate-benefits-kicker">{{ $t("billing.gate.unlockedOnPage") }}</div>
            <ul class="billing-gate-benefits">
              <li v-for="(item, index) in benefitItems" :key="`modal-${featureKey || 'b'}-${index}`">
                <UIcon name="i-lucide-lock-open" class="billing-gate-benefit-icon" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div class="billing-gate-actions">
            <UButton color="primary" icon="i-lucide-zap" @click="goBilling">
              {{ $t("billing.gate.ctaBilling") }}
            </UButton>
            <UButton color="neutral" variant="outline" icon="i-lucide-badge-euro" @click="goPricing">
              {{ $t("billing.gate.viewPricing") }}
            </UButton>
          </div>

          <p class="billing-gate-footer">{{ $t("billing.gate.footerHint") }}</p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.billing-gate-wrap {
  position: relative;
  width: 100%;
  display: block;
}

.billing-gate-scene {
  position: relative;
  isolation: isolate;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  min-height: 360px;
}

.billing-gate-backdrop {
  pointer-events: none;
  user-select: none;
  padding: 8px 4px 12px;
  filter: blur(8px) saturate(0.75);
  opacity: 0.65;
  transform: scale(1.015);
}

.billing-gate-blur {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--ui-primary) 16%, transparent), transparent 40%),
    linear-gradient(180deg, color-mix(in srgb, var(--ui-bg) 35%, transparent), color-mix(in srgb, var(--ui-bg) 82%, transparent));
  backdrop-filter: blur(14px) saturate(1.05);
  -webkit-backdrop-filter: blur(14px) saturate(1.05);
}

.billing-gate-panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  pointer-events: none;
}

.billing-gate-card {
  width: min(100%, 680px);
  display: grid;
  gap: 14px;
  padding: 18px 18px 16px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 75%, transparent);
  background: color-mix(in srgb, var(--ui-bg-elevated) 92%, transparent);
  box-shadow: 0 24px 60px color-mix(in srgb, #000 35%, transparent);
  pointer-events: auto;
}

.billing-gate-card--modal {
  width: 100%;
  box-shadow: none;
  border: none;
  background: transparent;
  padding: 0;
}

.billing-gate-panel-head {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.billing-gate-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: none;
  background: color-mix(in srgb, var(--ui-primary) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--ui-primary) 35%, transparent);
}

.billing-gate-feature-icon {
  width: 22px;
  height: 22px;
  color: var(--ui-primary);
}

.billing-gate-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.billing-gate-kicker,
.billing-gate-benefits-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ui-primary) 80%, var(--ui-text-muted));
  font-weight: 700;
}

.billing-gate-title {
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.35;
}

.billing-gate-description {
  margin: 0;
  color: var(--ui-text-muted);
  line-height: 1.5;
  font-size: 0.92rem;
}

.billing-gate-benefits-box {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 60%, transparent);
  background: color-mix(in srgb, var(--ui-bg) 55%, transparent);
}

.billing-gate-benefits {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.billing-gate-benefits li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--ui-text);
  line-height: 1.45;
  font-size: 0.9rem;
}

.billing-gate-benefit-icon {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  color: var(--ui-primary);
  flex: none;
}

.billing-gate-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.billing-gate-footer {
  margin: 0;
  text-align: center;
  color: var(--ui-text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

@media (max-width: 640px) {
  .billing-gate-panel-head {
    flex-direction: column;
  }

  .billing-gate-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
