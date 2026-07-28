<template>
  <UDashboardPanel id="admin-v2-settings" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardNavbar title="Réglage">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-10 w-full lg:max-w-4xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const links = [[
  { label: "Général", icon: "i-lucide-sliders-horizontal", to: "/admin-v2/settings", exact: true },
  { label: "Membres", icon: "i-lucide-users", to: "/admin-v2/settings/members" },
  { label: "Notifications", icon: "i-lucide-bell", to: "/admin-v2/settings/notifications" },
  { label: "Sécurité", icon: "i-lucide-shield", to: "/admin-v2/settings/security" }
]];
</script>
