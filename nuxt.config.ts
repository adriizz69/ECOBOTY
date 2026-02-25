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
      adminUserId: process.env.ADMIN_USER_ID || process.env.ADMIN_USER_IDS || "1328058083246608407"
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
    plugins: [
      {
        // Silence noisy 404 requests made by browser/devtools extensions.
        // These paths are not real Nuxt assets but can be requested during HMR.
        name: "ecoboty-ignore-nuxt-index-map",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = String(req.url || "").split("?")[0];
            if (url === "/_nuxt" || url === "/_nuxt/" || url === "/_nuxt/index.map") {
              res.statusCode = 204;
              res.end();
              return;
            }
            next();
          });
        }
      }
    ],
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
