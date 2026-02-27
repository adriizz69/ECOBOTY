export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2026-02-02",
  modules: ["@nuxt/ui", "@nuxtjs/i18n"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || "http://localhost:4000",
      discordClientId: process.env.DISCORD_CLIENT_ID,
      baseUrl: process.env.BASE_URL || "",
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
      rollupOptions: {
        output: {
          manualChunks: () => "app"
        }
      }
    }
  }
});
