<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  pending: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  applying: { type: Boolean, default: false }
});

const emit = defineEmits(["update:open", "apply"]);

const { t } = useI18n();

const snapshot = computed(() => props.pending?.snapshot || null);
const limits = computed(() => snapshot.value?.limits || {});
const extras = computed(() => snapshot.value?.extras || {});

const selection = reactive({
  shopIds: [],
  shopItemIds: [],
  uniqueAchievementIds: [],
  tierAchievementIds: []
});

const syncSelectionDefaults = () => {
  const shops = extras.value.shops || [];
  const items = extras.value.shopItems || [];
  const unique = extras.value.uniqueAchievements || [];
  const tiers = extras.value.tierAchievements || [];
  selection.shopIds = shops.slice(0, limits.value.shopsMax ?? 1).map((x) => Number(x.id));
  selection.shopItemIds = items.slice(0, limits.value.shopItemsMax ?? 25).map((x) => Number(x.id));
  selection.uniqueAchievementIds = unique
    .slice(0, limits.value.achievementsMax ?? 5)
    .map((x) => Number(x.id));
  selection.tierAchievementIds = tiers
    .slice(0, limits.value.achievementTiersMax ?? 1)
    .map((x) => Number(x.id));
};

watch(
  () => props.pending,
  (value) => {
    if (value) syncSelectionDefaults();
  },
  { immediate: true }
);

const dueLabel = computed(() => {
  const due = props.pending?.dueAt;
  if (!due) return "";
  try {
    return new Date(due).toLocaleString();
  } catch {
    return String(due);
  }
});

const toggleId = (listKey, id, maxKeep) => {
  const numericId = Number(id);
  const current = selection[listKey] || [];
  if (current.includes(numericId)) {
    selection[listKey] = current.filter((x) => x !== numericId);
    return;
  }
  const max = maxKeep == null ? Number.POSITIVE_INFINITY : Math.max(0, Number(maxKeep));
  if (current.length >= max) return;
  selection[listKey] = [...current, numericId];
};

const modalOpen = computed({
  get: () => Boolean(props.open),
  set: (value) => emit("update:open", Boolean(value))
});

const submit = () => {
  emit("apply", {
    shopIds: [...selection.shopIds],
    shopItemIds: [...selection.shopItemIds],
    uniqueAchievementIds: [...selection.uniqueAchievementIds],
    tierAchievementIds: [...selection.tierAchievementIds]
  });
};

const hasShopsOverflow = computed(
  () => (extras.value.shops || []).length > (limits.value.shopsMax ?? 1)
);
const hasItemsOverflow = computed(
  () => (extras.value.shopItems || []).length > (limits.value.shopItemsMax ?? 25)
);
const hasUniqueOverflow = computed(
  () => (extras.value.uniqueAchievements || []).length > (limits.value.achievementsMax ?? 5)
);
const hasTierOverflow = computed(
  () => (extras.value.tierAchievements || []).length > (limits.value.achievementTiersMax ?? 1)
);
const hasForcedCleanup = computed(
  () =>
    Boolean(extras.value.userShops?.length) ||
    Boolean(extras.value.roleBoosters?.length) ||
    Boolean(extras.value.channelBoosters?.length) ||
    Boolean(extras.value.advancedGames?.length)
);
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="$t('billing.cleanup.title')"
    :description="$t('billing.cleanup.description', { date: dueLabel })"
    :dismissible="false"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="loading" class="muted">{{ $t("common.loading") }}</div>
      <div v-else class="cleanup-body">
        <p class="muted">{{ $t("billing.cleanup.lead") }}</p>

        <section v-if="hasShopsOverflow" class="cleanup-section">
          <h4>{{ $t("billing.cleanup.shops", { max: limits.shopsMax ?? 1 }) }}</h4>
          <div class="cleanup-list">
            <label v-for="shop in extras.shops || []" :key="`shop-${shop.id}`" class="cleanup-item">
              <input
                type="checkbox"
                :checked="selection.shopIds.includes(Number(shop.id))"
                @change="toggleId('shopIds', shop.id, limits.shopsMax ?? 1)"
              />
              <span>{{ shop.name || `#${shop.id}` }}</span>
            </label>
          </div>
        </section>

        <section v-if="hasItemsOverflow" class="cleanup-section">
          <h4>{{ $t("billing.cleanup.items", { max: limits.shopItemsMax ?? 25 }) }}</h4>
          <div class="cleanup-list">
            <label v-for="item in extras.shopItems || []" :key="`item-${item.id}`" class="cleanup-item">
              <input
                type="checkbox"
                :checked="selection.shopItemIds.includes(Number(item.id))"
                @change="toggleId('shopItemIds', item.id, limits.shopItemsMax ?? 25)"
              />
              <span>{{ item.shopName }} · {{ item.name }}</span>
            </label>
          </div>
        </section>

        <section v-if="hasUniqueOverflow" class="cleanup-section">
          <h4>{{ $t("billing.cleanup.uniqueAchievements", { max: limits.achievementsMax ?? 5 }) }}</h4>
          <div class="cleanup-list">
            <label
              v-for="row in extras.uniqueAchievements || []"
              :key="`unique-${row.id}`"
              class="cleanup-item"
            >
              <input
                type="checkbox"
                :checked="selection.uniqueAchievementIds.includes(Number(row.id))"
                @change="toggleId('uniqueAchievementIds', row.id, limits.achievementsMax ?? 5)"
              />
              <span>{{ row.title || row.name || `#${row.id}` }}</span>
            </label>
          </div>
        </section>

        <section v-if="hasTierOverflow" class="cleanup-section">
          <h4>{{ $t("billing.cleanup.tierAchievements", { max: limits.achievementTiersMax ?? 1 }) }}</h4>
          <div class="cleanup-list">
            <label
              v-for="row in extras.tierAchievements || []"
              :key="`tier-${row.id}`"
              class="cleanup-item"
            >
              <input
                type="checkbox"
                :checked="selection.tierAchievementIds.includes(Number(row.id))"
                @change="toggleId('tierAchievementIds', row.id, limits.achievementTiersMax ?? 1)"
              />
              <span>{{ row.title || row.name || `#${row.id}` }}</span>
            </label>
          </div>
        </section>

        <section v-if="hasForcedCleanup" class="cleanup-section forced">
          <h4>{{ $t("billing.cleanup.forcedTitle") }}</h4>
          <ul>
            <li v-if="extras.userShops?.length">{{ $t("billing.cleanup.forcedUserShops") }}</li>
            <li v-if="extras.roleBoosters?.length || extras.channelBoosters?.length">
              {{ $t("billing.cleanup.forcedBoosters") }}
            </li>
            <li v-if="extras.advancedGames?.length">{{ $t("billing.cleanup.forcedGames") }}</li>
          </ul>
        </section>
      </div>
    </template>
    <template #footer>
      <div class="cleanup-footer">
        <UButton color="primary" :loading="applying" :disabled="loading || applying" @click="submit">
          {{ $t("billing.cleanup.apply") }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.cleanup-body {
  display: grid;
  gap: 16px;
}

.cleanup-section h4 {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.cleanup-list {
  display: grid;
  gap: 6px;
  max-height: 180px;
  overflow: auto;
}

.cleanup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg-elevated) 80%, transparent);
}

.cleanup-section.forced ul {
  margin: 0;
  padding-left: 18px;
  color: var(--ui-text-muted);
}

.cleanup-footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
