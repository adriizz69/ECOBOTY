<template>
  <UDashboardGroup unit="rem" class="admin-shell">
    <UDashboardSidebar
      id="admin-v2"
      v-model:open="open"
      collapsible
      resizable
      class="bg-default/40 backdrop-blur-md border-default"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <AdminV2TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <AdminV2UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <AdminV2NotificationsSlideover />
  </UDashboardGroup>
</template>

<script setup>
const route = useRoute();
const open = ref(false);

useAdminV2Dashboard();

const isRouteActive = (path) => {
  if (path === "/admin-v2/settings") {
    return route.path === path || route.path.startsWith("/admin-v2/settings/");
  }
  return route.path === path;
};

const primaryLinks = computed(() => [
  { label: "Vue d’ensemble", icon: "i-lucide-layout-dashboard", to: "/admin-v2" },
  { label: "Broadcast", icon: "i-lucide-send", to: "/admin-v2/broadcast" },
  { label: "Bienvenue", icon: "i-lucide-message-square-heart", to: "/admin-v2/welcome" },
  { label: "Réglages globaux", icon: "i-lucide-sliders-horizontal", to: "/admin-v2/global-settings" },
  { label: "Serveurs", icon: "i-lucide-server", to: "/admin-v2/servers" },
  { label: "Utilisateurs", icon: "i-lucide-users", to: "/admin-v2/users" },
  { label: "Top.gg", icon: "i-lucide-trophy", to: "/admin-v2/topgg" },
  { label: "Stripe / Premium", icon: "i-lucide-credit-card", to: "/admin-v2/billing" },
  { label: "Statistiques", icon: "i-lucide-chart-column", to: "/admin-v2/stats" },
  { label: "Logs", icon: "i-lucide-scroll-text", to: "/admin-v2/logs" },
  { label: "Base de données", icon: "i-lucide-database", to: "/admin-v2/database" },
  { label: "Réglages", icon: "i-lucide-settings-2", to: "/admin-v2/settings" }
].map((item) => ({
  ...item,
  active: typeof item.active === "boolean" ? item.active : isRouteActive(item.to),
  onSelect: item.onSelect || (() => {
    open.value = false;
  })
})));

const secondaryLinks = computed(() => ([
  {
    label: "Retour site",
    icon: "i-lucide-arrow-left",
    to: "/servers",
    onSelect: () => {
      open.value = false;
    }
  }
]));

const links = computed(() => [primaryLinks.value, secondaryLinks.value]);

const flattenLinks = (items = []) => {
  return items.flatMap((item) => {
    const children = Array.isArray(item.children) ? flattenLinks(item.children) : [];
    return [item, ...children];
  });
};

const groups = computed(() => [
  {
    id: "navigation",
    label: "Navigation",
    items: flattenLinks([...primaryLinks.value, ...secondaryLinks.value])
  }
]);
</script>
