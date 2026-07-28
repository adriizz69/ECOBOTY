<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>

<script setup>
const router = useRouter();
const config = useRuntimeConfig();
const { getToken, logout } = useAuth();

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
});

const user = ref({
  name: "Admin BOT",
  avatar: {
    icon: "i-lucide-user-cog"
  }
});

const doLogout = async () => {
  logout();
  await router.push("/");
};

const loadMe = async () => {
  try {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${config.public.apiBase}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    user.value = {
      name: data?.username || "Admin BOT",
      avatar: data?.avatar
        ? { src: `https://cdn.discordapp.com/avatars/${data.discord_id}/${data.avatar}.png?size=64` }
        : { icon: "i-lucide-user-cog" }
    };
  } catch {}
};

onMounted(loadMe);

const items = computed(() => ([
  [
    {
      type: "label",
      label: user.value.name,
      avatar: user.value.avatar
    }
  ],
  [
    { label: "Admin", icon: "i-lucide-shield", to: "/admin-v2" },
    { label: "Serveurs", icon: "i-lucide-server", to: "/servers" }
  ],
  [
    { label: "Déconnexion", icon: "i-lucide-log-out", onSelect: doLogout }
  ]
]));
</script>
