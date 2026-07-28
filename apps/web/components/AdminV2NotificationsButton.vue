<template>
  <UTooltip text="Notifications" :shortcuts="['N']">
    <UButton color="neutral" variant="ghost" square class="relative" @click="openNotifications">
      <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
      <span
        v-if="unreadCount > 0"
        class="pointer-events-none absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 text-center text-[10px] font-semibold leading-5 text-primary-foreground"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </UButton>
  </UTooltip>
</template>

<script setup>
const { unreadCount, openNotifications } = useAdminV2Dashboard();
</script>
