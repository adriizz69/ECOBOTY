<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-44' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedWorkspace,
        label: collapsed ? undefined : selectedWorkspace?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>

<script setup>
defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
});

const workspaces = ref([
  {
    label: "Admin EcoBoty",
    avatar: { icon: "i-lucide-shield" }
  }
]);

const selectedWorkspace = ref(workspaces.value[0]);

const items = computed(() => [
  workspaces.value.map((workspace) => ({
    ...workspace,
    onSelect: () => {
      selectedWorkspace.value = workspace;
    }
  })),
  [
    {
      label: "Tableau de bord",
      icon: "i-lucide-layout-dashboard",
      to: "/admin-v2"
    }
  ]
]);
</script>
