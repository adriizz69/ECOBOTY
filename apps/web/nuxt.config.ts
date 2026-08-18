import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const isProd = process.env.NODE_ENV === "production";
const isProdSpaBuild = isProd || process.env.NUXT_BUILD_TARGET === "production";
const localApi = "http://127.0.0.1:4000";

// Production SPA is same-origin (empty). `nuxt dev` talks to the API+bot on :4000.
const resolvedApiBase = (() => {
  if (isProdSpaBuild) return "";
  const raw = String(process.env.API_BASE || "").trim();
  if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) return localApi;
  return raw;
})();

export default defineNuxtConfig({
  envDir: rootDir,
  devtools: { enabled: !isProd },
  compatibilityDate: "2026-07-18",
  ssr: false,
  modules: ["@nuxt/ui", "@nuxtjs/i18n"],
  css: ["~/assets/css/main.css"],
  icon: {
    clientBundle: {
      scan: true
    }
  },
  nitro: {
    preset: "static",
    devProxy: {
      "/api": { target: localApi, changeOrigin: true },
      "/auth": { target: localApi, changeOrigin: true },
      "/bot": { target: localApi, changeOrigin: true }
    }
  },
  runtimeConfig: {
    public: {
      apiBase: resolvedApiBase,
      discordClientId: process.env.DISCORD_CLIENT_ID,
      baseUrl: process.env.BASE_URL || (isProd ? "https://ecoboty.eu" : ""),
      adminUserId: process.env.ADMIN_USER_ID || process.env.ADMIN_USER_IDS || "1328058083246608407",
      adsenseClient: process.env.ADSENSE_CLIENT || "",
      tawkToWidgetUrl:
        process.env.TAWK_TO_WIDGET_URL || "https://embed.tawk.to/69a1b03b37d2cc1c36f4a8a7/1jifpgq5r"
    }
  },
  i18n: {
    lazy: true,
    langDir: "locales",
    defaultLocale: "fr",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "ecoboty_locale",
      fallbackLocale: "fr",
      redirectOn: "root",
      alwaysRedirect: false
    },
    locales: [
      { code: "fr", name: "Français", file: "fr.json" },
      { code: "en", name: "English", file: "en.json" },
      { code: "es", name: "Español", file: "es.json" }
    ]
  },
  vite: {
    resolve: {
      dedupe: ["vue", "@vue/runtime-core", "@vue/runtime-dom"]
    },
    build: {
      cssCodeSplit: false,
      chunkSizeWarningLimit: 2000,
      // Vite 8 / Rolldown: keep a single app chunk (compat still accepts rollupOptions.manualChunks)
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [{ name: "app", test: /.*/ }]
          }
        }
      }
    }
  },
  app: {
    baseURL: "/",
    buildAssetsDir: "/_nuxt/",
    head: {
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }
      ]
    }
  }
});
