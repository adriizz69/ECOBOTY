<template>
  <UApp>
    <template v-if="isStandaloneShellRoute">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </template>
    <template v-else>
    <div class="app" :class="{ 'nav-open': mobileNavOpen }">
    <button
      v-if="mobileNavOpen"
      type="button"
      class="nav-backdrop"
      aria-label="Close menu"
      @click="mobileNavOpen = false"
    />
    <header class="topbar">
      <AppContextBar
        :show-menu-toggle="true"
        :menu-open="mobileNavOpen"
        :menu-label="$t('nav.home')"
        :show-servers-link="isLoggedIn"
        brand-title="EcoBoty"
        :brand-subtitle="$t('topbar.title')"
        brand-to="/"
        :is-logged-in="isLoggedIn"
        :username="me?.username || ''"
        :avatar-url="avatarUrl"
        :server-options="serverSelectOptions"
        :selected-server-id="selectedServerId"
        :is-premium="activeServerIsPremium"
        :show-plan="Boolean(selectedServerId)"
        :selected-locale="selectedLocale"
        :locale-options="localeOptions"
        @toggle-menu="mobileNavOpen = !mobileNavOpen"
        @login="handleLogin"
        @plan-click="goToActiveServerBilling"
        @update:selected-server-id="selectedServerId = $event"
        @update:selected-locale="selectedLocale = $event"
      >
        <template #trailing>
          <UBadge color="success" variant="soft">{{ $t("topbar.online") }}</UBadge>
        </template>
      </AppContextBar>
    </header>
    <aside class="sidebar" :class="{ open: mobileNavOpen }">
      <div class="sidebar-mobile-head">
        <button
          type="button"
          class="nav-close"
          aria-label="Close menu"
          @click="mobileNavOpen = false"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </button>
      </div>
      <div class="sidebar-body">
        <div class="sidebar-nav-scroll">
          <nav class="side-nav" @click="onNavClick">
        <NuxtLink to="/" class="side-link">
          <UIcon name="i-lucide-house" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.home") }}</span>
        </NuxtLink>
        <NuxtLink v-if="isLoggedIn && !isImpersonating" to="/servers" class="side-link">
          <UIcon name="i-lucide-server" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.servers") }}</span>
        </NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/user" class="side-link">
          <UIcon name="i-lucide-user-round" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.userSpace") }}</span>
        </NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/compte" class="side-link">
          <UIcon name="i-lucide-wallet" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.account") }}</span>
        </NuxtLink>
        <NuxtLink to="/documentation" class="side-link">
          <UIcon name="i-lucide-book-open" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.documentation") }}</span>
        </NuxtLink>
        <NuxtLink to="/tarifs" class="side-link">
          <UIcon name="i-lucide-tags" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.pricing") }}</span>
        </NuxtLink>
        <NuxtLink to="/setup" class="side-link">
          <UIcon name="i-lucide-activity" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.status") }}</span>
        </NuxtLink>
        <button v-if="isLoggedIn" class="side-link logout-link" type="button" @click="handleLogout">
          <UIcon name="i-lucide-log-out" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.logout") }}</span>
        </button>
        <button v-else class="side-link login-link" type="button" @click="handleLogin">
          <UIcon name="i-lucide-log-in" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.login") }}</span>
        </button>
        <a
          class="side-link support-link"
          href="https://discord.gg/e6eUHaqyGt"
          target="_blank"
          rel="noreferrer"
        >
          <UIcon name="i-lucide-message-circle" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.support") }}</span>
        </a>
          </nav>
        </div>
        <div class="sidebar-footer">
        <NuxtLink v-if="isAdmin" to="/admin-v2" class="side-link admin-link">
          <UIcon name="i-lucide-shield" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.adminBotV2") }}</span>
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
            <UIcon v-if="!avatarUrl" name="i-lucide-user" class="size-4" />
          </div>
          <div>
            <div class="account-label">{{ $t("account.label") }}</div>
            <div class="account-name">{{ me?.username || $t("account.notConnected") }}</div>
          </div>
        </div>
        <NuxtLink v-if="isLoggedIn" to="/servers" class="side-link servers-shortcut">
          <UIcon name="i-lucide-server" class="nav-icon" />
          <span class="nav-label">{{ $t("nav.servers") }}</span>
        </NuxtLink>
      </div>
      </div>
    </aside>
    <div class="content">
      <main class="main">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
        <SiteFooter />
      </main>
    </div>
    </div>
    </template>
    <div v-if="showCookieBanner" class="cookie-banner">
      <UCard class="cookie-card">
        <div class="cookie-text">
          <i18n-t keypath="cookies.text">
            <NuxtLink to="/conditions#partie-cookies" class="cookie-link">
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
  </UApp>
</template>

<script setup>
useHead({
  link: [
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }
  ]
});
const route = useRoute();
const router = useRouter();
const isStandaloneShellRoute = computed(() => {
  const path = String(route.path || "/");
  return (
    path === "/admin-v2" ||
    path.startsWith("/admin-v2/") ||
    path.startsWith("/guild/")
  );
});
const mobileNavOpen = ref(false);
function onNavClick(event) {
  const target = event?.target;
  if (!(target instanceof Element)) return;
  if (target.closest("a, button")) mobileNavOpen.value = false;
}
watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
  }
);
const config = useRuntimeConfig();
const { setToken, getToken, logout, logoutAll, login } = useAuth();
const { locale, locales, setLocale, t } = useI18n();
const isLoggedIn = ref(false);
const me = ref(null);
const selectedGuild = ref(null);
const managedServers = ref([]);
const adminUserId = computed(() => String(config.public.adminUserId || ""));
const isAdmin = computed(() => String(me.value?.discord_id || "") === adminUserId.value);
const isImpersonating = computed(() => Boolean(me.value?.impersonated));
const consentCookie = useCookie("cookie_consent", {
  maxAge: 60 * 60 * 24 * 180,
  sameSite: "lax",
  secure: !import.meta.dev
});
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
const discordTawkName = computed(() => {
  const username = String(me.value?.username || "").trim();
  if (username) return username;
  const discordId = String(me.value?.discord_id || "").trim();
  return discordId ? `Discord ${discordId}` : "";
});

const shouldLoadTawk = computed(
  () =>
    consentCookie.value === "accepted" &&
    tawkToWidgetUrl.value.length > 0 &&
    isLoggedIn.value &&
    Boolean(me.value?.discord_id)
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
const siteName = "ECOBOTY";

useHead({
  htmlAttrs: {
    lang: htmlLang,
    dir: htmlDir
  }
});

const normalizedBaseUrl = computed(() => {
  const raw = String(config.public.baseUrl || "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.client && window?.location?.origin) return window.location.origin.replace(/\/+$/, "");
  return "https://ecoboty.eu";
});

const pageSeo = computed(() => {
  const path = String(route.path || "/");
  const guildName = String(selectedGuild.value?.name || "").trim();
  const guildSuffix = guildName ? ` - ${guildName}` : "";

  if (path === "/") {
    return {
      title: "Accueil",
      description:
        "ECOBOTY: bot economie Discord avec dashboard complet, Twitch, succes, boutique, logs et automatisations.",
      noindex: false
    };
  }
  if (path === "/servers") {
    return {
      title: "Mes serveurs",
      description: "Selectionne et gere tes serveurs Discord connectes a ECOBOTY.",
      noindex: true
    };
  }
  if (path === "/compte") {
    return {
      title: "Mon compte",
      description: "Gere ton compte ECOBOTY, tes abonnements Premium et tes factures Stripe.",
      noindex: true
    };
  }
  if (path === "/setup") {
    return {
      title: "Statut des services",
      description: "Verifie l'etat des services et integrations ECOBOTY.",
      noindex: false
    };
  }
  if (path === "/documentation") {
    return {
      title: "Documentation",
      description: "Documentation ECOBOTY pour configurer le bot, l'admin et l'espace utilisateur.",
      noindex: false
    };
  }
  if (path === "/documentation/admin") {
    return {
      title: "Documentation Admin",
      description: "Guide administrateur ECOBOTY: economie, gains auto, Twitch, succes, anniversaires et logs.",
      noindex: false
    };
  }
  if (path === "/documentation/utilisateur") {
    return {
      title: "Documentation Utilisateur",
      description: "Guide utilisateur ECOBOTY: boutique, inventaire, jeux, succes et compte.",
      noindex: false
    };
  }
  if (path === "/mentions-legales") {
    return {
      title: "Mentions legales",
      description: "Mentions legales du site ECOBOTY.",
      noindex: false
    };
  }
  if (path === "/conditions") {
    return {
      title: "Conditions d'utilisation",
      description: "CGU, CGV, politique de confidentialite et cookies EcoBoty.",
      noindex: false
    };
  }
  if (path === "/confidentialite" || path === "/cookies") {
    return {
      title: "Conditions d'utilisation",
      description: "CGU, CGV, politique de confidentialite et cookies EcoBoty.",
      noindex: false
    };
  }
  if (path === "/admin" || path.startsWith("/admin-v2")) {
    return {
      title: "Administration",
      description: "Espace d'administration EcoBoty.",
      noindex: true
    };
  }
  if (path === "/user") {
    return {
      title: "Espace utilisateur",
      description: "Vue utilisateur ECOBOTY: progression, serveurs et activite personnelle.",
      noindex: true
    };
  }
  if (path.startsWith("/guild/")) {
    return {
      title: `Administration serveur${guildSuffix}`,
      description: "Panneau d'administration serveur ECOBOTY.",
      noindex: true
    };
  }
  if (path.startsWith("/user/guild/")) {
    return {
      title: `Espace serveur utilisateur${guildSuffix}`,
      description: "Espace utilisateur par serveur: boutique, inventaire, logs, succes et mon compte.",
      noindex: true
    };
  }
  if (path === "/callback") {
    return {
      title: "Connexion en cours",
      description: "Finalisation de la connexion ECOBOTY.",
      noindex: true
    };
  }
  return {
    title: "Dashboard",
    description: "Dashboard ECOBOTY.",
    noindex: false
  };
});

const canonicalUrl = computed(() => {
  const base = normalizedBaseUrl.value;
  const path = String(route.path || "/");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
});

const appLocale = computed(() => {
  const key = String(locale.value || "fr").toLowerCase();
  if (key.startsWith("en")) return "en-US";
  if (key.startsWith("es")) return "es-ES";
  return "fr-FR";
});

const buildAbsoluteUrl = (path) => {
  const base = normalizedBaseUrl.value;
  const value = String(path || "/");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
};

const breadcrumbLinks = computed(() => {
  const path = String(route.path || "/");
  const links = [{ name: "Accueil", path: "/" }];
  if (path === "/") return links;
  if (path === "/documentation") {
    links.push({ name: "Documentation", path: "/documentation" });
    return links;
  }
  if (path === "/documentation/admin") {
    links.push({ name: "Documentation", path: "/documentation" });
    links.push({ name: "Documentation Admin", path: "/documentation/admin" });
    return links;
  }
  if (path === "/documentation/utilisateur") {
    links.push({ name: "Documentation", path: "/documentation" });
    links.push({ name: "Documentation Utilisateur", path: "/documentation/utilisateur" });
    return links;
  }
  if (path === "/setup") {
    links.push({ name: "Statut des services", path: "/setup" });
    return links;
  }
  if (path === "/mentions-legales") {
    links.push({ name: "Mentions legales", path: "/mentions-legales" });
    return links;
  }
  if (path === "/conditions" || path === "/confidentialite" || path === "/cookies") {
    links.push({ name: "Conditions d'utilisation", path: "/conditions" });
    return links;
  }
  return null;
});

const organizationStructuredData = computed(() => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: normalizedBaseUrl.value,
  logo: buildAbsoluteUrl("/logo.png"),
  sameAs: ["https://discord.gg/e6eUHaqyGt"]
}));

const websiteStructuredData = computed(() => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: normalizedBaseUrl.value,
  inLanguage: appLocale.value
}));

const webpageStructuredData = computed(() => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${pageSeo.value.title} | ${siteName}`,
  url: canonicalUrl.value,
  description: pageSeo.value.description,
  inLanguage: appLocale.value,
  isPartOf: {
    "@type": "WebSite",
    name: siteName,
    url: normalizedBaseUrl.value
  }
}));

const breadcrumbStructuredData = computed(() => {
  const links = breadcrumbLinks.value;
  if (!Array.isArray(links) || !links.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: links.map((row, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: row.name,
      item: buildAbsoluteUrl(row.path)
    }))
  };
});

useHead(() => {
  const seo = pageSeo.value;
  const absoluteTitle = `${seo.title} | ${siteName}`;
  const robots = seo.noindex ? "noindex, nofollow" : "index, follow";
  const schemaScripts = [
    {
      key: "ld-organization",
      type: "application/ld+json",
      children: JSON.stringify(organizationStructuredData.value)
    },
    {
      key: "ld-website",
      type: "application/ld+json",
      children: JSON.stringify(websiteStructuredData.value)
    },
    {
      key: "ld-webpage",
      type: "application/ld+json",
      children: JSON.stringify(webpageStructuredData.value)
    }
  ];
  if (breadcrumbStructuredData.value) {
    schemaScripts.push({
      key: "ld-breadcrumb",
      type: "application/ld+json",
      children: JSON.stringify(breadcrumbStructuredData.value)
    });
  }
  return {
    title: seo.title,
    titleTemplate: (chunk) => (chunk ? `${chunk} | ${siteName}` : siteName),
    link: [{ rel: "canonical", href: canonicalUrl.value }],
    meta: [
      { name: "description", content: seo.description },
      { name: "robots", content: robots },
      { property: "og:site_name", content: siteName },
      { property: "og:type", content: "website" },
      { property: "og:title", content: absoluteTitle },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: canonicalUrl.value },
      { property: "og:image", content: `${normalizedBaseUrl.value}/logo.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: absoluteTitle },
      { name: "twitter:description", content: seo.description },
      { name: "twitter:image", content: `${normalizedBaseUrl.value}/logo.png` }
    ],
    script: schemaScripts
  };
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

let tawkBoundDiscordId = "";

const TAWK_BOUND_STORAGE_KEY = "ecoboty_tawk_bound_discord_id";

const clearBrowserStorageKeys = (storage) => {
  if (!storage) return;
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    const lower = key.toLowerCase();
    if (
      lower.includes("tawk") ||
      lower.startsWith("twk_") ||
      lower.includes("ssosession") ||
      lower === "$navigator.locks-requestqueuemap" ||
      lower === "$navigator.locks-clientids" ||
      lower === "$navigator.locks-heldlockset" ||
      lower === "previousnav"
    ) {
      keys.push(key);
    }
  }
  keys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  });
};

const clearTawkCookies = () => {
  const host = String(window.location.hostname || "");
  const parts = host.split(".").filter(Boolean);
  const domains = new Set(["", host, `.${host}`]);
  if (parts.length >= 2) {
    domains.add(`.${parts.slice(-2).join(".")}`);
  }

  const cookieNames = document.cookie
    .split(";")
    .map((chunk) => chunk.split("=")[0]?.trim())
    .filter(Boolean);

  cookieNames.forEach((name) => {
    const lower = name.toLowerCase();
    if (
      !(
        lower.startsWith("tawk_") ||
        lower.startsWith("twk_") ||
        lower === "tawkconnectiontime"
      )
    ) {
      return;
    }
    // Expire cookie for path=/ and common domain variants (tawk UUID survives otherwise).
    document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    domains.forEach((domain) => {
      if (!domain) return;
      document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    });
  });
};

const clearTawkBrowserIdentity = () => {
  if (!process.client) return;
  try {
    window.Tawk_API?.logout?.(() => {});
  } catch {
    // ignore
  }
  clearTawkCookies();
  clearBrowserStorageKeys(window.localStorage);
  clearBrowserStorageKeys(window.sessionStorage);
  try {
    window.localStorage.removeItem(TAWK_BOUND_STORAGE_KEY);
  } catch {
    // ignore
  }
};

const unloadTawk = ({ clearIdentity = true } = {}) => {
  if (!process.client) return;
  const globalWindow = window;
  try {
    globalWindow.Tawk_API?.hideWidget?.();
    globalWindow.Tawk_API?.shutdown?.();
  } catch {
    // ignore
  }
  document.querySelectorAll('script[data-tawk-widget="1"]').forEach((node) => node.remove());
  document
    .querySelectorAll('iframe[src*="tawk.to"], iframe[title*="chat widget" i]')
    .forEach((node) => node.remove());
  // Tawk leaves floating containers behind after shutdown.
  document
    .querySelectorAll('div[id^="tawkchat"], div[class*="tawk-"], div[id*="tawk"]')
    .forEach((node) => {
      try {
        node.remove();
      } catch {
        // ignore
      }
    });
  if (clearIdentity) {
    clearTawkBrowserIdentity();
  }
  tawkBoundDiscordId = "";
};

const ensureTawkLoaded = () => {
  if (!process.client) return;
  if (!shouldLoadTawk.value) {
    unloadTawk({ clearIdentity: true });
    return;
  }

  const discordId = String(me.value?.discord_id || "").trim();
  const visitorName = discordTawkName.value || `Discord ${discordId}`;
  const existingScript = document.querySelector('script[data-tawk-widget="1"]');
  let previouslyBound = "";
  try {
    previouslyBound = String(window.localStorage.getItem(TAWK_BOUND_STORAGE_KEY) || "");
  } catch {
    previouslyBound = "";
  }
  const sameWidget =
    existingScript?.getAttribute("src") === tawkToWidgetUrl.value &&
    tawkBoundDiscordId === discordId &&
    previouslyBound === discordId;

  if (sameWidget) {
    try {
      window.Tawk_API?.showWidget?.();
    } catch {
      // ignore
    }
    return;
  }

  // Anonymous tawk UUID cookies block Discord name unless wiped on account change/login.
  const needsIdentityReset = previouslyBound !== discordId;
  unloadTawk({ clearIdentity: needsIdentityReset });

  const globalWindow = window;
  globalWindow.Tawk_API = {};
  globalWindow.Tawk_LoadStart = new Date();
  // Must be set before script download so the dashboard shows the Discord username.
  globalWindow.Tawk_API.visitor = {
    name: visitorName
  };
  globalWindow.Tawk_API.onLoad = function onTawkLoad() {
    try {
      globalWindow.Tawk_API.setAttributes(
        {
          "discord-id": discordId,
          username: String(me.value?.username || visitorName)
        },
        () => {}
      );
      globalWindow.Tawk_API.showWidget?.();
    } catch {
      // ignore
    }
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = tawkToWidgetUrl.value;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  script.setAttribute("data-tawk-widget", "1");
  script.setAttribute("data-tawk-discord-id", discordId);
  document.head.appendChild(script);
  tawkBoundDiscordId = discordId;
  try {
    window.localStorage.setItem(TAWK_BOUND_STORAGE_KEY, discordId);
  } catch {
    // ignore
  }
};

watch([shouldLoadAdsense, adsenseClient], () => {
  ensureAdsenseLoaded();
}, { immediate: true });

watch([shouldLoadTawk, tawkToWidgetUrl, discordTawkName], () => {
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

const persistSelectedGuild = (guild) => {
  selectedGuild.value = guild;
  if (!process.client) return;
  if (guild?.id) {
    localStorage.setItem("selectedGuild", JSON.stringify(guild));
  } else {
    localStorage.removeItem("selectedGuild");
  }
};

const loadManagedServers = async () => {
  const token = getToken();
  if (!token) {
    managedServers.value = [];
    return;
  }
  try {
    const res = await fetch(`${config.public.apiBase}/api/servers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      managedServers.value = [];
      return;
    }
    const data = await res.json();
    managedServers.value = (Array.isArray(data.servers) ? data.servers : [])
      .filter((server) => server?.botPresent && !server?.banned);
  } catch {
    managedServers.value = [];
  }
};

const serverSelectOptions = computed(() =>
  managedServers.value.map((server) => {
    const isPremium = Boolean(server.billing?.isPremium);
    const planLabel = isPremium ? t("billing.status.premium") : t("billing.status.free");
    return {
      value: String(server.id),
      label: `${String(server.name || server.id)} · ${planLabel}`,
      shortLabel: String(server.name || server.id),
      isPremium
    };
  })
);

const activeServerIsPremium = computed(() => {
  const id = String(selectedGuild.value?.id || "");
  const server = managedServers.value.find((row) => String(row.id) === id);
  return Boolean(server?.billing?.isPremium);
});

const goToActiveServerBilling = () => {
  const guildId = String(selectedGuild.value?.id || "").trim();
  if (!guildId) {
    navigateTo("/servers");
    return;
  }
  navigateTo(`/guild/${guildId}?tab=billing`);
};

const syncGuildFromRoute = () => {
  const match = route.path.match(/^\/(?:user\/)?guild\/([^/]+)/);
  if (!match?.[1]) return;
  const guildId = String(match[1]);
  const fromList = managedServers.value.find((server) => String(server.id) === guildId);
  persistSelectedGuild(
    fromList
      ? { id: String(fromList.id), name: String(fromList.name || fromList.id) }
      : { id: guildId, name: guildId }
  );
};

const selectedServerId = computed({
  get: () => String(selectedGuild.value?.id || ""),
  set: (nextId) => {
    const guildId = String(nextId || "").trim();
    if (!guildId) return;
    const server = managedServers.value.find((row) => String(row.id) === guildId);
    if (!server) return;
    persistSelectedGuild({ id: String(server.id), name: String(server.name || server.id) });

    const adminMatch = route.path.match(/^\/guild\/([^/]+)/);
    const userMatch = route.path.match(/^\/user\/guild\/([^/]+)/);
    if (adminMatch) {
      navigateTo(`/guild/${guildId}`);
    } else if (userMatch) {
      navigateTo(`/user/guild/${guildId}`);
    }
  }
});

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
    await loadManagedServers();
    syncGuildFromRoute();
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
    router.push("/admin-v2");
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
    syncGuildFromRoute();
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
  font-family: var(--font-body);
  color: var(--text);
}
.app {
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--sidebar-w, 280px) 1fr;
  grid-template-rows: auto 1fr;
  gap: 22px;
  padding: 22px;
  background: transparent;
}
:global(html.light body) .app,
:global(body.theme-light) .app {
  background: transparent !important;
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
  grid-column: 1;
  grid-row: 2;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 90px;
  height: calc(100vh - 112px);
  overflow: hidden;
  backdrop-filter: blur(12px);
}
.sidebar-mobile-head {
  display: none;
  justify-content: flex-end;
  margin: -4px 0 4px;
}
.sidebar-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sidebar-nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}
.sidebar-footer {
  flex-shrink: 0;
  display: grid;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.server-switcher {
  display: grid;
  gap: 8px;
}
:global(body.theme-light) .sidebar {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
.brand {
  display: none;
}
.nav-toggle,
.nav-close {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  flex-shrink: 0;
}
.nav-backdrop {
  display: none;
}
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 0;
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
  border-radius: 14px;
  border: 1px solid transparent;
  transition: all 0.22s var(--ease);
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
}
.side-link:hover {
  border-color: transparent;
  background: rgba(45, 212, 160, 0.08);
  color: var(--text);
  transform: translateX(2px);
}
.side-link.router-link-active {
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.18), rgba(56, 189, 248, 0.1));
  border-color: rgba(45, 212, 160, 0.35);
  color: var(--text);
  box-shadow: 0 8px 18px rgba(45, 212, 160, 0.1);
}
.login-link {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  background: var(--accent-soft);
}
.login-link .nav-icon {
  background: rgba(45, 212, 160, 0.2) !important;
  color: var(--accent) !important;
}
.logout-link {
  color: #fecaca;
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.08);
}
.logout-link .nav-icon {
  background: rgba(248, 113, 113, 0.18) !important;
  color: #fca5a5 !important;
}
.support-link {
  border-color: var(--border);
  background: transparent;
  color: var(--text-soft);
}
.support-link .nav-icon {
  background: rgba(56, 189, 248, 0.14) !important;
  color: #38bdf8 !important;
}
.nav-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: inherit;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-soft);
  flex-shrink: 0;
  transition: background 0.2s var(--ease), color 0.2s var(--ease), transform 0.2s var(--ease);
}
.side-link:hover .nav-icon {
  transform: translateY(-1px) scale(1.05);
  background: rgba(45, 212, 160, 0.18);
  color: var(--accent);
}
.side-link.router-link-active .nav-icon {
  background: linear-gradient(135deg, var(--accent), #38bdf8);
  color: #04120c;
}
.side-nav .side-link:nth-child(1) .nav-icon { background: rgba(45, 212, 160, 0.14); color: var(--accent); }
.side-nav .side-link:nth-child(2) .nav-icon { background: rgba(56, 189, 248, 0.14); color: #38bdf8; }
.side-nav .side-link:nth-child(3) .nav-icon { background: rgba(251, 191, 36, 0.14); color: #fbbf24; }
.side-nav .side-link:nth-child(4) .nav-icon { background: rgba(167, 139, 250, 0.14); color: #a78bfa; }
.side-nav .side-link:nth-child(5) .nav-icon { background: rgba(248, 113, 113, 0.12); color: #f87171; }
.side-nav .side-link:nth-child(6) .nav-icon { background: rgba(52, 211, 153, 0.14); color: #34d399; }
.content {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.topbar {
  grid-column: 1 / -1;
  grid-row: 1;
  position: sticky;
  top: 12px;
  z-index: 40;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: block;
}
.topbar :deep(.context-bar) {
  width: 100%;
}
.topbar-actions {
  margin-left: auto;
}
:global(body.theme-light) .topbar {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
.main {
  max-width: 100%;
  margin: 0;
  width: 100%;
  padding: 4px 8px 36px;
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
.account-link,
.premium-spot {
  text-decoration: none;
}
.account-link {
  border-radius: 14px;
  padding: 8px;
  margin: -8px;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.account-link:hover {
  background: rgba(59, 130, 246, 0.08);
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
.premium-spot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(167, 139, 250, 0.28);
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.88), rgba(124, 58, 237, 0.24), rgba(37, 99, 235, 0.24));
}
.premium-spot-copy {
  display: grid;
  gap: 3px;
}
.premium-spot-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #c4b5fd;
}
.premium-spot-title {
  font-weight: 700;
  color: var(--text);
}
.premium-spot-icon {
  width: 18px;
  height: 18px;
  color: #c4b5fd;
  flex: 0 0 auto;
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
  border-color: rgba(15, 159, 114, 0.35) !important;
}
:global(body.theme-light) .hero-title {
  color: var(--text) !important;
}
:global(body.theme-light) .hero-sub {
  color: var(--text-soft) !important;
}
:global(body.theme-light) .nav-icon {
  background: var(--accent-soft);
}
:global(body.theme-light) .login-link {
  color: var(--accent-2);
  border-color: rgba(15, 159, 114, 0.36);
  background: var(--accent-soft);
}
@media (max-width: 1024px) {
  .app {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    padding: 12px;
    gap: 12px;
  }

  .topbar {
    grid-column: 1;
    grid-row: 1;
    position: sticky;
    top: 8px;
    z-index: 40;
  }

  .content {
    grid-column: 1;
    grid-row: 2;
    min-width: 0;
  }

  .nav-toggle {
    display: inline-flex;
  }

  .sidebar-mobile-head {
    display: flex;
  }

  .nav-close {
    display: inline-flex;
  }

  .nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 80;
    border: 0;
    padding: 0;
    margin: 0;
    background: rgba(2, 6, 23, 0.55);
    backdrop-filter: blur(2px);
    cursor: pointer;
  }

  .sidebar {
    grid-column: auto;
    grid-row: auto;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 90;
    width: min(320px, 88vw);
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0 22px 22px 0;
    transform: translateX(-105%);
    transition: transform 0.28s var(--ease);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main {
    padding: 0;
  }
}

@media (max-width: 720px) {
  .app {
    padding: 8px;
    gap: 8px;
  }

  .topbar-sub {
    display: none;
  }

  .topbar-logo {
    width: 36px;
    height: 36px;
  }

  .sidebar-footer .server,
  .sidebar-footer .account {
    font-size: 0.9rem;
  }

  .cookie-banner {
    left: 8px;
    right: 8px;
    bottom: 8px;
  }

  .cookie-card {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .cookie-actions {
    width: 100%;
  }

  .cookie-actions :deep(button) {
    flex: 1;
  }
}
</style>
