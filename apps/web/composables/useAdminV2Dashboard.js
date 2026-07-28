export const useAdminV2Dashboard = () => {
  const route = useRoute();
  const router = useRouter();
  const isNotificationsSlideoverOpen = useState("admin-v2-notifications-open", () => false);
  const notifications = useState("admin-v2-notifications", () => []);
  const notificationsLoading = useState("admin-v2-notifications-loading", () => false);
  const readNotificationKeys = useState("admin-v2-notifications-read", () => []);
  const readLoaded = useState("admin-v2-notifications-read-loaded", () => false);

  const { loadDashboardNotifications } = useAdminV2Data();

  const storageKey = "ecoboty_admin_v2_notifications_read";

  const loadReadState = () => {
    if (!process.client || readLoaded.value) return;
    readLoaded.value = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        readNotificationKeys.value = [];
        return;
      }
      const parsed = JSON.parse(raw);
      readNotificationKeys.value = Array.isArray(parsed)
        ? parsed.map((value) => String(value)).filter(Boolean)
        : [];
    } catch {
      readNotificationKeys.value = [];
    }
  };

  const persistReadState = () => {
    if (!process.client) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(readNotificationKeys.value));
    } catch {
      // ignore localStorage write failures
    }
  };

  const isNotificationRead = (notification) => {
    const key = String(notification?.readKey || notification?.id || "");
    if (!key) return false;
    return readNotificationKeys.value.includes(key);
  };

  const markNotificationRead = (notification) => {
    const key = String(notification?.readKey || notification?.id || "");
    if (!key || readNotificationKeys.value.includes(key)) return;
    readNotificationKeys.value = [...readNotificationKeys.value, key];
    persistReadState();
  };

  const markAllNotificationsRead = () => {
    const keys = notifications.value
      .map((notification) => String(notification?.readKey || notification?.id || ""))
      .filter(Boolean);
    if (!keys.length) return;
    readNotificationKeys.value = Array.from(new Set([...readNotificationKeys.value, ...keys]));
    persistReadState();
  };

  const loadNotifications = async ({ force = false } = {}) => {
    loadReadState();
    if (notificationsLoading.value) return notifications.value;
    if (!force && notifications.value.length) return notifications.value;

    notificationsLoading.value = true;
    try {
      const list = await loadDashboardNotifications({ limit: 80 });
      notifications.value = Array.isArray(list) ? list : [];
    } finally {
      notificationsLoading.value = false;
    }

    return notifications.value;
  };

  const openNotifications = async () => {
    await loadNotifications();
    isNotificationsSlideoverOpen.value = true;
  };

  const unreadCount = computed(() =>
    (notifications.value || []).filter((notification) => !isNotificationRead(notification)).length
  );

  defineShortcuts({
    "g-h": () => router.push("/admin-v2"),
    "g-b": () => router.push("/admin-v2/broadcast"),
    "g-w": () => router.push("/admin-v2/welcome"),
    "g-g": () => router.push("/admin-v2/global-settings"),
    "g-v": () => router.push("/admin-v2/servers"),
    "g-u": () => router.push("/admin-v2/users"),
    "g-t": () => router.push("/admin-v2/stats"),
    "g-l": () => router.push("/admin-v2/logs"),
    "g-d": () => router.push("/admin-v2/database"),
    "g-s": () => router.push("/admin-v2/settings"),
    n: () => {
      if (isNotificationsSlideoverOpen.value) {
        isNotificationsSlideoverOpen.value = false;
      } else {
        void openNotifications();
      }
    }
  });

  watch(
    () => route.fullPath,
    () => {
      isNotificationsSlideoverOpen.value = false;
    }
  );

  if (process.client) {
    onMounted(() => {
      loadReadState();
      void loadNotifications();
    });
  }

  return {
    isNotificationsSlideoverOpen,
    notifications,
    notificationsLoading,
    unreadCount,
    openNotifications,
    loadNotifications,
    isNotificationRead,
    markNotificationRead,
    markAllNotificationsRead
  };
};
