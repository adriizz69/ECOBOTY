<template>
  <UApp>
    <div class="app">
    <aside class="sidebar">
        <div class="brand">
          <div class="logo">
            <img src="/logo.png" alt="ECOBOTY" />
          </div>
          <div>
            <div class="title">ECOBOTY</div>
            <div class="subtitle">{{ $t("brand.subtitle") }}</div>
          </div>
        </div>
      <nav class="side-nav">
        <NuxtLink to="/" class="side-link">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">{{ $t("nav.home") }}</span>
        </NuxtLink>
        <NuxtLink v-if="isLoggedIn && !isImpersonating" to="/servers" class="side-link">
          <span class="nav-icon">🧭</span>
          <span class="nav-label">{{ $t("nav.servers") }}</span>
        </NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/user" class="side-link">
          <span class="nav-icon">👥</span>
          <span class="nav-label">{{ $t("nav.userSpace") }}</span>
        </NuxtLink>
        <NuxtLink to="/setup" class="side-link">
          <span class="nav-icon">📡</span>
          <span class="nav-label">{{ $t("nav.status") }}</span>
        </NuxtLink>
        <NuxtLink to="/documentation" class="side-link">
          <span class="nav-icon">📘</span>
          <span class="nav-label">{{ $t("nav.documentation") }}</span>
        </NuxtLink>
        <button v-if="isLoggedIn" class="side-link logout-link" type="button" @click="handleLogout">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">{{ $t("nav.logout") }}</span>
        </button>
        <button v-else class="side-link login-link" type="button" @click="handleLogin">
          <span class="nav-icon">🔐</span>
          <span class="nav-label">{{ $t("nav.login") }}</span>
        </button>
        <a
          class="side-link support-link"
          href="https://discord.gg/e6eUHaqyGt"
          target="_blank"
          rel="noreferrer"
        >
          <span class="nav-icon">💬</span>
          <span class="nav-label">{{ $t("nav.support") }}</span>
        </a>
      </nav>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-footer">
        <NuxtLink v-if="isAdmin" to="/admin" class="side-link admin-link">
          <span class="nav-icon">🛠️</span>
          <span class="nav-label">{{ $t("nav.adminBot") }}</span>
        </NuxtLink>
        <div v-if="isImpersonating" class="impersonation">
          <div class="impersonation-label">{{ $t("impersonation.label") }}</div>
          <div class="impersonation-name">
            {{ me?.impersonated_username || me?.impersonated || $t("account.user") }}
          </div>
          <UButton color="primary" variant="solid" size="xs" @click="stopImpersonation">
            {{ $t("impersonation.quit") }}
          </UButton>
        </div>
        <div class="account">
          <div class="avatar" :style="{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : '' }">
            <span v-if="!avatarUrl">👤</span>
          </div>
          <div>
            <div class="account-label">{{ $t("account.label") }}</div>
            <div class="account-name">{{ me?.username || $t("account.notConnected") }}</div>
          </div>
        </div>
        <div class="server">
          <div class="server-label">{{ $t("server.label") }}</div>
          <div class="server-name">
            {{ selectedGuild?.name || selectedGuild?.id || $t("server.none") }}
          </div>
        </div>
        <div class="locale-row">
          <div class="locale">
            <div class="sr-only">{{ $t("language.label") }}</div>
            <ClientOnly>
              <USelectMenu
                v-model="selectedLocale"
                :items="localeOptions"
                label-key="label"
                value-key="value"
                :searchable="false"
                :popper="{ placement: 'top-start' }"
                size="sm"
                class="locale-select-menu"
              >
                <template #default>
                  <div class="locale-selected">
                    <img :src="selectedLocaleItem?.flag" :alt="selectedLocaleItem?.label" class="locale-flag" />
                    <span>{{ selectedLocaleItem?.label }}</span>
                  </div>
                </template>
                <template #item-leading="{ item }">
                  <img :src="item.flag" :alt="item.label" class="locale-flag" />
                </template>
                <template #item="{ item }">
                  <div class="locale-option">
                    <span>{{ item.label }}</span>
                  </div>
                </template>
              </USelectMenu>
            </ClientOnly>
          </div>
          <div v-if="!disableLightMode" class="theme-toggle">
            <div class="sr-only">{{ $t("theme.label") }}</div>
            <ClientOnly>
              <UColorModeSelect size="sm" />
            </ClientOnly>
          </div>
        </div>
      </div>
    </aside>
    <div class="content">
      <header class="topbar">
        <div class="topbar-title">{{ $t("topbar.title") }}</div>
        <div class="topbar-actions">
          <UBadge color="success" variant="solid">{{ $t("topbar.online") }}</UBadge>
        </div>
      </header>
      <main class="main">
        <NuxtPage />
      </main>
    </div>
    <div v-if="showCookieBanner" class="cookie-banner">
      <UCard class="cookie-card">
        <div class="cookie-text">
          <i18n-t keypath="cookies.text">
            <NuxtLink to="/confidentialite" class="cookie-link">
              {{ $t("cookies.privacy") }}
            </NuxtLink>
          </i18n-t>
        </div>
        <div class="cookie-actions">
          <UButton color="success" variant="solid" size="sm" @click="acceptCookies">
            {{ $t("cookies.accept") }}
          </UButton>
          <UButton color="neutral" variant="outline" size="sm" @click="refuseCookies">
            {{ $t("cookies.reject") }}
          </UButton>
        </div>
      </UCard>
    </div>
    </div>
  </UApp>
</template>

<script setup>
useHead({
  link: [
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "apple-touch-icon", href: "/logo.png" }
  ]
});
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const { setToken, getToken, logout, logoutAll, login } = useAuth();
const { locale, locales, setLocale } = useI18n();
const isLoggedIn = ref(false);
const me = ref(null);
const selectedGuild = ref(null);
const adminUserId = computed(() => String(config.public.adminUserId || ""));
const isAdmin = computed(() => String(me.value?.discord_id || "") === adminUserId.value);
const isImpersonating = computed(() => Boolean(me.value?.impersonated));
const consentCookie = useCookie("cookie_consent", { maxAge: 60 * 60 * 24 * 180, sameSite: "lax" });
const showCookieBanner = computed(
  () => consentCookie.value !== "accepted" && consentCookie.value !== "refused"
);
const defaultTawkWidgetUrl = "https://embed.tawk.to/69a1b03b37d2cc1c36f4a8a7/1jifpgq5r";
const adsenseClient = computed(() => String(config.public.adsenseClient || "").trim());
const tawkToWidgetUrl = computed(
  () => String(config.public.tawkToWidgetUrl || defaultTawkWidgetUrl).trim()
);
const shouldLoadAdsense = computed(
  () => consentCookie.value === "accepted" && adsenseClient.value.length > 0
);
const shouldLoadTawk = computed(
  () => consentCookie.value === "accepted" && tawkToWidgetUrl.value.length > 0
);

const colorMode = useColorMode();
const disableLightMode = true;
const localeFlags = {
  fr: "/flags/fr.svg",
  en: "/flags/gb.svg",
  es: "/flags/es.svg"
};

const localeOptions = [
  { value: "fr", label: "Français", flag: "/flags/fr.svg" },
  { value: "en", label: "English", flag: "/flags/gb.svg" },
  { value: "es", label: "Español", flag: "/flags/es.svg" }
];


const selectedLocale = computed({
  get: () => locale.value,
  set: (value) => {
    if (!value) return;
    if (value !== locale.value) setLocale(value);
  }
});
const selectedLocaleItem = computed(
  () => localeOptions.find((item) => item.value === selectedLocale.value) || localeOptions[0]
);
const htmlLang = computed(() => locale.value || "fr");
const htmlDir = computed(() => "ltr");

useHead({
  htmlAttrs: {
    lang: htmlLang,
    dir: htmlDir
  }
});

const ensureAdsenseLoaded = () => {
  if (!process.client) return;
  if (!shouldLoadAdsense.value) return;
  if (!adsenseClient.value) return;

  let meta = document.querySelector('meta[name="google-adsense-account"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "google-adsense-account");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", adsenseClient.value);

  const targetSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient.value)}`;
  const existingScripts = Array.from(
    document.querySelectorAll('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')
  );
  const hasExactScript = existingScripts.some((s) => (s.getAttribute("src") || "") === targetSrc);
  if (hasExactScript) return;
  existingScripts.forEach((s) => s.remove());

  const script = document.createElement("script");
  script.async = true;
  script.src = targetSrc;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
};

const ensureTawkLoaded = () => {
  if (!process.client) return;
  if (!shouldLoadTawk.value) return;

  const existingScript = document.querySelector('script[data-tawk-widget="1"]');
  if (existingScript?.getAttribute("src") === tawkToWidgetUrl.value) return;
  if (existingScript) existingScript.remove();

  const globalWindow = window;
  globalWindow.Tawk_API = globalWindow.Tawk_API || {};
  globalWindow.Tawk_LoadStart = new Date();

  const script = document.createElement("script");
  script.async = true;
  script.src = tawkToWidgetUrl.value;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  script.setAttribute("data-tawk-widget", "1");
  document.head.appendChild(script);
};

watch([shouldLoadAdsense, adsenseClient], () => {
  ensureAdsenseLoaded();
}, { immediate: true });

watch([shouldLoadTawk, tawkToWidgetUrl], () => {
  ensureTawkLoaded();
}, { immediate: true });

const avatarUrl = computed(() => {
  if (!me.value?.discord_id || !me.value?.avatar) return "";
  return `https://cdn.discordapp.com/avatars/${me.value.discord_id}/${me.value.avatar}.png`;
});

const loadSelectedGuild = () => {
  if (!process.client) return;
  try {
    const raw = localStorage.getItem("selectedGuild");
    selectedGuild.value = raw ? JSON.parse(raw) : null;
  } catch {
    selectedGuild.value = null;
  }
};

const loadMe = async (allowRetry = true) => {
  const token = getToken();
  if (!token) {
    me.value = null;
    isLoggedIn.value = false;
    return;
  }
  try {
    const res = await fetch(`${config.public.apiBase}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) {
        logout();
        const nextToken = getToken();
        isLoggedIn.value = Boolean(nextToken);
        if (allowRetry && nextToken && nextToken !== token) {
          await loadMe(false);
          return;
        }
      }
      me.value = null;
      return;
    }
    const data = await res.json();
    me.value = data.user || null;
    isLoggedIn.value = true;
  } catch {
    me.value = null;
  }
};

const handleLogin = () => {
  login();
};

const handleLogout = () => {
  logoutAll();
  isLoggedIn.value = false;
  me.value = null;
  selectedGuild.value = null;
  if (process.client) {
    localStorage.removeItem("selectedGuild");
  }
  router.push("/");
};

const stopImpersonation = () => {
  logout();
  const token = syncAuthState();
  if (!token) {
    router.push("/");
    return;
  }
  loadMe();
  if (route.path.startsWith("/user")) {
    router.push("/admin");
  }
};

const acceptCookies = () => {
  consentCookie.value = "accepted";
};

const refuseCookies = () => {
  consentCookie.value = "refused";
};

const syncAuthState = () => {
  const token = getToken();
  isLoggedIn.value = Boolean(token);
  return token;
};

onMounted(() => {
  const token = route.query.token;
  const impersonate = String(route.query.impersonate || "") === "1";
  if (typeof token === "string" && token.length > 0) {
    setToken(token, { session: impersonate });
    isLoggedIn.value = true;
    if (route.path === "/callback") {
      const redirect = route.query.redirect;
      if (typeof redirect === "string" && redirect.length > 0) {
        try {
          const url = new URL(redirect, window.location.origin);
          if (url.origin === window.location.origin) {
            navigateTo(url.pathname + url.search + url.hash);
            return;
          }
          window.location.href = redirect;
          return;
        } catch {
          navigateTo(redirect);
          return;
        }
      }
      navigateTo("/servers");
    }
  }
  syncAuthState();
  loadSelectedGuild();
  loadMe();
  if (disableLightMode) {
    colorMode.value = "dark";
  }
  const mode = (disableLightMode ? "dark" : colorMode.value) || "dark";
  document.body.classList.toggle("theme-light", mode === "light");
  document.body.classList.toggle("theme-dark", mode !== "light");
});

watch(
  () => route.fullPath,
  () => {
    syncAuthState();
    loadSelectedGuild();
    loadMe();
  }
);

watch(
  () => colorMode.value,
  (value) => {
    if (disableLightMode && value !== "dark") {
      colorMode.value = "dark";
      return;
    }
    const next = value === "light" ? "light" : "dark";
    document.body.classList.toggle("theme-light", next === "light");
    document.body.classList.toggle("theme-dark", next !== "light");
  }
);
</script>

<style scoped>
:global(*),
:global(*::before),
:global(*::after) {
  box-sizing: border-box;
}
:global(body) {
  margin: 0;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  background: radial-gradient(1200px 800px at 10% 10%, #0b1220 0%, #0b0f1a 40%, #070a12 100%);
  background-color: var(--bg);
  color: var(--text);
}
:global(body.theme-light) {
  background: var(--bg);
  color: var(--text);
}
:global(html.light body),
:global(body.theme-light) {
  background: #f6f7fb !important;
}
.app {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  padding: 16px;
  background: transparent;
}
:global(html.light body) .app,
:global(body.theme-light) .app {
  background: #f6f7fb !important;
}
.locale-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: end;
}
.theme-toggle {
  display: grid;
  gap: 8px;
  justify-items: stretch;
}
.locale-select-menu :global(.u-button),
.locale-select-menu :global(.u-select-menu__trigger) {
  width: 100%;
}
.theme-toggle :global(.u-button),
.theme-toggle :global(.u-select-menu__trigger) {
  width: 100%;
}
.locale-select-menu :global(.u-button),
.theme-toggle :global(.u-button) {
  min-height: 54px;
  padding: 14px 18px;
  font-size: 14px;
  font-weight: 700;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.locale-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.locale-selected {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.sidebar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 16px;
  height: calc(100vh - 32px);
}
:global(body.theme-light) .sidebar {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  overflow: hidden;
}
.logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.title {
  font-weight: 700;
  letter-spacing: 0.3px;
}
.subtitle {
  font-size: 12px;
  color: var(--text-muted);
}
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.admin-link {
  margin-bottom: 12px;
  border-color: rgba(34, 197, 94, 0.25);
  background: rgba(34, 197, 94, 0.12);
}
.admin-link .nav-icon {
  background: rgba(34, 197, 94, 0.22);
}
.side-link {
  color: var(--text);
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  cursor: pointer;
}
.login-link {
  color: #dbeafe;
  border-color: rgba(59, 130, 246, 0.28);
  background: rgba(37, 99, 235, 0.16);
}
.login-link .nav-icon {
  background: rgba(59, 130, 246, 0.24);
}
.logout-link {
  color: #fecaca;
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.08);
}
.logout-link .nav-icon {
  background: rgba(239, 68, 68, 0.18);
}
.support-link {
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.1);
  color: #bfdbfe;
}
.support-link .nav-icon {
  background: rgba(59, 130, 246, 0.22);
}
.nav-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 16px;
  background: var(--accent-soft);
}
.side-link:hover {
  border-color: var(--border-strong);
  background: var(--accent-soft);
}
.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.topbar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
:global(body.theme-light) .topbar {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
.topbar-title {
  font-weight: 700;
  letter-spacing: 0.3px;
}
.topbar-actions :global(.u-badge) {
  font-weight: 600;
}
.main {
  max-width: 100%;
  margin: 0;
  width: 100%;
  padding: 8px 12px 32px;
}
.cookie-banner {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: center;
  z-index: 50;
}
.cookie-card {
  width: min(960px, 100%);
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  border-radius: 16px;
  box-shadow: var(--shadow);
}
.cookie-text {
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
}
.cookie-link {
  color: var(--accent);
  text-decoration: none;
  margin-left: 4px;
}
.cookie-link:hover {
  color: #ffffff;
}
.cookie-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.sidebar-spacer {
  flex: 1;
}
.sidebar-footer {
  display: grid;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
:global(body.theme-light) .sidebar-footer {
  border-top-color: rgba(148, 163, 184, 0.35);
}
.impersonation {
  border-radius: 14px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  display: grid;
  gap: 6px;
}
.impersonation-label {
  font-size: 12px;
  color: #93c5fd;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.impersonation-name {
  font-weight: 700;
  color: #e0f2fe;
}
.account {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  font-size: 18px;
}
.account-label,
.server-label {
  font-size: 12px;
  color: var(--text-muted);
}
.account-name,
.server-name {
  font-weight: 600;
  color: var(--text);
}
.locale {
  display: grid;
  gap: 6px;
  position: relative;
  outline: none;
  min-width: 0;
}
.locale-select {
  width: 100%;
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}
.locale-select:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.7);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}
.locale-flag {
  width: 18px;
  height: 12px;
  border-radius: 2px;
  object-fit: cover;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
}
.locale-chevron {
  margin-left: auto;
  color: var(--text-muted);
}
.locale-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 6px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 6px;
  display: grid;
  gap: 6px;
  z-index: 20;
  box-shadow: var(--shadow);
}
.locale-option {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 8px 10px;
  background: transparent;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  text-align: left;
  font-weight: 600;
}
.locale-option:hover {
  background: rgba(59, 130, 246, 0.18);
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch .slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  transition: 0.2s ease;
}
.switch .slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  top: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: 0.2s ease;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
}
.switch input:checked + .slider {
  background: rgba(59, 130, 246, 0.7);
}
.switch input:checked + .slider:before {
  transform: translateX(22px);
}

:global(body.theme-light) input,
:global(body.theme-light) select,
:global(body.theme-light) textarea {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border-strong);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
}
:global(body.theme-light) input::placeholder,
:global(body.theme-light) textarea::placeholder {
  color: #94a3b8;
}
:global(body.theme-light) .card,
:global(body.theme-light) .sub-card,
:global(body.theme-light) .modal-card,
:global(body.theme-light) .item-card,
:global(body.theme-light) .shop-card,
:global(body.theme-light) .stat-card,
:global(body.theme-light) .trash-card,
:global(body.theme-light) .list-row,
:global(body.theme-light) .inv-member,
:global(body.theme-light) .inv-item,
:global(body.theme-light) .hero,
:global(body.theme-light) .section-content,
:global(body.theme-light) .section-nav {
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
  box-shadow: var(--shadow) !important;
}
:global(body.theme-light) .page {
  background: var(--bg) !important;
}
:global(body.theme-light) .nav-group {
  color: var(--text-muted) !important;
}
:global(body.theme-light) .nav-divider {
  background: var(--border) !important;
}
:global(body.theme-light) .nav-item {
  color: var(--text) !important;
  background: transparent !important;
  border-color: transparent !important;
}
:global(body.theme-light) .nav-item:hover {
  background: var(--accent-soft) !important;
  border-color: var(--border-strong) !important;
}
:global(body.theme-light) .nav-item.active {
  background: var(--accent-soft) !important;
  border-color: rgba(59, 130, 246, 0.35) !important;
}
:global(body.theme-light) .hero-title {
  color: var(--text) !important;
}
:global(body.theme-light) .hero-sub {
  color: var(--text-soft) !important;
}
:global(body.theme-light) .nav-icon {
  background: rgba(37, 99, 235, 0.12);
}
:global(body.theme-light) .login-link {
  color: #1e3a8a;
  border-color: rgba(37, 99, 235, 0.36);
  background: rgba(37, 99, 235, 0.12);
}
@media (max-width: 1024px) {
  .app {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
    height: auto;
  }
}
@media (max-width: 720px) {
  .sidebar {
    padding: 16px;
  }
  .side-nav {
    flex-direction: row;
    justify-content: space-between;
  }
  .side-link {
    flex: 1;
    justify-content: center;
    padding: 10px;
  }
  .nav-label {
    display: none;
  }
  .sidebar-footer {
    border-top: none;
    padding-top: 0;
  }
}
</style>
