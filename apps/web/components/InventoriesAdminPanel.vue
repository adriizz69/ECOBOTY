<template>
  <UCard class="card inv-admin">
    <div class="card-head">
      <div>
        <h3>{{ $t("adminGuild.inventories.title") }}</h3>
        <p class="muted">{{ $t("adminGuild.inventories.subtitle") }}</p>
      </div>
      <div class="actions">
        <UButton color="neutral" variant="outline" :loading="loading" @click="load({ force: true })">
          {{ $t("common.refresh") }}
        </UButton>
      </div>
    </div>

    <div class="inv-stats">
      <article class="inv-stat">
        <span class="inv-stat-label">{{ $t("adminGuild.inventories.statsMembers") }}</span>
        <strong class="inv-stat-value">{{ inventoryStats.members }}</strong>
      </article>
      <article class="inv-stat">
        <span class="inv-stat-label">{{ $t("adminGuild.inventories.statsTotal") }}</span>
        <strong class="inv-stat-value">{{ inventoryStats.totalItems }}</strong>
      </article>
      <article class="inv-stat">
        <span class="inv-stat-label">{{ $t("adminGuild.inventories.statsDistinct") }}</span>
        <strong class="inv-stat-value">{{ inventoryStats.distinctTypes }}</strong>
      </article>
    </div>

    <div class="inv-admin-layout">
      <aside class="inv-sidebar">
        <div class="inv-sidebar-head">
          <label class="inv-search">
            <UIcon name="i-lucide-search" class="inv-search-icon" />
            <input
              v-model="search"
              type="search"
              :placeholder="$t('adminGuild.inventories.searchMember')"
            />
          </label>
          <p v-if="!loading && usersSorted.length" class="inv-sidebar-meta muted">
            {{ $t("adminGuild.inventories.searchResults", { count: usersSorted.length }) }}
          </p>
          <p class="inv-sidebar-hint muted">{{ $t("adminGuild.inventories.hint") }}</p>
        </div>

        <div class="inv-sidebar-body">
          <div v-if="loading" class="inv-state">
            <UIcon name="i-lucide-loader-circle" class="inv-state-icon spin" />
            <span>{{ $t("common.loading") }}</span>
          </div>
          <div v-else-if="!usersSorted.length" class="inv-state">
            <UIcon name="i-lucide-backpack" class="inv-state-icon" />
            <span>{{ $t("adminGuild.inventories.empty") }}</span>
          </div>
          <div v-else class="inv-member-list">
            <button
              v-for="user in usersSorted"
              :key="user.userId"
              type="button"
              :class="['inv-member-row', selectedUserId === user.userId && 'active']"
              @click="selectUser(user.userId)"
            >
              <div class="inv-member-avatar">
                <DiscordAvatar
                  :user-id="user.userId"
                  :avatar="avatarRaw(user)"
                  :alt="displayName(user)"
                />
              </div>
              <div class="inv-member-copy">
                <span class="inv-member-name">{{ displayName(user) }}</span>
                <span class="inv-member-id">{{ user.userId }}</span>
              </div>
              <span class="inv-member-badge">{{ user.totalQuantity }}</span>
            </button>
          </div>
        </div>
      </aside>

      <section class="inv-detail">
        <div v-if="!selectedUser" class="inv-state inv-state--large">
          <UIcon name="i-lucide-user-round" class="inv-state-icon" />
          <h4>{{ $t("adminGuild.inventories.selectUser") }}</h4>
          <p class="muted">{{ $t("adminGuild.inventories.selectUserHelp") }}</p>
        </div>

        <template v-else>
          <header class="inv-user-hero">
            <div class="inv-user-hero-avatar">
              <DiscordAvatar
                :user-id="selectedUser.userId"
                :avatar="avatarRaw(selectedUser)"
                :alt="displayName(selectedUser)"
                :size="128"
              />
            </div>
            <div class="inv-user-hero-copy">
              <h4>{{ displayName(selectedUser) }}</h4>
              <p class="muted inv-user-id">{{ selectedUser.userId }}</p>
              <div class="inv-user-pills">
                <span class="inv-pill">
                  {{ $t("adminGuild.inventories.totalItems", { count: selectedUser.totalQuantity }) }}
                </span>
                <span class="inv-pill">
                  {{ $t("adminGuild.inventories.distinctItems", { count: selectedUser.items.length }) }}
                </span>
              </div>
            </div>
          </header>

          <div v-if="!selectedUser.items.length" class="inv-state">
            <UIcon name="i-lucide-package-open" class="inv-state-icon" />
            <span>{{ $t("adminGuild.inventories.emptyItems") }}</span>
          </div>

          <div v-else class="inv-items-grid">
            <article
              v-for="entry in selectedUser.items"
              :key="`${selectedUser.userId}-${entry.itemId}`"
              class="inv-item-card"
            >
              <div class="inv-item-media">
                <img v-if="entry.image_url" :src="entry.image_url" :alt="entry.name" />
                <span v-else class="inv-item-fallback">{{ typeEmoji(entry.type) }}</span>
                <span class="inv-qty-badge">×{{ entry.quantity }}</span>
              </div>

              <div class="inv-item-body">
                <div class="inv-item-headline">
                  <h5>{{ entry.name }}</h5>
                  <span v-if="entry.hidden" class="inv-tag inv-tag--muted">
                    {{ $t("adminGuild.inventories.hidden") }}
                  </span>
                </div>
                <span :class="['inv-tag', `inv-tag--${typeClass(entry.type)}`]">
                  {{ formatItemType(entry.type) }}
                </span>
              </div>

              <div class="inv-item-footer">
                <div class="inv-qty-stepper">
                  <button
                    type="button"
                    class="inv-qty-btn"
                    :disabled="removeQty(selectedUser.userId, entry) <= 1"
                    @click="bumpQty(selectedUser.userId, entry.itemId, -1, entry.quantity)"
                  >
                    <UIcon name="i-lucide-minus" />
                  </button>
                  <input
                    v-model.number="removeQuantities[removeKey(selectedUser.userId, entry.itemId)]"
                    type="number"
                    min="1"
                    :max="entry.quantity"
                    class="inv-qty-input"
                    :aria-label="$t('adminGuild.inventories.qty')"
                  />
                  <button
                    type="button"
                    class="inv-qty-btn"
                    :disabled="removeQty(selectedUser.userId, entry) >= entry.quantity"
                    @click="bumpQty(selectedUser.userId, entry.itemId, 1, entry.quantity)"
                  >
                    <UIcon name="i-lucide-plus" />
                  </button>
                </div>
                <UButton
                  color="error"
                  variant="soft"
                  size="sm"
                  :loading="removingKey === removeKey(selectedUser.userId, entry.itemId)"
                  @click="removeItem(selectedUser.userId, entry.itemId)"
                >
                  <UIcon name="i-lucide-trash-2" />
                  {{ $t("adminGuild.inventories.remove") }}
                </UButton>
              </div>
            </article>
          </div>
        </template>
      </section>
    </div>
  </UCard>
</template>

<script setup>
const props = defineProps({
  guildId: { type: String, required: true },
  active: { type: Boolean, default: false }
});

const config = useRuntimeConfig();
const { t } = useI18n();
const { getToken, login } = useAuth();

const users = ref([]);
const loading = ref(false);
const loadedOnce = ref(false);
const selectedUserId = ref("");
const search = ref("");
const removeQuantities = reactive({});
const removingKey = ref("");
const userProfiles = ref({});

const usersSorted = computed(() => {
  const list = Array.isArray(users.value) ? [...users.value] : [];
  const query = search.value.trim().toLowerCase();
  const filtered = query
    ? list.filter((user) => {
        const name = displayName(user).toLowerCase();
        const username = String(user.username || "").toLowerCase();
        const idValue = String(user.userId || "").toLowerCase();
        return name.includes(query) || username.includes(query) || idValue.includes(query);
      })
    : list;
  filtered.sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { sensitivity: "base" }));
  return filtered;
});

const selectedUser = computed(
  () => users.value.find((user) => String(user.userId) === String(selectedUserId.value)) || null
);

const inventoryStats = computed(() => {
  const list = users.value || [];
  const members = list.length;
  const totalItems = list.reduce((sum, user) => sum + Number(user.totalQuantity || 0), 0);
  const distinctTypes = new Set(
    list.flatMap((user) => (user.items || []).map((item) => String(item.itemId)))
  ).size;
  return { members, totalItems, distinctTypes };
});

const parseJsonSafe = async (res, fallback = {}) => {
  try {
    return await res.json();
  } catch {
    return fallback;
  }
};

const handleUnauthorized = (res) => {
  if (res?.status !== 401) return false;
  login();
  return true;
};

const handleActionFailure = async (res, { genericMessage = "Action impossible." } = {}) => {
  if (handleUnauthorized(res)) return true;
  if (res.ok) return false;
  const data = await parseJsonSafe(res.clone(), {});
  const errorMessage = String(data?.error || "").trim();
  alert(errorMessage ? `${genericMessage} (${errorMessage})` : genericMessage);
  return true;
};

const displayName = (user) => {
  const userId = String(user?.userId || "");
  return (
    userProfiles.value[userId]?.displayName ||
    user?.username ||
    userId ||
    t("common.na")
  );
};

const avatarRaw = (user) => {
  const userId = String(user?.userId || "");
  const info = userProfiles.value[userId] || {};
  return info.avatar || user?.avatar || "";
};

const removeKey = (userId, itemId) => `${userId}-${itemId}`;

const removeQty = (userId, entry) =>
  Math.max(1, Number(removeQuantities[removeKey(userId, entry.itemId)] || 1));

const bumpQty = (userId, itemId, delta, max) => {
  const key = removeKey(userId, itemId);
  const current = Math.max(1, Number(removeQuantities[key] || 1));
  removeQuantities[key] = Math.min(max, Math.max(1, current + delta));
};

const selectUser = (userId) => {
  selectedUserId.value = String(userId || "");
};

const resolveUserIds = async (ids, attempt = 1) => {
  const unique = Array.from(
    new Set(
      (ids || [])
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter((value) => /^\d{5,22}$/.test(value))
    )
  );
  const missing = unique.filter((userId) => {
    const entry = userProfiles.value[userId];
    if (!entry) return true;
    if (entry.resolved === true || entry.notFound === true) return false;
    return true;
  });
  if (!missing.length) return;

  const token = getToken();
  const chunkSize = 8;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const res = await fetch(`${config.public.apiBase}/api/guilds/${props.guildId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userIds: chunk })
    });
    if (!res.ok) continue;
    const data = await parseJsonSafe(res, {});
    const profiles = data.users || {};
    const normalized = {};
    for (const userId of chunk) {
      const profile = profiles[userId] || profiles[String(userId)] || null;
      const key = String(userId);
      const previous = userProfiles.value[key] || {};
      const display = String(profile?.displayName || profile?.username || previous.displayName || key).trim();
      const username = String(profile?.username || previous.username || "").trim();
      const notFound = Boolean(profile?.notFound);
      const ok =
        Boolean(profile?.ok) ||
        (display && display !== key && !/^\d{16,22}$/.test(display));
      normalized[key] = {
        displayName: display || key,
        username,
        avatar: profile?.avatar || previous.avatar || "",
        notFound,
        resolved: ok || notFound || attempt >= 4
      };
    }
    userProfiles.value = { ...userProfiles.value, ...normalized };
  }

  if (attempt >= 4) return;
  const unresolved = missing.filter((userId) => {
    const entry = userProfiles.value[userId];
    return !entry || (entry.resolved !== true && entry.notFound !== true);
  });
  if (!unresolved.length) return;
  await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  await resolveUserIds(unresolved, attempt + 1);
};

const seedRemoveQuantities = () => {
  users.value.forEach((entry) => {
    (entry.items || []).forEach((item) => {
      const key = removeKey(entry.userId, item.itemId);
      if (!removeQuantities[key]) removeQuantities[key] = 1;
    });
  });
};

const load = async ({ force = false } = {}) => {
  if (!props.guildId) return;
  if (!force && loadedOnce.value) return;
  loading.value = true;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${props.guildId}/inventories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (handleUnauthorized(res)) {
    loading.value = false;
    return;
  }
  if (!res.ok) {
    loading.value = false;
    return;
  }
  const data = await parseJsonSafe(res, {});
  users.value = data.inventories || [];
  if (!users.value.length) {
    selectedUserId.value = "";
  } else if (!users.value.some((user) => String(user.userId) === String(selectedUserId.value))) {
    selectedUserId.value = String(users.value[0].userId);
  }
  seedRemoveQuantities();
  await resolveUserIds(users.value.map((entry) => entry.userId));
  loading.value = false;
  loadedOnce.value = true;
};

const removeItem = async (userId, itemId) => {
  if (!userId || !itemId) return;
  const key = removeKey(userId, itemId);
  const quantity = Math.max(1, Number(removeQuantities[key] || 1));
  if (!confirm(t("adminGuild.inventories.removeConfirm", { count: quantity }))) return;

  removingKey.value = key;
  const token = getToken();
  const params = new URLSearchParams({ quantity: String(quantity) });
  const res = await fetch(
    `${config.public.apiBase}/api/guilds/${props.guildId}/inventory/${userId}/${itemId}?${params.toString()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  removingKey.value = "";
  if (await handleActionFailure(res, {
    genericMessage: t("adminGuild.inventories.removeError")
  })) {
    return;
  }
  await load({ force: true });
};

const formatItemType = (type) => {
  const key = String(type || "");
  if (key === "role") return t("adminGuild.shopItems.typeRole");
  if (key === "temp_role") return t("adminGuild.shopItems.typeTempRole");
  if (key === "inventory") return t("adminGuild.shopItems.typeInventory");
  if (key === "irl") return t("adminGuild.shopItems.typeIrl");
  if (key === "lootbox") return t("adminGuild.shopItems.typeLootbox");
  return key || t("common.na");
};

const typeClass = (type) => {
  const key = String(type || "inventory");
  if (["role", "temp_role", "inventory", "irl", "lootbox"].includes(key)) return key;
  return "inventory";
};

const typeEmoji = (type) => {
  const key = String(type || "");
  if (key === "role") return "🎭";
  if (key === "temp_role") return "⏳";
  if (key === "irl") return "📦";
  if (key === "lootbox") return "🎁";
  return "🎒";
};

watch(
  () => props.active,
  (isActive) => {
    if (isActive) load({ force: false });
  },
  { immediate: true }
);

defineExpose({ load });
</script>

<style scoped>
.inv-admin :deep([data-slot="body"]) {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.inv-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.inv-stat {
  position: relative;
  overflow: hidden;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(45, 212, 160, 0.22);
  background:
    linear-gradient(135deg, rgba(45, 212, 160, 0.1), rgba(56, 189, 248, 0.04)),
    var(--surface-2, var(--bg-elevated));
}

.inv-stat:nth-child(2) {
  border-color: rgba(56, 189, 248, 0.24);
  background:
    linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(129, 140, 248, 0.04)),
    var(--surface-2, var(--bg-elevated));
}

.inv-stat:nth-child(3) {
  border-color: rgba(251, 191, 36, 0.24);
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(251, 146, 60, 0.04)),
    var(--surface-2, var(--bg-elevated));
}

.inv-stat-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.inv-stat-value {
  display: block;
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}

.inv-admin-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  min-height: 520px;
}

.inv-sidebar,
.inv-detail {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-elevated);
  overflow: hidden;
}

.inv-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.inv-sidebar-head {
  padding: 14px;
  border-bottom: 1px solid var(--border);
  display: grid;
  gap: 8px;
}

.inv-search {
  position: relative;
  display: block;
}

.inv-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.inv-search input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-2, var(--bg));
  color: var(--text);
}

.inv-sidebar-meta,
.inv-sidebar-hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
}

.inv-sidebar-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px;
}

.inv-member-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inv-member-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.inv-member-row:hover {
  background: var(--accent-soft);
  transform: translateX(2px);
}

.inv-member-row.active {
  border-color: rgba(45, 212, 160, 0.42);
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.16), rgba(56, 189, 248, 0.08));
}

.inv-member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.inv-member-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-member-name {
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-member-id {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-member-badge {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent);
  background: rgba(45, 212, 160, 0.14);
  border: 1px solid rgba(45, 212, 160, 0.28);
}

.inv-detail {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow: auto;
}

.inv-user-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(45, 212, 160, 0.22);
  background:
    linear-gradient(135deg, rgba(45, 212, 160, 0.12), rgba(56, 189, 248, 0.06)),
    var(--surface-2, var(--bg-elevated));
}

.inv-user-hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}

.inv-user-hero-copy h4 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 750;
}

.inv-user-id {
  margin: 4px 0 10px;
  font-size: 0.78rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.inv-user-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.inv-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 650;
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
}

.inv-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.inv-item-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-2, var(--bg-elevated));
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.inv-item-card:hover {
  border-color: rgba(45, 212, 160, 0.35);
  box-shadow: 0 12px 28px rgba(45, 212, 160, 0.08);
  transform: translateY(-2px);
}

.inv-item-media {
  position: relative;
  height: 120px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 20%, rgba(45, 212, 160, 0.16), transparent 55%),
    radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.12), transparent 50%),
    var(--bg);
}

.inv-item-media img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid var(--border);
}

.inv-item-fallback {
  font-size: 2rem;
}

.inv-qty-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(6px);
}

.inv-item-body {
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}

.inv-item-headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.inv-item-headline h5 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
}

.inv-tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.inv-tag--role { color: #c4b5fd; background: rgba(139, 92, 246, 0.16); }
.inv-tag--temp_role { color: #93c5fd; background: rgba(59, 130, 246, 0.16); }
.inv-tag--inventory { color: #6ee7b7; background: rgba(16, 185, 129, 0.16); }
.inv-tag--irl { color: #fdba74; background: rgba(249, 115, 22, 0.16); }
.inv-tag--lootbox { color: #f9a8d4; background: rgba(236, 72, 153, 0.16); }
.inv-tag--muted { color: var(--text-muted); background: rgba(148, 163, 184, 0.12); }

.inv-item-footer {
  margin-top: auto;
  padding: 0 14px 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.inv-qty-stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg);
}

.inv-qty-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.inv-qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.inv-qty-input {
  width: 44px;
  border: none;
  background: transparent;
  text-align: center;
  font-weight: 700;
  color: var(--text);
  -moz-appearance: textfield;
}

.inv-qty-input::-webkit-outer-spin-button,
.inv-qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.inv-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 16px;
  text-align: center;
  color: var(--text-muted);
}

.inv-state--large {
  flex: 1;
  min-height: 320px;
}

.inv-state h4 {
  margin: 0;
  color: var(--text);
}

.inv-state-icon {
  width: 34px;
  height: 34px;
  opacity: 0.72;
}

.spin {
  animation: inv-spin 0.9s linear infinite;
}

@keyframes inv-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .inv-stats {
    grid-template-columns: 1fr;
  }

  .inv-admin-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .inv-sidebar-body {
    max-height: 280px;
  }

  .inv-user-hero {
    flex-direction: column;
    text-align: center;
  }

  .inv-user-pills {
    justify-content: center;
  }

  .inv-items-grid {
    grid-template-columns: 1fr;
  }
}
</style>
