export const useAdminV2Data = () => {
  const config = useRuntimeConfig();
  const { getToken } = useAuth();

  const summary = useState("admin-v2-summary", () => ({
    totalGuilds: 0,
    bannedGuilds: 0,
    totalUsers: 0,
    botAbsent: 0
  }));
  const guilds = useState("admin-v2-guilds", () => []);
  const adminLogs = useState("admin-v2-logs", () => []);

  const normalizeGuild = (row) => {
    const botPresent = Boolean(row.bot_present);
    const displayName =
      row.name && row.name !== "Unknown" ? row.name : row.bot_name || row.name || "Unknown";
    const icon = row.icon || row.bot_icon || null;
    return {
      ...row,
      bot_present: botPresent,
      user_ui_disabled: Boolean(row.user_ui_disabled),
      displayName,
      iconUrl: icon ? `https://cdn.discordapp.com/icons/${row.discord_guild_id}/${icon}.png` : ""
    };
  };

  const applyOverviewData = (data) => {
    const normalizedGuilds = (data.guilds || []).map(normalizeGuild);
    const activeCount = normalizedGuilds.filter((guild) => guild.bot_present).length;
    const absentCount = normalizedGuilds.length - activeCount;

    summary.value.totalGuilds = activeCount;
    summary.value.botAbsent = absentCount;
    summary.value.bannedGuilds = Number(data.summary?.bannedGuilds || 0);
    summary.value.totalUsers = Number(data.summary?.totalUsers || 0);

    guilds.value = normalizedGuilds;
    adminLogs.value = Array.isArray(data.logs) ? data.logs : [];
  };

  const loadOverview = async () => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${config.public.apiBase}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    applyOverviewData(data);
  };

  const sendBroadcast = async ({ message, includeBanned }) => {
    const token = getToken();
    if (!token) return { ok: false, message: "Token manquant" };
    const res = await fetch(`${config.public.apiBase}/api/admin/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, includeBanned })
    });
    if (!res.ok) {
      return { ok: false, message: "Erreur lors de l'envoi." };
    }
    const data = await res.json();
    const sent = Number(data.sent || 0);
    const eligible = Number(data.eligible || 0);
    const total = Number(data.totalConfigured || 0);
    const failed = Number(data.failed || 0);
    const skipped = Number(data.skippedBanned || 0);

    if (total === 0) return { ok: true, message: "Aucun serveur n’a de salon log bot configuré." };
    if (eligible === 0) return { ok: true, message: "Aucun serveur éligible (bannis exclus)." };
    if (sent === 0) return { ok: true, message: `0/${eligible} envoyés (échec ${failed}).` };
    return {
      ok: true,
      message: `Message envoyé à ${sent}/${eligible} serveurs${skipped > 0 ? ` (${skipped} bannis ignorés)` : ""}.`
    };
  };

  const loadWelcomeSettings = async () => {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${config.public.apiBase}/api/admin/welcome-message`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.settings || null;
  };

  const saveWelcomeSettings = async (payload) => {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${config.public.apiBase}/api/admin/welcome-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    return res.ok;
  };

  const banGuild = async (guildId, reason) => {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${config.public.apiBase}/api/admin/guilds/${guildId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason })
    });
    return res.ok;
  };

  const loadGuildDetails = async (guildId) => {
    const token = getToken();
    if (!token) throw new Error("auth_required");
    const normalized = String(guildId || "").replace(/\D/g, "");
    if (!normalized) throw new Error("invalid_guild_id");
    const res = await fetch(`${config.public.apiBase}/api/admin/guilds/${normalized}/details`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "guild_details_failed");
    return data.details || null;
  };

  const unbanGuild = async (guildId) => {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${config.public.apiBase}/api/admin/guilds/${guildId}/unban`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  };

  const createInvite = async (guildId) => {
    const token = getToken();
    if (!token) return "";
    const res = await fetch(`${config.public.apiBase}/api/admin/guilds/${guildId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ maxAge: 3600, maxUses: 1 })
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.invite?.url || "";
  };

  const loadDbInfo = async () => {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${config.public.apiBase}/api/admin/db-info`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.info || null;
  };

  const setUserUiGlobal = async (disabled) => {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${config.public.apiBase}/api/admin/user-ui/global`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ disabled })
    });
    return res.ok;
  };

  const setUserUiForGuild = async (guildId, disabled) => {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${config.public.apiBase}/api/admin/guilds/${guildId}/user-ui`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ disabled })
    });
    return res.ok;
  };

  const loadDashboardNotifications = async ({ limit = 50 } = {}) => {
    const token = getToken();
    if (!token) return [];
    const params = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(`${config.public.apiBase}/api/admin/notifications?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.notifications) ? data.notifications : [];
  };

  const loadDashboardStats = async ({
    limit = 50,
    preset = "month",
    month = null,
    year = null,
    start = null,
    end = null,
    granularity = "auto",
    timeZone = "UTC"
  } = {}) => {
    const token = getToken();
    if (!token) return null;
    const params = new URLSearchParams({
      limit: String(limit),
      preset: String(preset || "month"),
      granularity: String(granularity || "auto"),
      timeZone: String(timeZone || "UTC")
    });
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    if (start) params.set("start", String(start));
    if (end) params.set("end", String(end));
    const res = await fetch(`${config.public.apiBase}/api/admin/stats?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.stats || null;
  };

  const loadTopggOverview = async () => {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${config.public.apiBase}/api/admin/topgg`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return res.json();
  };

  const saveTopggSettings = async (payload) => {
    const token = getToken();
    if (!token) return { ok: false, message: "Token manquant" };
    const res = await fetch(`${config.public.apiBase}/api/admin/topgg/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, message: data.error || "Erreur sauvegarde Top.gg" };
    }
    const data = await res.json();
    return { ok: true, settings: data.settings || null };
  };

  const syncTopggMetrics = async () => {
    const token = getToken();
    if (!token) return { ok: false, message: "Token manquant" };
    const res = await fetch(`${config.public.apiBase}/api/admin/topgg/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: data.error || "Sync Top.gg échouée" };
    }
    return { ok: Boolean(data.ok), ...data };
  };

  const loadTopggVotes = async (limit = 50) => {
    const token = getToken();
    if (!token) return [];
    const res = await fetch(`${config.public.apiBase}/api/admin/topgg/votes?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.votes) ? data.votes : [];
  };

  const loadBillingCatalogOverview = async () => {
    const token = getToken();
    if (!token) throw new Error("auth_required");
    const res = await fetch(`${config.public.apiBase}/api/admin/billing/catalog`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "billing_catalog_overview_failed");
    return data;
  };

  const syncBillingCatalog = async () => {
    const token = getToken();
    if (!token) throw new Error("auth_required");
    const res = await fetch(`${config.public.apiBase}/api/admin/billing/catalog/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.reason || "billing_catalog_sync_failed");
    return data;
  };

  const recreateBillingCatalogZeroTax = async () => {
    const token = getToken();
    if (!token) throw new Error("auth_required");
    const res = await fetch(`${config.public.apiBase}/api/admin/billing/catalog/recreate-zero-tax`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.reason || "billing_catalog_recreate_failed");
    return data;
  };

  const syncGuildBilling = async (guildId) => {
    const token = getToken();
    if (!token) throw new Error("auth_required");
    const normalized = String(guildId || "").replace(/\D/g, "");
    if (!normalized) throw new Error("invalid_guild_id");
    const res = await fetch(`${config.public.apiBase}/api/admin/billing/guilds/${normalized}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.reason || "billing_guild_sync_failed");
    return data;
  };

  const adminBillingFetch = async (path, options = {}) => {
    const token = getToken();
    if (!token) throw new Error("auth_required");
    const res = await fetch(`${config.public.apiBase}/api/admin/billing${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "billing_admin_request_failed");
    return data;
  };

  const loadBillingDashboard = async () => adminBillingFetch("/overview");
  const loadBillingAccounts = async () => adminBillingFetch("/accounts");
  const loadBillingPromoCodes = async () => adminBillingFetch("/promo-codes");
  const loadBillingWebhookEvents = async () => adminBillingFetch("/webhooks?limit=80");
  const createBillingPromoCode = async (payload) =>
    adminBillingFetch("/promo-codes", { method: "POST", body: JSON.stringify(payload) });
  const deactivateBillingPromoCode = async (id) =>
    adminBillingFetch(`/promo-codes/${id}/deactivate`, { method: "POST" });
  const cancelBillingGuildSubscription = async (guildId, payload = {}) => {
    const normalized = String(guildId || "").replace(/\D/g, "");
    return adminBillingFetch(`/guilds/${normalized}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  };
  const refundBillingGuildSubscription = async (guildId, payload = {}) => {
    const normalized = String(guildId || "").replace(/\D/g, "");
    return adminBillingFetch(`/guilds/${normalized}/refund`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  };
  const loadBillingRefundQuote = async (guildId) => {
    const normalized = String(guildId || "").replace(/\D/g, "");
    return adminBillingFetch(`/guilds/${normalized}/refund-quote`);
  };

  return {
    summary,
    guilds,
    adminLogs,
    loadOverview,
    sendBroadcast,
    loadWelcomeSettings,
    saveWelcomeSettings,
    banGuild,
    unbanGuild,
    loadGuildDetails,
    createInvite,
    loadDbInfo,
    setUserUiGlobal,
    setUserUiForGuild,
    loadDashboardNotifications,
    loadDashboardStats,
    loadTopggOverview,
    saveTopggSettings,
    syncTopggMetrics,
    loadTopggVotes,
    loadBillingCatalogOverview,
    syncBillingCatalog,
    recreateBillingCatalogZeroTax,
    syncGuildBilling,
    loadBillingDashboard,
    loadBillingAccounts,
    loadBillingPromoCodes,
    loadBillingWebhookEvents,
    createBillingPromoCode,
    deactivateBillingPromoCode,
    cancelBillingGuildSubscription,
    refundBillingGuildSubscription,
    loadBillingRefundQuote
  };
};
