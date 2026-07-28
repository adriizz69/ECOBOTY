export const useAdminV2Guard = () => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const { getToken } = useAuth();
  const me = ref(null);
  const loading = ref(true);

  const adminUserId = String(config.public.adminUserId || "1328058083246608407");
  const isAdmin = computed(() => String(me.value?.discord_id || "") === adminUserId);

  const loadMe = async () => {
    loading.value = true;
    try {
      const token = getToken();
      if (!token) {
        me.value = null;
        return;
      }
      const res = await fetch(`${config.public.apiBase}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        me.value = null;
        return;
      }
      const data = await res.json();
      me.value = data?.user || data || null;
    } catch {
      me.value = null;
    } finally {
      loading.value = false;
    }
  };

  const requireAdmin = async () => {
    await loadMe();
    if (!isAdmin.value) {
      await router.push("/servers");
      return false;
    }
    return true;
  };

  return {
    me,
    loading,
    isAdmin,
    requireAdmin
  };
};
