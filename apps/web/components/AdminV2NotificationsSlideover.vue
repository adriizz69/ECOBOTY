<template>
  <USlideover v-model:open="isNotificationsSlideoverOpen" title="Notifications">
    <template #body>
      <div class="flex items-center justify-between gap-2 pb-2">
        <p class="text-xs text-muted">Clique une notification pour la marquer comme lue.</p>
        <UButton color="neutral" variant="ghost" size="xs" @click="markAllNotificationsRead">
          Tout marquer lu
        </UButton>
      </div>

      <div v-if="notificationsLoading" class="space-y-2">
        <USkeleton class="h-16 w-full rounded-lg" />
        <USkeleton class="h-16 w-full rounded-lg" />
        <USkeleton class="h-16 w-full rounded-lg" />
      </div>

      <div v-else-if="!notifications.length" class="rounded-lg border border-default bg-elevated/30 p-3 text-sm text-muted">
        Aucune notification pour le moment.
      </div>

      <div v-else class="v2-notifs">
        <NuxtLink
          v-for="item in notifications"
          :key="item.id"
          :to="item.route || '/admin-v2'"
          class="v2-notif"
          :class="{ 'v2-notif--read': isNotificationRead(item) }"
          @click="onNotificationClick(item)"
        >
          <div class="v2-notif-head">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <UIcon :name="item.icon || iconByKind(item.kind)" class="size-4 shrink-0" />
                <span class="truncate v2-notif-title">{{ item.title || 'Notification' }}</span>
              </div>
              <p class="v2-notif-body">{{ item.body || '—' }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <span v-if="!isNotificationRead(item)" class="size-2 rounded-full bg-primary" />
              <span class="v2-notif-shortcut">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </template>
  </USlideover>
</template>

<script setup>
const {
  isNotificationsSlideoverOpen,
  notifications,
  notificationsLoading,
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  isNotificationRead
} = useAdminV2Dashboard();

const iconByKind = (kind) => {
  if (kind === 'guild_joined') return 'i-lucide-server-cog';
  if (kind === 'guild_left') return 'i-lucide-server-off';
  if (kind === 'user_joined') return 'i-lucide-user-plus';
  if (kind === 'bot_inactive') return 'i-lucide-triangle-alert';
  if (kind === 'bot_recovered') return 'i-lucide-shield-check';
  return 'i-lucide-bell';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR');
};

const onNotificationClick = (item) => {
  markNotificationRead(item);
  isNotificationsSlideoverOpen.value = false;
};

watch(
  () => isNotificationsSlideoverOpen.value,
  (open) => {
    if (open) {
      void loadNotifications({ force: true });
    }
  }
);
</script>

<style scoped>
.v2-notifs {
  display: grid;
  gap: 8px;
}

.v2-notif {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in oklab, var(--ui-border) 80%, transparent);
  background: color-mix(in oklab, var(--ui-bg-elevated) 80%, transparent);
}

.v2-notif:hover {
  border-color: color-mix(in oklab, var(--ui-primary) 40%, var(--ui-border));
}

.v2-notif--read {
  opacity: 0.7;
}

.v2-notif-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.v2-notif-title {
  font-weight: 600;
}

.v2-notif-shortcut {
  font-size: 11px;
  opacity: 0.8;
  white-space: nowrap;
}

.v2-notif-body {
  margin: 6px 0 0;
  font-size: 13px;
  opacity: 0.9;
}
</style>
